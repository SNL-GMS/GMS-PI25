"""
Python prototype of N. D. Selby's Multiple-Filter Generalized F-Detector

References:

Selby, N. D. (2008). Application of a generalized F detector at a seismometer array. Bulletin of the 
Seismological Society of America, 98(5), 2469-2481.

Selby, N. D. (2013). A multiple-filter F detector method for medium-aperture seismometer arrays. Geophysical 
Journal International, 192(3), 1189-1195.

Selby, N. D. (2013). A multiple-filter F detector method for medium-aperture seismometer arrays. Geophysical 
Journal International, 192(3), 1189-1195.
"""

import os
import pickle
import shutil
import sys
import time
import warnings
from argparse import SUPPRESS, Action, ArgumentParser
from enum import Enum
from pathlib import Path

import matplotlib  # imported for version info only
import numpy as np
import obspy
import scipy  # imported for version info only
import pisces # imported for version info only
import sqlalchemy # imported for version info only
from numba.core.errors import (
    NumbaDeprecationWarning,
    NumbaPendingDeprecationWarning,
    NumbaPerformanceWarning,
)
from obspy import UTCDateTime

from genf import (
    ArrayGeometry,
    Beamform,
    DataQualityControl,
    Detection,
    FrequencyTimeAnalysis,
    LogicalCounter,
    MinimumPowerBeam,
    NoisePowerSpectrum,
    Parameters,
    PassbandFilters,
    Wavedata,
    detector,
    longTermAverage,
    main_call,
)
from genf.plot import (
    plot_beamset,
    plot_beamweights,
    plot_fplots,
    plot_narrowband_filters,
    plot_noise_power_spectrum,
    plot_passband_filters,
    plot_traces,
)

# Suppress the following warnings
# We suppress performance warnings because we get one on the @ array multiplcation in beamloop.xtcx function
# and the deprecation as a matter of course.  Warnings shouldn't be suppressed in development however
warnings.simplefilter("ignore", category=NumbaDeprecationWarning)
warnings.simplefilter("ignore", category=NumbaPendingDeprecationWarning)
warnings.simplefilter("ignore", category=NumbaPerformanceWarning)


class DataSource(Enum):
    xxx = "xxx"
    ims = "ims"


def importWaveformData(inputDirectory, param):
    """
    Imports waveform data from a database for the entire time interval using CSS tables as specified in
    'wfReader.par'. Data are stored as ObsPy stream objects in 'wfDict' and 'wfStream'.
    """
    # Import waveform data for full time interval from database
    wfReadParFilename = os.path.join(inputDirectory, "wfReader", "wfReader.par")
    print("\nRead waveform reader parameter file %s" % wfReadParFilename)
    print("Import waveform data from database")
    start = time.time()
    wfDict = main_call(wfReadParFilename, "y", param.overlap)

    # Store traces in a standard list
    wfStream = []
    print("\nTraces:")
    for n in range(len(wfDict["traces"])):
        tr = wfDict["traces"][n]
        print(tr.stats, "\n")
        wfStream.append(tr)
    print("Total time elapsed: %f sec" % (time.time() - start))

    return wfDict, wfStream


def makeWavedata(inputDirectory, network, timePeriod, arrayGeom):
    """
    Reads IMS filenames from a specified folder in the data archive. Imports data from these files, prunes the segments to keep
    only those that match the sites and channels of interest, and demeans each remaining trace. Waveform data are stored
    as ObsPy stream objects in chronological order in 'wavedata'.
    """

    # Instantiate wavedata object for IMS data
    wavedata = Wavedata()
    # Directory containing IMS waveform data
    imsDirectory = os.path.join(inputDirectory, "dataArchive", network, timePeriod)
    # Retrieve all IMS filenames from a specified directory
    print("\nRead IMS filenames and seismogram data from %s" % imsDirectory)
    start = time.time()
    wavedata.readIMSFilenames(imsDirectory)
    # Read IMS files into Stream objects (entire set of waveform data are stored in a list of Stream objects as
    # 'wavedata.imsData')
    wavedata.readIMSData(imsDirectory)
    print("\nNumber of IMS files: %i" % wavedata.numIMS)
    # Prune segments in all IMS files to match only the network sites (array elements) and channels of interest
    wavedata.pruneSegments(arrayGeom)
    # Demean individual segments in each IMS file
    wavedata.demeanSegments()
    print("\nTotal time elapsed: %f sec" % (time.time() - start))
    return wavedata


