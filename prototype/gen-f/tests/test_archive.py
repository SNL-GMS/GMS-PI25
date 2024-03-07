from pathlib import Path

import pytest

from genf.archive import ArchiveNotMounted, determine_non_windows_archive_path


@pytest.mark.parametrize(
    "osname,archive,expected",
    (
        ("MacOS", "responses", "/Volumes/responses"),
        ("MacOS", "/Volumes/responses", "/Volumes/responses"),
        ("MacOS", "/Volumes/foo/bar/baz/responses", "/Volumes/foo/bar/baz/responses"),
        ("MacOS", "responses", "/Volumes/XXX/Data/LOOKUP/responses"),
        ("Linux", "responses", "/mnt/responses"),
        ("Linux", "/mnt/responses", "/mnt/responses"),
        ("Linux", "/mnt/foo/bar/baz/responses", "/mnt/foo/bar/baz/responses"),
        ("Linux", "responses", "/mnt/XXX/Data/LOOKUP/responses"),
        ("MacOS", "waveform", "/Volumes/waveform/wf_2010/022"),
        ("Linux", "waveform", "/mnt/waveform/wf_2010/022"),
        ("MacOS", "/", "/path/XXX/Data/LOOKUP/responses"),
        ("Linux", "/", "/path/XXX/Data/LOOKUP/responses"),
    ),
    ids=(
        "MacOS-relative",
        "MacOS-absolute",
        "MacOS-deep-absolute",
        "MacOS-relative-deep-mount",
        "Linux-relative",
        "Linux-absolute",
        "Linux-deep-absolute",
        "Linux-relative-deep-mount",
        "MacOS-case-insensitive-filesystem",
        "Linux-case-sensitive-filesystem",
        "MacOS-root-dir-provided",
        "Linux-root-dir-provided",
    ),
)
def test_determine_non_windows_archive_path(monkeypatch, osname, archive, expected):
    monkeypatch.setattr("genf.archive.Path.exists", lambda x: True)
    if "waveform" in archive:
        db_value = "\\\\XXX\\WaveForm\\wf_2010\\022"
    else:
        db_value = "\\\\XXX\\Data\\LOOKUP\\responses"

    parents = list(Path(expected).parents)
    # set up the mounts
    if len(parents) == 2:
        # general case, just assume the archive is directly under /mnt or volumes
        mount = Path(expected)
    else:
        # deep mount
        mount = parents[-3]
    monkeypatch.setattr("genf.archive.Path.iterdir", lambda x: [mount])
    monkeypatch.setattr("genf.archive.Path.is_dir", lambda x: True)

    fname = "foo.resp"
    path = determine_non_windows_archive_path(
        osname=osname, archive_path=db_value, archive=archive, fname=fname
    )
    assert path == (Path(expected) / fname).as_posix()


@pytest.mark.parametrize("archive,", ("NA", "someinvalidname"))
def test_determine_non_windows_archive_path_invalid(archive):
    db_value = "\\\\XXX\\Data\\LOOKUP\\responses"
    with pytest.raises(ArchiveNotMounted):
        path = determine_non_windows_archive_path(
            osname="MacOS", archive_path=db_value, archive=archive, fname="foo"
        )
