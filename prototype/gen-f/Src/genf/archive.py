import logging
from pathlib import Path, PureWindowsPath

logger = logging.getLogger(__name__)


class ArchiveNotMounted(Exception):
    """Custom error for when the archive containing waveforms is not mounted"""


def determine_non_windows_archive_path(
    osname: str, archive_path: str, archive: str, fname: str
) -> str:
    """
    Finds a common subpath between 'archive' and 'archive_path' and returns it, having resolved it to an
    appropriate OS mount point for non-windows OSes
    """
    provided_archive = archive
    if provided_archive == "NA":
        raise ArchiveNotMounted(
            f"Mount archive is 'NA' but a mount archive is required for {osname}.  Check MOUNT_ARCHIVE parameter in the input file"
        )

    # get response path.  If this is a windows path convert it to something we can use
    # i.e. an absolute posix path
    os_archive_path = Path(PureWindowsPath(archive_path).as_posix()).resolve()

    # If the archive is absolute, just search for the last part of it
    archive = (
        Path(provided_archive).name
        if Path(provided_archive).is_absolute()
        else provided_archive
    )

    # OS dependent mount points
    mount_root = "/mnt" if osname == "Linux" else "/Volumes"

    # Find where the archive is in the response path from the db
    # Unfortunately we need to support situations where the DB cases the path
    # but the receiving system doesn't: eg db WaveForm -> filesystem waveform
    index = [
        i
        for i, part in enumerate(os_archive_path.parts)
        if (archive in part and part != "/") or (archive in part.lower())
    ]

    archive_path = Path(provided_archive)
    if index:  # Success, archive in in the response path
        index = index[0]
        if archive_path.is_absolute():
            # if absolute, just take the provided path and whatever's after the match
            archive_path = archive_path.parent / Path(*os_archive_path.parts[index:])
        else:
            # Deal with case mismatches
            if os_archive_path.parts[index] == archive:
                archive_path = Path(*os_archive_path.parts[index:])
            else:
                start = os_archive_path.parts[index]
                archive_path = Path(start.lower(), *os_archive_path.parts[index + 1 :])
    else:  # Archive isn't in the response path
        # Is it absolute? If so, it's expected it won't be on the response path
        # So just look there for response files unless the archive doesn't exist
        if archive_path.is_absolute() and archive_path.exists():
            index = -1
            archive_path = Path("./")
        else:  # We have an error: not absolute and there's no matching subpiece of the response path
            # Figure out an informative error

            if (Path(mount_root) / archive_path).exists():
                msg = (
                    f"Provided archive '{provided_archive}' appears to be mounted under {mount_root} but it has no subpath "
                    f"commonality with the response path in the database: {os_archive_path}.  "
                    "Check MOUNT_ARCHIVE parameter in the input file"
                )
            else:
                msg = (
                    f"Archive '{provided_archive}' is not mounted! Mount archive or check MOUNT_ARCHIVE "
                    f"parameter in the input file.  On {osname} a relative-pathed archive should appear somewhere under {mount_root}"
                )
            raise ArchiveNotMounted(msg)

    # Figure out what's under the mount root
    # and try to align that mount to what's returned by the db
    # For example, assume the db returns ~ '/path/Data/LOOKUP/responses'
    # and the archive is 'responses'
    # Allow the user to have any point in this share mounted mounted (e.g. on Mac)
    # - /Volumes/path
    # - /Volumes/Data
    # - /Volumes/LOOKUP
    # - /Volumes/responses (preferred)
    # etc

    candidate_prefixes = list()
    mount_root_dirs = [p.name for p in Path(mount_root).iterdir() if p.is_dir()]
    for i, part in enumerate(os_archive_path.parts):
        if i > index:  # don't look beyond where we matched 'archive'
            break
        if part in mount_root_dirs or part.lower() in mount_root_dirs:
            candidate_prefixes.append(
                Path(mount_root) / Path(*os_archive_path.parts[i:index])
            )

    candidate_prefixes = list(set(candidate_prefixes))  # eliminate any duplicates

    # if user provided an absolute path, prefer it
    if Path(provided_archive).is_absolute():
        candidate_prefixes.insert(0, Path(provided_archive))

    # Find where the file is, checking all candidates
    for path in candidate_prefixes:
        test_path = path / archive_path

        if test_path.exists():
            test_file = test_path / fname
            if test_file.exists():
                archive_path = test_file.as_posix()
                break  # found a file, so stop
    else:  # we didn't break out of the loop, so we didn't find any files
        expected_paths = set(prefix / archive_path for prefix in candidate_prefixes)
        missing_paths = set(str(path) for path in expected_paths if not path.exists())

        if not expected_paths:
            msg = (
                f"Archive '{provided_archive}' is not mounted! Mount archive or check MOUNT_ARCHIVE "
                f"parameter in the input file.  On {osname} a relative-pathed archive should appear somewhere under {mount_root}"
            )
            raise ArchiveNotMounted(msg)
        if len(expected_paths) == len(missing_paths):
            msg = (
                f"Could not find file: {fname} on any expected paths: {[str(path) for path in expected_paths]} "
                f"No expected paths exist on this system.  Check the MOUNT_ARCHIVE parameter in the input file"
            )
        else:
            msg = f"Could not find file: {fname} on any existing expected paths: {[str(p) for p in (expected_paths - missing_paths)]}. "
        logger.warning(msg)
        raise FileNotFoundError(msg)
    return archive_path