def write_detection(detection, outputDirectory) -> str:
    """Write detection to outputDirectory"""
    # Create detection subfolder
    print("\nCreate detection subfolder")
    filenameRoot = str(detection.dateTime).translate({ord(i): None for i in "-:"})[0:15]
    subdir = os.path.join(outputDirectory, filenameRoot)
    if not os.path.exists(subdir):
        os.mkdir(subdir)
        print("Subfolder '%s' created successfully" % subdir)
    else:
        print("Subfolder '%s' already exists" % subdir)
    # Save current detection information ('Detection' object) as Python pickle file in output subdirectory
    print("Save detection object to output subdir")
    with open(os.path.join(subdir, f"{filenameRoot}_det.obj"), "wb") as filehandle:
        pickle.dump(detection, filehandle)
    return subdir


def write_detections_and_plot(
    detections, interval: str, dataQC, arrayGeom, step, numFreq, freq, overlap, outputDirectory
):
    samplingRate = dataQC.array[0].stats.sampling_rate
    numChan = arrayGeom.numSites
    # Write out the detections and plot them if asked
    for detection in detections:
        detection_output_dir = write_detection(detection, outputDirectory)
        # Plot individual traces and beam weights and save to output subdirectory. (Traces currently do not
        # include UTCDateTime formatting along the horizontal axis... working on it.)
        # Plot titles convey start and end times for each trace
        plotTitle = interval
        print("Plot and save traces")
        plot_traces(detection, plotTitle, samplingRate, step, overlap, detection_output_dir)
        print("Plot and save detection beam weights")
        plot_beamweights(
            detection, arrayGeom, numChan, freq, numFreq, detection_output_dir
        )


def runGenFDetector(
    array,
    arrayGeom,
    dataQC,
    param,
    beamform,
    noisePowerLTA,
    fstatLTA,
    xstatLTA,
    passbandFilters,
    currentDetection,
    signalPresent,
    detecting,
    verbose,
    plots,
    outputDirectory,
):
    """
    Processes a given time segment (i.e., processing interval), including data quality control, frequency-time
    analysis, minimum-power beamforming, and the detection phase. Returns a list of detections, if any, and
    the 'currentDetection' object to be passed to the next time segment.
    """

    # Perform data quality control (upsampling, bandpass filtering, power masking) on waveform data
    print("\nPerform data quality control on waveform data:")
    start = time.time()

    dataQC.performDataQualityControl(
        array, param.sampleRate, param.filterFreq, param.maxPowerRatio
    )
    print("Total time elapsed: %f sec" % (time.time() - start))

    print("\nTraces in current processing interval:")
    for tr in dataQC.array:
        print(tr)
        # fout = os.path.join(outputDirectory, f"{tr.stats.station}.{tr.stats.channel}_waveform.png")
        # tr.plot(color='blue')

    # Number of sample points in each waveform, determined from first trace in array
    npts = array[0].stats.npts
    # Sampling distance (in sec) between sample points
    delta = array[0].stats.delta

    # Instantiate frequency-time analysis object
    print("\nInstantiate frequency-time analysis object")
    time.time()
    fta = FrequencyTimeAnalysis(
        param.freq, param.numFreq, param.fmin, param.fmax, delta, npts
    )
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Design narrowband filters used for frequency-time analysis. Assumes that all waveforms across the channels
    # have the same signal length. These filters are stored in the 'fta' object and will be later used for
    # frequency-time analysis during the detection phase, per time segment.
    print("\nDesign narrowband filters")
    start = time.time()
    fta.narrowbandFilters()
    print("Total time elapsed: %f sec" % (time.time() - start))
    # Plot narrowband filters
    if plots:
        plot_narrowband_filters(fta, param.numFreq, outputDirectory)

    # Frequency-time analysis (multiple-filter approach) of the waveforms
    print("\nPerform frequency-time analysis on the waveforms")
    start = time.time()
    fta.mfanSeismicArray(dataQC.array)
    print("delta: %0.6f sec" % fta.delta)
    print("npts: %d" % fta.npts)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Plot passband filters superimposed on narrowband filters (see Fig. 1 in Selby, 2013)
    if plots:
        corners = param.passbandFilters
        plot_passband_filters(
            passbandFilters, fta, param.freq, param.numFreq, corners, outputDirectory
        )

    # Expand power mask for current array to a point-by-point array to match Selby's format
    maskArray = np.tile(dataQC.mask, (npts, 1))

    # Instantiate minimum power beam object
    mpBeam = MinimumPowerBeam()
    # Compute beam weights for current time segment / IMS file
    print("\nCompute beam weights")
    start = time.time()
    mpBeam.detBeamWeights(beamform, param, dataQC.mask, param.freq, arrayGeom.numSites)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Detection phase
    print("\nRun detector")
    # Run detector function for current time segment / IMS file
    start = time.time()
    # Run the detector and output any new detections in 'detectionsList'
    detectionsList, currentDetection, fout, interval = detector(
        arrayGeom,
        dataQC.array,
        param,
        beamform,
        fta,
        mpBeam,
        passbandFilters,
        maskArray,
        noisePowerLTA,
        fstatLTA,
        xstatLTA,
        currentDetection,
        signalPresent,
        detecting,
        verbose,
    )
    print("\nTotal time elapsed: %f sec" % (time.time() - start))
    return detectionsList, currentDetection, fout, interval


