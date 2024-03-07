import time as rtime
from copy import deepcopy

import numpy as np
from obspy import UTCDateTime
from scipy import special

from .beamloop import iter_beams


class Detection:
    """
	Provides a structure for storing information associated with an individual detection. Note that while the 
	beam weights are actually complex, as computed in the 'MinimumPowerBeam' class, Selby only keeps the real 
	part here, which is then used to reconstruct the beam waveform 'beamTrace'.
	"""

    def __init__(self):
        """
		       'time' : Elapsed time since midnight UTC of January 1, 1970 [sec] (real float) 
		   'dateTime' : Date and time in year, month, day, hour, min, sec, um (string)
		       'stat' : F-stat value for detection beam and passband (real float)
		       'prob' : Detection probability corresponding to F-stat above (real float)
		       'beam' : Beam index associated with maximum F-stat value, i.e., detection beam
		        'azi' : Azimuth of detection beam [deg] (real float) 
		       'slow' : Slowness of detection beam [km/sec] (real float)
		     'numUse' : Number of channels used, i.e., unmasked channels, at time of detection (int)
		      'sites' : List of all array element names whose data are used in detection process (string)
		       'freq' : Frequencies of interest, one per narrowband filter, used in detection process [Hz] 
		                (real float) 
		       'band' : Passband index associated with maximum F-stat value, i.e., detection passband (int)
		     'filter' : Amplitude profile of detection passband at frequencies of interest (real float)
		         'dt' : Time delays for set of channels relative to detection beam [sec] (real float) 
		 'noisePower' : Noise power LTA at time of detection as a function of frequency [nm^2/Hz] (real float)
		    'weights' : Weight assigned per frequency per channel for detection beam (real float)
		  'posterior' : Posterior of inverse prior matrix per frequency for detection beam (real float)
		       'mask' : Power mask value per channel for detection beam (boolean)
		  'statTrace' : x-stat trace for time segment in which detection occurred (real float)
		  'probTrace' : Corresponding detection probability for x-stat trace above (real float)
		  'beamTrace' : Reconstructed beam waveform (real float)
		"""

        self.time = None
        self.dateTime = None
        self.stat = None
        self.prob = None
        self.beam = None
        self.azi = None
        self.slow = None
        self.numUse = None
        self.sites = None
        self.freq = None
        self.band = None
        self.filter = None
        self.dt = None
        self.noisePower = None
        self.weights = None
        self.posterior = None
        self.mask = None
        self.statTrace = None
        self.probTrace = None
        self.beamTrace = None


