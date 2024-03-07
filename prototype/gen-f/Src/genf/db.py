#!/usr/bin/env python3

"""db.py (formerly called libresponse_db.py) - Read in response files from database based on user input outlined 
in a parameter file and parse and cascade them into FAP file format."""

import datetime  # used to convert standard date to epoch time
import logging
import numbers  # check variable types
import os  # i/o operations (path exists, isdirectory, etc.)
import platform  # check what OS code is run on
import re  # perform string format checks
import warnings  # warnings

import numpy as np  # math
import pisces as ps  # import pisces database reader
import pisces.schema.css3 as css
import pisces.schema.kbcore as kb  # import necessary schemas
import scipy as sp  # scipy
import scipy.interpolate  # - interpolation functions
import scipy.signal  # - signal processing
from sqlalchemy import MetaData  # assign basic database features
from sqlalchemy import (  # used to assign unique, primary keys to tables
    PrimaryKeyConstraint,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import (
    declarative_base,  # base class used to inherit and map table features
)

from .archive import ArchiveNotMounted, determine_non_windows_archive_path
from .libresponse import compute_resp

logger = logging.getLogger(__name__)


class MultResponses(UserWarning):
    """Custom error for when one station/channel pair pulls in multiple response files"""


class PathError(Exception):
    """Custom error for when a specified path does not exist"""


class ArchiveNotMounted(Exception):
    """Custom error for when the archive containing waveforms is not mounted"""


class EmptyQuery(Exception):
    """Custom error for when the query returns an empty list, i.e., no data were found that fit the query"""


def db_par_reader(par_file):
    """Parses a parameter file containing database information.

       This function reads a parameter text file which contains:

       * Schema type (css or kb core)
       * Table/database account names (table_name:database_account, e.g. ARRIVAL:xxx_gms)
       * Oracle path (path to Oracle installation, e.g. /Users/username/Library/Oracle)
       * TNS Admin path (path to Oracle admin file, e.g. /Users/username/Library/Oracle/instantclient_12_2/network/admin)
       * Database name and password (e.g. DB_NAME:db_password@host)
       * Name of archive where original response files are stored (e.g. WaveForm)
       * List of response files to retrieve and dates (e.g. NET.STA.LOC.CHAN       START_TIME    END_TIME)
       * Frequency axis (can be set to default, e.g. Freq_axis = default, set to a specified frequency axis, e.g.
       * Freq_axis = 0.1, 0.2, 0.3/ 20 with / representing a line continuation, or it can be set to NA. If set to
       * NA, specify additional parameters in the file, see below)
       * If Freq_axis parameter set to NA, the following parameters used to generate a frequency axis are defined
       * for each station:
       * log scale (generate frequency axis on a log scale; can be true or false)
       * maximum frequency of axis
       * minimum frequency of axis
       * number of frequency bins

        An example parameter file is shown below:

        Schema = kb
        Tables = mt_sitechan:xxx_gms, mt_sensor:xxx_gms, mt_instrument:xxx_gms
        ORACLE_HOME_PATH = /Users/username/Library/Oracle
        TNS_ADMIN_PATH = /Users/username/Library/Oracle/instantclient_12_2/network/admin
        DB_PASSWORD = DB_NAME:db_password@host
        MOUNT_ARCHIVE = responses_mt
        IM.BRD00.00.BDF       2011-08-11T19:12:55     2015-06-24T19:12:55
        IM.BELG.00.BH?        2013-09-20T19:12:55     2015-02-25T19:12:55

        Freq_axis = NA

        #If building a frequency axis, fill out the desired parameters below for each station.
        #If the Freq_axis parameter is assigned (not blank) these parameters will be ignored

        #If log scale is true, generate a logarithmic frequency axis; else make a linear frequency axis
        #If max freq is set to NA, set maximum frequency equal to the sampling rate read in from the database
        Log_scale = False
        Max_freq = 20
        Min_freq = 0.1
        Num_freq_bins = 100

        Log_scale = True
        Max_freq = 100
        Min_freq = 0.1
        Num_freq_bins = 10

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
           A dictionary containing the following keys: schema, tables, oracle_path, tns_path, db_pwd, archive,
           stat_info, freq_axis.
           Types and definitions of each key described at the beginning of this function

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

    freq_arr = []
    par_vals = {
        "schema": [],
        "tables": [],
        "oracle_path": [],
        "tns_path": [],
        "db_pwd": [],
        "archive": [],
        "stat_info": [],
        "freq_axis": [0]
        # Need to initiate freq_axis with one element available. It will be overwritten by first line
        # of frequency axis in parameter file later on.
    }

    # Check if parameter file exists
    if not os.path.exists(par_file):
        raise FileNotFoundError("Parameter file does not exist: '{}'".format(par_file))

    # Open parameter file and save each line to a list
    with open(par_file, "r") as p:
        par_lines = p.read().splitlines()

        # loop through each line of the file
        for j in range(len(par_lines)):

            # get the current line
            line = par_lines[j]

            # skip the line if it's a comment or blank
            if line.lstrip().startswith("#") or len(line.strip()) == 0:
                continue

            # Read the line header string to the left of the equals sign and make it lower case (e.g. Schema -> schema)
            line_hdr = str(par_lines[j].split("=").pop(0).strip(" "))
            line_hdr = line_hdr.lower()

            # Assign read-in parameter to correct dictionary key (e.g. if Schema = 'kb', par_vals['schema'] = kb) or
            # variable (in case of values used to build frequency axis)
            if line_hdr == "schema":
                par_vals["schema"] = par_lines[j].split("=").pop(1).strip(" ")

            if line_hdr == "tables":
                par_vals["tables"] = par_lines[j].split("=").pop(1).strip(" ")

            if line_hdr == "oracle_home_path":
                par_vals["oracle_path"] = par_lines[j].split("=").pop(1).strip(" ")

            if line_hdr == "tns_admin_path":
                par_vals["tns_path"] = par_lines[j].split("=").pop(1).strip(" ")

            if line_hdr == "db_password":
                par_vals["db_pwd"] = par_lines[j].split("=").pop(1).strip(" ")

            if line_hdr == "mount_archive":
                par_vals["archive"] = par_lines[j].split("=").pop(1).strip(" ")

            # If there is no line header and the row contains a :,
            # i.e. it's a row defining the station information, append the station row to
            # par_vals['stat_info']
            if "=" not in line and ":" in line:
                par_vals["stat_info"].append(line)

            if line_hdr == "freq_axis":
                par_vals["freq_axis"][
                    0
                ] = (
                    line.lower()
                )  # Save first line of frequency axis to dictionary. Lower
                # case header so it can be removed later.

            # Following are only used if frequency axis is being built within this code
            if line_hdr == "log_scale":
                log_scale = par_lines[j].split("=").pop(1).strip(" ")
                log_scale = log_scale.lower()

                # If log scale string is true, save boolean True to log_scale variable. Otherwise, save boolean False.
                if log_scale == "true":
                    log_scale = bool(1)

                elif log_scale == "false":
                    log_scale = bool(0)

                freq_arr.append(log_scale)

            if line_hdr == "max_freq":
                max_freq = par_lines[j].split("=").pop(1).strip(" ")

                freq_arr.append(max_freq)

            if line_hdr == "min_freq":
                min_freq = par_lines[j].split("=").pop(1).strip(" ")

                freq_arr.append(min_freq)

            if line_hdr == "num_freq_bins":
                num_bins = par_lines[j].split("=").pop(1).strip(" ")

                freq_arr.append(num_bins)

            """ Next block of code reads in frequency axis and converts it to a list of floats if numbers passed in. 
            Otherwise, simply reads in keyword default to be used in later if statement. Right now, this block
            of code is bypassed in order to read and build multiple frequency axes. Come back to it later"""

            # If a line continuation character \ is found beyond the first line, append the line to the freq_axis list
            if line_hdr != "freq_axis" and "\\" in line:
                par_vals["freq_axis"].append(line[:-2])

    # If the freq_axis list does not contain the word 'default' or 'na'
    if any("default" not in s for s in par_vals["freq_axis"]) and any(
        "na" not in s for s in par_vals["freq_axis"]
    ):

        # Split the large string blocks into individual elements (e.g. ['50, 60, 70'] becomes ['50','60','70']
        par_vals["freq_axis"] = [y for x in par_vals["freq_axis"] for y in x.split(",")]

        # If continuation character did not allow for complete split of elements, split on continuation character
        par_vals["freq_axis"] = [
            y for x in par_vals["freq_axis"] for y in x.split("\\")
        ]

        # Split the first element, which will always be ['freq_axis = *'], into ['freq_axis','*']
        par_vals["freq_axis"] = [y for x in par_vals["freq_axis"] for y in x.split("=")]

        # Strip any leading or trailing blanks found in the freq_axis list
        par_vals["freq_axis"] = [x.strip(" ") for x in par_vals["freq_axis"]]

        # Remove any empty elements from freq_axis list
        par_vals["freq_axis"] = [x for x in par_vals["freq_axis"] if x]

        # If any continuation characters \ remain in freq_axis list, remove
        if "\\" in par_vals["freq_axis"]:
            par_vals["freq_axis"].remove("\\")

        # Delete the element 'freq_axis' from list
        del par_vals["freq_axis"][0]

        # Convert all remaining elements to float
        par_vals["freq_axis"] = [float(x) for x in par_vals["freq_axis"]]

    elif any("default" in s for s in par_vals["freq_axis"]):

        # If default was entered, set entire freq_axis entry to "default"
        par_vals["freq_axis"] = "default"

    elif any("na" in s for s in par_vals["freq_axis"]):

        par_vals["freq_axis"].append(log_scale)

        if max_freq != "NA":
            max_freq = float(max_freq)

        par_vals["freq_axis"].append(max_freq)
        par_vals["freq_axis"].append(float(min_freq))
        par_vals["freq_axis"].append(int(num_bins))

    """End of bypassed codeblock. Everything below is the line is used"""

    par_vals["freq_axis"] = freq_arr

    # Check if arguments are valid
    print(".......................................")
    print("local path to Oracle installation = ", par_vals["oracle_path"])
    print("local path to TNS admin = ", par_vals["tns_path"])
    print(".......................................")
    print("")

    if par_vals["schema"] != "kb" and par_vals["schema"] != "css":
        raise ValueError("Invalid schema: Schema type must be kb or css")
    actual_par = par_file.replace("_temp", "")
    if not os.path.exists(par_vals["oracle_path"]):
        print("")
        print("+++++++++++++++++")
        print(f"set correct Oracle path and user/password in {actual_par}")

        print("+++++++++++++++++")
        raise PathError(
            f"Path to Oracle does not exist: {par_vals['oracle_path']} (par file {actual_par})"
        )

    if not os.path.exists(par_vals["tns_path"]):
        print("")
        print("+++++++++++++++++")
        print(f"set correct TNS admin path and user/password in {actual_par}")

        print("+++++++++++++++++")
        raise PathError(
            f"TNS admin path does not exist: {par_vals['oracle_path']} (par file {actual_par})"
        )

    return par_vals


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
           The epoch time (seconds since 1970-01-01)

     """
    # Convert date to a datetime object
    dt = datetime.datetime(yr, mon, day, hr, minute, sec)

    # Subtract 1970-01-01 from date to retrieve epoch time. Return in seconds.
    epocht = (dt - datetime.datetime(1970, 1, 1)).total_seconds()

    return epocht


def query_info(station_info):
    """Parses the station rows in the parameter file into start_date, end_date, station, and channel arrays

     This function splits a station row, e.g. IM.BRD00.00.BDF       2011-08-11T19:12:55     2015-06-24T19:12:55
     into start date, end date, station, and channel (network and loc are not used). The function goes through each
     row and appends each of these values to an array.

     Returns arrays start_date, end_date, station, channel

     Note that start date and end date are converted to epoch time (seconds since 1970-01-01) using the function
     date_std_to_epocht.

     Parameters
       ------------
       station_info : list
        A list containing each station row in the input parameter file,
        e.g. IM.BRD00.00.BDF       2011-08-11T19:12:55     2015-06-24T19:12:55

        The list is output by function db_par_reader as a dictionary entry 'stat_info', i.e. db_vals['stat_info']

       Returns
       -------
       start_date: list
           List of all start dates in parameter file converted to epoch time (seconds since 1970-01-01)

        end_date: list
           List of all end dates in parameter file converted to epoch time (seconds since 1970-01-01)

        station: list
           List of all stations in parameter file. * or ? wildcards are converted to % symbol for use in Pisces

         channel: list
           List of all channels in parameter file. * or ? wildcards are converted to % symbol for use in Pisces

        Raises
        ---------

       ValueError
           An invalid value has been given in one of the arguments

     """

    # Initiate arrays

    start_date = []
    end_date = []
    station = []
    channel = []

    # Go through each line, parse, and append info to appropriate array
    for sta_line in station_info:
        sta_arr = sta_line.split()

        """Following block of code retrieves the standard start and end dates and
        converts them to epoch time"""

        # Verify start and end date strings are in correct format. Format must be xxxx-xx-xxTxx:xx:xx,
        # e.g. 2011-08-11T19:12:55.

        # re pattern reads as [0-9]{4}, i.e. 4 characters that must be between 0 and 9

        date_pattern = "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}"
        std_match = re.match(date_pattern, sta_arr[1])
        end_match = re.match(date_pattern, sta_arr[2])

        if std_match is None:
            raise ValueError(
                "The start date is not in the correct format. Format should be yr-mon-dayThr:min:sec, "
                "e.g. 2011-08-11T19:12:55"
            )

        if end_match is None:
            raise ValueError(
                "The end date is not in the correct format. Format should be yr-mon-dayThr:min:sec, "
                "e.g. 2011-08-11T19:12:55"
            )

        # Split the date and get yr-mon-day section for start and end date
        start_stddate = sta_arr[1].split("T").pop(0)
        end_stddate = sta_arr[2].split("T").pop(0)

        # Extract yr from yr-mon-day for start and end date
        start_yr = int(start_stddate.split("-").pop(0))
        end_yr = int(end_stddate.split("-").pop(0))

        # Extract mon from yr-mon-day for start and end date
        start_mon = int(start_stddate.split("-").pop(1))
        end_mon = int(end_stddate.split("-").pop(1))

        # Extract day from yr-mon-day for start and end date
        start_day = int(start_stddate.split("-").pop(2))
        end_day = int(end_stddate.split("-").pop(2))

        # Split the date and get hr:minute:sec section for start and end date
        # Note that specifying msec is optional
        start_stddate2 = sta_arr[1].split("T").pop(1)
        end_stddate2 = sta_arr[2].split("T").pop(1)

        # Extract hr from hr:minute:sec for start and end date
        start_hr = int(start_stddate2.split(":").pop(0))
        end_hr = int(end_stddate2.split(":").pop(0))

        # Extract minute from hr:minute:sec for start and end date
        start_min = int(start_stddate2.split(":").pop(1))
        end_min = int(end_stddate2.split(":").pop(1))

        # Extract sec from hr:minute:sec for start and end date
        start_sec = int(start_stddate2.split(":").pop(2))
        end_sec = int(end_stddate2.split(":").pop(2))

        # Convert start and end dates to epoch time (seconds since 1970-01-01)
        start_edate = str(
            date_std_to_epocht(
                start_yr, start_mon, start_day, start_hr, start_min, start_sec
            )
        )
        end_edate = str(
            date_std_to_epocht(end_yr, end_mon, end_day, end_hr, end_min, end_sec)
        )

        # Save start and end dates for all stations to start_date, end_date arrays
        start_date.append(start_edate)
        end_date.append(end_edate)

        """Following block of code retrieves the station and channel information for each station row"""

        # Crawl over each station row and split the station entry in the first column of the row
        sta_info = sta_arr[0].split(".")

        # Save station and channel names to station and channel arrays, respectively.
        # Replace ? or * wildcard with the % wildcard expected by Pisces/sqlAlchemy

        station.append(sta_info[1].replace("?", "%").replace("*", "%"))
        channel.append(sta_info[3].replace("?", "%").replace("*", "%"))

    return start_date, end_date, station, channel


def query_db(
    start_date, end_date, stat, chann, archive, session, Instrument, SiteChan, Sensor
):
    """Queries a database archive and returns all response file paths found for each station/channel pair defined
    in the parameter file.

    Parameters
    ------------
      start_date: list
           List of all start dates in parameter file converted to epoch time (seconds since 1970-01-01)

      end_date: list
           List of all end dates in parameter file converted to epoch time (seconds since 1970-01-01)

      station: list
           List of all stations in parameter file. * or ? wildcards are converted to % symbol for use in Pisces

      channel: list
           List of all channels in parameter file. * or ? wildcards are converted to % symbol for use in Pisces

    Raises
    ------

    EmptyQuery
        The query resulting from the input parameters returned no data, i.e., it's empty

    ArchiveNotMounted
        If using an archive, will result if the archive either has not been mounted or was incorrectly defined
        in the input parameter file

    Returns
    -------

    file_name: list
        List of all retrieved response file paths for each requested station/channel pair

    stat_name: list
        List of station/channel pairs, e.g. ANMO_BHZ

    10/30/20"""

    # print(start_date, end_date)

    inst_ids = (
        session.query(Instrument)
        .filter(SiteChan.sta == Sensor.sta)
        .filter(SiteChan.chanid == Sensor.chanid)
        .filter(Sensor.inid == Instrument.inid)
        .filter(SiteChan.chan.like(chann))
        .filter(SiteChan.sta.like(stat))
        .filter(Sensor.time <= end_date)
        .filter(Sensor.endtime >= start_date)
        .filter(Sensor.jdate.between(SiteChan.ondate, SiteChan.offdate))
    )

    if not inst_ids.all():
        raise EmptyQuery(
            f"The query found no data for station '{sta}' channel '{chann}' {start_date} - {end_date}. Modify requested station information in input file."
        )

    # print(inst_ids.all())

    # The Pisces query used to retrieve response file paths (above) is equivalent to the SQL Developer query below:

    # SELECT i.*
    # FROM DB_NAME.sitechan sc, DB_NAME.sensor s, DB_NAME.instrument i
    # WHERE sc.sta = s.sta
    # AND sc.chanid = s.chanid
    # AND s.inid = i.inid
    # AND sc.chan LIKE 'CHAN'
    # AND sc.sta LIKE 'STA'
    # AND s.time <= END_DATE and s.endtime >= START_DATE
    # AND s.jdate between sc.ondate and sc.offdate;

    stat_ids = (
        session.query(Sensor)
        .filter(SiteChan.sta == Sensor.sta)
        .filter(SiteChan.chanid == Sensor.chanid)
        .filter(Sensor.inid == Instrument.inid)
        .filter(SiteChan.chan.like(chann))
        .filter(SiteChan.sta.like(stat))
        .filter(Sensor.time <= end_date)
        .filter(Sensor.endtime >= start_date)
        .filter(Sensor.jdate.between(SiteChan.ondate, SiteChan.offdate))
    )

    # print(stat_ids.all())

    if not stat_ids.all():
        raise EmptyQuery(
            f"The query found no data for station '{sta}' channel '{chann}' {start_date} - {end_date}. Modify requested station information in input file."
        )

    # The Pisces query used to retrieve station and channel names corresponding to the retrieved response files (
    # above) is equivalent to the SQL Developer query below:

    # SELECT s.*
    # FROM DB_NAME.sitechan sc, DB_NAME.sensor s, DB_NAME.instrument i
    # WHERE sc.sta = s.sta
    # AND sc.chanid = s.chanid
    # AND s.inid = i.inid
    # AND sc.chan LIKE 'CHAN'
    # AND sc.sta LIKE 'STA'
    # AND s.time <= END_DATE and s.endtime >= START_DATE
    # AND s.jdate between sc.ondate and sc.offdate;

    # This query is specifically used to treat edge cases where a station/channel pair's response file changes
    # over the requested time period

    # Generate a list of all instrument ids (inst_ids) and station/channel ids (stat_ids)

    inst_list = inst_ids.all()
    stat_list = stat_ids.all()

    # Get length of inst_list and create range of values for the for loop
    in_lst = range(0, len(inst_list))

    # Initialize arrays
    file_name = []
    stat_arr = []
    samp_rate = []

    for in_id in in_lst:

        try:
            # If the instrument response file exists, proceed with for loop

            # Retrieve station and channel names from sensor table. Used to deal with edge case where
            # station/channel response file changes over requested period of time.
            stat_name = stat_list[in_id][0]
            chan_name = stat_list[in_id][1]

            # May add these as identifiers for unique response files. Not used for now.
            # inid = stat_list[in_id][4]
            # chanid = stat_list[in_id][5]

            # Retrieve path to response file archive containing physical response files. If on a Mac, paths are
            # updated to work with Pisces

            # get filename
            fname = inst_list[in_id].dfile

            # if on MacOS
            if platform.system() == "Darwin":
                resp_path = determine_non_windows_archive_path(
                    "MacOS", inst_list[in_id].dir, archive, fname
                )
            # if on Linux
            elif platform.system() == "Linux":
                resp_path = determine_non_windows_archive_path(
                    "Linux", inst_list[in_id].dir, archive, fname
                )

            # if on Windows
            else:
                # add filename to path
                resp_path = inst_list[in_id].dir + "\\" + fname

            samp_rate.append(inst_list[in_id].samprate)

            # Generate file_name array containing response file paths and stat_arr containing station/channel pairs
            # (e.g. ANMO_BHZ)

            file_name.append(resp_path)
            stat_arr.append(stat_name + "_" + chan_name)

        except FileNotFoundError:

            # Specifically skips blank entries in database table
            continue

    if not file_name:
        ids = [f"{stat_list[in_id][0]}.{stat_list[in_id][1]}" for in_id in in_lst]
        msg = f"Could not find any response files for ids: {ids}"
        logger.warn(msg)
        raise FileNotFoundError(msg)

    return file_name, stat_arr, samp_rate


def db_call(par_path):
    """Makes main script a function that can be called. When called, entire script will be run.

    Parameters
           ------------
           par_path : str
               The full filepath to the parameter file
               (e.g.,`/path/to/example.par`)

           Returns
           -------
           sol_dict: dictionary
               Types and definitions of each key are described later in the code
    """

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

    # --------------------------------------------------------------------------
    # Set up table classes
    # --------------------------------------------------------------------------

    # Retrieve table names and database accounts (if applicable) from dictionary db_vals

    table_list = db_vals["tables"].split(",")

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
        # Note that only tables with sensor, sitechan, or instrument in the name will be generated. Other tables
        # not necessary for query are ignored.

        # UniqueConstraint and PrimaryKeyConstraint are specifically used to assign unique and primary keys for each
        # table 

        for table_val in table_dict:

            if "sitechan" in table_val.lower():

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

            elif "sensor" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Sensor(base, kb.Sensor):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "chan", "time"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Sensor(kb.Sensor):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "chan", "time"),
                            {"keep_existing": True},
                        )

            elif "instrument" in table_val.lower():

                if table_dict[table_val].lower() != "na":

                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Instrument(base, kb.Instrument):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint(
                                "instype", "samprate", "ncalib", "dir", "dfile"
                            ),
                            PrimaryKeyConstraint("inid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Instrument(kb.Instrument):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint(
                                "instype", "samprate", "ncalib", "dir", "dfile"
                            ),
                            PrimaryKeyConstraint("inid"),
                            {"keep_existing": True},
                        )

    elif db_vals["schema"] == "css":
        # If using css schema

        # For each table in the dictionary, generate the class. If accessing from personal database, generate
        # class with both a declarative base and css schema. Otherwise, generate class with just css schema.
        # Note that only tables with sensor, sitechan, or instrument in the name will be generated. Other tables
        # not necessary for query are ignored.

        for table_val in table_dict:

            if "sitechan" in table_val.lower():

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

            elif "sensor" in table_val.lower():

                if table_dict[table_val].lower() != "na":
                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Sensor(base, css.Sensor):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "chan", "time", "endtime"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Sensor(css.Sensor):
                        __tablename__ = table_val
                        __table_args__ = (
                            PrimaryKeyConstraint("sta", "chan", "time", "endtime"),
                            {"keep_existing": True},
                        )

            elif "instrument" in table_val.lower():

                if table_dict[table_val].lower() != "na":
                    base = declarative_base(
                        metadata=MetaData(schema=table_dict[table_val])
                    )

                    class Instrument(base, css.Instrument):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint(
                                "instype", "samprate", "ncalib", "dir", "dfile"
                            ),
                            PrimaryKeyConstraint("inid"),
                            {"keep_existing": True},
                        )

                elif table_dict[table_val].lower() == "na":

                    class Instrument(css.Instrument):
                        __tablename__ = table_val
                        __table_args__ = (
                            UniqueConstraint(
                                "instype", "samprate", "ncalib", "dir", "dfile"
                            ),
                            PrimaryKeyConstraint("inid"),
                            {"keep_existing": True},
                        )

    # ---------------------------------------------------------------------------
    # Retrieve info needed to query database
    # ---------------------------------------------------------------------------

    [starting_date, ending_date, sta, chan] = query_info(db_vals["stat_info"])

    # --------------------------------------------------------------------------
    # Query database and return final FAP results
    # --------------------------------------------------------------------------

    """ The following block queries the database and returns FAP results for all requested stations in parameter file """

    # Total number of station rows in parameter file
    num_stat = len(sta)

    sol_dict = {"freq": [], "amp": [], "phase": []}

    count = 0
    for i in range(num_stat):

        count += 4

        # Query the database and retrieve all response file paths associated with each requested station/channel pair. Can
        # be multiple files if (a) a wildcard was used in the query, e.g. BH? or BH* or (b) if the response of a
        # station/channel pair changed during the requested time period. This second case will result in a warning and
        # the first available response file will be used for that pair. NOTE: Currently not applicable since wildcard
        # no longer in use.

        # file_array contains the response file paths, stat_array contains station/channel pair info used to check for
        # case (b) described above

        file_array, stat_array, samp_array = query_db(
            starting_date[i],
            ending_date[i],
            sta[i],
            chan[i],
            db_vals["archive"],
            session,
            Instrument,
            SiteChan,
            Sensor,
        )

        # Return the index of all unique station/channel pairs

        index = np.unique(stat_array, return_index=True)

        # Rewrite file_array to contain response files for only unique station/channel pairs
        # This deals with the edge case where a station/channel pair's response file changed during the
        # requested time period

        file_array2 = []

        for k in range(len(index[1])):
            file_array2.append(file_array[index[1][k]])

        # If non-unique station/channel pairs were found, print out a warning and which station(s) raised it

        if len(file_array) != len(file_array2):

            # inverse is a boolean array indicating whether a station/channel pair was found to be unique (True = 1) or not
            # (False = 0). The boolean array has the dimensions of the original array.

            inverse = np.unique(stat_array, return_inverse=True)

            for l in range(len(inverse[1])):

                if inverse[1][l] == 0:
                    warnings.warn(
                        "Found multiple response files for station/channel pair: '{}'. Using first response "
                        "file found.".format(stat_array[l]),
                        MultResponses,
                        stacklevel=2,
                    )

        # Pass in each response file path and process the response file. Return the final FAP results (frequency,
        # amplitude, phase) for each response file.

        for file_count in range(len(file_array2)):

            if all(isinstance(x, float) for x in db_vals["freq_axis"]):
                print("Using frequency axis from parameter file\n.")
                [freqs, amp, phase] = compute_resp(
                    file_array2[file_count], freqs=db_vals["freq_axis"]
                )

                sol_dict["freq"].append(freqs)
                sol_dict["amp"].append(amp)
                sol_dict["phase"].append(phase)

            elif db_vals["freq_axis"] == "default":
                print("Using default frequency axis\n.")
                [freqs, amp, phase] = compute_resp(file_array2[file_count])

                sol_dict["freq"].append(freqs)
                sol_dict["amp"].append(amp)
                sol_dict["phase"].append(phase)

            else:
                print("Building frequency axis\n.")

                # Start allows you to access correct frequency info for each station
                start = 4 * i

                log_scale = bool(db_vals["freq_axis"][start])
                max_freq = db_vals["freq_axis"][start + 1]
                min_freq = float(db_vals["freq_axis"][start + 2])
                num_freq = int(db_vals["freq_axis"][start + 3])

                # If maximum frequency is set to NA, set it equal to the sampling rate retrieved from the database
                if max_freq == "NA":

                    max_freq = samp_array[0]

                else:

                    max_freq = float(max_freq)

                # Call function compute_resp and return FAP information. Save FAP info for each station in solution
                # dictionary.
                [freqs, amp, phase] = compute_resp(
                    file_array2[file_count],
                    minfreq=min_freq,
                    maxfreq=max_freq,
                    numfreq=num_freq,
                    logscale=log_scale,
                )

                sol_dict["freq"].append(freqs)
                sol_dict["amp"].append(amp)
                sol_dict["phase"].append(phase)

    return sol_dict