def run(
    inputDirectory,
    outputDirectory,
    data_source,
    network,
    ims_data_dir,
    verbose,
    plots,
    fplots,
    passband_index,
    snr,
):
    """
    Main entry point for Gen-f processing. Sets up everything to perform detections for consecutive processing
    intervals.
    """

    outputDirectory = os.path.join(outputDirectory, network)
    # Create output directory
    if not os.path.exists(outputDirectory):
        os.makedirs(outputDirectory, exist_ok=True)
        print("\nDirectory '%s' created successfully" % outputDirectory)
    else:
        print("\nDirectory '%s' already exists" % outputDirectory)

    # Instantiate parameters object
    param = Parameters(snr=snr)
    # Array parameter filename
    parFilename = os.path.join(inputDirectory, "par", f"{network}.par")
    # Import parameters from file
    print("\nRead network parameters from %s" % parFilename)
    start = time.time()
    param.readParameters(parFilename)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Import waveform data from database
    if data_source == DataSource.xxx:
        wfDict, wfStream = importWaveformData(inputDirectory, param)
        waveform_dir = os.path.join(outputDirectory, "waveforms")
        # Write out waveform trace images
        if not os.path.exists(waveform_dir):
            os.makedirs(waveform_dir, exist_ok=True)
        for tr in wfStream:
            fout = os.path.join(
                waveform_dir, f"{tr.stats.station}.{tr.stats.channel}_waveform.png"
            )
            tr.plot(color="blue", outfile=fout)

    # Instantiate array geometry object
    arrayGeom = ArrayGeometry()
    if data_source == DataSource.xxx:
        # Import array geometry information from waveform metadata
        print("\nImport array geometry from waveform metadata")
        start = time.time()
        arrayGeom.importArrayGeometryDatabase(wfDict, param.beamPoint)
    else:
        # Array geometry filename
        arrayGeomFilename = os.path.join(inputDirectory, "channels", f"{network}.geom")
        # Import array geometry information from file
        print("\nRead array geometry file %s" % arrayGeomFilename)
        start = time.time()
        arrayGeom.readArrayGeometryFile(arrayGeomFilename)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Instantiate beam parameters object
    beamform = Beamform()
    # Import beam parameters from beam-recipe file (all attributes are stored in 'beamform' object)
    beamParFilename = os.path.join(inputDirectory, "beamsets", param.beamParFilename)
    print("\nRead beam recipe from %s" % beamParFilename)
    start = time.time()
    beamform.readBeamset(beamParFilename)
    print("\nNumber of beam components: %i" % beamform.numBeam)
    print("Total time elapsed: %f sec" % (time.time() - start))
    # Plot beamset in polar coordinates
    if plots:
        plot_beamset(beamform, outputDirectory, network)
    # Generate array geometry relative to beam point, i.e., array reference point
    print("\nGenerate array geometry relative to beam point")
    # Compute distances and offsets using lat/lon values for set of array elements and array reference point,
    # stored as attributes of 'beamform' object
    start = time.time()
    beamform.distAndOffset(
        arrayGeom.siteLat,
        arrayGeom.siteLon,
        param.beamPoint[0],
        param.beamPoint[1],
        arrayGeom.numSites,
    )
    # Compute time delays, i.e., attribute 'dt', for each beam and station combination
    beamform.delays()
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Import data from IMS files
    if data_source == DataSource.ims:
        wavedata = makeWavedata(inputDirectory, network, ims_data_dir, arrayGeom)

    # Read in both noise power spectrum and FAP instrument response from file and modulate the initial noise power
    # spectrum at the frequencies interest. Instantiate noise power spectrum object
    NP = NoisePowerSpectrum()
    # Import noise power spectrum from file
    noiseSpectrumFilename = os.path.join(
        inputDirectory, "noiseModel", param.noiseSpectrumFilename
    )
    print("\nRead noise power spectrum from %s" % noiseSpectrumFilename)
    start = time.time()
    NP.readNoisePowerSpectrum(noiseSpectrumFilename)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Import FAP instrument response data from database or from response files
    if data_source == DataSource.xxx:
        respParFilename = os.path.join(inputDirectory, "libresponse", "response.par")
        print("\nRead instrument response parameter file %s" % respParFilename)
        print("Import instrument response data from database")
        start = time.time()
        calib = np.array(wfDict["calib"][0]).astype(float).item()
        calper = np.array(wfDict["calper"][0]).astype(float).item()
        print("calib:", calib, "calper:", calper)
        NP.importInstrumentResponseDatabase(calib, calper, respParFilename)
    else:
        # Import FAP instrument response data from file
        responseFilename = os.path.join(
            inputDirectory, "responses", param.responseFilename
        )
        start = time.time()
        NP.readInstrumentResponseFilename(responseFilename)

    print("Total time elapsed: %f sec" % (time.time() - start))

    # Generate frequencies of interest
    print("\nGenerate frequencies of interest")
    param.generateFrequencies()
    print(f"fmin: {param.fmin}, fmax: {param.fmax}")
    print(f"Number of frequencies: {param.numFreq}")

    # Modulate noise power spectrum with instrument response, interpolating both at the desired frequencies
    print("\nModulate noise power spectrum with instrument response")
    start = time.time()
    # Final noise power is unitless
    noisePower = NP.modulateNoisePowerSpectrum(param.freq)
    print("Total time elapsed: %f sec" % (time.time() - start))
    # Plot noise power spectrum
    if plots:
        plot_noise_power_spectrum(param.freq, noisePower, outputDirectory)

    # Check that minimum number of channels is satisfied
    if data_source == DataSource.xxx:
        unique_channels = {
            f"{trace.stats.station}.{trace.stats.channel}" for trace in wfStream
        }
    else:
        unique_channels = {
            f"{trace.stats.station}.{trace.stats.channel}"
            for stream in wavedata.imsData
            for trace in stream
        }
    if len(unique_channels) < param.minChannels:
        channel_source = (
            "wfReader.par" if data_source == DataSource.xxx else "ims files"
        )
        print(
            f"Error: Not enough unique channels in {channel_source} to run gen-f.  Using {unique_channels} channels"
        )
        exit(-1)

    # Instantiate passband filters object
    print("\nInstantiate passband filters object")
    start = time.time()
    passbandFilters = PassbandFilters()
    # Design passband filters for specified frequency bands in network parameter file, where 'param.passbandFilters'
    # contains the corners of the passbands. Passband filters are functions of frequency and allow variability in
    # source and path characteristics.
    print("\nDesign passband filters")
    passbandFilters.generatePassbandFilters(param.freq, param.passbandFilters)
    print("Total time elapsed: %f sec" % (time.time() - start))

    if fplots:
        do_detect_for_fplots(
            param,
            noisePower,
            beamform,
            arrayGeom,
            passbandFilters,
            passband_index,
            wfStream,
            outputDirectory,
            verbose,
        )
    else:
        data = wfStream if data_source == DataSource.xxx else wavedata
        do_detect(
            param,
            noisePower,
            beamform,
            arrayGeom,
            passbandFilters,
            data_source,
            data,
            outputDirectory,
            plots,
            verbose,
        )

    print("\npython version: ", ".".join(map(str, sys.version_info[:3])))
    print("numpy version: ", np.__version__)
    print("scipy version: ", scipy.__version__)
    print("obspy version: ", obspy.__version__)
    print("matplotlib version: ", matplotlib.__version__)
    print("pisces version: ", pisces.__version__)
    print("sqlalchemy version: ", sqlalchemy.__version__)


