import numba as numba
import numpy as np


@numba.njit()
def xtcx(data, prior, isDiag):
    """
	Generates a real scalar value, which, summed over frequency, provides the data power (Eqn. 7 of Selby, 
	2013). Note that the real part of 'value' is provided as output.

	  'data' : Input data vector for all channels at a given frequency [1, numChan] (complex float)
	 'prior' : Noise correlation matrix for a given beam and given frequency [numChan, numChan] (complex float)
	'isDiag' : Boolean for diagonality of 'prior' (boolean)
	 'value' : Scalar value from summation (real) 
	"""

    # Complex conjugate of data vector
    dataConj = np.conj(data)

    # Sum of terms where j = k (i.e., each channel is correlated with itself) in matrix Q^-1. This calculation
    # can be performed separately, since there is no correlation between different channels when the matrix is
    # purely diagonal.
    if isDiag:
        value = np.sum(dataConj * np.diag(prior) * data)
        # 'value' is theoretically real, but eliminate possible imaginary part due to possible numerical
        # imprecision.
        return value.real
    # When Q^-1 is not purely diagonal, include all matrix elements. Perform matrix multiplication:
    # [sMP*][Q^-1][sMP]. Note that Selby only keeps the real part in his Fortran implementation.
    else:
        value = dataConj @ prior
        value = value @ np.transpose(data)
    return value.real