def detector(
    arrayGeom,
    array,
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
):
    """
	Driver program to run the generalized F detector. Operates on a single time segment with narrowband-filtered 
	waveform data contained in 'fta' object.

	      'arrayGeom' : 'ArrayGeometry' 
	          'array' : Stream object containing waveform data and metadata for all channels in the current
	                    processing interval
	          'param' : 'Parameters' object 
	       'beamform' : 'Beamform' object
	            'fta' : 'FrequencyTimeAnalysis' object 
	         'mpbeam' : 'MinimumPowerBeam' object
	'passbandFilters' : 'PassbandFilters' object
	      'maskArray' : Power mask for channels in array [npts, numChan] (boolean)
	  'noisePowerLTA' : 1D list of recursive LTA objects for noise power
	       'fstatLTA' : 2D list of recursive LTA objects for f-statistic (noise)
	       'xstatLTA' : 2D list of recursive LTA objects for x-statistic (signal and noise)
	  'signalPresent' : 'LogicalCounter' object for signal-present mode
	      'detecting' : 'LogicalCounter' object for detecting mode
	        'verbose' : Switch for print-to-screen verbosity (boolean)
	  'detectionList' : List of detections as 'Detection' objects for current time segment
	"""

    # Obtain sampling rate (after upsampling) and start time directly from waveform metadata. Use the first
    # trace (channel) noting that these values are equivalent across all traces.
    tr = array[0]
    samplingRate = tr.stats.sampling_rate
    startTime = UTCDateTime(tr.stats.starttime).timestamp

    # Total number of channels
    numChan = arrayGeom.numSites
    # Number of channnels with any unmasked data
    numChanAny = np.sum(np.any(maskArray, axis=0))
    # Number of frequencies of interest
    numFreq = param.numFreq
    # Frequencies of interest
    freq = param.freq
    # Total number of beams
    numBeam = beamform.numBeam
    # Total number of passbands
    numBand = passbandFilters.numBand
    # Minimum number of channels required to calculate statistics for given time point and beam, else default
    # values will used
    minChan = param.minChannels

    # Signal-to-noise threshold used in computing the probability of detection
    snr = param.snr
    # Significance level used to accept or reject probabilities for declaration of detection
    significance = param.significance

    # Initiate logical flag to indicate if there is a current (live) detection
    liveDetection = False

    # Initialize list of detections for current processing interval
    detectionList = []

    # Passband filters for required frequency bands
    passbands = passbandFilters.passbandFilters
    degF = passbandFilters.degF

    # Time parameters in terms of number of time points
    nstart, nend, nstep, nloop, waitStep = timeParameters(param, samplingRate, fta.npts)

    # Initial allocations
    fs = np.zeros((numBand, numBeam), dtype=float)
    fstat = np.zeros((numBand, numBeam), dtype=float)
    beamMask = np.zeros((numChan, numBeam), dtype=bool)
    xstat = np.zeros((numBand, numBeam, nloop), dtype=float)
    fout = np.zeros((numBand, numBeam, nloop), dtype=float)
    numChanUsed = np.zeros((numBeam, nloop), dtype=np.int32)

    # Initialize time step counter
    iloop = 0
    print("\nStart time: %s" % UTCDateTime(startTime + nstart / samplingRate))
    print("Starting time loop")

    print(
        "nstart %d, nend %d, nstep %d, nloop %d, waitStep %d"
        % (nstart, nend, nstep, nloop, waitStep)
    )

    for i in range(nstart, nend, nstep):
        if iloop == nloop:
            # This can happen due to the rounding in timeParameters
            break
        # Keep track of time point in terms of UTC date and time convention (seconds)
        time = startTime + i / samplingRate
        
        # If required, update noise power spectrum LTA by taking the median over the channels per frequency. If
        # there the minimum number of channels 'minChan' is not satisfied, use the current state of the power
        # spectrum LTA.
        if param.updateNoiseSpectrum == 1:
            if verbose:
                print("\nUpdating noise spectrum")
            # Both the mask and data buffer arrays have dimensions [numFreq, numChan]
            maskBufferNoise = np.tile(maskArray[i, :], (numFreq, 1))
            dataBufferNoise = fta.value[i, :, :]

            # Number of active channels (i.e., not masked out) for the ith time point
            numChanOn = np.sum(maskArray[i, :])
            if numChanOn > minChan:
                # Compute magnitude of complex values
                dataBufferNoise = np.absolute(dataBufferNoise)
                # Indices for nonzero mask values in the mask buffer
                loc = np.nonzero(maskBufferNoise)
                # New data buffer array without entries from masked channels
                dataBufferMasked = dataBufferNoise[loc].reshape(numFreq, numChanOn)
                # Compute square of the median data value for each frequency
                noisePowerSpectrum = np.square(np.median(dataBufferMasked, axis=1))
                # Normalize by mean value
                noisePowerSpectrum /= np.mean(noisePowerSpectrum)
            # Use default values
            else:
                # Recall that the noise power LTA is a list of objects, not an array
                noisePowerSpectrum = np.zeros(numFreq)
                for n in range(numFreq):
                    noisePowerSpectrum[n] = noisePowerLTA[n].value

        if verbose:
            print("\nStarting beam loop")
        rtime.perf_counter()

        # Convert fstat and xstat LTAs to numpy arrays since iter_beams reads them but cannot handle lists of
        # lists. Converting noisePowerLtaArray as well for consistency (though numba will handle 1D lists of
        # objects).
        fstatLtaArray = np.array([[lta.value for lta in row] for row in fstatLTA])
        xstatLtaArray = np.array([[lta.value for lta in row] for row in xstatLTA])
        noisePowerLtaArray = np.array([lta.value for lta in noisePowerLTA])

        numBeamUsed, foutBeams = iter_beams(
            beamform.numBeam,
            beamform.dt,
            samplingRate=samplingRate,
            numChan=numChan,
            numBand=passbandFilters.numBand,
            passbands=passbandFilters.passbandFilters,
            beamMask=beamMask,
            verbose=verbose,
            numChanUsed=numChanUsed,
            ftaValue=fta.value,
            numChanAny=numChanAny,
            maskArray=maskArray,
            numFreq=numFreq,
            mpBeamWtsPosterior=mpBeam.wtsPosterior,
            mpBeamWtsWeight=mpBeam.wtsWeight,
            mpBeamWtsDiagonal=mpBeam.wtsDiagonal,
            mpBeamWtsInvPrior=mpBeam.wtsInvPrior,
            noisePowerLtaArray=noisePowerLtaArray,
            iloop=iloop,
            minChan=minChan,
            fs=fs,
            fstat=fstat,
            fstatLtaArray=fstatLtaArray,
            xstat=xstat,
            xstatLtaArray=xstatLtaArray,
            timeOffset=i,
        )
        # end of beam loop

        # Update F-stat output
        fout[:, :, iloop] = foutBeams

        if verbose:
            print("\nNumber of beams used: %d" % numBeamUsed)
        fstatProbMax = 0
        xstatProbMax = 0
        if numBeamUsed > 0:

            fstatMax = np.max(fstat, axis=1)
            xstatMax = np.max(xstat[:, :, iloop], axis=1)
            fstatMaxBeam = np.argmax(fstat, axis=1)
            xstatMaxBeam = np.argmax(xstat[:, :, iloop], axis=1)
            fstatProb = detFprob(
                fstatMax, degF, snr, numChanUsed[fstatMaxBeam, iloop], minChan
            )
            xstatProb = detFprob(
                xstatMax, degF, snr, numChanUsed[xstatMaxBeam, iloop], minChan
            )
            fstatProbMax = np.max(fstatProb)
            # fstatProbMaxBand = np.argmax(fstatProb)
            xstatProbMax = np.max(xstatProb)
            xstatProbMaxBand = np.argmax(xstatProb)

        # If fstatProbMax exceeds the significance threshold, then there is a signal present
        if fstatProbMax > significance:
            signalPresent.initiate(waitStep)
        else:
            signalPresent.decrement()

        # Check that fstat and xstat LTAs are activated before detections can occur. (It is assumed that LTAs
        # are always used.) Selby checks if ALL elements in each LTA variable are active, but if one element is
        # active, then so are all of the elements. Recall that LTA structured arrays are actually lists, and
        # apply indexing as such.
        if (fstatLTA[0][0].active == True) and (xstatLTA[0][0].active == True):

            # If xstatProbMax exceeds significance threshold, then we are detecting.
            if xstatProbMax > significance:

                # If we are not already detecting, we have a new signal. Store new detection time.
                if not detecting.state():
                    # Instantiate new detection object
                    currentDetection.time = time
                    currentDetection.dateTime = UTCDateTime(time)

                # If we are not already detecting, store new detection information. Or if we are already
                # detecting, update detection information (except for detection time), provided the time since
                # the initial detection is less than 'WAIT'. The time elapsed since the detection was initially
                # made must not exceed 'SIGNAL_UPDATE', the length of time after a detection where the detector
                # is allowed to update detection information, e.g., f-stat, azimth, slowness.
                # (Note: Determine where currentDetection.prob and currentDetection.stat were initialized in
                # Selby's code.)
                NP = np.zeros(numFreq, dtype=float)
                if not detecting.state() or (
                    detecting.state()
                    and (time - currentDetection.time < param.signalUpdate)
                    and (xstatProbMax >= currentDetection.prob)
                    and (xstatMax[xstatProbMaxBand] > currentDetection.stat)
                ):
                    currentDetection.band = xstatProbMaxBand
                    currentDetection.stat = xstatMax[xstatProbMaxBand]
                    currentDetection.prob = xstatProbMax
                    currentDetection.beam = xstatMaxBeam[xstatProbMaxBand]
                    currentDetection.azi = beamform.azi[currentDetection.beam]
                    currentDetection.slow = beamform.slow[currentDetection.beam]
                    currentDetection.numUse = numChanUsed[currentDetection.beam, iloop]
                    currentDetection.weights = np.real(
                        mpBeam.wtsWeight[currentDetection.beam, :, :]
                    )
                    currentDetection.posterior = mpBeam.wtsPosterior[
                        currentDetection.beam, :
                    ]
                    currentDetection.filter = passbands[:, currentDetection.band]
                    currentDetection.freq = fta.freq
                    currentDetection.mask = beamMask[:, currentDetection.beam]
                    currentDetection.sites = arrayGeom.sites
                    currentDetection.dt = beamform.dt[:, currentDetection.beam]
                    # Extract noise power value from LTA object per frequency
                    for n in range(numFreq):
                        NP[n] = noisePowerLTA[n].value
                    currentDetection.noisePower = NP
                    liveDetection = True

                # Update detecting logical counter
                detecting.initiate(waitStep)

            else:
                detecting.decrement()

        # If there is a live detection and no longer in detection state or at the last time step, add the
        # detection to the list
        if liveDetection and (not detecting.state() or (nend - i <= nstep)):

            # Append a copy of 'currentDetection'
            detectionCopy = deepcopy(currentDetection)
            detectionList.append(detectionCopy)

            # Turn off live detection logical flag
            liveDetection = False

            print("\nDetection parameters:")
            print("time: %f" % currentDetection.time)
            print("dateTime: %s" % currentDetection.dateTime)
            print("stat: %f" % currentDetection.stat)
            print("prob: %f" % currentDetection.prob)
            print("band: %d" % currentDetection.band)
            print("beam: %d" % currentDetection.beam)
            print("azi: %f" % currentDetection.azi)
            print("slow: %f" % currentDetection.slow)
            print("numUse: %d" % currentDetection.numUse)
            print("noisePowerLTA:")
            print(currentDetection.noisePower)

        # Update the noise power LTA
        if not detecting.state():
            for n in range(numFreq):
                noisePowerLTA[n].update(noisePowerSpectrum[n])

        # If not in the detection state and if no signal is present, update the F-stat LTA. Recall that LTA
        # structured arrays are actually lists, and apply indexing as such.
        if not detecting.state() and not signalPresent.state():
            for m in range(numBand):
                for j in range(numBeam):
                    fstatLTA[m][j].update(fs[m][j])

        # Update the xstat (detection) LTA regardless of either state
        for m in range(numBand):
            for j in range(numBeam):
                xstatLTA[m][j].update(fs[m][j])

        # Advance to next time loop
        iloop += 1

    # End of time loop
    print("\nEnd of time loop")
    print("\nTotal number of detections: %d" % len(detectionList))

    # Compute and store trace information per detection
    for detection in detectionList:
        print("\nDetection %s:" % detection.dateTime)
        print("Compute traces for f-stat, f-prob, and detection beam")
        # Extract x-stat trace for detection band and beam
        detection.statTrace = xstat[detection.band, detection.beam, :]
        # Compute probability trace
        detection.probTrace = detProbTrace(
            detection.statTrace, degF[detection.band], snr, detection.numUse
        )
        # Reconstruct detection beam
        detection.beamTrace = detBeamRecon(fta, samplingRate, maskArray, detection)

    # Create a string representing the time interval
    # This is used in plotting; ideally other code could assemble this
    startstr = str(UTCDateTime(startTime + nstart / samplingRate))
    endstr = str(UTCDateTime(startTime + nend / samplingRate))
    startstr = startstr[: len(startstr) - 4]
    endstr = endstr[: len(endstr) - 4]
    interval_str = f"{startstr} - {endstr}"

    # Return detections made in current processing interval
    return detectionList, currentDetection, fout, interval_str