def do_detect(
    param,
    noisePower,
    beamform,
    arrayGeom,
    passbandFilters,
    data_source,
    data,
    outputDirectory,
    plots: bool,
    verbose: bool,
):
    """
    Do the main work of detection for XXX or IMS runs that don't involve producing F-distributions plots.
    Main work of detection includes creating the Long Term Averages and data quality control objects
    and feeding the data to the detection algorithm given how the data is structured given its data source.
    """

    wavedata = data
    wfStream = data
    # Instantiate recursive longterm averages (LTAs)
    print("\nInstantiate longterm averages")
    start = time.time()
    noisePowerLTA, fstatLTA, xstatLTA = longTermAverage.instantiateLTAs(
        param, noisePower, beamform.numBeam
    )
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Instantiate logical counters
    print("\nInstantiate logical counters for signal present and detecting modes")
    start = time.time()
    # Instantiate 'signalPresent', 'detecting', and 'currentDetection' objects
    signalPresent = LogicalCounter()
    detecting = LogicalCounter()
    currentDetection = Detection()
    # Initialize values at zero
    spValue = detValue = 0
    signalPresent.initiate(spValue)
    detecting.initiate(detValue)
    print("Total time elapsed: %f sec" % (time.time() - start))

    # Instantiate data quality control object
    dataQC = DataQualityControl()

    # Run the Gen-F detector per time segment. Long-term averages and logical counters are updated at the end of the
    # detection phase and carried over to the next time segment without the use of I/O files.
    print("\nStarting detection phase")
    # Summary filename containing basic detection information from each run of the detector function. File is created
    # at end of all detections.
    summaryFilename = os.path.join(outputDirectory, "summary.txt")
    # List of all detections in over the entire processing interval / IMS files
    detectionsTotal = []
    # Switch for detection stage
    processing = True
    # Process overlapping time segments until end of data is reached
    if data_source == DataSource.xxx:
        # Start time of detection stage (excluding overlap region)
        dt = UTCDateTime(float(wfStream[0].stats.sac["user1"]))
        print(f"Start time: {dt}")
        while processing:
            # Create array of traces for current interval
            array = []
            # Loop over each trace in the stream
            for tr in wfStream:
                # Trim the segment in the current processing interval, including overlap at each end. Make a copy to
                # preserve the original trace.
                segment = tr.copy().trim(
                    dt - param.overlap,
                    dt + param.interval + param.overlap - tr.stats.delta,
                )
                array.append(segment)

            # Add any detections to list of total detections over the entire time period
            detections, currentDetection, fout, interval = runGenFDetector(
                array,
                arrayGeom,
                dataQC,
                param,
                beamform,
                noisePowerLTA,
                fstatLTA,
                xstatLTA,
                passbandFilters,
                currentDetection,
                signalPresent,
                detecting,
                verbose,
                plots,
                outputDirectory,
            )
            detectionsTotal.extend(detections)
            write_detections_and_plot(
                detections,
                interval,
                dataQC,
                arrayGeom,
                step=param.step,
                numFreq=param.numFreq,
                freq=param.freq,
                overlap=param.overlap,
                outputDirectory=outputDirectory,
            )

            # Proceed to next processing interval
            dt += param.interval

            # If any trace end-time precedes end of next processing interval, turn off processing status
            for tr in wfStream:
                if (
                    tr.stats.endtime.timestamp
                    < (dt + param.interval + param.overlap - tr.stats.delta).timestamp
                ):
                    print("\nEnd of last processing interval")
                    processing = False
                    break
    else:
        # Loop over IMS files (time segments)
        for fileNum in range(wavedata.numIMS):
            print("\nFile number %d: %s" % (fileNum, wavedata.imsFilenames[fileNum]))
            # Waveform data and metadata for all channels in current IMS file
            array = wavedata.imsData[fileNum]
            detections, currentDetection, fout, interval = runGenFDetector(
                array,
                arrayGeom,
                dataQC,
                param,
                beamform,
                noisePowerLTA,
                fstatLTA,
                xstatLTA,
                passbandFilters,
                currentDetection,
                signalPresent,
                detecting,
                verbose,
                plots,
                outputDirectory,
            )
            detectionsTotal.extend(detections)
            write_detections_and_plot(
                detections,
                interval,
                dataQC,
                arrayGeom,
                step=param.step,
                numFreq=param.numFreq,
                freq=param.freq,
                overlap=param.overlap,
                outputDirectory=outputDirectory,
            )

    # Write basic detection information to output summary file
    print("\nWriting detection information to %s" % summaryFilename)
    with open(summaryFilename, "w") as f:
        for detection in detectionsTotal:
            row = [
                str(detection.dateTime)[0:23],
                "%3.1f" % detection.azi,
                "%0.3f" % detection.slow,
                "%3.1f" % detection.stat,
                "%1.2f" % detection.prob,
                detection.numUse,
                detection.beam,
                detection.band,
            ]
            f.write(
                "{: >23} {: >8} {: >6} {: >33} {: >6} {: >3} {: >4} {: >3}\n".format(
                    *row
                )
            )


