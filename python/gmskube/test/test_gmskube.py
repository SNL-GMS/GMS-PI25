import os
import shlex
from argparse import ArgumentTypeError, Namespace
from json.decoder import JSONDecodeError
from unittest.mock import MagicMock, mock_open, patch

import pytest
from rich.console import Console

from python.gmskube import GMSKube
from get_test_resources import (
    get_config_overrides_path,
    get_request_response,
    get_test_custom_chart_path,
    get_test_file_contents,
)


@pytest.fixture()
def gmskube() -> GMSKube:
    gmskube = GMSKube()
    gmskube.console = Console(log_time=False, log_path=False)
    return gmskube


@patch("python.gmskube.GMSKube.get_kubernetes_version")
@patch("os.chmod")
@patch("builtins.open", new_callable=mock_open)
@patch("logging.basicConfig")
@patch("argparse.ArgumentParser.parse_args")
def test_main(
    mock_parse_args: MagicMock,
    mock_basicConfig: MagicMock,
    mock_open: MagicMock,
    mock_chmod: MagicMock,
    mock_get_kubernetes_version: MagicMock,
    monkeypatch,
    gmskube: GMSKube
) -> None:
    mock_parse_args.return_value = Namespace(
        verbose="DEBUG",
        command=(lambda *args: None)
    )
    mock_basicConfig.return_value = None
    mock_chmod.return_value = None
    mock_get_kubernetes_version.return_value = None
    monkeypatch.setenv("KUBECTL_CONTEXT", "test")
    monkeypatch.delenv("REQUEST_CA_BUNDLE", raising=False)
    gmskube.main([])


