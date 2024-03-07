from pathlib import Path

from genf.readDBwaveforms import db_par_reader

here = Path(__file__).parent


def test_waveform_db_par_reader(monkeypatch):
    monkeypatch.setattr("os.path.exists", lambda x: True)
    par_file = here / "data" / "Input" / "waveformReader" / "wfReader.par"

    results = db_par_reader(par_file)

    assert "db_pwd" in results and results["db_pwd"]
    del results["db_pwd"]

    expected = {
        "schema": "css",
        "tables": "SITE:idcidcx, SITECHAN:idcidcx, WFDISC:idcidcx",
        "oracle_path": "/",
        "tns_path": "/",
        "archive": "waveform",
        "stations": [
            "IM.ARA0.00.sz",
            "IM.ARA1.00.sz",
            "IM.ARA2.00.sz",
            "IM.ARA3.00.sz",
            "IM.ARB1.00.sz",
            "IM.ARB2.00.sz",
            "IM.ARB3.00.sz",
            "IM.ARB4.00.sz",
            "IM.ARB5.00.sz",
            "IM.ARC1.00.sz",
            "IM.ARC2.00.sz",
            "IM.ARC3.00.sz",
            "IM.ARC4.00.sz",
            "IM.ARC5.00.sz",
            "IM.ARC6.00.sz",
            "IM.ARC7.00.sz",
            "IM.ARD1.00.sz",
            "IM.ARD2.00.sz",
            "IM.ARD3.00.sz",
            "IM.ARD4.00.sz",
            "IM.ARD5.00.sz",
            "IM.ARD6.00.sz",
            "IM.ARD7.00.sz",
            "IM.ARD8.00.sz",
            "IM.ARD9.00.sz",
        ],
        "reference_start_time": "2010-01-22T02:05:00",
        "reference_end_time": "2010-01-22T02:09:00",
    }
    assert results == expected