def do_detect_for_fplots(
    param,
    noisePower,
    beamform,
    arrayGeom,
    passbandFilters,
    passband_num,
    wfStream,
    outputDirectory,
    verbose,
):
    """
    Do the main work of detection with the goal of producing F-distribution plots.  This is 
    similar to do_detect() which does not produce F-distribution plots.
    """
    # Check if passband index is within the acceptable range, [0, passbandFilters.numBand - 1]
    numBand = np.shape(param.passbandFilters)[0]
    if passband_num is not None and (passband_num < 0 or passband_num > numBand - 1):
        print(
            f"\nError: Passband index {passband_num} is out of acceptable range: 0 - {numBand - 1}"
        )
        exit(-1)

    # If 'passband_num' is not specified at command line, default to the passband with the highest degree of
    # freedom, 'passbandFilters.degF'. If two or more passbands have the highest DOF, select the first:
    print(passbandFilters.degF)
    if passband_num is None:
        passband_num = np.argmax(passbandFilters.degF)

    # Regular detection and associated plots are not created in this application
    plots = False
    # Start time of each detection stage (excluding overlap region)
    startTime = UTCDateTime(float(wfStream[0].stats.sac["user1"]))
    # Run Gen-F with and without correlated noise accounted for and collect F-stat values in each case

    for correlateNoise in [True, False]:

        # Set switch for accounting for correlated noise
        param.correlatedNoise = int(correlateNoise)
        print("\nCORRELATED_NOISE =", param.correlatedNoise)

        # Instantiate and initialize recursive longterm averages (LTAs)
        print("\nInstantiate longterm averages")
        start = time.time()
        noisePowerLTA, fstatLTA, xstatLTA = longTermAverage.instantiateLTAs(
            param, noisePower, beamform.numBeam
        )
        print("Total time elapsed: %f sec" % (time.time() - start))

        # Instantiate logical counters for 'signalPresent' and 'detecting'
        print("\nInstantiate logical counters for signal present and detecting modes")
        start = time.time()
        signalPresent = LogicalCounter()
        detecting = LogicalCounter()
        # Initialize values at zero
        spValue = detValue = 0
        signalPresent.initiate(spValue)
        detecting.initiate(detValue)
        print("Total time elapsed: %f sec" % (time.time() - start))

        # Instantiate data quality control object
        dataQC = DataQualityControl()

        # Instantiate current detection object
        currentDetection = Detection()

        if correlateNoise:
            # Correlated noise switch on
            print("\nStarting detection phase with correlated noise switch on")
            # F-stat values for passband of interest as a function of azimuth and slowness, averaged over time
            fstatBeams_correlated = np.zeros(beamform.numBeam, dtype=float)
            # F-stat values for passband of interest for all beams and time points
            fstatTime_correlated = []
        else:
            # Correlated noise switch off
            print("\nStarting detection phase with correlated noise switch off")
            # F-stat values for passband of interest as a function of azimuth and slowness, averaged over time
            fstatBeams_uncorrelated = np.zeros(beamform.numBeam, dtype=float)
            # F-stat values for passband of interest for all beams and time points
            fstatTime_uncorrelated = []

        # Switch for detection stage
        processing = True
        # Set start time of detection stage (excluding overlap region)
        dt = startTime
        # Start counter for number of time segments
        count = 0
        # Process overlapping time segments until end of data is reached
        while processing:
            # Create array of traces for current interval
            array = []
            # Loop over each trace in the stream
            for tr in wfStream:
                # Trim the segment in the current processing interval, including overlap at each end. Make a copy to
                # preserve the original trace.
                segment = tr.copy().trim(
                    dt - param.overlap,
                    dt + param.interval + param.overlap - tr.stats.delta,
                )
                array.append(segment)

            # Run detector for current time segment
            detections, currentDetection, fout, _ = runGenFDetector(
                array,
                arrayGeom,
                dataQC,
                param,
                beamform,
                noisePowerLTA,
                fstatLTA,
                xstatLTA,
                passbandFilters,
                currentDetection,
                signalPresent,
                detecting,
                verbose,
                plots,
                outputDirectory,
            )

            # Collect appropriate F-stat values from 'xstat' of dimensions [numBand, numBeam, nloop] where 'nloop'
            # is the number of time points evaluated in the detector time loop
            if correlateNoise:
                fstatBeams_correlated += np.average(fout[passband_num, :, :], axis=1)
                fstatTime_correlated.append(fout[passband_num, :, :])
            else:
                fstatBeams_uncorrelated += np.average(fout[passband_num, :, :], axis=1)
                fstatTime_uncorrelated.append(fout[passband_num, :, :])

            # Increase segment count and proceed to next processing interval
            count += 1
            dt += param.interval

            # If any trace end-time precedes end of next processing interval, turn off processing status
            for tr in wfStream:
                if (
                    tr.stats.endtime.timestamp
                    < (dt + param.interval + param.overlap - tr.stats.delta).timestamp
                ):
                    print("\nEnd of last processing interval")
                    processing = False
                    break

        if correlateNoise:
            # Average over number of time segments
            fstatBeams_correlated /= count
            # Convert list to array
            fstatTime_correlated = np.asarray(
                fstatTime_correlated, dtype=float
            ).reshape(-1)
        else:
            # Average over number of time segments
            fstatBeams_uncorrelated /= count
            # Convert list to array
            fstatTime_uncorrelated = np.asarray(
                fstatTime_uncorrelated, dtype=float
            ).reshape(-1)

    # Plot F distributions
    degF = passbandFilters.degF[passband_num]
    plot_fplots(
        fstatTime_correlated,
        fstatBeams_correlated,
        fstatTime_uncorrelated,
        fstatBeams_uncorrelated,
        azi=beamform.azi,
        slow=beamform.slow,
        numSites=arrayGeom.numSites,
        degF=degF,
        outputDirectory=outputDirectory,
    )