def timeParameters(param, samplingRate, npts):
    """
    Calculates time parameters in terms of number of time points.

      'nstart' : First time point in trace after overlap region
        'nend' : Last time point in trace before overlap region
       'nstep' : Step size in time points for time loop
       'nloop' : Total number of time points evaluated in time loop
    'waitStep' : Wait period in time points 
    """

    # First time point in trace after initial overlap region between consecutive time segments (see 'OVERLAP'
    # in network parameter file). When comparing to Fortran implementation, note that Fortran indexing starts
    # at 1 and Python at 0.
    nstart = int(np.round(param.overlap * samplingRate)) + 1
    # Last time point in trace before overlap region with next time segment
    nend = int(np.round(npts - param.overlap * samplingRate)) + 1
    # Step size in time points used in time loop (see 'STEP' in network file)
    nstep = int(np.round(param.step * samplingRate))
    # Total number of time points evaluated in time loop
    nloop = int(np.round(np.max((nend - nstart) / nstep, 0)))
    # Wait period (dead-zone) in terms of time points (see 'WAIT' in network parameter file)
    waitStep = int(np.round(param.wait * samplingRate / nstep))

    return nstart, nend, nstep, nloop, waitStep


def detFprob(fstat, degF, snr, numChanUsed, minChan):
    """
	Given a measure of the non-central F statistic, calculate the probability of a signal with the given 
	signal-to-noise ratio being present. Relies on canned function 'scipy.special.betainc' (normalized 
	incomplete beta function), equivalent to the corresponding function in the GNU Scientific Library in C, to 
	which Selby's Fortran code interfaces.

	Here, 'fstat' a vector of length equal to the number of passbands, where each of its elements is 
	the maximum F-stat value corresponding to that passband; 'fprob' provides the corresponding	F-probabilities 
	per passband. Attribute 'numChanUsed' is also provided per passband with each element corresponding to the 
	number of channels used for the beam that produced the maximum F-stat value for that passband. Only 'snr'
	and 'minChan' are scalars.

	      'fstat' : Measure of non-central F-statistic per passband (real float)
	       'degF' : Degrees of freedom, i.e., twice the time-bandwidth product, per passband (real float)
	        'snr' : Signal-to-noise ratio for which to test (real float)
	'numChanUsed' : Number of channels used in array per passband (int)
	    'minChan' : Minimum number of channels required for F-stat calculations (int)
	      'fprob' : F-probability per passband (real float)
	"""

    N = len(fstat)
    fprob = np.zeros(N)

    for i in range(N):
        if numChanUsed[i] >= minChan:
            fnn1 = degF[i]
            # Selby does type conversions here with INT vs. NINT, which rounds to the nearest integer:
            # For a > 0, NINT(a) = INT(a + 0.5)
            nn1 = np.maximum(1, int(fnn1))
            nn2 = nn1 * (numChanUsed[i] - 1)
            lambda1 = int(fnn1 * snr * snr)
            nc1 = (np.square(nn1 + lambda1)) / (nn1 + 2 * lambda1)
            fprime = (nn1 * fstat[i]) / (nn1 + lambda1)
            # Implement the normalized incomplete beta function which takes three arguments, BETAINC(a, b, x)
            fprob[i] = 1.0 - special.betainc(
                0.5 * nn2, 0.5 * nc1, nn2 / (nn2 + nc1 * fprime)
            )
        else:
            fprob[i] = 0.0

    return fprob


