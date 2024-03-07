#!/usr/bin/env python3
import contextlib
import getpass
import io
import json
import logging
import os
import re
import subprocess
import sys
import tarfile
import time
import traceback
from argparse import (
    ArgumentParser,
    ArgumentTypeError,
    Namespace,
    RawDescriptionHelpFormatter,
)
from operator import itemgetter
from pathlib import Path
from signal import SIGINT, signal
from types import FrameType

try:
    import requests
    import yaml
    from requests.adapters import HTTPAdapter
    from rich import box
    from rich.console import Console
    from rich.table import Table
    from urllib3 import Retry
except ImportError:
    load_script = Path(__file__).resolve().parents[2] / "load-gms-conda-env.sh"
    raise SystemExit(
        "It looks like you're not using the approved environment.  Please "
        f"run:  source {load_script}"
    )

from .parsers import Parsers


class GMSKube:
    """
    The ``gmskube`` command-line program is used to install and
    configure instances of GMS (the Geophysical Monitoring System) on
    Kubernetes.  See :func:`parser` for more details.

    Attributes:
        args (Namespace):  The parsed command line arguments.
        augmentation_name (str):  The name of the augmentation to apply
            or delete with the `gmskube augment` command.
        augmentations (list[str]):  Which augmentations to apply when
            installing an instance.
        command (Callable):  The function to be run corresponding to the
            sub-command selected.
        config_override_path (str):  The path to a directory of
            configuration overrides to load into the instance.
        custom_chart_path (str):  Path to a local Helm chart directory
            to deploy.
        deploy_dir (Path):  The location of the ``deploy`` directory,
            containing our Helm charts.
        dry_run (bool):  Whether to not actually install, but instead
            just print the YAML that would've been used.
        image_tag (str):  The Docker tag to use for the images.
        ingress_port (str):  The port for ingress to the
            ``config-loader``.
        instance_name (str):  The name of the instance.
        instance_type (str):  The type of the instance.
        is_istio (bool):  Whether to enable Istio injection.
        service (str):  The name of the service for which to get the
            ingress route.
        set_strings (list[str]):  A list of ``key=value`` strings for
            setting values in the Helm charts.
        sets (list[str]):  Like ``set_strings``, but without forcing
            string values.
        show_all (bool):  Whether to list all Helm-installed instances,
            even if they do not contain GMS metadata.
        timeout (int):  A timeout (in minutes) used for various
            operations.
        username (str):  The username for which to filter ``gmskube ls``
            results.
        values (list[str]):  Paths to values override YAML files.
        verbose (str):  Either ``"INFO"`` or ``"DEBUG"``, for differing
            levels of log output.
        wallet_path (str):  The path to an Oracle Wallet directory.
        with_container (bool):  Whether the script is being run
            with the wrapping container.
    """

    def __init__(self):
        self.console_kwargs = {"log_path": False}
        if os.getenv("CI"):
            self.console_kwargs["force_terminal"] = True
        if os.getenv("RICH_LOG_PATH"):
            self.console_kwargs["log_path"] = True
        self.console = Console(**self.console_kwargs)
        self.with_container = not bool(os.getenv("GMSKUBE_WITHOUT_CONTAINER"))
        self.deploy_dir = (
            Path("/deploy") if self.with_container else
            Path(__file__).resolve().parents[3] / "deploy"
        )

    def main(self, argv: list[str]) -> None:
        """
        The main routine for the ``gmskube`` command-line tool.

        Args:
            argv:  The command line arguments used when running this
                file as a script.
        """
        self.parse_args(argv)

        # Configure logging:  Make sure this comes before any call to
        # logging.  Remove any existing logging handlers that may have
        # been set up in imports.
        while len(logging.root.handlers):
            logging.root.removeHandler(logging.root.handlers[-1])
        logging.basicConfig(
            format="[%(levelname)s] %(message)s",
            level=getattr(logging, self.verbose)
        )  # yapf: disable

        # Capture any messages from the warnings module.
        logging.captureWarnings(True)

        # Save the `kubectl` context into a file if the environment
        # variable is set.
        if "KUBECTL_CONTEXT" in os.environ:  # pragma: no branch
            logging.debug("KUBECTL_CONTEXT is set, saving file")

            # Save the context into `/kubeconfig/config` where the
            # `$KUBECONFIG` environment variable is set in the
            # `Dockerfile`.  The path is hard-coded instead of using the
            # environment variable to prevent a Fortify finding.
            with open("/kubeconfig/config", "w") as kube_file:
                print(f"{os.getenv('KUBECTL_CONTEXT')}", file=kube_file)
            os.chmod("/kubeconfig/config", 0o600)

        # Print debug arguments.
        logging.debug("Arguments:")
        for arg in vars(self.args):
            logging.debug(f"    {arg} = {getattr(self.args, arg) or ''}")

        # Print out the entire environment for debug.
        logging.debug(
            "Environment:\n" + "\n".join([
                f"        {key}={value}" for key,
                value in sorted(os.environ.items())
            ])
        )

        try:
            self.get_kubernetes_version()
            self.args.command()
        except Exception as ex:  # pragma no coverage
            self.console.log(fr"[bold red]\[ERROR] {ex}")
            traceback.print_exc()
            sys.exit(1)

    @property
    def parser(self) -> ArgumentParser:
        """
        Get the main argument parser for the script.

        Note:
            Any time new arguments are added, be sure to regenerate the
            ``bash_completion`` file by running
            ``shtab gmskube.gmskube.get_parser > bash_completion`` in
            the ``python/gmskube`` directory.
        """
        description = """
Description
===========

The `gmskube` command-line program is used to install and configure
instances of GMS (the Geophysical Monitoring System) on Kubernetes.

Each "instance" is an installation of a multi-container application that
is managed as a single unit and runs on a Kubernetes cluster.  Each
instance is contained within its own namespace in Kubernetes.  Various
predefined types of instances are available.

Multiple copies of instances of the same type may be run simultaneously.
Each instance must be given a unique name to identify it, as well as
distinguish it from other running instances of the same type.

Different versions of a particular instance type may be available from
the configured Docker registry.  Released versions of GMS are tagged
with a specific version number.  During development, this corresponds to
a tag name on the Docker images.

Configuration
=============

Before you can run `gmskube`, you must first download a `Kubeconfig`
bundle from the cluster, and have the `kubectl` context set to the
correct cluster.

1. Login to Rancher.
2. Click the cluster name.
3. In the upper right, click the blue "Kubeconfig File" button.
4. Copy/Paste the contents into `~/.kube/config` on your development
   machine.
5. If you have `kubectl` installed, the `KUBECONFIG` environment
   variable should already be set.  If not, set `KUBECONFIG=~/config`.
"""
        parser = ArgumentParser(
            description=description,
            formatter_class=RawDescriptionHelpFormatter,
            prog="gmskube"
        )
        subparsers = parser.add_subparsers(help="Available sub-commands:")

        # Augment [Apply, Delete, Catalog]
        augment_parser = subparsers.add_parser(
            "augment",
            help="Augment a running instance of the system."
        )
        augment_subparsers = augment_parser.add_subparsers(
            help="Available augment sub-commands:"
        )

        # Augment Apply
        augment_apply_parser = augment_subparsers.add_parser(
            "apply",
            parents=[
                Parsers.augmentation_name,
                Parsers.chart,
                Parsers.dry_run,
                Parsers.name,
                Parsers.sets,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="Apply an augmentation to a running instance of the system."
        )
        augment_apply_parser.set_defaults(command=self.apply_augmentation)

        # Augment Catalog
        augment_catalog_parser = augment_subparsers.add_parser(
            "catalog",
            aliases=["cat"],
            parents=[
                Parsers.chart,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="List the catalog of available augmentation names."
        )
        augment_catalog_parser.set_defaults(command=self.list_augmentations)

        # Augment Delete
        augment_delete_parser = augment_subparsers.add_parser(
            "delete",
            parents=[
                Parsers.augmentation_name,
                Parsers.chart,
                Parsers.dry_run,
                Parsers.name,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="Delete the specified augmentation."
        )
        augment_delete_parser.set_defaults(command=self.delete_augmentation)

        # Ingress
        ingress_parser = subparsers.add_parser(
            "ingress",
            parents=[
                Parsers.name,
                Parsers.port,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="List the ingress routes for an instance."
        )
        ingress_parser.add_argument(
            "--service",
            help="Return only the ingress route for the specified service."
        )
        ingress_parser.set_defaults(command=self.list_ingress_routes)

        # Install
        install_parser = subparsers.add_parser(
            "install",
            parents=[
                Parsers.augment,
                Parsers.config,
                Parsers.dry_run,
                Parsers.istio,
                Parsers.name,
                Parsers.port,
                Parsers.set_string,
                Parsers.sets,
                Parsers.tag,
                Parsers.timeout,
                Parsers.values,
                Parsers.verbose,
            ],
            help="Install an instance of the system."
        )
        install_type_chart_group = install_parser.add_mutually_exclusive_group(
            required=True
        )
        Parsers.add_type_args(install_type_chart_group)
        Parsers.add_chart_args(install_type_chart_group)
        install_parser.add_argument(
            "--wallet-path",
            help="Optional path to an Oracle Wallet directory.  Under normal "
            "circumstances either the shared cluster-wide wallet, or the "
            "container wallet, will automatically be used for the instance, "
            "so supplying an Oracle Wallet path is not necessary.  This "
            "argument should only be used when testing a new Oracle Wallet."
        )
        install_parser.set_defaults(command=self.install_instance)

        # List
        list_parser = subparsers.add_parser(
            "list",
            aliases=["ls"],
            parents=[
                Parsers.tag,
                Parsers.timeout,
                Parsers.types,
                Parsers.verbose,
            ],
            help="List instances."
        )
        list_parser.add_argument(
            "--user",
            help="List only instances deployed by the specified user."
        )
        list_parser.add_argument(
            "--all",
            "-a",
            default=False,
            action="store_true",
            help="Include all namespaces (system, rancher, etc.), not just "
            "GMS instances."
        )
        list_parser.add_argument(
            "name",
            nargs="?",
            help="Optional name of the instance to list. If the instance does "
            "not exist, then a non-zero exit code will be returned."
        )
        list_parser.set_defaults(command=self.list_instances)

        # Reconfig
        reconfig_parser = subparsers.add_parser(
            "reconfig",
            parents=[
                Parsers.config,
                Parsers.name,
                Parsers.port,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="Reconfigure a running instance of a system."
        )
        reconfig_parser.set_defaults(command=self.reconfigure_instance)

        # Uninstall
        uninstall_parser = subparsers.add_parser(
            "uninstall",
            parents=[
                Parsers.name,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
            ],
            help="Uninstall an instance of the system."
        )
        uninstall_parser.set_defaults(command=self.uninstall_instance)

        # Upgrade
        upgrade_parser = subparsers.add_parser(
            "upgrade",
            parents=[
                Parsers.augment,
                Parsers.dry_run,
                Parsers.name,
                Parsers.set_string,
                Parsers.sets,
                Parsers.tag,
                Parsers.timeout,
                Parsers.verbose,
                Parsers.values,
            ],
            help="Upgrade an instance of the system."
        )
        Parsers.add_chart_args(upgrade_parser)
        upgrade_parser.set_defaults(command=self.upgrade_instance)

        return parser

    def parse_args(self, argv: list[str]) -> Namespace:
        """
        Parse the command-line arguments to the script, save them as
        instance attributes, and validate them.

        Args:
            argv:  The command line arguments used when running this
                file as a script.
        """
        self.args = self.parser.parse_args(argv)
        self.set_instance_attributes()
        if not hasattr(self.args, "command"):
            self.parser.print_help()
            sys.exit(0)
        self.validate_instance_tag()
        self.validate_instance_name()
        self.validate_augmentations()
        if self.dry_run:
            self.set_dry_run_console()

    def set_instance_attributes(self) -> None:
        """
        Set the parsed arguments as instance attributes for ease of
        reference.  If any arguments weren't specified, default them to
        ``None``.
        """
        self.augmentation_name = getattr(self.args, "augmentation_name", None)
        self.augmentations = getattr(self.args, "augment", None)
        self.command = getattr(self.args, "command", None)
        self.config_override_path = getattr(self.args, "config", None)
        self.custom_chart_path = getattr(self.args, "chart", None)
        self.dry_run = getattr(self.args, "dry_run", None)
        self.image_tag = getattr(self.args, "tag", None)
        self.ingress_port = getattr(self.args, "port", None)
        self.instance_name = getattr(self.args, "name", None)
        self.instance_type = getattr(self.args, "type", None)
        self.is_istio = getattr(self.args, "istio", None)
        self.service = getattr(self.args, "service", None)
        self.set_strings = getattr(self.args, "set_strings", None)
        self.sets = getattr(self.args, "sets", None)
        self.show_all = getattr(self.args, "all", None)
        self.timeout = getattr(self.args, "timeout", None)
        self.username = getattr(self.args, "user", None)
        self.values = getattr(self.args, "values", None)
        self.verbose = getattr(self.args, "verbose", None)
        self.wallet_path = getattr(self.args, "wallet_path", None)
        if self.values is None:
            self.values = []

    def validate_instance_tag(self) -> None:
        """
        If the user doesn't supply ``--tag`` on the command line, and
        the sub-command selected is either ``install``, ``upgrade``, or
        ``augment``, error out and ask the user to supply the ``--tag``.
        """
        if self.image_tag is None and self.command.__name__ in [
            "install_instance",
            "upgrade_instance",
            "apply_augmentation",
            "delete_augmentation",
            "list_augmentations"
        ]:
            raise ArgumentTypeError("The `--tag` argument is required.")

    def validate_instance_name(self) -> None:
        """
        Check two limitations that apply to instance names:

        1. Instance name length is between 3 and 128 characters.  Until
           we find out otherwise, this is an arbitrary limit.
        2. The instance name will be used as part of a DNS hostname, so
           it must comply with DNS naming rules:  Hostname labels may
           contain only the ASCII letters ``a`` through ``z`` (in a
           case-insensitive manner), the digits ``0`` through ``9``, and
           the hyphen (``-``).  The original specification of hostnames
           in RFC 952, mandated that labels could not start with a digit
           or with a hyphen, and must not end with a hyphen.  However, a
           subsequent specification (RFC 1123) permitted hostname labels
           to start with digits.  No other symbols, punctuation
           characters, or white space are permitted.

        Note:
            This is intentionally not an ``argparse`` argument type
            because any unknown arguments will cause it to error too
            soon and give a misleading error message to the user.

        Raises:
            ArgumentTypeError:  If the instance name is invalid.
        """
        if self.instance_name is not None:
            pattern = re.compile(r"^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$")
            if not pattern.match(self.instance_name):
                raise ArgumentTypeError(
                    "Instance name must be between 3 and 128 characters long, "
                    "consist only of lower case letters digits and hyphens, "
                    "and not start or end with a hyphen."
                )

    def validate_augmentations(self) -> None:
        """
        Ensure any augmentations specified are defined in the
        augmentation ``values.yaml`` file.

        Raises:
            RuntimeError:  If an augmentation name is invalid.
        """
        if self.augmentations is None and self.augmentation_name is None:
            return
        with open(self.deploy_dir / "augmentation/values.yaml", "r") as file:
            augmentation_values = yaml.safe_load(file)
        augmentations = []
        if self.augmentations is not None:
            augmentations += self.augmentations
        if self.augmentation_name is not None:
            augmentations += [self.augmentation_name]
        for augmentation in augmentations:
            for key, _ in augmentation_values.items():
                with contextlib.suppress(KeyError, TypeError):
                    if key == augmentation:
                        break
            else:
                raise RuntimeError(
                    f"{augmentation!r} is not a valid augmentation name.  "
                    "See `gmskube augment catalog --tag <tag>` for available "
                    "augmentations."
                )

    def set_dry_run_console(self):
        """
        When running in dry-run mode, remove the fancy features from the
        console for the sake of printing Helm charts, etc.
        """
        self.console_kwargs["force_interactive"] = False
        self.console_kwargs["highlight"] = False
        self.console_kwargs["soft_wrap"] = True
        self.console = Console(**self.console_kwargs)
        self.console.log = self.console.print

    def install_instance(self) -> None:
        """
        Perform the ``helm install`` command, with some extra options
        for loading data.
        """
        self.console.log(f"[cyan]Installing {self.instance_name}")
        base_domain = self.get_base_domain()
        docker_registry = self.get_docker_registry()
        self.console.log("Getting ingress port")
        port = self.get_ingress_port()
        self.console.log(f"Ingress port: {port}")

        # Set the instance type to be custom if loading in a user-defined
        # custom chart directory.
        if self.custom_chart_path is not None:
            self.instance_type = "custom"

        if not self.dry_run:
            self.console.log(
                f"[cyan]Setting up namespace {self.instance_name}"
            )
            self.create_namespace()

        # Build up the install command.
        install_cmd = (
            f"helm {'install' if self.dry_run < 2 else 'template'} "
            f"{self.instance_name} "
            f"{self.instance_type} "
            f"--namespace {self.instance_name} "
            f"--timeout {self.timeout}m "
            f"--set 'global.baseDomain={base_domain}' "
            f"--set 'global.basePort={port}' "
            f"--set 'global.imageRegistry={docker_registry}' "
            f"--set 'kafka.image.registry={docker_registry}' "
            f"--set 'kafka.zookeeper.image.registry={docker_registry}' "
            f"--set 'kafka.metrics.kafka.image.registry={docker_registry}' "
            f"--set 'kafka.metrics.jmx.image.registry={docker_registry}' "
            f"--set 'global.imageTag={self.image_tag}' "
            f"--set 'kafka.image.tag={self.image_tag}' "
            f"--set 'kafka.zookeeper.image.tag={self.image_tag}' "
            f"--set 'kafka.metrics.kafka.image.tag={self.image_tag}' "
            f"--set 'kafka.metrics.jmx.image.tag={self.image_tag}' "
            f"--set 'global.user={getpass.getuser()}' "
            # These --set commands are for LOGGING --BEGIN
            f"--set 'elasticsearch.image.tag={self.image_tag}' "
            f"--set 'elasticsearch.sysctlImage.tag={self.image_tag}' "
            f"--set 'elasticsearch.kibana.image.tag={self.image_tag}' "
            f"--set 'fluentd.image.repository={docker_registry}/gms-common/"
            f"logging-fluentd' "
            f"--set 'fluentd.image.tag={self.image_tag}' "
            # These --set commands are for LOGGING --END
            # These --set commands are for KEYCLOAK --BEGIN
            f"--set 'keycloakx.image.repository={docker_registry}/gms-common/"
            "keycloak' "
            f"--set 'keycloakx.image.tag={self.image_tag}' "
            f"--set 'postgresql.image.tag={self.image_tag}' "
            # These --set commands are for KEYCLOAK --END
        )
        if self.wallet_path is not None:
            install_cmd += "--set 'global.oracleWalletOverride=true' "
        if self.is_istio:
            install_cmd += "--set 'global.istio=true' "
        if self.dry_run:
            install_cmd += "--dry-run --debug "

        # Add any custom Helm values set by the `--set` option.
        if self.sets is not None:
            for item in self.sets:
                install_cmd += f"--set '{item}' "

        # Add any custom Helm values set by the `--set-string` option.
        if self.set_strings is not None:
            for item in self.set_strings:
                install_cmd += f"--set-string '{item}' "

        # Add any values override files set by the `--values` option.
        for values_file in self.values:
            install_cmd += f"--values '{values_file}' "

        # Apply any augmentations.
        if self.augmentations is not None:
            for aug_name in self.augmentations:
                self.console.log(f"[cyan]Enabling augmentation {aug_name}")
                install_cmd += f"--set augmentation.{aug_name}.enabled=true "

        # Run the `helm install` command.
        self.console.log("[cyan]Running helm install")
        return_code, out, err = self.run_helm_install(install_cmd)

        # Exit here for dry-run mode, since everything else after this
        # point requires a real install.
        if self.dry_run:
            sys.exit(return_code)

        if return_code > 0:
            self.print_error(
                f"Could not install instance {self.instance_name}: {err}"
            )
            sys.exit(return_code)

        # Run the config-loader.
        self.console.log("[cyan]Beginning data load")
        self.request_dataload(base_domain=base_domain, port=port)

        self.console.log(
            f"\nTo list ingress routes for this instance, run `gmskube "
            f"ingress {self.instance_name}`"
        )
        self.console.log(
            f"[bold green]{self.instance_name} installed successfully!"
        )

    def upgrade_instance(self) -> None:
        """
        Perform the ``helm upgrade`` command.
        """
        self.console.log(f"[cyan]Upgrading {self.instance_name}")

        # Get the instance type.
        self.console.log("Getting instance type")
        if self.custom_chart_path is not None:
            # Set the instance type to be custom if loading in a
            # user-defined custom chart directory.
            instance_type = "custom"
        else:
            # Get the instance type from the labels.  We don't use
            # `args.type` here because we don't allow the type to be
            # changed during an upgrade.
            instance_type = (
                self.get_instance_labels().get("gms/type", None)
            )  # yapf: disable
        if instance_type is None:
            self.print_error(
                f"Could not determine the type for instance "
                f"{self.instance_name}.  Possible causes:\n        - Instance "
                "is not installed. Check by running `gmskube ls`.\n        - "
                "Instance was not installed using `gmskube` and is missing "
                "metadata. Uninstall then use `gmskube install`."
            )
            sys.exit(1)
        self.console.log(f"Instance type is: {instance_type}")

        # Get and save the existing values.
        self.console.log("Getting existing helm values")
        return_code, out, err = self.run_helm_get_values()
        if return_code == 0:
            self.console.log("Saving existing helm values to a temporary file")
            with open("/tmp/existing_values.yaml", "w") as existing_values:
                print(out, file=existing_values)
        else:
            # if we can't get the existing values then error
            self.print_error(
                "Unable to get existing values for instance "
                f"{self.instance_name}: {err}"
            )
            sys.exit(return_code)

        # Create the upgrade command.  Provide the values file from the
        # chart followed by the existing values, so Helm will merge them
        # together.
        upgrade_cmd = (
            f"helm upgrade {self.instance_name} {instance_type} "
            f"--namespace {self.instance_name} "
            f"--timeout {self.timeout}m "
            f"--values {self.deploy_dir / instance_type / 'values.yaml'} "
            f"--values /tmp/existing_values.yaml "
            f"--set 'global.user={getpass.getuser()}' "
            # all permutations of imageTag need to be passed on upgrade to
            # make it into sub-charts
            f"--set 'global.imageTag={self.image_tag}' "
            f"--set 'kafka.image.tag={self.image_tag}' "
            f"--set 'kafka.zookeeper.image.tag={self.image_tag}' "
            f"--set 'elasticsearch.image.tag={self.image_tag}' "
            f"--set 'elasticsearch.sysctlImage.tag={self.image_tag}' "
            f"--set 'elasticsearch.kibana.image.tag={self.image_tag}' "
            f"--set 'fluentd.image.tag={self.image_tag}' "
            f"--set 'keycloakx.image.tag={self.image_tag}' "
            f"--set 'postgresql.image.tag={self.image_tag}' "
        )
        if self.dry_run:
            upgrade_cmd += "--dry-run --debug "

        # Add any custom Helm values set by the `--set` option.
        if self.sets is not None:
            for item in self.sets:
                upgrade_cmd += f"--set '{item}' "

        # Add any custom Helm values set by the `--set-string` option.
        if self.set_strings is not None:
            for item in self.set_strings:
                upgrade_cmd += f"--set-string '{item}' "

        # Add any values override files set by the `--values` option.
        for values_file in self.values:
            upgrade_cmd += f"--values '{values_file}' "

        # Apply any augmentations.
        if self.augmentations is not None:
            for aug_name in self.augmentations:
                self.console.log(f"[cyan]Enabling augmentation {aug_name}")
                upgrade_cmd += f"--set augmentation.{aug_name}.enabled=true "

        # Run the `helm upgrade` command.
        self.console.log("[cyan]Running helm upgrade")
        return_code, out, err = self.run_helm_upgrade(upgrade_cmd)
        if return_code > 0:
            self.print_error(
                f"Could not upgrade instance {self.instance_name}: {err}"
            )
            sys.exit(return_code)
        self.console.log(f"[bold green]{self.instance_name} upgrade complete!")

    def uninstall_instance(self) -> None:
        """
        Perform the ``helm uninstall`` command, wait for pods to
        terminate, and then delete the namespace.
        """
        self.console.log(f"[cyan]Uninstalling {self.instance_name}")

        # run helm uninstall
        self.console.log("[cyan]Running helm uninstall")
        return_code, out, err = self.run_helm_uninstall()

        if return_code != 0:
            self.console.log(
                "Helm uninstall unsuccessful, will attempt to delete the "
                "namespace anyway"
            )

        # wait for resources created by helm to terminate since helm uninstall
        # is
        # async
        timeout_seconds = self.timeout * 60
        time_waited = 0
        while (
            time_waited < timeout_seconds and return_code == 0
        ):  # pragma: no branch
            # get resources filtered by label
            return_code, out, err = self.run_kubectl_get_all_helm_resources()

            # check the count of lines returned
            if len(out.splitlines()) == 0:
                break

            if time_waited % 15 == 0:  # pragma: no branch
                # print a message every 15 seconds noting that we are waiting
                self.console.log(
                    f"Waiting for helm resources to terminate, "
                    f"{len(out.splitlines())} resources remaining"
                )

            time.sleep(1)
            time_waited += 1

            if time_waited >= timeout_seconds:  # pragma: no coverage
                self.print_warning(
                    "Timed out waiting for helm resources to terminate, "
                    "attempting to delete the namespace anyway"
                )

        # Delete the namespace
        self.console.log("[cyan]Deleting namespace")
        return_code, out, err = self.run_kubectl_delete_namespace()

        if return_code == 0:
            self.console.log(
                f"[bold green]{self.instance_name} uninstall complete!"
            )
        else:
            self.print_error(
                f"{self.instance_name} uninstall unsuccessful, "
                "please review errors/warnings above"
            )

    def reconfigure_instance(self) -> None:
        """
        Reconfigure the instance:  run a reduced data-load, and then
        ``rollout restart`` deployments that require it.
        """
        self.console.log(f"[cyan]Reconfiguring {self.instance_name}")

        # get instance istio status
        self.console.log("Getting instance istio status")
        self.is_istio = self.is_instance_istio()
        self.console.log(f"Instance istio status: {self.is_istio}")

        # get the ingress port
        self.console.log("Getting ingress port")
        port = self.get_ingress_port()
        self.console.log(f"Ingress port: {port}")

        self.console.log("[cyan]Beginning data load")
        if not self.request_dataload(
            base_domain=self.get_base_domain(),
            endpoint="reload",
            port=port
        ):
            self.print_error(
                "Data load failed to execute successfully, Exiting"
            )
            sys.exit(1)

        # restart deployments with restartAfterReconfig label
        self.console.log("[cyan]Rollout restart deployments")
        self.console.log(
            "Getting list of deployments with label "
            "`restartAfterReconfig=true`"
        )
        return_code, out, err = (
            self.run_kubectl_get_deployments_restart_after_reconfig()
        )

        if return_code > 0:
            self.print_error(
                f"Unable to get list of deployment requiring restart: {err}"
            )
            sys.exit(return_code)

        # rollout restart each deployment
        deployments_data = json.loads(out)
        for deployment in deployments_data["items"]:
            self.console.log(
                f"Restarting deployment {deployment['metadata']['name']}"
            )
            self.run_kubectl_rollout_restart(
                f"deployment {deployment['metadata']['name']}"
            )

        self.console.log(
            f"[bold green]{self.instance_name} reconfig complete!"
        )

    def list_instances(self) -> None:
        """
        List the installed instances.
        """

        # Get all the Helm instances.
        return_code, out, err = self.run_helm_list()
        if return_code > 0:
            self.print_error(f"Could not list instances: {err}")
            sys.exit(return_code)
        instances = json.loads(out)

        # Get all `gms` ConfigMaps.
        return_code, out, err = (
            self.run_kubectl_get_configmap_all_namespaces("gms")
        )
        if return_code != 0:
            self.print_error(
                f"Unable to get gms configmap from all namespaces: {err}"
            )
            sys.exit(return_code)
        all_gms_configmaps = json.loads(out)

        # Check if the given instance name isn't in the list.
        if (
            self.instance_name is not None
            and all(i["name"] != self.instance_name for i in instances)
        ):
            self.print_error(
                f"Instance name `{self.instance_name}` does not exist."
            )
            sys.exit(1)

        # Loop through each of the Helm instances.
        table = Table(
            "NAME",
            "STATUS",
            "TYPE",
            "USER",
            "UPDATED",
            "TAG",
            box=box.SIMPLE,
            expand=False,
            pad_edge=False,
            show_edge=False
        )
        for instance in instances:
            labels = self.get_labels_for_list(instance, all_gms_configmaps)
            if self.filter_list(instance, labels):
                continue
            table.add_row(
                instance["name"],
                instance["status"],
                labels.get("gms/type", "?"),
                labels.get("gms/user", "?"),
                labels.get("gms/update-time", "?"),
                labels.get("gms/image-tag", "?"),
            )  # yapf: disable
        columns = os.getenv("COLUMNS")
        os.environ["COLUMNS"] = "1000"
        self.console.print(table)
        if columns is not None:
            os.environ["COLUMNS"] = columns

    @staticmethod
    def get_labels_for_list(
        instance: dict[str, str],
        configmaps: dict[str, str]
    ) -> dict[str, str]:  # yapf: disable
        """
        Get the labels for the given instance.

        Args:
            instance:  The instance JSON data.
            configmaps:  The key-value pairs from all the ConfigMaps.

        Returns:
            The instance labels.
        """
        gmslabels = (
            item["metadata"]["labels"]
            for item in configmaps["items"]
            if item["metadata"]["labels"]["gms/name"] == instance["name"]
        )
        return next(gmslabels, {})  # pragma: no branch

    def filter_list(
        self,
        instance: dict[str, str],
        labels: dict[str, str]
    ) -> bool:  # yapf: disable
        """
        Filter the table of instances according to these criteria:

        * We only want to see instances with ``gms`` labels, unless the
          ``--all`` flag is specified.
        * If the instance name is specified, only show that row of the
          table.
        * If ``--user`` is specified, only show instances created by
          that user.
        * If ``--type`` is specified, only show instances of that type.

        Args:
            instance:  The instance JSON data.
            labels:  Any labels on the instance.

        Returns:
            Whether to filter the current ``instance`` from the table.
        """
        return (
            not self.show_all
            and not labels
            or (
                self.instance_name is not None
                and instance["name"] != self.instance_name
            )
            or (
                self.username is not None
                and labels.get("gms/user", "?") != self.username
            )
            or (
                self.instance_type is not None
                and labels.get("gms/type", "?") != self.instance_type
            )
        )  # yapf: disable

    def list_ingress_routes(self) -> None:
        """
        List the ingress routes for an instance.
        """

        # get instance istio status
        self.is_istio = self.is_instance_istio()

        # get the ingress port
        port = self.get_ingress_port()

        # column format
        col_format = "%-60s   %-70s"

        # Setup the header
        if self.service is None:
            print(col_format % ("SERVICE", "URL"))
            print(col_format % ("-------", "---"))

        if self.is_istio:
            data = self.get_ingress_data("virtualservice")
            # loop through the virtualservice data
            for vs in data["items"]:
                host = f"https://{vs['spec']['hosts'][0]}:{port}"
                name = vs["metadata"]["name"]
                for http in vs["spec"]["http"]:
                    for match in http["match"]:
                        try:
                            path = match["uri"]["prefix"].lstrip("/")
                            url = f"{host}/{path}"

                            if self.service is None:
                                print(col_format % (name, url))
                            elif name == self.service:
                                print(url)
                                return
                        except KeyError:
                            # if there is no uri/prefix then just ignore it
                            continue
        else:
            data = self.get_ingress_data("ingress")
            # loop through the ingress data
            for ingress in data["items"]:
                for rule in ingress["spec"]["rules"]:
                    host = f"https://{rule['host']}:{port}"
                    for path in rule["http"]["paths"]:
                        name = path["backend"]["service"]["name"]
                        url = f"{host}{path['path']}"

                        if self.service is None:
                            print(col_format % (name, url))
                        elif name == self.service:
                            print(url)

    def get_ingress_data(self, resource: str) -> dict[str, str]:
        """
        Get the JSON data for the given resource.

        Args:
            resource:  The resource type (either ``"ingress"`` or
                ``"virtualservice"``).

        Returns:
            The ingress details.
        """
        return_code, out, _ = self.run_kubectl_get(
            namespace=self.instance_name,
            resource_type=resource,
            resource_name="",
        )
        if return_code != 0:  # pragma: no coverage
            self.print_error(f"Unable to get {resource} details.")
            sys.exit(return_code)
        return json.loads(out)

    def apply_augmentation(self) -> None:
        """
        Apply an augmentation to a standing instance.
        """
        try:
            self.console.log(
                f"[cyan]Applying augmentation `{self.augmentation_name}` to "
                f"instance `{self.instance_name}`."
            )
            if self.sets is None:
                self.sets = []

            # sets should be in the context of the augmentation application,
            # so append the right scope
            for i in range(len(self.sets)):
                self.sets[i] = (
                    f"augmentation.{self.augmentation_name}.{self.sets[i]}"
                )
            self.augmentations = [self.augmentation_name]
            self.upgrade_instance()
        except Exception as e:
            self.print_error(
                f"Failed to apply augmentation `{self.augmentation_name}` to "
                f"instance `{self.instance_name}`:  {e}"
            )
            sys.exit(1)
        self.console.log(
            f"[bold green]Augmentation '{self.augmentation_name}' "
            f"successfully applied to {self.instance_name}"
        )

    def delete_augmentation(self) -> None:
        """
        Delete an augmentation from a standing instance.
        """
        try:
            self.console.log(
                f"[cyan]Deleting augmentation `{self.augmentation_name}` from "
                f"instance `{self.instance_name}`."
            )
            self.sets = [
                f"augmentation.{self.augmentation_name}.enabled=false"
            ]
            self.upgrade_instance()

        except Exception as e:
            self.print_error(
                f"Failed to delete augmentation `{self.augmentation_name}` "
                f"from instance `{self.instance_name}`:  {e}"
            )
            sys.exit(1)

        self.console.log(
            f"[bold green]Augmentation `{self.augmentation_name}` "
            f"successfully deleted from instance `{self.instance_name}`."
        )

    def list_augmentations(self) -> None:
        """
        Display a table of the augmentations available to be applied to
        an instance.
        """
        augmentations = []
        with open(self.deploy_dir / "augmentation/values.yaml", "r") as file:
            aug_values = yaml.safe_load(file)
        for key, value in aug_values.items():
            with contextlib.suppress(KeyError, TypeError):
                metadata = value["metadata"]
                aug = {
                    "name": key,
                    "type": metadata.get("type", "none"),
                    "labels": metadata.get("labels", []),
                    "wait": metadata.get("wait", ""),
                    "description": metadata.get("description", "")
                }  # yapf: disable
                augmentations.append(aug)
        col_format = "%-48s   %-8s   %-23s  %-50s"
        print(col_format % ("NAME", "TYPE", "LABELS", "DESCRIPTION"))
        print(col_format % ("----", "----", "------", "-----------"))
        for a in sorted(augmentations, key=itemgetter("type")):
            print(
                col_format % (
                    a["name"],
                    a["type"],
                    ",".join(a.get("labels", [])),
                    a["description"]
                )
            )  # yapf: disable

    def get_kubernetes_version(self) -> None:
        """
        Get the version of the Kubernetes cluster API and set the
        ``PATH`` appropriately.
        """
        return_code, out, err = self.run_kubectl_version()
        if return_code != 0:
            self.print_error(
                "Unable to connect to the kubernetes cluster "
                "to determine version.\n"
                f"Message: {err}\n\n"
                f"Possible things to check:\n"
                f"    - You are connecting to the correct cluster.\n"
                f"    - Your kube config file credentials are valid.\n"
                f"    - Run `kubectl get nodes` and check for error messages."
            )
            sys.exit(return_code)
        version_data = json.loads(out)
        majorVersion = version_data["serverVersion"]["major"]
        minorVersion = version_data["serverVersion"]["minor"]
        kubernetesVersion = f"{majorVersion}.{minorVersion}"
        logging.debug(f"Kubernetes API version: {kubernetesVersion}")
        helmVersion = None
        if kubernetesVersion == "1.20":
            helmVersion = "3.8"
        elif kubernetesVersion in ["1.24", "1.25", "1.26"]:
            helmVersion = "3.12"
        else:
            self.print_error(
                "Only kubernetes versions 1.20 and 1.24-1.26 are supported. "
                f"Version {kubernetesVersion} detected."
            )
            sys.exit(1)

        # The dockerfile must have the correct versions in /opt
        os.environ["PATH"] = (
            f"/opt/kubectl_{kubernetesVersion}:/opt/helm_{helmVersion}:"
            f"{os.getenv('PATH')}"
        )

    def request_dataload(
        self,
        base_domain: str,
        endpoint: str = "load",
        port: int = 443
    ) -> bool:
        """
        Send a HTTP request to the ``config-loader`` initiate a
        data-load.

        Args:
            base_domain:  The fully-qualified domain name of the
                Kubernetes cluster where the ``config-loader`` service
                is running.
            endpoint:  The HTTP service target endpoint.
            port:  The port for making the HTTPS request to the
                ``config-loader``.

        Returns:
            ``True`` if the data-load was successful; ``False``
            otherwise.
        """
        timeout_seconds = self.timeout * 60

        # check if config-loader service exists in the instance
        return_code, out, err = self.run_kubectl_get(
            namespace=self.instance_name,
            resource_type="service",
            resource_name="config-loader"
        )
        if return_code > 0:
            self.console.log(
                "config-loader service does not exist, skipping data load"
            )
            return True

        try:
            retry_strategy = Retry(
                total=20,
                backoff_factor=0.2,
                status_forcelist=[404],
                allowed_methods=["POST", "GET"]
            )  # yapf: disable
            adapter = HTTPAdapter(max_retries=retry_strategy)
            http = requests.Session()
            http.mount("https://", adapter)

            # format the url - must be https on kube cluster, and the requests
            # CA
            # bundle env var must be set
            config_loader_url = (
                f"https://{self.instance_name}.{base_domain}:{port}/"
                "config-loader"
            )

            if self.config_override_path is not None:
                override_file = self.get_override_tar_file()
                if override_file is None:
                    self.print_error(
                        "Unable to create tar file from user supplied "
                        "overrides"
                    )
                    sys.exit(1)
                files = {"files": override_file}
            else:
                files = None

            self.console.log("Waiting for config loader to be alive")
            time_waited = 0
            while time_waited < timeout_seconds:
                post_response = http.get(
                    f"{config_loader_url}/alive",
                    allow_redirects=False
                )

                if post_response.status_code == 200:
                    break

                if time_waited % 30 == 0:  # pragma: no branch
                    # print a message every 30 seconds noting that we are
                    # waiting.
                    self.console.log("Waiting for config loader to be alive")

                time.sleep(1)
                time_waited += 1

                if time_waited >= timeout_seconds:  # pragma: no branch
                    self.print_warning(
                        "Timed out waiting for config loader to be alive, "
                        "will attempt data load anyway"
                    )

            self.console.log("Requesting data load")
            post_response = http.post(
                f"{config_loader_url}/{endpoint}",
                files=files
            )

            if post_response.status_code != 200:
                self.print_error(
                    "Failed to initiate a data load. "
                    f"{post_response.status_code}: {post_response.reason}"
                )
                sys.exit(1)

            # Wait for results from the config-loader service
            response_json = None
            time_waited = 0
            while time_waited < timeout_seconds:  # pragma: no branch
                time.sleep(1)
                time_waited += 1

                get_response = http.get(f"{config_loader_url}/result")
                if get_response.status_code != 200:
                    self.print_warning(
                        "Status code from result endpoint was unexpected: "
                        f"{get_response.status_code}"
                    )
                    continue

                try:
                    response_json = get_response.json()
                    # print out the chunks of the partial config-loader log
                    if partial_result := response_json["partial_result"]:
                        self.console.log(partial_result.strip())
                    if response_json["status"] == "FINISHED":
                        break
                except json.decoder.JSONDecodeError:
                    self.print_warning(
                        "Unable to convert response to json: "
                        f"'{get_response.text}'"
                    )

            if response_json is None:
                self.print_error("Data load response status is unknown")
                sys.exit(1)
            elif response_json["status"] != "FINISHED":
                self.print_error(
                    f"Timed out waiting for data load after {self.timeout} "
                    "minutes, Exiting"
                )
                sys.exit(1)
            elif response_json["successful"]:
                self.console.log("Data load successfully completed")
                return True
            else:
                self.print_error(
                    "Data load failed to execute successfully, Exiting"
                )
                sys.exit(1)

        except Exception as e:
            self.print_error(e)
            sys.exit(1)

    def get_override_tar_file(self) -> str:
        """
        Create a tar file from the input ``--config`` directory.
        """
        buffered_tarfile = None
        try:
            filelist = []
            dirlist = [
                f"{self.config_override_path}/processing",
                f"{self.config_override_path}/station-reference/stationdata",
                f"{self.config_override_path}/station-reference/definitions",
                f"{self.config_override_path}/user-preferences"
            ]
            for override_dir in dirlist:
                if os.path.exists(override_dir):
                    for root, dirs, files in os.walk(override_dir):
                        for name in files:
                            fullpathfilename = os.path.join(root, name)
                            subpathfilename = os.path.relpath(
                                fullpathfilename,
                                self.config_override_path
                            )
                            filelist.append(subpathfilename)

            # Change to the config override directory
            os.chdir(self.config_override_path)

            # Create the tar file
            fh = io.BytesIO()
            with tarfile.open(fileobj=fh, mode="w:gz") as tar:
                for file in filelist:
                    # ignore any filenames that start with "."
                    if not file.startswith("."):
                        tar.add(file)
            buffered_tarfile = fh.getbuffer()
        except Exception as ex:
            self.print_error(ex)
        return buffered_tarfile

    def get_docker_registry(self) -> str:
        """
        Get the docker registry for images

        Returns:
            The docker registry.
        """
        # This is a raging hack to satisfy Fortify because it will
        # complain if the value is taken directly from the env var. So
        # write the env var to a stream, then read it back. Much Security!
        with io.StringIO() as mem_stream:
            mem_stream.write(f"{os.getenv('CI_DOCKER_REGISTRY')}")
            return mem_stream.getvalue()

    def get_base_domain(self) -> str:
        """
        Get the base domain for ingress routes.

        Returns:
            The base domain.
        """
        config = self.get_ingress_ports_config()
        try:
            return config["base_domain"]
        except KeyError:
            self.print_error(
                "`base_domain` is not configured in the "
                "`ingress-ports-config` ConfigMap in the `gms` namespace."
            )
            sys.exit(1)

    def get_ingress_port(self) -> str:
        """
        Gets the port for ingress depending on if Istio is enabled or
        the port override argument is given.

        Returns:
            The port number.
        """
        if self.ingress_port is not None:
            return self.ingress_port
        config = self.get_ingress_ports_config()
        return config["istio_port"] if self.is_istio else config["nginx_port"]

    def get_ingress_ports_config(self) -> dict[str, str]:
        """
        Get the values from the ``ingress-ports-config`` ConfigMap in
        the ``gms`` namespace.

        Returns:
            The key-value pairs representing the ConfigMap data.
        """
        return_code, out, err = (
            self.run_kubectl_get(
                namespace="gms",
                resource_type="configmap",
                resource_name="ingress-ports-config"
            )
        )
        if return_code != 0:  # pragma: no coverage
            self.print_error(
                "Unable to get gms configmap ingress-ports-config"
            )
            sys.exit(return_code)
        config = json.loads(out)
        return config["data"]

    def get_rancher_project_id(self) -> str | None:
        """
        Get the values from the ``rancher-project-config`` ConfigMap in
        the ``gms`` namespace, and retrieve the project ID.

        Returns:
            The Rancher project ID, if found, or ``None`` otherwise.
        """
        return_code, out, err = (
            self.run_kubectl_get(
                namespace="gms",
                resource_type="configmap",
                resource_name="rancher-project-config"
            )
        )
        if return_code != 0:
            logging.debug("ConfigMap `gms/rancher-project-config` not found.")
            return None
        config = json.loads(out)
        return config["data"]["id"]

    def is_instance_istio(self) -> bool:
        """
        Determine if the namespace has Istio enabled.

        Returns:
            ``True`` if the namespace has the
            ``istio-injection=enabled`` label; ``False`` otherwise.
        """
        return_code, out, err = self.run_kubectl_get(
            namespace=self.instance_name,
            resource_type="namespace",
            resource_name=self.instance_name
        )
        if return_code != 0:
            self.print_error("Unable to get namespace details")
            sys.exit(return_code)
        data = json.loads(out)
        try:
            return data["metadata"]["labels"]["istio-injection"] == "enabled"
        except KeyError:
            return False

    def get_instance_labels(self) -> dict[str, str]:
        """
        Gets the labels from the ``gms`` ConfigMap for the instance.

        Returns:
            The key-value pairs representing the labels.
        """
        return_code, out, err = self.run_kubectl_get(
            namespace=self.instance_name,
            resource_type="configmap",
            resource_name="gms"
        )
        if return_code != 0:
            self.print_error(
                "Unable to get the `gms` ConfigMap for instance "
                f"`{self.instance_name}`:  {err}"
            )
            return {}
        data = json.loads(out)
        logging.debug(
            f"Labels for ConfigMap `gms` in Namespace `{self.instance_name}`:"
        )
        logging.debug(data["metadata"]["labels"])
        return data["metadata"]["labels"]

    def create_namespace(self) -> None:
        """
        Create a new Kubernetes namespace for the instance.  Add the
        Istio label and Rancher project annotations, if applicable.

        Raises:
            SystemExit:  If there's a failure in either creating,
                labeling, or annotating the namespace.
        """
        return_code, out, err = self.run_kubectl_create_namespace()
        if return_code > 0:
            sys.exit(return_code)

        # standard labels
        labels = (
            f"app.kubernetes.io/instance={self.instance_name} "
            f"app.kubernetes.io/name={self.instance_type} "
            f"app.kubernetes.io/part-of={self.instance_type} "
            "pod-security.kubernetes.io/enforce=privileged "
            "pod-security.kubernetes.io/enforce-version=v1.25 "
            "pod-security.kubernetes.io/audit=privileged "
            "pod-security.kubernetes.io/audit-version=v1.25 "
            "pod-security.kubernetes.io/warn=privileged "
            "pod-security.kubernetes.io/warn-version=v1.25 "
        )
        if self.is_istio:
            self.console.log("Adding `istio-injection=enabled` label.")
            labels += "istio-injection=enabled "

        return_code, out, err = self.run_kubectl_label_namespace(labels)
        if return_code > 0:
            sys.exit(return_code)

        rancher_project_id = self.get_rancher_project_id()
        if rancher_project_id is not None:
            self.console.log("Adding rancher project annotation")
            return_code, out, err = self.run_kubectl_annotate_namespace(
                f"field.cattle.io/projectId='{rancher_project_id}'"
            )
            if return_code > 0:
                sys.exit(return_code)

    def run_command(
        self,
        command: str,
        cwd: str | None = None,
        print_output: bool = True
    ) -> tuple[int, str, str]:  # yapf: disable
        """
        Execute the given command in the underlying shell.

        command:  The command string to execute.
        cwd:  The directory in which to run the command.  ``None`` means
            the current working directory.
        print_output:  Whether to print the ``stdout`` and ``stderr``
            from the command.

        Returns:
            A tuple of the return code, ``stdout`` string, and
            ``stderr`` string.
        """
        logging.debug(f"Running command: {command}")
        result = subprocess.run(
            command,
            capture_output=True,
            cwd=cwd,
            shell=True,
            text=True
        )
        if print_output:
            self.console.log(result.stdout)
            if len(result.stderr) > 0:
                self.print_warning(result.stderr)
        return result.returncode, result.stdout, result.stderr

    def print_warning(self, message: str) -> None:
        """
        Print a warning message in bold yellow.

        Args:
            message:  The message to print.
        """
        self.console.log(fr"[bold yellow]\[WARNING] {message}")

    def print_error(self, message: str) -> None:
        """
        Print an error message in bold red.

        Args:
            message:  The message to print.
        """
        self.console.log(fr"[bold red]\[ERROR] {message}")

    def run_helm_list(self) -> tuple[int, str, str]:  # pragma: no coverage
        return self.run_command(
            "helm list --all --all-namespaces --output json",
            cwd=self.deploy_dir,
            print_output=False
        )

    def run_helm_install(
        self,
        command: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            command,
            cwd=self.deploy_dir,
            print_output=True
        )

    def run_helm_get_values(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"helm get values {self.instance_name} --all --namespace "
            f"{self.instance_name}",
            cwd=self.deploy_dir,
            print_output=False
        )

    def run_helm_uninstall(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"helm uninstall {self.instance_name} --namespace "
            f"{self.instance_name}",
            cwd=self.deploy_dir,
            print_output=True
        )

    def run_helm_upgrade(
        self,
        command: str | list[str]
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            command,
            cwd=self.deploy_dir,
            print_output=True
        )

    def run_kubectl_label_namespace(
        self,
        labels: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        """
        Apply one or more labels to a namespace.

        Args:
            labels:  A space-delimited string of labels to apply.
        """
        return self.run_command(
            f"kubectl label namespace {self.instance_name} {labels}",
            print_output=True
        )

    def run_kubectl_annotate_namespace(
        self,
        annotation: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl annotate namespace {self.instance_name} {annotation}",
            print_output=True
        )

    def run_kubectl_create_namespace(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl create namespace {self.instance_name}",
            print_output=True
        )

    def run_kubectl_delete_namespace(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl delete namespace {self.instance_name}",
            print_output=True
        )

    def run_kubectl_rollout_restart(
        self,
        resource: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl rollout restart {resource} --namespace "
            f"{self.instance_name}",
            print_output=True
        )

    def run_kubectl_get(
        self,
        namespace: str,
        resource_type: str,
        resource_name: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl --namespace {namespace} get {resource_type} "
            f"{resource_name} --output json",
            print_output=False
        )

    def run_kubectl_get_configmap_all_namespaces(
        self,
        configmap_name: str
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        # must use --field-selector with --all-namespaces to get
        # configmaps by name
        return self.run_command(
            "kubectl get configmap --all-namespaces --field-selector "
            f"metadata.name=={configmap_name} --output json",
            print_output=False
        )

    def run_kubectl_get_deployments_restart_after_reconfig(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl get deployment --selector restartAfterReconfig=true "
            f"--namespace {self.instance_name} --output json",
            print_output=False
        )

    def run_kubectl_get_all_helm_resources(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        return self.run_command(
            f"kubectl get daemonset,deployment,replicaset,statefulset,pvc "
            f"--no-headers --selector='app.kubernetes.io/managed-by==Helm' "
            f"--output name --namespace {self.instance_name}",
            print_output=False
        )

    def run_kubectl_version(
        self
    ) -> tuple[int, str, str]:  # pragma: no coverage; yapf: disable
        # note this runs whatever kubectl is in the path
        return self.run_command(
            "kubectl version --output json",
            print_output=False
        )


def get_parser() -> ArgumentParser:
    """
    Needed to allow us to use ``shtab`` to generation the bash
    completion file for this script by running ``shtab
    gmskube.gmskube.get_parser > bash_completion`` in the
    ``python/gmskube`` directory.
    """
    return GMSKube().parser


def handler(
    signal_received: int,
    frame: FrameType
) -> None:  # pragma: no coverage
    sys.exit(0)


if __name__ == "__main__":  # pragma: no coverage
    signal(SIGINT, handler)
    gmskube = GMSKube()
    gmskube.main(sys.argv[1:])