def configure_parser():
    """Configures the argument parser"""
    description = """
    gen-f Python prototype of N. D. Selby's Multiple-Filter Generalized F-Detector
"""
    parser = ArgumentParser()
    parser = ArgumentParser(description=description, add_help=False)

    # This use of argument groups + adding help back in is simply
    # to force --help to show optional arguments and required arguments
    # correctly (as argparse assumes any '--' arguments are optional)
    required = parser.add_argument_group("required arguments")
    cond_required = parser.add_argument_group("conditionally required arguments")
    parser.add_argument_group("optional arguments")
    exclusive = parser.add_mutually_exclusive_group()

    # Add back help
    parser.add_argument(
        "-h",
        "--help",
        action="help",
        default=SUPPRESS,
        help="show this help message and exit",
    )
    required.add_argument(
        "--input",
        "-i",
        dest="input_dir",
        type=str,
        required=True,
        help="Input directory. Input directories must conform to a particular structure.  "
        "See the Gen-F user manual pdf for further information.  "
        "Or to have gen-f create an example Input directory with .par files and sample data, use the --init-input-dir argument",
    )
    parser.add_argument(
        "--output",
        "-o",
        dest="output_dir",
        type=str,
        required=False,
        default="Output",
        help="Output directory, defaults to ./Output.  Ignored if using '--fplots'",
    )
    cond_required.add_argument(
        "--data-source",
        "-d",
        dest="data_source",
        choices=list(DataSource),
        metavar=set(DataSource.__members__),
        type=DataSource.__getitem__,
        required=False,
        help="Whether the source of the waveforms is the XXX database or ims files.  Required if not using '--fplots'",
    )
    cond_required.add_argument(
        "--ims-data-dir",
        dest="ims_data_dir",
        type=str,
        help="Subdirectory of {INPUT_DIR}/dataArchive/{NETWORK}/ where .ims waveform data is located.  Required if using '--data-source ims'.",
    )
    exclusive.add_argument(
        "--plot",
        dest="plots",
        action="store_true",
        help="Plot and save filters, beamset, traces, and beam weights as the program runs. Mutually exclusive with --fplots",
    )
    exclusive.add_argument(
        "--fplots",
        dest="fplots",
        action="store_true",
        help="Create F-distribution plots using data from XXX.  Mutually exclusive with --plot",
    )
    parser.add_argument(
        "--passband-index",
        dest="passband_index",
        type=int,
        help="Passband index for which to create the F-distribution plots.  If not provided, the widest passband is used",
    )
    parser.add_argument(
        "--verbose",
        dest="verbose",
        action="store_true",
        help="Output intermediate information throughout the detector function for every time point, beam, etc., "
        "based on Selby's code. This is not recommended due to increase computation time.",
    )
    required.add_argument(
        "--network", "-n", type=str, required=True, help="Seismic array network"
    )
    snr = 2.5
    parser.add_argument(
        "--snr",
        dest="snr",
        type=float,
        default=snr,
        help=f"Signal-to-noise ratio threshold for detection. If unspecified defaults to {snr}"
    )

    # Init input dir should ignore other arguments and whether or not they're required
    # So make a custom action that will exit arg parsing after it does what it needs to do
    class InitInput(Action):
        def __call__(self, parser, namespace, values, option_string):
            if os.path.exists("Input"):
                print("Directory 'Input' already exists; aborting")
                sys.exit(-1)
            src = Path(__file__).parent / "Input"
            dest = Path("Input")
            shutil.copytree(src, dest)
            print(
                f"Created directory {dest.resolve()} with example .par files and input data"
            )
            parser.exit()

    parser.add_argument(
        "--init-input-dir",
        dest="init_input_dir",
        action=InitInput,
        nargs=0,
        required=False,
        help="Initialize an input configuration and data directory called 'Input' under the current working directory. "
        "This directory will be structured in the way gen-f expects with example .par files and a small input data set "
        "for the CMAR network that is runnable via `gen-f -i Input -n CMAR -d ims --plot`.  This option aims to give users "
        "a quick way to get a working input directory that they can then modify for their own purposes.  Users are expected "
        "to modify Input/libresponse/response.par and Input/waveformReader/wfReader.par to set Oracle-related fields "
        "if they are planning to use the database with the `--data-source XXX` option",
    )
    return parser