def detProbTrace(statTrace, degF, snr, numChanUsed):
    """
	Similar to function 'detFprob', but designed to compute the probability trace (in time) for a particular 
	stat trace. Here it is given that the number of channels used exceeds the minimum-channel requirement.

	  'statTrace' : x-stat values for entire time loop for given detection passband and beam (real float)
	       'degF' : Degrees of freedom for given detection passband (real float)
            'snr' : Signal-to-noise ratio for which to test (real float)
    'numChanUsed' : Number of channels used in array for given detection passband (int)
      'probTrace' : Probability for corresponding stat trace (real float)
	"""

    N = len(statTrace)
    probTrace = np.zeros(N)

    for i in range(N):
        fnn1 = degF
        # Selby does type conversions here with INT vs. NINT, which rounds to the nearest integer:
        # 	For a > 0, NINT(a) = INT(a + 0.5)
        nn1 = np.maximum(1, int(fnn1))
        nn2 = nn1 * (numChanUsed - 1)
        lambda1 = int(fnn1 * snr * snr)
        nc1 = (np.square(nn1 + lambda1)) / (nn1 + 2 * lambda1)
        fprime = (nn1 * statTrace[i]) / (nn1 + lambda1)
        # Implement the normalized incomplete beta function which takes three arguments, BETAINC(a, b, x).
        probTrace[i] = 1.0 - special.betainc(
            0.5 * nn2, 0.5 * nc1, nn2 / (nn2 + nc1 * fprime)
        )

    return probTrace


