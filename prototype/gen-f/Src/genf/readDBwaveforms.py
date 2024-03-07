#!/usr/bin/env python3

"""waveform_read.py - Read in waveforms from database based on user input outlined in a parameter file.
This version can read in waveforms from any reference time (no origin time dependence) and can
produce continuous waveforms from .w segments.
"""
import datetime  # used to convert standard date to epoch time

# import statements
import os  # i/o operations (path exists, isdirectory, etc.)
import platform  # check what OS code is run on
import re  # perform string format checks
import warnings  # warnings
from typing import Tuple

import numpy as np
import obspy.io.sac.util as util
import pisces as ps  # import pisces database reader
import pisces.request as req  # retrieve waveform wfdisc rows from database
import pisces.schema.css3 as css  # import css schema
import pisces.schema.kbcore as kb  # import kb core schema
from obspy.core import trace  # save waveforms to a trace object
from obspy.core import utcdatetime  # convert epoch time (float) to a utcdatetime object
from obspy.core.stream import Stream  # save traces to a Stream object
from pisces.io.trace import read_waveform  # read in waveforms from archive

#    import sqlalchemy as sa                    # import sqlalchemy database reader
#    from sqlalchemy.orm import Session         # import Session object used to connect to database
from sqlalchemy import MetaData  # assign basic database features
from sqlalchemy import (  # used to assign unique, primary keys to tables
    PrimaryKeyConstraint,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import (
    declarative_base,  # base class used to inherit and map table features
)

from .archive import determine_non_windows_archive_path


class PathError(Exception):
    """Custom error for when a specified path does not exist"""


class MultLatLon(UserWarning):
    """Custom error for when one station has multiple lat/lon pairs in the database"""


class EmptyQuery(Exception):
    """Custom error for when the query returns an empty list, i.e., no data were found that fit the query"""


def db_par_reader(par_file, check_paths=True):
    """Parses a parameter file containing database information.

       This function reads a parameter text file which contains:

       * Schema type (css or kb core)
       * Table/database account names (table_name:database_account, e.g. ARRIVAL:xxx_gms)
       * Oracle path (path to Oracle installation, e.g. /Users/username/Library/Oracle)
       * TNS Admin path (path to Oracle admin file, e.g. /Users/username/Library/Oracle/instantclient_12_2/network/admin)
       * Database name and password (e.g. DB_NAME:db_password@host)
       * Name of archive where original waveforms are stored (e.g. WaveForm)
       * List of waveform files to retrieve (e.g. NET.STA.LOC.CHAN   ORIGIN_TIME  WINDOW_BEG_TIME  WINDOW_END_TIME)

        An example parameter file is shown below:

        Schema = css
        Tables = SITE:xxx_gms, SITECHAN:xxx_gms, WFDISC:xxx_gms
        ORACLE_HOME_PATH = /Users/username/Library/Oracle
        TNS_ADMIN_PATH = /Users/username/Library/Oracle/instantclient_12_2/network/admin
        DB_PASSWORD = DB_NAME:db_password@host
        MOUNT_ARCHIVE = WaveForm
      # Stat name            Reference time             Win_start (minutes, must be negative)   Win_end (minutes)
        IM.JNU.00.BH*        2017-09-03T03:30:01        -5                                      25
        IM.JKA.00.BH*        2017-09-03T03:30:01        -5                                      25
        IM.SEY.00.BH*        2017-09-03T03:30:01        -5                                      25

       * or ? Wildcards can be specified for station or channel names.

       Each line of this parameter file is parsed into several dictionary entries, which are passed to various
       functions/commands.

       NOTE ON ARCHIVE:  The archive parameter is for Macs ONLY. It contains the name of the archive where waveforms
       are physically stored, e.g. WaveForm. All archives are
       assumed to be mounted to Volumes such that the full waveform path would be /Volumes/archive. If on a
       Windows machine or a direct path is available without mounting an archive, set archive = NA in parameter file

       Parameters
       ------------
       par_file : str
           The full filepath to the parameter file
           (e.g.,`/path/to/example_resp.par`)


       Returns
       -------
       par_vals: dictionary
           A dictionary containing the following keys: schema, tables, oracle_path, tns_path, archive, db_pwd, stat_info.
           All keys contain str types. The definition of each key is described at the beginning of this function.

       Raises
       ------
       FileNotFoundError
           Cannot find the response file
       IsADirectoryError
           Attempted to read a directory, not a file
       TypeError
           One of the provided arguments is an invalid type, or an invalid number
           of arguments were supplied
       ValueError
           An invalid value has been given in one of the arguments
       """

    # Initiate dictionary par_vals

    par_vals = {
        "schema": [],
        "tables": [],
        "oracle_path": [],
        "tns_path": [],
        "archive": [],
        "db_pwd": [],
        "stations": [],
        "reference_start_time": [],
        "reference_end_time": [],
    }
    remapped_par_vals = {
        "tns_admin_path": "tns_path",
        "oracle_home_path": "oracle_path",
        "db_password": "db_pwd",
        "mount_archive": "archive",
    }

    # Check if parameter file exists
    if not os.path.exists(par_file):
        raise FileNotFoundError("Parameter file does not exist: '{}'".format(par_file))

    # Open parameter file and save each line to a list
    with open(par_file, "r") as p:
        par_lines = p.read().splitlines()
        # loop through each line of the file
        for line in par_lines:

            # skip the line if it's a comment or blank
            if line.lstrip().startswith("#") or len(line.strip()) == 0:
                continue

            # i.e. it's a row defining station information, append the station row to par_vals['stat_info']
            if "=" not in line:
                line = line.strip()
                par_vals["stations"].append(line)

            else:
                # Read the line header string to the left of the equals sign and make it lower case (e.g. Schema -> schema)
                line_hdr = str(line.split("=").pop(0).strip(" "))
                line_hdr = line_hdr.lower()

                # Assign read-in parameter to correct dictionary key (e.g. if Schema = 'kb', par_vals['schema'] = kb)
                if line_hdr in par_vals:
                    par_vals[line_hdr] = line.split("=").pop(1).strip(" ")
                elif line_hdr in remapped_par_vals:
                    par_vals[remapped_par_vals[line_hdr]] = (
                        line.split("=").pop(1).strip(" ")
                    )

    # Check if arguments are valid

    if par_vals["schema"] != "kb" and par_vals["schema"] != "css":
        raise ValueError("Invalid schema: Schema type must be kb or css")

    if check_paths:
        if not os.path.exists(par_vals["oracle_path"]):
            raise PathError("Path to Oracle does not exist")

        if not os.path.exists(par_vals["tns_path"]):
            raise PathError("TNS admin path does not exist")

    return par_vals


def jdate_to_epocht(jdy):

    jdy = str(jdy)

    # Convert Julian date to a datetime object
    jdy_epoch = datetime.datetime.strptime("17246", "%y%j")

    # Subtract 1970-01-01 from date to retrieve epoch time. Return in seconds.
    epocht = (jdy_epoch - datetime.datetime(1970, 1, 1)).total_seconds()

    return epocht


def date_std_to_epocht(yr, mon, day, hr, minute, sec):
    """Converts standard date (yr-mon-dayThr:minute:sec) to epoch time.

     This function reads in the year, month, and day, e.g. 2009, 10, 04 and
     returns the epoch time

     Parameters
       ------------
       yr : int
           The year listed in the standard date
       mon : int
            The month listed in the standard date
       day : int
            The day listed in the standard date
       hr : int
            The hour listed in the standard date
       minute : int
            The minute listed in the standard date
       sec : int
            The seconds listed in the standard date

       Returns
       -------
       epocht: float
           The epoch time (seconds since 1970-01-01)"""

    # Convert date to a datetime object
    dt = datetime.datetime(yr, mon, day, hr, minute, sec)

    # Subtract 1970-01-01 from date to retrieve epoch time. Return in seconds.
    epocht = (dt - datetime.datetime(1970, 1, 1)).total_seconds()

    return epocht


def date_std_to_jd(stddate, yr):
    """Converts standard date (yr-mon-day) to Julian date.

    Parameters
    -----------------
    stddate: str
        The standard date in yr-mon-day format.

    yr: str
        The year listed in the standard date

    Returns
    ---------------

    jdate: str
        The Julian date in yrday format, e.g. 2017235. If Julian date is < 3 digits, zeros are appended to the
        beginning of the day, e.g. 2019003, 2018052"""

    # Set necessary string format
    fmt = "%Y-%m-%d"

    # Create a datetime object from the input string
    sdtdate = datetime.datetime.strptime(stddate, fmt)

    # Retrieve all attributes of datetime object (e.g. tm_year = 2017)
    sdtdate = sdtdate.timetuple()

    # Retrieve Julian date from tuple of attributes and convert to string
    jdate_num = sdtdate.tm_yday
    jdate_num = str(jdate_num)

    # If Julian date has fewer than three digits, append leading zeros
    if len(jdate_num) == 1:
        jdate_num = "00" + jdate_num
    elif len(jdate_num) == 2:
        jdate_num = "0" + jdate_num

    # Combine Julian date with year to get yearjdy format, e.g. 2009005

    jdate = str(yr) + jdate_num

    return jdate


def process_reference_time(reference_time: str) -> Tuple[float, int]:
    # Verify start and end date strings are in correct format. Format must be xxxx-xx-xxTxx:xx:xx,
    # e.g. 2011-08-11T19:12:55.

    # re pattern reads as [0-9]{4}, i.e. 4 characters that must be between 0 and 9

    date_pattern = "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}"
    std_match = re.match(date_pattern, reference_time)

    if std_match is None:
        raise ValueError(
            "The origin date is not in the correct format. Format should be yr-mon-dayThr:min:sec, "
            "e.g. 2011-08-11T19:12:55"
        )

    # Split the date and get yr-mon-day section for start date
    start_stddate = reference_time.split("T").pop(0)

    # Extract yr from yr-mon-day for start date
    start_yr = int(start_stddate.split("-").pop(0))

    # Extract mon from yr-mon-day for start date
    start_mon = int(start_stddate.split("-").pop(1))

    # Extract day from yr-mon-day for start date
    start_day = int(start_stddate.split("-").pop(2))

    # Split the date and get hr:minute:sec section for start date
    # Note that specifying msec is optional
    start_stddate2 = reference_time.split("T").pop(1)

    # Extract hr from hr:minute:sec for start date
    start_hr = int(start_stddate2.split(":").pop(0))

    # Extract minute from hr:minute:sec for start date
    start_min = int(start_stddate2.split(":").pop(1))

    # Extract sec from hr:minute:sec for start date
    start_sec = int(start_stddate2.split(":").pop(2))

    # Convert start dates to epoch time (seconds since 1970-01-01)
    start_edate = date_std_to_epocht(
        start_yr, start_mon, start_day, start_hr, start_min, start_sec
    )

    # Convert start date to Julian date (used to help narrow down query). Takes yr-mon-day.
    start_jdate = date_std_to_jd(start_stddate, start_yr)

    # Return start dates
    return start_edate, start_jdate


def query_info(stations, reference_start_time, reference_end_time, overlap):
    """Parses the station rows in the parameter file into origin_time, station, channel, window start time
     and window end time arrays

     This function splits a station row, e.g. IM.BRD00.00.BDF       2011-08-11T19:12:55 10  30
     into origin_time, station, channel (network and loc are not used), window start time (sec before
     phase arrival) and window end time (sec after phase arrival). The function goes through each
     row and appends each of these values to an array.

     origin_time is converted to epoch time (seconds since 1970-01-01) using the function
     date_std_to_epocht and to Julian day using the function date_std_to_jd.

     Parameters
       ------------
       station_info : list
        A list containing each station row in the input parameter file,
        e.g. IM.JNU.00.BHZ        2017-09-03T03:30:01        -5                                      25

        The list is output by function db_par_reader as a dictionary entry 'stat_info', i.e. db_vals['stat_info']

       Returns
       -------
        start_date: list
           List of all origin times in parameter file converted to epoch time (seconds since 1970-01-01)

        network: list
            List of all networks in parameter file. Networks are metadata only.

        station: list
           List of all stations in parameter file. * or ? wildcards are converted to % symbol for use in sqlAlchemy

        location: list
            List of all locations in parameter file. Locations are metadata only.

         channel: list
           List of all channels in parameter file. * or ? wildcards are converted to % symbol for use in sqlAlchemy

         trm_start: list
            List of all window start times, where start times are defined as number of seconds before the phase
            arrival time

         trm_end: list
            List of all window end times, where end times are defined as number of seconds after the phase
            arrival time

         jdy: str
            Julian date in yrjdy format, e.g. 2019001


        Raises
        ---------

       ValueError
           An invalid value has been given in one of the arguments"""

    # Initiate arrays

    trm_start = []
    trm_end = []

    network = []
    station = []
    location = []
    channel = []

    # Go through each line, parse, and append info to appropriate array
    for sta_arr in stations:

        """Following block of code retrieves the standard start and end dates and
        converts them to epoch time"""

        """Following block of code retrieves the station and channel information for each station row"""

        # Crawl over each station row and split the station entry in the first column of the row
        sta_info = sta_arr.split(".")

        if len(sta_info) != 4:
            raise ValueError(
                "The station entry is not in the correct format. Format should be net.sta.loc.chan,"
                "where sta or chan can have a wildcard (? or *), e.g., IM.JKA.00.BH*"
            )

        # Save network names, station names, locations, and channel names to their
        # individual arrays. Replace ? or * wildcard with the % wildcard expected by Pisces/sqlAlchemy

        network.append(sta_info[0])
        station.append(sta_info[1].replace("?", "%").replace("*", "%"))
        location.append(sta_info[2])
        channel.append(sta_info[3].replace("?", "%").replace("*", "%"))

    # handle the start time and windows
    ref_time, ref_jdate = process_reference_time(reference_start_time)
    ref_end_time, ref_end_jdate = process_reference_time(reference_end_time)

    trm_end = [ref_end_time - ref_time + overlap] * len(stations)
    trm_start = [-overlap] * len(stations)

    start_date = [str(ref_time)] * len(stations)
    jdy = [str(ref_jdate)] * len(stations)

    return jdy, start_date, network, station, location, channel, trm_start, trm_end


def wave_trm(waveform, trm_start, trm_end, or_time):
    """Trims a trace object containing the waveform to the desired window length. Window length
    is specified in the parameter file via parameters trm_start, trm_end, i.e. window_start = arr_time - trm_start,
    window_end = arr_time + trm_end

    Parameters
    ------------
    waveform: Obspy Trace
        Contains the waveform to be trimmed

    trm_start: list
            List of all window start times, where start times are defined as number of seconds before the origin time

    trm_end: list
            List of all window end times, where end times are defined as number of seconds after the origin time

    or_time: float
            Origin time (in epoch time). Note that the origin time specified here is the value from the parameter file
            and not the exact origin time from the database, which includes msec
    """
    # Convert start and end times to UTCDateTime objects
    tstart = utcdatetime.UTCDateTime(or_time + trm_start)
    tend = utcdatetime.UTCDateTime(or_time + trm_end)

    # print(tstart)
    # print(tend)

    # Trim window to specified length and set waveform.stats.starttime to equal tstart
    # waveform.stats.starttime = tstart
    waveform.trim(starttime=tstart, endtime=tend)

    # print(waveform.stats)

    return waveform


def main_call(par_path, full_sol, overlap: float):
    """Makes main script a function that can be called. When called, entire script will be run.

    Parameters
           ------------
           par_path : str
               The full filepath to the parameter file
               (e.g.,`/path/to/example.par`)

            full_sol: str
                Either 'y' or 'n'. If 'y', a dictionary containing a) a Stream object (consisting of requested
                waveforms), b) station hang, c) station vang, and d) station latitude and longitude will be returned.
                If 'n', only station latitude and longitude are returned.


           Returns
           -------
           sol_dict: dictionary
               If full_sol = 'y': A dictionary containing the following keys: new_stream, hang, vang, latlon
               If full_sol = 'n': A dictionary containing the following keys: latlon
               Types and definitions of each key are described later in the code
               :param par_path:
               :param full_sol:
    """

    def query_db(
        session, jdy, origin_time, netw, stat, loc, chann, trm_start, trm_end, archive
    ):
        """Queries a database archive and returns all response file paths found for each station/channel pair defined
        in the parameter file.

        Parameters
        ------------

          jdy: str
                Julian date in yrjdy format, e.g. 2019001

          origin_time: list
               List of all origin times in parameter file in epoch time (seconds since 1970-01-01)

          network: list
                List of all networks in parameter file. Networks are metadata only.

          station: list
               List of all stations in parameter file. * or ? wildcards are converted to % symbol for use in sqlAlchemy
               KEEP WILDCARD?

          location: list
                List of all locations in parameter file. Locations are metadata only.

          channel: list
               List of all channels in parameter file. * or ? wildcards are converted to % symbol for use in sqlAlchemy

          trm_start: list
                List of all window start times, where start times are defined as number of seconds before the origin time

          trm_end: list
                List of all window end times, where end times are defined as number of seconds after the origin time

          archive: str
            For Macs ONLY: Name of archive where waveforms are physically stored, e.g. WaveForm. All archives are
            assumed to be mounted to Volumes such that the full waveform path would be /Volumes/archive. If on a
            Windows machine or a direct path is available without mounting an archive, set archive = NA in parameter file

        Raises
        ------

        EmptyQuery
            The query resulting from the input parameters returned no data, i.e., it's empty

        ArchiveNotMounted
            If using an archive, will result if the archive either has not been mounted or was incorrectly defined
            in the input parameter file

        Returns
        -------

        stream: Stream object
            Contains all available trimmed waveform traces. Individual traces can be accessed in an array fashion
            e.g. stream[0]"""

        # Initialize necessary lists

        wf_list = []
        wf_time_list = []
        samp_list = []
        chann_list = []
        calib_list = []
        calper_list = []
        hang_list = []
        vang_list = []
        lat_list = []
        lon_list = []
        latlon_list = []
        wfdiscs = []

        # Convert reference_time string to a float (var name needs to be updated)
        otime1 = float(origin_time)

        # Convert reference time (in epoch time format) to jdy1 (jdy of beginning
        # window) and jdy2 (jdy end of window). These will be equal if
        # requested window occurs on same jdy.

        jdy_epoch = otime1

        jdy_epoch_start = jdy_epoch + trm_start
        jdy_epoch_end = jdy_epoch + trm_end

        std_start = str(datetime.datetime.utcfromtimestamp(jdy_epoch_start))
        std_end = str(datetime.datetime.utcfromtimestamp(jdy_epoch_end))

        jdy1 = date_std_to_jd(std_start[0:10], std_start[0:4])
        jdy2 = date_std_to_jd(std_end[0:10], std_end[0:4])

        # Query for wfdisc id, wfdisc time, sample rate,  channel hang, channel vang, site lat, site lon and wfdisc rows for a specified
        # station and channel on the Julian date upon which the origin time occurred. Note that the returned origin time
        # will be the nearest to the input origin time in msec. The equivalent SQL developer command is shown below.

        """SELECT w.wfid, w.time, w.samprate, w.calib, w.calper, sc.hang, sc.vang, s.lat, s.lon, w.*, w.chan
        FROM site s, sitechan sc, wfdisc w
        WHERE s.sta=sc.sta
        AND s.sta = w.sta
        AND sc.chan = w.chan
        AND w.sta = 'sta'
        AND sc.chan like 'chann’                                                                   
        AND w.jdate between jdy1 and jdy2                                              
        AND s.ondate < jdy1 AND s.offdate > jdy2                                     
        AND sc.ondate < jdy1 AND sc.offdate > jdy2;"""
        id_lst = (
            session.query(
                Wfdisc.wfid,
                Wfdisc.time,
                Wfdisc.samprate,
                Wfdisc.calib,
                Wfdisc.calper,
                SiteChan.hang,
                SiteChan.vang,
                Site.lat,
                Site.lon,
                Wfdisc,
                Wfdisc.chan,
            )
            .filter(Site.sta == SiteChan.sta)
            .filter(Site.sta == Wfdisc.sta)
            .filter(SiteChan.chan == Wfdisc.chan)
            .filter(Wfdisc.sta == stat)
            .filter(SiteChan.chan.like(chann))
            .filter(Wfdisc.jdate.between(jdy1, jdy2))
            .filter(Site.ondate < jdy1)
            .filter(Site.offdate > jdy2)
            .filter(SiteChan.ondate < jdy1)
            .filter(SiteChan.offdate > jdy2)
        )

        id_list = id_lst.all()

        # print(id_list)

        if not id_list:
            raise EmptyQuery(
                f"The query found no data for station {stat} channel {chann} Jday range {jdy1} {jdy2}. Modify requested station information in input file."
            )

        # Convert list of tuples containing query information into list of individual elements
        id_list3 = [item for t in id_list for item in t]

        # SELECT w.wfid, w.time, w.samprate, sc.hang, sc.vang, s.lat, s.lon, w.*

        # Retrieve all wfids, wf times, sample rates, hangs, vangs, lats, lons,
        # and wdisc rows from list of query
        # information and save each type to individual lists
        for wf_elem in range(0, len(id_list3), 11):
            wf_list.append(float(id_list3[wf_elem]))

        for wf_time_elem in range(1, len(id_list3), 11):
            wf_time_list.append(id_list3[wf_time_elem])

        for samp_elem in range(2, len(id_list3), 11):
            samp_list.append(id_list3[samp_elem])

        for calib_elem in range(3, len(id_list3), 11):
            calib_list.append(id_list3[calib_elem])

        for calper_elem in range(4, len(id_list3), 11):
            calper_list.append(id_list3[calper_elem])

        for hang_elem in range(5, len(id_list3), 11):
            hang_list.append(id_list3[hang_elem])

        for vang_elem in range(6, len(id_list3), 11):
            vang_list.append(id_list3[vang_elem])

        for lat_elem in range(7, len(id_list3), 11):
            lat_list.append(id_list3[lat_elem])

        for lon_elem in range(8, len(id_list3), 11):
            lon_list.append(id_list3[lon_elem])

        for wfdisc_elem in range(9, len(id_list3), 11):
            wfdiscs.append(id_list3[wfdisc_elem])

        for chann_elem in range(10, len(id_list3), 11):
            chann_list.append(id_list3[chann_elem])

        # Concatenate hang, vang, calib, calper arrays with chann array into
        # a single array. This array will be used to find the unique parameters
        # (hang, vang, calib, calper) for each sta/chann queried

        wfpars_arr = np.row_stack((chann_list, hang_list))
        wfpars_arr = np.row_stack((wfpars_arr, vang_list))
        wfpars_arr = np.row_stack((wfpars_arr, calib_list))
        wfpars_arr = np.row_stack((wfpars_arr, calper_list))

        # NOTE TO SELF: calib is the same regardless of whether we hit the database or not

        # Extract unique columns

        unq_wfpars_arr = np.unique(wfpars_arr, axis=1)

        # Set hang_list, etc. equal to the appropriate row

        hang_list = np.ndarray.tolist(unq_wfpars_arr[1, :])
        vang_list = np.ndarray.tolist(unq_wfpars_arr[2, :])
        calib_list = np.ndarray.tolist(unq_wfpars_arr[3, :])
        calper_list = np.ndarray.tolist(unq_wfpars_arr[4, :])

        # Initiate list
        waveform_arr = []

        for m, wfdisc in enumerate(wfdiscs):

            # if on MacOS
            if platform.system() == "Darwin":
                wf_path = determine_non_windows_archive_path(
                    "MacOS", wfdisc.dir, archive, wfdisc.dfile
                )
            # if on Linux
            elif platform.system() == "Linux":
                wf_path = determine_non_windows_archive_path(
                    "Linux", wfdisc.dir, archive, wfdisc.dfile
                )
            else:  # Windows
                wf_path = wfdisc.dir + "/" + wfdisc.dfile

            waveform = read_waveform(
                wf_path, wfdisc.datatype, wfdisc.foff, wfdisc.nsamp
            )

            # Convert waveform to Obspy trace object
            waveform = trace.Trace(waveform)

            # Update start time to .w start time (w.time)
            # Otherwise may end up with an incorrect window
            waveform.stats.starttime = wf_time_list[m]

            # Update waveform sampling rate to rate listed in wfdisc.
            # Otherwise, rate is set to 1 Hz and window length will be
            # incorrect when trimmed
            waveform.stats.sampling_rate = wfdiscs[m].samprate

            # Trim waveform so that it starts N minutes before the origin time and ends M minutes after the origin time
            # Origin time in this case is the exact origin time written in the parameter file, not the database supplied
            # origin time
            waveform2 = wave_trm(waveform, trm_start, trm_end, float(origin_time))
            waveform2.stats.channel = wfdiscs[m].chan
            waveform2.stats.station = stat
            waveform2.stats.network = netw
            waveform2.stats.location = loc

            # ObsPy to SAC header to store reference time (for use with Gen-F, diverging from SANDMT)
            waveform2.stats.sac = util.obspy_to_sac_header(waveform2.stats)
            waveform2.stats.sac["user1"] = origin_time

            # Generate stream object containing all waveform traces

            waveform_arr.append(waveform2)

        # Merge all traces in stream into a single trace (used when request spans
        # more than one day)
        # Merge will handle gaps and overlaps in different ways depending on
        # method selected, etc. See https://docs.obspy.org/packages/autogen/obspy.core.stream.Stream.merge.html

        # Need to make input to merge method flexible (passed by the user)
        stream = Stream(traces=waveform_arr)
        stream.merge(
            method=0,
            fill_value=None,
            interpolation_samples=0,
            misalignment_threshold=0.01,
        )

        # Save latitude and longitude
        latlon_list.append(lat_list[m])
        latlon_list.append(lon_list[m])

        return stream, hang_list, vang_list, latlon_list, calib_list, calper_list

    # ---------------------------------------------------------------------------
    # Begin database session
    # ---------------------------------------------------------------------------

    # Add warning if par file not built correctly

    # Retrieve dictionary db_vals containing necessary parameter file info
    db_vals = db_par_reader(par_path)

    # Extract Oracle and TNS admin paths and set up Oracle environment
    os.environ["ORACLE_HOME"] = db_vals["oracle_path"]
    os.environ["TNS_ADMIN"] = db_vals["tns_path"]

    # Validate and begin database session

    session = ps.db_connect(conn="oracle+cx_oracle:" + "//" + db_vals["db_pwd"])

    # Below is an alternative way to start a session. Uncomment this block along with necessary imports to use.

    # e = sa.create_engine('oracle://' + db_vals['db_pwd'])
    # metadata = sa.MetaData(e)
    # Base = declarative_base()
    # session = Session(e)

    # --------------------------------------------------------------------------
    # Set up table classes
    # --------------------------------------------------------------------------

    # Retrieve table names and database accounts (if applicable) from dictionary db_vals

    table_list = db_vals["tables"].split(",")

    # Initiate lists
    key_list = []
    key_val_list = []

    # Split the table list into keys and key values to generate a dictionary. If accessing from a personal account, keys
    # will be table names (e.g. Origin) and key values will be the database account in which a specific table can be
    # found (e.g. xxx_gms). If accessing a database account directly, all key values will be NA.

    for table_elem in table_list:
        split_elem = table_elem.split(":")
        key_name = split_elem[0].strip(" ")
        key_val = split_elem[1].strip(" ")
        key_list.append(key_name)
        key_val_list.append(key_val)

    # Zip the key and key values list together and generate dictionary
    zip_list = zip(key_list, key_val_list)
    table_dict = dict(zip_list)

    # Generate table classes. If accessing database from a personal account, the class will be made using a
    # sqlAlchemy declarative_base such that a class effectively represents the SQL developer call db_account.table_name
    # (e.g. xxx_gms.origin). In the parameter file, each table should be paired with the database account it's located
    # in (e.g. origin: xxx_gms).
    #
    # The generated class will either inherit KB Core characteristics or CSS characteristics depending on what was
    # specified in the parameter file
    #
    # Need to convert long if-else statement to a class generating function in future.

    # If kb core schema selected
    if db_vals["schema"] == "kb":

        # For each table in the dictionary, generate the class. If accessing from personal database, generate
        # class with both a declarative base and kb core schema. Otherwise, generate class with just kb core schema.
        # Note that only tables with origin, site, sitechan, or wfdisc in the name will be generated. Other tables
        # not necessary for query are ignored.

        # UniqueConstraint and PrimaryKeyConstraint are specifically used to assign unique and primary keys for each
        # table 

        for table_val in table_dict:

            if "origin" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Origin(base, kb.Origin):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("lat", "lon", "depth", "time", "auth"),
                            PrimaryKeyConstraint("orid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Origin(kb.Origin):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("lat", "lon", "depth", "time", "auth"),
                            PrimaryKeyConstraint("orid"),
                            {"keep_existing": True},
                        )

            elif "site" in table_val.lower() and "chan" not in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Site(base, kb.Site):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta, ondate"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Site(kb.Site):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta, ondate"),
                            {"keep_existing": True},
                        )

            elif "sitechan" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class SiteChan(base, kb.Sitechan):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "ondate"),
                            PrimaryKeyConstraint("chanid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class SiteChan(kb.Sitechan):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "ondate"),
                            PrimaryKeyConstraint("chanid"),
                            {"keep_existing": True},
                        )

            elif "wfdisc" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Wfdisc(base, kb.Wfdisc):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "time"),
                            PrimaryKeyConstraint("wfid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Wfdisc(kb.Wfdisc):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "time"),
                            PrimaryKeyConstraint("wfid"),
                            {"keep_existing": True},
                        )

    elif db_vals["schema"] == "css":
        # If using css schema

        # For each table in the dictionary, generate the class. If accessing from personal database, generate
        # class with both a declarative base and css schema. Otherwise, generate class with just css schema.
        # Note that only tables with origin, site, sitechan, and wfdisc in the name will be generated. Other tables
        # not necessary for query are ignored.

        for table_val in table_dict:

            if "origin" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Origin(base, css.Origin):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("orid"),
                            PrimaryKeyConstraint("lat", "lon", "depth", "time"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Origin(css.Origin):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("orid"),
                            PrimaryKeyConstraint("lat", "lon", "depth", "time"),
                            {"keep_existing": True},
                        )

            elif "site" in table_val.lower() and "chan" not in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Site(base, css.Site):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "ondate"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Site(css.Site):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "ondate"),
                            {"keep_existing": True},
                        )

            elif "sitechan" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class SiteChan(base, css.Sitechan):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "ondate"),
                            PrimaryKeyConstraint("chanid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class SiteChan(css.Sitechan):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("sta", "chan", "ondate"),
                            PrimaryKeyConstraint("chanid"),
                            {"keep_existing": True},
                        )

            elif "wfdisc" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Wfdisc(base, css.Wfdisc):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("wfid"),
                            PrimaryKeyConstraint("sta", "chan", "time"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Wfdisc(css.Wfdisc):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint("wfid"),
                            PrimaryKeyConstraint("sta", "chan", "time"),
                            {"keep_existing": True},
                        )

    # ---------------------------------------------------------------------------
    # Retrieve info needed to query database
    # ---------------------------------------------------------------------------

    jdate, origin_time, net, sta, loc, chan, trim_start, trim_end = query_info(
        db_vals["stations"],
        db_vals["reference_start_time"],
        db_vals["reference_end_time"],
        overlap,
    )

    # --------------------------------------------------------------------------
    # Query database and return final waveform results
    # --------------------------------------------------------------------------

    # Total number of station rows in parameter file
    num_stat = len(sta)

    # If full solution specified by user, initiate a dictionary with key values traces, hang, vang, latlon. Otherwise,
    # initiate a directory with just the latlon key.

    if full_sol == "y":
        sol_dict = {
            "traces": [],
            "hang": [],
            "vang": [],
            "latlon": [],
            "calib": [],
            "calper": [],
        }
    else:
        sol_dict = {"latlon": []}

    for i in range(num_stat):
        # Query the database and retrieve all waveforms associated with each requested station/channel pair. All waveforms
        # will be stored in the Stream object "traces". Individual waveforms can be accessed in the same way as a list,
        # i.e. traces[0] will return the first trace in the Stream object.

        traces, hang, vang, latlon, calib, calper = query_db(
            session,
            jdate[i],
            origin_time[i],
            net[i],
            sta[i],
            loc[i],
            chan[i],
            trim_start[i],
            trim_end[i],
            db_vals["archive"],
        )

        # print(len(traces))

        # Save all traces, hang, vang, and station latitude and longitude to solution dictionary if full solution
        # requested. Otherwise, just save station latitude and longitude

        if full_sol == "y":

            sol_dict["traces"] += traces
            sol_dict["hang"].append(hang)
            sol_dict["vang"].append(vang)
            sol_dict["latlon"].append(latlon)
            sol_dict["calib"].append(calib)
            sol_dict["calper"].append(calper)

            # print(len(sol_dict['traces']))

        else:

            sol_dict["latlon"].append(latlon)

    return sol_dict