def validate_args(args, parser):
    """Validates the command line interface arguments"""
    # if using --fplots, force data source to XXX
    if args.fplots and args.data_source:
        parser.error(
            "gen-f: error: the following argument is not allowed when using argument --fplots: --data-source/-d"
        )
        sys.exit(-1)

    # Data source is required if not using --fplots
    if not args.fplots and not args.data_source:
        parser.error(
            "gen-f: error: the following arguments are required: --data-source/-d"
        )
        sys.exit(-1)

    # Input directory exists and is a directory
    if not os.path.exists(args.input_dir):
        print(f"Input directory '{args.input_dir}' does not exist")
        sys.exit(-1)
    if not os.path.isdir(args.input_dir):
        print(f"Input directory '{args.input_dir}' is not a directory")

    # Input directory has appropriate subdirectory and network par file
    expected_par_file = os.path.join(args.input_dir, "par", f"{args.network}.par")
    if not os.path.exists(expected_par_file):
        print(
            f"Expected par file {expected_par_file} for seismic array network {args.network} not found."
        )
        sys.exit(-1)

    # If IMS data source, ensure subdirectory exists
    network_dir = os.path.join(args.input_dir, "dataArchive", args.network)
    if args.data_source == DataSource.ims:
        if not args.ims_data_dir:
            dirs = (
                [path.name for path in Path(network_dir).iterdir() if path.is_dir()]
                if os.path.exists(network_dir)
                else None
            )
            suggest = f": perhaps specify one of {dirs}" if dirs else ""
            parser.error(
                f"Data source is 'ims' but no --ims-data-dir specified{suggest}"
            )
            sys.exit(-1)

        data_dir = os.path.join(network_dir, args.ims_data_dir)
        if not os.path.exists(data_dir):
            parser.error(f"specified '{data_dir}' does not exist")
            sys.exit(-1)

    # Output directory exists or we're able to create it
    if not os.path.exists(args.output_dir):
        try:
            print(f"Making output directory {args.output_dir}")
            os.makedirs(args.output_dir, exist_ok=True)
        except Exception as e:
            print(
                f"Output directory '{args.output_dir}' does not exist and cannot create it: {e}"
            )
            sys.exit(-1)
    if not os.path.isdir(args.output_dir):
        print(f"Output directory '{args.output_dir}' is not a directory")
        sys.exit(-1)


def main():
    parser = configure_parser()
    args = parser.parse_args()
    validate_args(args, parser)

    data_source = args.data_source if args.data_source is not None else DataSource.xxx
    print(f"Running gen-f with args: {vars(args)}")
    run(
        args.input_dir,
        args.output_dir,
        data_source=data_source,
        network=args.network,
        ims_data_dir=args.ims_data_dir,
        verbose=args.verbose,
        plots=args.plots,
        fplots=args.fplots,
        passband_index=args.passband_index,
        snr=args.snr
    )