def detBeamRecon(fta, samplingRate, maskArray, detection):
    """
	Reconstructs the detection minimum-power beam described in Eqn. 7 of Selby, 2011. Waveform data have 
	already been shifted in the methods of the 'MinimumPowerBeam' class, prior to the detection phase, but 
	without proper beam weighting or normalization. The latter is applied by this function, post-detection.

             'fta' : 'FrequencyTimeAnalysis' object
    'samplingRate' : Sampling rate [Hz] (real float)
       'maskArray' : Power mask per channel per sample point [npts, numChan] (boolean: 0 or 1)
	   'detection' : 'Detection' object
	   'beamTrace' : Reconstructed minimum-power beam for given detection (real float)
	"""

    # Extract the narrowband-filtered waveforms. Array size of 'ftaValue' is [npts, numFreq, numChan], where
    # the number of frequencies equals the number of narrowband filters. Values are complex.
    ftaValue = fta.value

    # Convert 'dt' per channel to integer shifts per channel. Selby does type conversions here with NINT, which
    # rounds to the nearest integer: for a > 0, NINT(a) = INT(a + 0.5). Need a loop for now, since 'np.int'
    # works only on scalars.
    shift = np.zeros(np.shape(ftaValue)[2], dtype=int)
    # Loop over channels
    for k in range(np.shape(ftaValue)[2]):
        shift[k] = int(np.round(-1.0 * samplingRate * detection.dt[k]))

    # Normalization per frequency in the MP beam equation
    norm = np.sqrt(detection.noisePower * detection.posterior)

    # Loop over frequencies
    for n in range(fta.numFilt):
        # Shift and normalize the filtered waveforms with power mask and apply detection passband filter for
        # each frequency.
        ftaValue[:, n, :] = (
            np.roll(ftaValue[:, n, :] * maskArray, shift, axis=0)
            * detection.filter[n]
            / norm[n]
        )

    # Detection beam weights are real with an array size of [numFreq, numChan]. Stack them 'npts', i.e.,
    # shape(fta.value[0]) times. (Note that while the beam weights are complex-valued when originally computed
    # by the 'MinimumPowerBeam' class, Selby only keeps the real part in the 'Detection' object.)
    weightsStack = np.dstack([detection.weights] * fta.npts)
    # Apply proper beam weights per frequency per channel for each sample point in the fta waveforms. 3D array
    # 'weightsCopy' must be transposed to match the dimensions of 'fta.value'.
    ftaValue *= weightsStack.transpose(2, 0, 1)

    # Marginalize the frequency dimension from the weighted fta waveforms, i.e., sum over frequencies (inner
    # sum), reducing array size to [npts, numChan]. Sum over channels (outer sum) to form the final
    # reconstructed beam.
    beamTrace = np.sum(np.sum(ftaValue, axis=1), axis=1)

    # Selby keeps only the real part
    return beamTrace.real
