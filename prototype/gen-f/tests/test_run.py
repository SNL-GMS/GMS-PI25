import json
import warnings
from pathlib import Path

from numba.core.errors import NumbaPerformanceWarning
from obspy import read as obs_read

from genf.main import DataSource, run
from genf.readDBwaveforms import db_par_reader, process_reference_time

here = Path(__file__).parent

data_dir = here / "data"


def mock_importWaveformData(inputDirectory, param):
    metadata_file = data_dir / "metadata.json"
    arces = data_dir / "ARCES"
    with open(metadata_file, "r") as f:
        metadata = json.load(f)

    streams = [obs_read(tr.as_posix()) for tr in arces.iterdir()]
    traces = [stream[0] for stream in streams]
    # Metadata has a list of trace ids under the key 'traces', not the
    # actual trace, so convert it to have a list of traces
    id_to_trace = {tr.id: tr for tr in traces}
    ordered_traces = [id_to_trace[trace_id] for trace_id in metadata["traces"]]

    # The traces will have incorrect values for trace.stats.sac.user1;
    # readDBwaveforms manipulates this field, storing as SAC undoes that manipulation
    # so re-do it here
    #
    # Set user1 to the start time from the par file
    wfpar = data_dir / "Input" / "waveformReader" / "wfReader.par"
    par_vals = db_par_reader(wfpar.as_posix(), check_paths=False)
    origin_time, _ = process_reference_time(par_vals["reference_start_time"])
    for tr in ordered_traces:
        tr.stats.sac.user1 = origin_time
    metadata["traces"] = ordered_traces

    return metadata, ordered_traces


def mock_db_call(filename):
    with open(data_dir / "response.json") as f:
        response = json.load(f)
    return response


def test_run(monkeypatch, tmp_path):
    warnings.simplefilter("ignore", category=NumbaPerformanceWarning)
    monkeypatch.setattr("genf.main.importWaveformData", mock_importWaveformData)
    monkeypatch.setattr("genf.noisePowerSpectrum.db_call", mock_db_call)

    run(
        inputDirectory=data_dir / "Input",
        outputDirectory=tmp_path,
        data_source=DataSource.xxx,
        network="ARCES",
        ims_data_dir=None,
        verbose=False,
        plots=None,
        fplots=None,
        passband_index=None,
        snr=None
    )
    summary = Path(tmp_path / "ARCES" / "summary.txt").read_text()
    expected = Path(data_dir / "expected" / "summary.txt").read_text()
    assert summary == expected