@numba.njit()
def iter_beams(
    numBeam: int,
    dt: np.ndarray,
    samplingRate: float,
    numChan: int,
    passbands: np.ndarray,
    numBand: int,
    beamMask: np.ndarray,
    verbose: bool,
    numChanUsed: np.ndarray,
    ftaValue: np.ndarray,
    numChanAny: np.int64,
    maskArray: np.ndarray,
    numFreq: int,
    mpBeamWtsPosterior: np.ndarray,
    mpBeamWtsWeight: np.ndarray,
    mpBeamWtsDiagonal: np.ndarray,
    mpBeamWtsInvPrior: np.ndarray,
    noisePowerLtaArray: np.ndarray,
    iloop: int,
    minChan: int,
    fs: np.ndarray,
    fstat: np.ndarray,
    fstatLtaArray: np.ndarray,
    xstat: np.ndarray,
    xstatLtaArray: np.ndarray,
    timeOffset,
):
    """
               'numBeam': Total number of beams
	               'dt' : Delays for each beam and channel combination [sec] (float)
          'samplingRate': Waveform sampling rate
               'numChan': Number of channels
             'passbands': Passband filters for required frequency bands
               'numBand': Total number of passbands
              'beamMask': (channel, beam)
               'verbose': Verbosity flag that converns print statements
           'numChanUsed': Number of channels used
              'ftaValue': Value of the Frequency Time Analysis
            'numChanAny': Number of channels with any masked data
               'numFreq': Number of frequencies
    'mpBeamWtsPosterior': Posterior weights from Minimum Power Beam object
       'mpBeamWtsWeight': Weight from Minimum Power Beam object
     'mpBeamWtsDiagonal': Diagonal weights from Mininmum Power Beam object
     'mpBeamWtsInvPrior': Inverse Prior weights from Minimum Power Beam object
         'noisePowerLTA': 1D list of noise power Long Term Average objects
                 'iloop': index from the time loop
               'minChan': Minimum number of channels required to calculate statistics for given time point and beam
                    'fs': 2D (band x beam) numpy array
                 'fstat': 2D (band x beam) numpy array of the f-statistic (noise)
         'fstatLTAArray': 1D numpy array (float) of the long term average of the f-statistic (noise) 
                 'xstat': 2D numpy array of the x-statistic (signal and noise)
              'xstatLTA': 1D numpy array (float) of the long term average of the x-statistic (signal and noise)
            'timeOffest': Time offest
    """

    # print(f"Iterating over beams ({numBeam}) for loop {iloop}, timeoffset {timeOffset}")

    numBeamUsed = 0
    # Multiplicative factor with 'numChanAny'. Number of channels used for given time point and beam must
    # exceed the result.
    useFactor = 0.5
    dataPower = np.zeros(numFreq, dtype=numba.float64)
    maskBuffer = np.zeros((numFreq, numChan), dtype=numba.int32)
    dataBuffer = np.zeros((numFreq, numChan), dtype=numba.complex128)

    for j in range(numBeam):
        # Select the required data and mask from each channel. Mask buffer is logical, 1 or 0, indicating
        # to use or not use data.

        if verbose:
            print("\nSelecting data segment")
        for k in range(numChan):
            # Calculate the time delay in number of sample points for the current beam and channel. Selby
            # does type conversions here with NINT, which rounds to the nearest integer:
            # For a > 0, NINT(a) = INT(a + 0.5).
            t0 = timeOffset - np.int(np.round(dt[k, j] * samplingRate))
            # if verbose:
            #    msg = "\ndt = {ndt} sec, t0 = {t0}".format(ndt=dt[k, j], t0=t0))
            #    print(msg)
            dataBuffer[:, k] = ftaValue[t0, :, k]
            maskBuffer[:, k] = maskArray[t0, k] * np.ones(numFreq, dtype=np.int32)

        # Apply mask to selected data [numFreq, numChan]
        dataBuffer *= maskBuffer
        # Given how the power mask is initially computed, 'numChanUsed' is a constant value for all beams
        # and time loops, equivalent to 'numChanAny' (already computed)
        # Numba can't use any along an axis, so this next expression
        # is essentially: umChanUsed[j, iloop] = np.sum(np.any(maskBuffer, axis=0))
        numChanUsed[j, iloop] = np.sum(np.sum(maskBuffer, axis=0).astype("bool"))
        # if verbose:
        #    print("Number of channels used: %d" % (numChanUsed[j, iloop]))
        # All rows of 'maskBuffer' are identical, so pick zeroth row. Dimensions of 'beamMask' is
        # [numChan, numBeam].
        beamMask[:, j] = maskBuffer[0, :]

        # If minimum number of channels is met, calculate statistics; else use default values. Second
        # condition is ineffectual since 'numChanUsed[j,iloop]' always equals 'numChanAny' due to Selby's
        # power masking method; it will always be met provided that 'useFactor' <= 1. This is replicated
        # from Selby's code in case of future changes to the power masking.
        if (numChanUsed[j, iloop] >= minChan) and (
            numChanUsed[j, iloop] > np.int(np.round(useFactor * numChanAny))
        ):
            # Increase beam counter
            numBeamUsed += 1
            # Channel ratio will always be 1.0 for the current power mask characteristics
            channelRatio = numChanUsed[j, iloop] / numChanAny

            # Calculate data power (Selby notes to add call for correlated noise)
            if verbose:
                print("\nCalculating data power")
            for n in range(numFreq):
                dataPower[n] = xtcx(
                    dataBuffer[n, :],
                    mpBeamWtsInvPrior[j, :, :, n],
                    mpBeamWtsDiagonal[j, n],
                )
                # Normalize data power by noise power LTA at current frequency.
                dataPower[n] /= noisePowerLtaArray[n]

            # Calculate beam power
            if verbose:
                print("\nForming beam")
            # After applying corresponding weight to each element in 'dataBuffer', perform summation across
            # the channels dimension. Note that 'dataBuffer' is already masked by channel number, while
            # masked channels have zero beam weight.
            beam = np.sum(dataBuffer * mpBeamWtsWeight[j, :, :], axis=1) / channelRatio
            # Beam power is a vector of length 'numFreq'. Normalize by the posterior value at each
            # frequency. Since 'beam' is multiplied by its complex conjugate, and the posterior is real,
            # the beam power should be real, numerically; but take the real part in case of numerical
            # imprecision.
            beamPower = (
                channelRatio * beam * np.conj(beam) / (mpBeamWtsPosterior[j, :])
            ).real
            # Normalize by noise power LTA as well.
            for n in range(numFreq):
                beamPower[n] /= noisePowerLtaArray[n]

            # Calculate statistics (See Eqn. 6 of Selby, 2011)
            for m in range(numBand):
                denom = np.sum(dataPower * passbands[:, m]) - np.sum(
                    beamPower * passbands[:, m]
                )
                fs[m, j] = (
                    (numChanUsed[j, iloop] - 1)
                    * np.sum(beamPower * passbands[:, m])
                    / denom
                )
                # Recall that the fstat and xstat LTAs are lists and not arrays.
                fstat[m, j] = fs[m, j] / fstatLtaArray[m][j]
                xstat[m, j, iloop] = fs[m, j] / xstatLtaArray[m][j]

        # If minimum channels are not met, use default values. (Note: Test execution of 'else' statement.)
        else:
            for m in range(numBand):
                fs[m, j] = fstatLtaArray[m][j]
                fstat[m, j] = 1.0
                xstat[m, j, iloop] = 1.0
    return numBeamUsed, fstat