def test_main_no_command(
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    with pytest.raises(SystemExit):
        gmskube.main([])
    stdout, _ = capsys.readouterr()
    for line in [
        "usage: gmskube [-h]",
        "The `gmskube` command-line program",
        "Before you can run `gmskube`",
    ]:
        assert line in stdout


@pytest.mark.parametrize(
    "name, exception",
    [("Te$t",
      ArgumentTypeError),
     ("",
      SystemExit)]
)
def test_parse_args_name_invalid(
    name: str,
    exception: Exception,
    gmskube: GMSKube
) -> None:
    with pytest.raises(exception):
        gmskube.parse_args(
            shlex.split(f"install --tag develop --type ian {name}")
        )


# ----- Uninstall tests
@patch("python.gmskube.GMSKube.run_kubectl_delete_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_get_all_helm_resources")
@patch("python.gmskube.GMSKube.run_helm_uninstall")
def test_uninstall_success(
    mock_run_helm_uninstall: MagicMock,
    mock_run_kubectl_get_all_helm_resources: MagicMock,
    mock_run_kubectl_delete_namespace: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_uninstall.return_value = (0, "", "")
    mock_run_kubectl_get_all_helm_resources.return_value = (0, "", "")
    mock_run_kubectl_delete_namespace.return_value = (0, "", "")
    gmskube.parse_args(shlex.split("uninstall test --timeout 4"))
    gmskube.uninstall_instance()
    stdout, _ = capsys.readouterr()
    for line in [
        "Uninstalling test",
        "Running helm uninstall",
        "Deleting namespace",
        "test uninstall complete",
    ]:
        assert line in stdout


@patch("python.gmskube.GMSKube.run_kubectl_delete_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_get_all_helm_resources")
@patch("python.gmskube.GMSKube.run_helm_uninstall")
def test_uninstall_helm_uninstall_fail(
    mock_run_helm_uninstall: MagicMock,
    mock_run_kubectl_get_all_helm_resources: MagicMock,
    mock_run_kubectl_delete_namespace: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_uninstall.return_value = (1, "", "")
    mock_run_kubectl_get_all_helm_resources.return_value = (0, "", "")
    mock_run_kubectl_delete_namespace.return_value = (0, "", "")
    gmskube.parse_args(shlex.split("uninstall test --timeout 4"))
    gmskube.uninstall_instance()
    stdout, _ = capsys.readouterr()
    expected = [
        "Helm uninstall unsuccessful, will attempt to delete the namespace "
        "anyway",
        "Deleting namespace",
        "test uninstall complete"
    ]
    for line in expected:
        for word in line.split():
            assert word in stdout


@patch("python.gmskube.GMSKube.run_kubectl_delete_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_get_all_helm_resources")
@patch("python.gmskube.GMSKube.run_helm_uninstall")
def test_uninstall_namespace_delete_fail(
    mock_run_helm_uninstall: MagicMock,
    mock_run_kubectl_get_all_helm_resources: MagicMock,
    mock_run_kubectl_delete_namespace: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_uninstall.return_value = (0, "", "")
    mock_run_kubectl_get_all_helm_resources.return_value = (0, "", "")
    mock_run_kubectl_delete_namespace.return_value = (1, "", "")
    gmskube.parse_args(shlex.split("uninstall test --timeout 4"))
    gmskube.uninstall_instance()
    stdout, _ = capsys.readouterr()
    expected = (
        "test uninstall unsuccessful, please review errors/warnings above"
    )
    for word in expected.split():
        assert word in stdout
    assert "test uninstall complete" not in stdout


# ----- Install tests
@patch("python.gmskube.GMSKube.apply_augmentation")
@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_custom_chart(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_request_dataload: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_get_base_domain: MagicMock,
    mock_apply_augmentation: MagicMock,
    gmskube: GMSKube
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (0, "", "")
    mock_request_dataload.return_value = True
    mock_get_ingress_port.return_value = "443"
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_apply_augmentation.return_value = None
    gmskube.parse_args(
        shlex.split(
            "install "
            f"--chart {get_test_custom_chart_path()} "
            "--no-istio "
            "--set name=value "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.install_instance()


@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_dry_run(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_request_dataload: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_get_base_domain: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (0, "", "")
    mock_request_dataload.return_value = True
    mock_get_ingress_port.return_value = "443"
    mock_get_base_domain.return_value = "test.cluster.local"
    gmskube.parse_args(
        shlex.split(
            "install "
            "--dry-run "
            "--no-istio "
            "--tag test "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.install_instance()
    stdout, _ = capsys.readouterr()
    assert "Setting up namespace test" not in stdout
    assert "test installed successfully" not in stdout


@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.run_kubectl_label_namespace")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_istio(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_request_dataload: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_run_kubectl_label_namespace: MagicMock,
    mock_get_base_domain: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (0, "", "")
    mock_request_dataload.return_value = True
    mock_get_ingress_port.return_value = "8443"
    mock_run_kubectl_label_namespace.return_value = (0, "", "")
    mock_get_base_domain.return_value = "test.cluster.local"
    gmskube.parse_args(
        shlex.split(
            "install "
            "--istio "
            "--tag test "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.install_instance()
    stdout, _ = capsys.readouterr()
    assert "Ingress port: 8443" in stdout


@patch("python.gmskube.GMSKube.validate_augmentations")
@patch("python.gmskube.GMSKube.apply_augmentation")
@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_with_augmentations(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_request_dataload: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_get_base_domain: MagicMock,
    mock_apply_augmentation: MagicMock,
    mock_validate_augmentations: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (0, "", "")
    mock_request_dataload.return_value = True
    mock_get_ingress_port.return_value = "443"
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_apply_augmentation.return_value = None
    mock_validate_augmentations.return_value = None
    gmskube.parse_args(
        shlex.split(
            "install "
            "--augment test1 "
            "--augment test2 "
            "--no-istio "
            "--tag test "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.install_instance()
    stdout, _ = capsys.readouterr()
    assert "Enabling augmentation test1" in stdout
    assert "Enabling augmentation test2" in stdout


@patch("python.gmskube.GMSKube.validate_augmentations")
@patch("python.gmskube.GMSKube.apply_augmentation")
@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_with_augmentations_sets(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_request_dataload: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_get_base_domain: MagicMock,
    mock_apply_augmentation: MagicMock,
    mock_validate_augmentations: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (0, "", "")
    mock_request_dataload.return_value = True
    mock_get_ingress_port.return_value = "443"
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_apply_augmentation.return_value = None
    mock_validate_augmentations.return_value = None
    gmskube.parse_args(
        shlex.split(
            "install "
            "--augment test1 "
            "--augment test2 "
            "--no-istio "
            "--set name=value "
            "--tag test "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.install_instance()
    stdout, _ = capsys.readouterr()
    assert "Enabling augmentation test1" in stdout
    assert "Enabling augmentation test2" in stdout


@patch("python.gmskube.GMSKube.get_base_domain")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.run_helm_install")
@patch("python.gmskube.GMSKube.create_namespace")
def test_install_helm_install_fail(
    mock_create_namespace: MagicMock,
    mock_run_helm_install: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_get_base_domain: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_create_namespace.return_value = None
    mock_run_helm_install.return_value = (1, "", "")
    mock_get_ingress_port.return_value = "443"
    mock_get_base_domain.return_value = "test.cluster.local"
    gmskube.livedata = False
    gmskube.parse_args(
        shlex.split(
            "install "
            "--no-istio "
            "--set name=value "
            "--tag test "
            "--type ian "
            "--timeout 4 "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.install_instance()
    stdout, _ = capsys.readouterr()
    assert "Could not install instance test" in stdout
    assert "test installed successfully" not in stdout


# ----- Upgrade tests
@patch("python.gmskube.GMSKube.run_helm_upgrade")
@patch("python.gmskube.GMSKube.run_helm_get_values")
@patch("python.gmskube.GMSKube.get_instance_labels")
def test_upgrade_dry_run(
    mock_get_instance_labels: MagicMock,
    mock_run_helm_get_values: MagicMock,
    mock_run_helm_upgrade: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_instance_labels.return_value = {"gms/type": "ian"}
    mock_run_helm_get_values.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_get_values.yaml"),
        ""
    )
    mock_run_helm_upgrade.return_value = (0, "", "")
    gmskube.parse_args(
        shlex.split(
            "upgrade "
            "--dry-run "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    assert "Upgrading test" in stdout
    assert "Getting instance type" in stdout
    assert "Instance type is: ian" in stdout
    assert "Getting existing helm values" in stdout
    assert "Saving existing helm values to a temporary file" in stdout
    assert "Running helm upgrade" in stdout
    assert "test upgrade complete!" in stdout


@patch("python.gmskube.GMSKube.run_helm_upgrade")
@patch("python.gmskube.GMSKube.run_helm_get_values")
def test_upgrade_custom_chart(
    mock_run_helm_get_values: MagicMock,
    mock_run_helm_upgrade: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_get_values.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_get_values.yaml"),
        ""
    )
    mock_run_helm_upgrade.return_value = (0, "", "")
    gmskube.parse_args(
        shlex.split(
            "upgrade "
            f"--chart {get_test_custom_chart_path()} "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    assert "Instance type is: custom" in stdout


@patch("python.gmskube.GMSKube.validate_augmentations")
@patch("python.gmskube.GMSKube.run_helm_upgrade")
@patch("python.gmskube.GMSKube.run_helm_get_values")
@patch("python.gmskube.GMSKube.get_instance_labels")
def test_upgrade_with_augmentations(
    mock_get_instance_labels: MagicMock,
    mock_run_helm_get_values: MagicMock,
    mock_run_helm_upgrade: MagicMock,
    mock_validate_augmentations: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_instance_labels.return_value = {"gms/type": "ian"}
    mock_run_helm_get_values.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_get_values.yaml"),
        ""
    )
    mock_run_helm_upgrade.return_value = (0, "", "")
    mock_validate_augmentations.return_value = None
    gmskube.parse_args(
        shlex.split(
            "upgrade "
            "--augment test1 "
            "--augment test2 "
            "--set name=value "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    assert "Enabling augmentation test1" in stdout
    assert "Enabling augmentation test2" in stdout


@patch("python.gmskube.GMSKube.get_instance_labels")
def test_upgrade_get_instance_type_fail(
    mock_get_instance_labels: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_instance_labels.return_value = {"invalid": "value"}
    gmskube.parse_args(
        shlex.split("upgrade "
                    "--tag test "
                    "--timeout 4 "
                    "test")
    )
    with pytest.raises(SystemExit):
        gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    assert "Could not determine the type for instance" in stdout


@patch("python.gmskube.GMSKube.run_helm_get_values")
@patch("python.gmskube.GMSKube.get_instance_labels")
def test_upgrade_helm_get_values_fail(
    mock_get_instance_labels: MagicMock,
    mock_run_helm_get_values: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_instance_labels.return_value = {"gms/type": "ian"}
    mock_run_helm_get_values.return_value = (1, "", "helm get values failed")
    gmskube.parse_args(
        shlex.split(
            "upgrade "
            "--set name=value "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    expected = (
        "Unable to get existing values for instance test: helm get values "
        "failed"
    )
    for word in expected.split():
        assert word in stdout


@patch("python.gmskube.GMSKube.run_helm_upgrade")
@patch("python.gmskube.GMSKube.run_helm_get_values")
@patch("python.gmskube.GMSKube.get_instance_labels")
def test_upgrade_helm_upgrade_fail(
    mock_get_instance_labels: MagicMock,
    mock_run_helm_get_values: MagicMock,
    mock_run_helm_upgrade: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_instance_labels.return_value = {"gms/type": "ian"}
    mock_run_helm_get_values.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_get_values.yaml"),
        ""
    )
    mock_run_helm_upgrade.return_value = (1, "", "helm upgrade failed")
    gmskube.parse_args(
        shlex.split(
            "upgrade "
            "--set name=value "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.upgrade_instance()
    stdout, _ = capsys.readouterr()
    expected = "Could not upgrade instance test: helm upgrade failed"
    for word in expected.split():
        assert word in stdout


# ----- Reconfig tests
@patch("python.gmskube.GMSKube.run_kubectl_rollout_restart")
@patch(
    "python.gmskube.GMSKube.run_kubectl_get_deployments_restart_after_reconfig"
)
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.is_instance_istio")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.get_base_domain")
def test_reconfig(
    mock_get_base_domain: MagicMock,
    mock_request_dataload: MagicMock,
    mock_is_instance_istio: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_run_kubectl_get_deployments_restart_after_reconfig: MagicMock,
    mock_run_kubectl_rollout_restart: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_request_dataload.return_value = True
    mock_is_instance_istio.return_value = False
    mock_get_ingress_port.return_value = "443"
    mock_run_kubectl_get_deployments_restart_after_reconfig.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_deployments_restart.json"
        ),
        ""
    )
    mock_run_kubectl_rollout_restart.return_value = (0, "", "")
    gmskube.parse_args(
        shlex.split("reconfig "
                    "--config test "
                    "--timeout 4 "
                    "test")
    )
    gmskube.reconfigure_instance()
    stdout, _ = capsys.readouterr()
    expected = [
        "Reconfiguring test",
        "Getting instance istio status",
        "Instance istio status: False",
        "Getting ingress port",
        "Ingress port: 443",
        "Beginning data load",
        "Rollout restart deployments",
        "Getting list of deployments with label `restartAfterReconfig=true`",
        "Restarting deployment acei-merge-processor",
        "Restarting deployment cd11-rsdf-processor",
        "Restarting deployment da-connman",
        "test reconfig complete"
    ]
    for line in expected:
        for word in line.split():
            assert word in stdout


@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.is_instance_istio")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.get_base_domain")
def test_reconfig_dataload_fail(
    mock_get_base_domain: MagicMock,
    mock_request_dataload: MagicMock,
    mock_is_instance_istio: MagicMock,
    mock_get_ingress_port: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_request_dataload.return_value = False
    mock_is_instance_istio.return_value = False
    mock_get_ingress_port.return_value = "443"
    gmskube.parse_args(
        shlex.split("reconfig "
                    "--config test "
                    "--timeout 4 "
                    "test")
    )
    with pytest.raises(SystemExit):
        gmskube.reconfigure_instance()
    stdout, _ = capsys.readouterr()
    expected = "Data load failed to execute successfully, Exiting"
    for word in expected.split():
        assert word in stdout


@patch(
    "python.gmskube.GMSKube.run_kubectl_get_deployments_restart_after_reconfig"
)
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.is_instance_istio")
@patch("python.gmskube.GMSKube.request_dataload")
@patch("python.gmskube.GMSKube.get_base_domain")
def test_reconfig_get_deployments_restart_after_reconfig_fail(
    mock_get_base_domain: MagicMock,
    mock_request_dataload: MagicMock,
    mock_is_instance_istio: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_run_kubectl_get_deployments_restart_after_reconfig: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_base_domain.return_value = "test.cluster.local"
    mock_request_dataload.return_value = True
    mock_is_instance_istio.return_value = False
    mock_get_ingress_port.return_value = "443"
    mock_run_kubectl_get_deployments_restart_after_reconfig.return_value = (
        1,
        "",
        "get deployments restart failed"
    )
    gmskube.parse_args(
        shlex.split("reconfig "
                    "--config test "
                    "--timeout 4 "
                    "test")
    )
    with pytest.raises(SystemExit):
        gmskube.reconfigure_instance()
    stdout, _ = capsys.readouterr()
    expected = (
        "Unable to get list of deployment requiring restart: get deployments "
        "restart failed"
    )
    for word in expected.split():
        assert word in stdout


# ----- List tests
@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.console.width = 120
    gmskube.show_all = False
    gmskube.parse_args(["ls"])
    gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    assert "fleet-agent-local" not in stdout
    for line in [
        "grafana   deployed   grafana   testuser    2021-11-23T160029Z   "
        "develop",
        "logging   deployed   logging   otheruser   2021-11-24T013156Z   "
        "develop",
        "test      deployed   ian       testuser    2021-12-20T210438Z   "
        "develop"
    ]:
        assert line in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_show_all(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.console.width = 120
    gmskube.parse_args(shlex.split("ls --all"))
    gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    for line in [
        "fleet-agent-local        deployed   ?         ?           "
        "?                    ?",
        "grafana                  deployed   grafana   testuser    "
        "2021-11-23T160029Z   develop",
        "logging                  deployed   logging   otheruser   "
        "2021-11-24T013156Z   develop",
        "test                     deployed   ian       testuser    "
        "2021-12-20T210438Z   develop"
    ]:
        assert line in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_username(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.console.width = 120
    gmskube.parse_args(shlex.split("ls --user testuser"))
    gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    for instance_name in ["fleet-agent-local", "logging"]:
        assert instance_name not in stdout
    assert (
        "grafana   deployed   grafana   testuser   2021-11-23T160029Z   "
        "develop"
    ) in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_instance_type(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.console.width = 120
    gmskube.parse_args(shlex.split("ls --type logging"))
    gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    for instance_name in ["fleet-agent-local", "grafana"]:
        assert instance_name not in stdout
    assert (
        "logging   deployed   logging   otheruser   2021-11-24T013156Z   "
        "develop"
    ) in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_name(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.console.width = 120
    gmskube.parse_args(shlex.split("ls test"))
    gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    for instance_name in ["fleet-agent-local", "grafana", "logging"]:
        assert instance_name not in stdout
    assert (
        "test   deployed   ian    testuser   2021-12-20T210438Z   "
        "develop"
    ) in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_name_not_exist(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_all_namespaces.json"
        ),
        ""
    )
    gmskube.show_all = False
    gmskube.instance_name = "doesnotexist"
    with pytest.raises(SystemExit) as exitinfo:
        gmskube.list_instances()
    assert exitinfo.value.code == 1
    stdout, _ = capsys.readouterr()
    assert ("Instance name `doesnotexist` does not exist") in stdout


@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_helm_list_fail(
    mock_run_helm_list: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (1, "", "helm list failed")
    gmskube.show_all = False
    with pytest.raises(SystemExit):
        gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    assert "Could not list instances: helm list failed" in stdout


@patch("python.gmskube.GMSKube.run_kubectl_get_configmap_all_namespaces")
@patch("python.gmskube.GMSKube.run_helm_list")
def test_list_kubectl_get_configmap_all_namespaces_fail(
    mock_run_helm_list: MagicMock,
    mock_run_kubectl_get_configmap_all_namespaces: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_helm_list.return_value = (
        0,
        get_test_file_contents("cmds/run_helm_list.json"),
        ""
    )
    mock_run_kubectl_get_configmap_all_namespaces.return_value = (
        1,
        "",
        "get configmap fail"
    )
    gmskube.show_all = False
    with pytest.raises(SystemExit):
        gmskube.list_instances()
    stdout, _ = capsys.readouterr()
    expected = (
        "Unable to get gms configmap from all namespaces: get configmap fail"
    )
    for word in expected.split():
        assert word in stdout


# ----- Ingress tests
@pytest.mark.parametrize("service", [None, "test-service"])
@pytest.mark.parametrize("is_istio", [True, False])
@patch("python.gmskube.GMSKube.run_kubectl_get")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.is_instance_istio")
def test_list_ingress_routes(
    mock_is_instance_istio: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_run_kubectl_get: MagicMock,
    is_istio: bool,
    service: str | None,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_is_instance_istio.return_value = is_istio
    mock_get_ingress_port.return_value = "8443" if is_istio else "443"
    resource = "virtualservice" if is_istio else "ingress"
    mock_run_kubectl_get.return_value = (
        0,
        get_test_file_contents(f"cmds/run_kubectl_get_{resource}.json"),
        ""
    )
    gmskube.parse_args(
        shlex.split(
            "ingress "
            + ("" if service is None else f"--service {service} ")
            + "--timeout 4 test"
        )
    )  # yapf: disable
    gmskube.list_ingress_routes()
    stdout, _ = capsys.readouterr()
    if is_istio:
        if service is None:
            assert stdout.count("\n") == 18
            assert (
                "test-service" + " "*51
                + "https://test.cluster.com:8443/test-service"
            ) in stdout
            assert (
                "prometheus" + " "*53
                + "https://prometheus-test.cluster.com:8443/"
            ) in stdout
            assert (
                "reactive-interaction-gateway" + " "*35
                + "https://test.cluster.com:8443/"
                + "reactive-interaction-gateway/api/"
            ) in stdout
        else:
            assert stdout.count("\n") == 1
            assert ("https://test.cluster.com:8443/test-service") in stdout
            assert ("test-service" + " "*50) not in stdout
    elif service is None:
        assert (
            "https://test-develop.cluster.gms.domain.com:443/"
            "acei-merge-processor"
        ) in stdout
    else:
        assert stdout.count("\n") == 1
        assert (
            "https://test-develop.cluster.gms.domain.com:443/test-service"
        ) in stdout
        assert ("test-service" + " "*50) not in stdout


@pytest.mark.parametrize("is_istio", [True, False])
@patch("python.gmskube.GMSKube.run_kubectl_get")
@patch("python.gmskube.GMSKube.get_ingress_port")
@patch("python.gmskube.GMSKube.is_instance_istio")
def test_list_ingress_routes_get_virtualservice_fail(
    mock_is_instance_istio: MagicMock,
    mock_get_ingress_port: MagicMock,
    mock_run_kubectl_get: MagicMock,
    is_istio: bool,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_is_instance_istio.return_value = is_istio
    mock_get_ingress_port.return_value = "8443" if is_istio else "443"
    mock_run_kubectl_get.return_value = (1, "", "")
    gmskube.parse_args(shlex.split("ingress --timeout 4 test"))
    with pytest.raises(SystemExit):
        gmskube.list_ingress_routes()
    stdout, _ = capsys.readouterr()
    resource = "virtualservice" if is_istio else "ingress"
    assert f"Unable to get {resource} details" in stdout


# ----- Augment Apply tests
@patch("python.gmskube.GMSKube.upgrade_instance")
@patch("python.gmskube.GMSKube.validate_augmentations")
def test_apply_augmentation(
    mock_validate_augmentations: MagicMock,
    mock_upgrade_instance: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_validate_augmentations.return_value = None
    mock_upgrade_instance.return_value = None
    gmskube.parse_args(
        shlex.split(
            "augment "
            "apply "
            "--name test "
            "--set key=value "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.apply_augmentation()
    stdout, _ = capsys.readouterr()
    assert "Augmentation 'test' successfully applied to test" in stdout


@patch("python.gmskube.GMSKube.upgrade_instance")
@patch("python.gmskube.GMSKube.validate_augmentations")
def test_apply_augmentation_exception(
    mock_validate_augmentations: MagicMock,
    mock_upgrade_instance: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_validate_augmentations.return_value = None
    mock_upgrade_instance.side_effect = Exception("test exception message")
    gmskube.parse_args(
        shlex.split(
            "augment "
            "apply "
            "--name test "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.apply_augmentation()
    stdout, _ = capsys.readouterr()
    expected = (
        "Failed to apply augmentation `test` to instance `test`:  test "
        "exception message"
    )
    for word in expected.split():
        assert word in stdout


# ----- Augment Delete tests
@patch("python.gmskube.GMSKube.upgrade_instance")
@patch("python.gmskube.GMSKube.validate_augmentations")
def test_delete_augmentation(
    mock_validate_augmentations: MagicMock,
    mock_upgrade_instance: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_validate_augmentations.return_value = None
    mock_upgrade_instance.return_value = None
    gmskube.parse_args(
        shlex.split(
            "augment "
            "delete "
            "--name test "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    gmskube.delete_augmentation()
    stdout, _ = capsys.readouterr()
    assert (
        "Augmentation `test` successfully deleted from instance `test`"
    ) in stdout


@patch("python.gmskube.GMSKube.upgrade_instance")
@patch("python.gmskube.GMSKube.validate_augmentations")
def test_delete_augmentation_exception(
    mock_validate_augmentations: MagicMock,
    mock_upgrade_instance: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_validate_augmentations.return_value = None
    mock_upgrade_instance.side_effect = Exception("test exception message")
    gmskube.parse_args(
        shlex.split(
            "augment "
            "delete "
            "--name test "
            "--tag test "
            "--timeout 4 "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.delete_augmentation()
    stdout, _ = capsys.readouterr()
    expected = (
        "Failed to delete augmentation `test` from instance `test`:  test "
        "exception message"
    )
    for word in expected.split():
        assert word in stdout


# ----- Augment Catalog tests
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data=get_test_file_contents("augmentation/test_values.yaml")
)
def test_list_augmentations(
    mock_open: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    gmskube.list_augmentations()
    stdout, _ = capsys.readouterr()
    assert (
        "aug1                                               harness    "
        "ian,sb,database          my awesome augmentation"
    ) in stdout
    assert (
        "aug-missing-labels                                 "
        "harness                   "
    ) in stdout
    assert (
        "aug-missing-type                                   "
        "none       ian            "
    ) in stdout


# ----- Other function tests
# ----- get_kubernetes_version tests
@pytest.mark.parametrize(
    "test_file_version, kubectl_version, helm_version",
    [
        ("1_20", "1.20", "3.8"),
        ("1_24", "1.24", "3.12"),
        ("1_25", "1.25", "3.12"),
        ("1_26", "1.26", "3.12")
    ]
)  # yapf: disable
@patch("python.gmskube.GMSKube.run_kubectl_version")
def test_get_kubernetes_version(
    mock_run_kubectl_version: MagicMock,
    test_file_version: str,
    kubectl_version: str,
    helm_version: str,
    gmskube: GMSKube
) -> None:
    mock_run_kubectl_version.return_value = (
        0,
        get_test_file_contents(
            f"cmds/run_kubectl_version_{test_file_version}.json"
        ),
        ""
    )
    gmskube.get_kubernetes_version()
    assert f"/opt/kubectl_{kubectl_version}" in os.getenv("PATH")
    assert f"/opt/helm_{helm_version}" in os.getenv("PATH")


@patch("python.gmskube.GMSKube.run_kubectl_version")
def test_get_kubernetes_version_not_supported(
    mock_run_kubectl_version: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_version.return_value = (
        0,
        get_test_file_contents("cmds/run_kubectl_version_1_21.json"),
        ""
    )
    with pytest.raises(SystemExit):
        gmskube.get_kubernetes_version()
    stdout, _ = capsys.readouterr()
    assert "Only kubernetes versions 1.20 and 1.24-1.26 are supported" in stdout
    assert "Version 1.21" in stdout


@patch("python.gmskube.GMSKube.run_kubectl_version")
def test_get_kubernetes_version_fail(
    mock_run_kubectl_version: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_version.return_value = (
        1,
        "",
        "run kubectl version failed"
    )
    with pytest.raises(SystemExit):
        gmskube.get_kubernetes_version()
    stdout, _ = capsys.readouterr()
    assert "Unable to connect to the kubernetes cluster" in stdout
    assert "run kubectl version failed" in stdout


# ----- request_data_load tests
@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(200)
    mock_loads.return_value = {
        "status": "FINISHED",
        "successful": True,
        "partial_result": "partial dataload log",
        "result": "dataload log"
    }
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    result = gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    assert "Waiting for config loader to be alive" in stdout
    assert "Requesting data load" in stdout
    assert "partial dataload log" in stdout
    assert "Data load successfully completed" in stdout
    assert result is True


@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_kubectl_get_fail(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (1, "", "")
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    result = gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    expected = "config-loader service does not exist, skipping data load"
    for word in expected.split():
        assert word in stdout
    assert result is True


@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.get_override_tar_file")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_config_overrides(
    mock_run_kubectl_get: MagicMock,
    mock_get_override_tar_file: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get_override_tar_file.return_value = "test"
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(200)
    mock_loads.return_value = {
        "status": "FINISHED",
        "successful": True,
        "partial_result": "partial dataload log",
        "result": "dataload log"
    }
    gmskube.parse_args(
        shlex.split(
            "install "
            f"--config {get_config_overrides_path()} "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    result = gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    assert "Requesting data load" in stdout
    assert "partial dataload log" in stdout
    assert "Data load successfully completed" in stdout
    assert result is True


@patch("python.gmskube.GMSKube.get_override_tar_file")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_config_overrides_get_override_tar_file_fail(
    mock_run_kubectl_get: MagicMock,
    mock_get_override_tar_file: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get_override_tar_file.return_value = None
    gmskube.parse_args(
        shlex.split(
            "install "
            f"--config {get_config_overrides_path()} "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    expected = "Unable to create tar file from user supplied overrides"
    for word in expected.split():
        assert word in stdout


@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_alive_timeout(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(500)
    mock_post.return_value = get_request_response(200)
    mock_loads.return_value = {
        "status": "FINISHED",
        "successful": True,
        "partial_result": "partial dataload log",
        "result": "dataload log"
    }
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.timeout = 0.006
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    expected = [
        "Waiting for config loader to be alive",
        "Timed out waiting for config loader to be alive, will attempt data "
        "load anyway",
        "Data load response status is unknown"
    ]
    for line in expected:
        for word in line.split():
            assert word in stdout


@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_post_load_fail(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(500)
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    assert "Requesting data load" in stdout
    assert "Failed to initiate a data load. 500: None" in stdout


@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_result_response_unsuccessful(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(200)
    mock_loads.return_value = {
        "status": "FINISHED",
        "successful": False,
        "partial_result": "partial dataload log",
        "result": "dataload log"
    }
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    expected = "Data load failed to execute successfully, Exiting"
    for word in expected.split():
        assert word in stdout


@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_status_not_finished(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(200)
    mock_loads.return_value = {
        "status": "NOT DONE",
        "successful": True,
        "partial_result": "partial dataload log",
        "result": "dataload log"
    }
    gmskube.parse_args(
        shlex.split(
            "install "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.timeout = 0.006
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    expected = [
        "partial dataload log",
        "Timed out waiting for data load after 0.006 minutes, Exiting"
    ]
    for line in expected:
        for word in line.split():
            assert word in stdout


@patch("python.gmskube.GMSKube.get_override_tar_file")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_exception(
    mock_run_kubectl_get: MagicMock,
    mock_get_override_tar_file: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get_override_tar_file.side_effect = Exception(
        "test exception message"
    )
    gmskube.config_override_path = get_config_overrides_path()
    gmskube.parse_args(
        shlex.split(
            "install "
            f"--config {get_config_overrides_path()} "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    assert "test exception message" in stdout


@patch("json.loads")
@patch("requests.Session.post")
@patch("requests.Session.get")
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_request_dataload_json_decode_exception(
    mock_run_kubectl_get: MagicMock,
    mock_get: MagicMock,
    mock_post: MagicMock,
    mock_loads: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (0, "", "")
    mock_get.return_value = get_request_response(200)
    mock_post.return_value = get_request_response(200)
    mock_loads.side_effect = JSONDecodeError("error decoding", "dock error", 0)
    gmskube.parse_args(
        shlex.split(
            "install "
            f"--config {get_config_overrides_path()} "
            "--tag develop "
            "--timeout 4 "
            "--type ian "
            "test"
        )
    )
    gmskube.timeout = 0.001
    with pytest.raises(SystemExit):
        gmskube.request_dataload(base_domain="test.cluster.com")
    stdout, _ = capsys.readouterr()
    assert "Unable to convert response to json" in stdout
    assert "Data load response status is unknown" in stdout


# ----- get_override_tar_file tests
def test_get_override_tar_file(gmskube: GMSKube) -> None:
    gmskube.config_override_path = get_config_overrides_path()
    result = gmskube.get_override_tar_file()
    assert result is not None
    assert 200 < len(result) < 350


def test_get_override_tar_file_path_not_exists(gmskube: GMSKube) -> None:
    gmskube.config_override_path = "/tmp"
    result = gmskube.get_override_tar_file()
    assert result is not None
    assert 20 < len(result) < 60


def test_get_override_tar_file_exception(
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    gmskube.config_override_path = "/doesnotexist"
    result = gmskube.get_override_tar_file()
    stdout, _ = capsys.readouterr()
    expected = "No such file or directory: '/doesnotexist'"
    for word in expected.split():
        assert word in stdout
    assert result is None


# ----- get_ingress_port tests
@pytest.mark.parametrize("override", [True, False])
@pytest.mark.parametrize("is_istio", [True, False])
@patch("python.gmskube.GMSKube.get_ingress_ports_config")
def test_get_ingress_port(
    mock_get_ingress_ports_config: MagicMock,
    is_istio: bool,
    override: bool,
    gmskube: GMSKube
) -> None:
    mock_get_ingress_ports_config.return_value = {
        "istio_port": "8443",
        "nginx_port": "443"
    }
    gmskube.ingress_port = "9000" if override else None
    gmskube.is_istio = is_istio
    result = gmskube.get_ingress_port()
    if override:
        assert result == "9000"
    else:
        assert result == ("8443" if is_istio else "443")


# ----- get_base_domain tests
@patch("python.gmskube.GMSKube.get_ingress_ports_config")
def test_get_base_domain(
    mock_get_ingress_ports_config: MagicMock,
    gmskube: GMSKube
) -> None:
    mock_get_ingress_ports_config.return_value = {
        "base_domain": "test.gms.domain.com",
        "istio_port": "8443",
        "nginx_port": "443"
    }
    assert gmskube.get_base_domain() == "test.gms.domain.com"


@patch("python.gmskube.GMSKube.get_ingress_ports_config")
def test_get_base_domain_fail(
    mock_get_ingress_ports_config: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_get_ingress_ports_config.return_value = {
        "istio_port": "8443",
        "nginx_port": "443"
    }
    with pytest.raises(SystemExit):
        gmskube.get_base_domain()
    stdout, _ = capsys.readouterr()
    expected = (
        "`base_domain` is not configured in the gms ingress-ports-config "
        "ConfigMap"
    )
    for word in expected.split():
        assert word in stdout


# ----- get_ingress_ports_config tests
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_ingress_ports_config(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
) -> None:
    mock_run_kubectl_get.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_ingress_ports_config.json"
        ),
        ""
    )
    data = gmskube.get_ingress_ports_config()
    assert data["base_domain"] == "test.gms.domain.com"
    assert data["istio_port"] == "8443"
    assert data["nginx_port"] == "443"


@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_ingress_ports_config_kubectl_get_fail(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (1, "", "")
    with pytest.raises(SystemExit):
        gmskube.get_ingress_ports_config()
    stdout, _ = capsys.readouterr()
    expected = "Unable to get gms configmap ingress-ports-config"
    for word in expected.split():
        assert word in stdout


# ----- is_instance_istio tests
@pytest.mark.parametrize("is_istio", [True, False])
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_is_instance_istio(
    mock_run_kubectl_get: MagicMock,
    is_istio: bool,
    gmskube: GMSKube,
) -> None:
    file_name = f"run_kubectl_get_namespace{'_istio' if is_istio else ''}.json"
    mock_run_kubectl_get.return_value = (
        0,
        get_test_file_contents(f"cmds/{file_name}"),
        ""
    )
    gmskube.instance_name = "test"
    assert gmskube.is_instance_istio() is is_istio


@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_is_instance_istio_kubectl_get_fail(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (1, "", "")
    gmskube.instance_name = "test"
    with pytest.raises(SystemExit):
        gmskube.is_instance_istio()
    stdout, _ = capsys.readouterr()
    assert "Unable to get namespace details" in stdout


# ----- get_instance_labels tests
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_instance_labels(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
) -> None:
    mock_run_kubectl_get.return_value = (
        0,
        get_test_file_contents("cmds/run_kubectl_get_configmap_gms.json"),
        ""
    )
    gmskube.instance_name = "test"
    result = gmskube.get_instance_labels()
    assert result["gms/cd11-connman-port"] == "8041"
    assert result["gms/cd11-dataman-port-end"] == "8449"
    assert result["gms/cd11-dataman-port-start"] == "8100"
    assert result["gms/cd11-live-data"] == "false"
    assert result["gms/image-tag"] == "test"
    assert result["gms/name"] == "test"
    assert result["gms/namespace"] == "test"
    assert result["gms/user"] == "testuser"


@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_instance_labels_kubectl_get_fail(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_get.return_value = (1, "", "test error")
    gmskube.instance_name = "test"
    result = gmskube.get_instance_labels()
    stdout, _ = capsys.readouterr()
    assert len(result) == 0
    expected = (
        "Unable to get the `gms` ConfigMap for instance `test`: test error"
    )
    for word in expected.split():
        assert word in stdout


# ----- run_command tests
def test_run_command(gmskube: GMSKube) -> None:
    return_code, stdout, stderr = gmskube.run_command(
        "echo 'test'",
        print_output=True
    )
    assert return_code == 0
    assert stdout == "test\n"
    assert stderr == ""


def test_run_command_no_print_output(
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    command = "echo 'test'"
    return_code, stdout, stderr = gmskube.run_command(
        command,
        print_output=False
    )
    assert return_code == 0
    assert stdout == "test\n"
    assert stderr == ""
    stdout, stderr = capsys.readouterr()
    assert "test" not in stdout
    assert "test" not in stderr


def test_run_command_print_output_error(gmskube: GMSKube) -> None:
    return_code, stdout, stderr = gmskube.run_command(
        "boguscmd",
        print_output=True
    )
    assert return_code == 127
    assert stdout == ""
    assert "command not found" in stderr


# ----- print_warning tests
def test_print_warning(
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    gmskube.print_warning("test warning")
    stdout, _ = capsys.readouterr()
    assert "[WARNING] test warning" in stdout


# ----- print_error tests
def test_print_error(gmskube: GMSKube, capsys: pytest.CaptureFixture) -> None:
    gmskube.print_error("test error")
    stdout, _ = capsys.readouterr()
    assert "[ERROR] test error" in stdout


# ----- create_namespace tests
@pytest.mark.parametrize("is_istio", [True, False])
@patch("python.gmskube.GMSKube.get_rancher_project_id")
@patch("python.gmskube.GMSKube.run_kubectl_label_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_create_namespace")
def test_create_namespace_no_rancher_project(
    mock_run_kubectl_create_namespace: MagicMock,
    mock_run_kubectl_label_namespace: MagicMock,
    mock_get_rancher_project_id: MagicMock,
    is_istio: bool,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_create_namespace.return_value = (0, "", "")
    mock_run_kubectl_label_namespace.return_value = (0, "", "")
    mock_get_rancher_project_id.return_value = (None)
    gmskube.parse_args(
        shlex.split(
            "install "
            + ("--istio" if is_istio else "--no-istio")
            + " --tag develop "
            + "--timeout 4 "
            + "--type ian "
            + "test"
        )
    )  # yapf: disable
    gmskube.create_namespace()
    if is_istio:
        stdout, _ = capsys.readouterr()
        assert "Adding `istio-injection=enabled` label" in stdout


@patch("python.gmskube.GMSKube.run_kubectl_annotate_namespace")
@patch("python.gmskube.GMSKube.get_rancher_project_id")
@patch("python.gmskube.GMSKube.run_kubectl_label_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_create_namespace")
def test_create_namespace_rancher_project(
    mock_run_kubectl_create_namespace: MagicMock,
    mock_run_kubectl_label_namespace: MagicMock,
    mock_get_rancher_project_id: MagicMock,
    mock_run_kubectl_annotate_namespace: MagicMock,
    gmskube: GMSKube,
    capsys: pytest.CaptureFixture
) -> None:
    mock_run_kubectl_create_namespace.return_value = (0, "", "")
    mock_run_kubectl_label_namespace.return_value = (0, "", "")
    mock_get_rancher_project_id.return_value = ("local:abc123")
    mock_run_kubectl_annotate_namespace.return_value = (0, "", "")
    gmskube.parse_args(
        shlex.split("install --tag develop --timeout 4 --type ian test")
    )
    gmskube.create_namespace()
    stdout, _ = capsys.readouterr()
    assert "Adding rancher project annotation" in stdout


@patch("python.gmskube.GMSKube.run_kubectl_create_namespace")
def test_create_namespace_kubectl_create_namespace_fail(
    mock_run_kubectl_create_namespace: MagicMock,
    gmskube: GMSKube,
) -> None:
    mock_run_kubectl_create_namespace.return_value = (1, "", "")
    gmskube.parse_args(
        shlex.split("install --tag develop --timeout 4 --type ian test")
    )
    with pytest.raises(SystemExit):
        gmskube.create_namespace()


@patch("python.gmskube.GMSKube.run_kubectl_label_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_create_namespace")
def test_create_namespace_kubectl_label_namespace_fail(
    mock_run_kubectl_create_namespace: MagicMock,
    mock_run_kubectl_label_namespace: MagicMock,
    gmskube: GMSKube,
) -> None:
    mock_run_kubectl_create_namespace.return_value = (0, "", "")
    mock_run_kubectl_label_namespace.return_value = (1, "", "")
    gmskube.parse_args(
        shlex.split("install --tag develop --timeout 4 --type ian test")
    )
    with pytest.raises(SystemExit):
        gmskube.create_namespace()


@patch("python.gmskube.GMSKube.run_kubectl_annotate_namespace")
@patch("python.gmskube.GMSKube.get_rancher_project_id")
@patch("python.gmskube.GMSKube.run_kubectl_label_namespace")
@patch("python.gmskube.GMSKube.run_kubectl_create_namespace")
def test_create_namespace_kubectl_annotate_namespace_fail(
    mock_run_kubectl_create_namespace: MagicMock,
    mock_run_kubectl_label_namespace: MagicMock,
    mock_get_rancher_project_id: MagicMock,
    mock_run_kubectl_annotate_namespace: MagicMock,
    gmskube: GMSKube,
) -> None:
    mock_run_kubectl_create_namespace.return_value = (0, "", "")
    mock_run_kubectl_label_namespace.return_value = (0, "", "")
    mock_get_rancher_project_id.return_value = ("local:abc123")
    mock_run_kubectl_annotate_namespace.return_value = (1, "", "")
    gmskube.parse_args(
        shlex.split("install --tag develop --timeout 4 --type ian test")
    )
    with pytest.raises(SystemExit):
        gmskube.create_namespace()


# ----- get_rancher_project_id tests
@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_rancher_project_id(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube
) -> None:
    mock_run_kubectl_get.return_value = (
        0,
        get_test_file_contents(
            "cmds/run_kubectl_get_configmap_rancher_project_config.json"
        ),
        ""
    )
    assert gmskube.get_rancher_project_id() == "local:p-j5jfn"


@patch("python.gmskube.GMSKube.run_kubectl_get")
def test_get_rancher_project_id_kubectl_get_fail(
    mock_run_kubectl_get: MagicMock,
    gmskube: GMSKube
) -> None:
    mock_run_kubectl_get.return_value = (1, "", "")
    assert gmskube.get_rancher_project_id() is None


def test_validate_instance_name_pass(gmskube: GMSKube) -> None:
    gmskube.instance_name = "test-1234"
    gmskube.validate_instance_name()


def test_validate_instance_name_fail(gmskube: GMSKube) -> None:
    with pytest.raises(ArgumentTypeError):
        gmskube.instance_name = "awesome@_test"
        gmskube.validate_instance_name()


@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data=get_test_file_contents("augmentation/test_values.yaml")
)
def test_validate_augmentations_fail(
    mock_open: MagicMock,
    gmskube: GMSKube
) -> None:
    gmskube.augmentation_name = None
    gmskube.augmentations = ["invalid-augmentation-name"]
    with pytest.raises(RuntimeError):
        gmskube.validate_augmentations()
    gmskube.augmentation_name = "invalid-augmentation-name"
    gmskube.augmentations = None
    with pytest.raises(RuntimeError):
        gmskube.validate_augmentations()


@pytest.mark.parametrize(
    "augmentations",
    [
        None,
        ["aug1"],
        ["aug1", "aug-missing-labels"]
    ]
)  # yapf: disable
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data=get_test_file_contents("augmentation/test_values.yaml")
)
def test_validate_augmentations_pass(
    mock_open: MagicMock,
    augmentations: list[str] | None,
    gmskube: GMSKube
) -> None:
    gmskube.augmentation_name = None
    gmskube.augmentations = augmentations
    gmskube.validate_augmentations()
    gmskube.augmentation_name = "aug1"
    gmskube.augmentations = None
    gmskube.validate_augmentations()
