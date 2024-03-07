#!/usr/bin/env python3
from argparse import _ActionsContainer, ArgumentParser, BooleanOptionalAction

from .argtypes import ArgTypes


class Parsers:
    """
    This class supplies :class:`ArgumentParser` objects that can be used
    to either add the same arguments to multiple `gmskube` subcommands,
    or to allow other scripts to use `gmskube` command line arguments.
    They can be used as follows:

    .. code-block:: python

        from gmskube import Parsers

        # Either...
        parser = ArgumentParser(
            parents=[
                Parsers.foo,
                Parsers.bar,
                Parsers.baz
            ]
        )
        parser.add_argument("--bif")
        ...

        # Or...
        parser = ArgumentParser()
        subparsers = parser.add_subparsers()
        subparser = subparsers.add_parser(
            parents=[
                Parsers.foo,
                Parsers.bar,
                Parsers.baz
            ]
        )
        subparser.add_argument("--bif")
        ...

        # Or...
        parser = ArgumentParser()
        Parsers.add_foo_args(parser)
        group = parser.add_argument_group()
        Parsers.add_bar_args(group)
        exclusive = parser.add_mutually_exclusive_group()
        Parsers.add_baz_args(exclusive)
        Parsers.add_bif_args(exclusive)
        ...
    """

    @staticmethod
    def add_augment_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--augment",
            action="append",
            help="Augmentation name to apply to the instance during install "
            "or upgrade.  Can be specified multiple times to apply multiple "
            "augmentations.  The augmentation name must be a valid "
            "augmentation found by running `gmskube augment catalog --tag "
            "<tag name>`."
        )

    augment = ArgumentParser(add_help=False)
    add_augment_args(augment)

    @staticmethod
    def add_augmentation_name_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--name",
            "-n",
            dest="augmentation_name",
            help="Name of the augmentation.  See `--list` for available names."
        )

    augmentation_name = ArgumentParser(add_help=False)
    add_augmentation_name_args(augmentation_name)

    @staticmethod
    def add_chart_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--chart",
            help="Path to a local Helm chart directory to deploy.  If not "
            "specified, the Helm chart is automatically extracted from a "
            "Docker image that contains the chart files for the branch.  Note "
            "that the directory must exist at or below the present directory "
            "(`PWD`); no `../` is allowed."
        )

    chart = ArgumentParser(add_help=False)
    add_chart_args(chart)

    @staticmethod
    def add_config_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--config",
            help="Path to a directory of configuration overrides to load into "
            "the instance."
        )

    config = ArgumentParser(add_help=False)
    add_config_args(config)

    @staticmethod
    def add_dry_run_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--dry-run",
            default=0,
            action="count",
            help="View the objects to be applied, but don't send them to the "
            "Kubernetes cluster."
        )

    dry_run = ArgumentParser(add_help=False)
    add_dry_run_args(dry_run)

    @staticmethod
    def add_istio_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--istio",
            default=True,
            action=BooleanOptionalAction,
            help="Whether to enable the Istio service mesh in the namespace."
        )

    istio = ArgumentParser(add_help=False)
    add_istio_args(istio)

    @staticmethod
    def add_name_args(container: _ActionsContainer) -> None:
        container.add_argument("name", help="The name of the instance.")

    name = ArgumentParser(add_help=False)
    add_name_args(name)

    @staticmethod
    def add_port_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--port",
            type=int,
            help="Port to access the instance from outside the cluster.  If "
            "not specified, then the value is determined using the "
            "`ingress-ports-config` configmap in the GMS namespace."
        )

    port = ArgumentParser(add_help=False)
    add_port_args(port)

    @staticmethod
    def add_set_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--set",
            dest="sets",
            type=ArgTypes.set,
            action="append",
            help="Set a value in the chart to the specified value.  May be "
            "specified multiple times for different values.  Examples:  "
            "`--set foo=bar` to set value `foo` to `bar`; `--set "
            "global.env.GLOBAL_VAR=Hello` to set the `GLOBAL_VAR` environment "
            "variable to `Hello` in all application Pods within the instance; "
            "`--set cd11-connman.env.CONNMAN_VAR=World` to set the "
            "`CONNMAN_VAR` environment var to `World` only in the "
            "`cd11-connman` app\"s Pod; `--set bastion.replicas=0` to set the "
            "`replicas` chart value in the `bastion` chart to `0`."
        )

    sets = ArgumentParser(add_help=False)
    add_set_args(sets)

    @staticmethod
    def add_set_string_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--set-string",
            dest="set_strings",
            type=ArgTypes.set,
            action="append",
            help="Similar to `--set` but forces a string value."
        )

    set_string = ArgumentParser(add_help=False)
    add_set_string_args(set_string)

    @staticmethod
    def add_tag_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--tag",
            type=ArgTypes.tag,
            help="Tag name, which corresponds to the docker tag of the "
            "images.  The value entered will automatically be transformed "
            "according to the definition of the gitlab `CI_COMMIT_REF_SLUG` "
            "variable definition (lowercase, shortened to 63 characters, and "
            "with everything except `0-9` and `a-z` replaced with `-`, no "
            "leading / trailing `-`)."
        )

    tag = ArgumentParser(add_help=False)
    add_tag_args(tag)

    @staticmethod
    def add_timeout_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--timeout",
            type=int,
            default=5,
            help="Specify the max time in minutes (integer) that `gmskube` "
            "should wait for various actions to complete."
        )

    timeout = ArgumentParser(add_help=False)
    add_timeout_args(timeout)

    @staticmethod
    def add_type_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--type",
            choices={"ian", "keycloak", "logging", "sb"},
            help="The type of instance."
        )  # yapf: disable

    types = ArgumentParser(add_help=False)
    add_type_args(types)

    @staticmethod
    def add_values_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "--values",
            action="append",
            help="Set override values in the chart using a YAML file.  The "
            "chart `values.yaml` is always included first, existing values "
            "second (for upgrade), followed by any override file(s).  This "
            "file should only include the specific values you want to "
            "override; it should not be the entire `values.yaml` from the "
            "chart.  This flag can be used multiple times to specify multiple "
            "files.  The priority will be given to the last (right-most) file "
            "specified."
        )

    values = ArgumentParser(add_help=False)
    add_values_args(values)

    @staticmethod
    def add_verbose_args(container: _ActionsContainer) -> None:
        container.add_argument(
            "-v",
            "--verbose",
            default="INFO",
            action="store_const",
            const="DEBUG",
            help="Enable debug level output."
        )

    verbose = ArgumentParser(add_help=False)
    add_verbose_args(verbose)
