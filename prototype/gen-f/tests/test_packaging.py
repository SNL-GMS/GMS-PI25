import subprocess


def test_import():
    pass


def test_cli_program_exists_and_is_on_path():
    cproc = subprocess.run(["gen-f"], capture_output=True)
    assert "usage: gen-f " in cproc.stderr.decode("utf-8")
