import cmath

import numpy as np
from scipy import special


class MinimumPowerBeam:
    """
	Computes a set of complex beam weights as a function of frequency and channel with which to calculate a 
	minimum-power (MP) beam. The MP beam can be thought of as applying a frequency-dependent set of weights to 
	each seismogram in the array such that the signal passes unfiltered (undistorted) and the noise power is 
	reduced (Selby, 2008); thus it should rather be called the "minimum-noise-power beam". Operates on an 
	individual time segment (i.e., over one processing interval) with a variable power mask.

	 'DAMP' : Same as 'gamma' in Eqn. 10 (Selby, 2011) 
	'WHITE' : Same as 'alpha' in Eqn. 10 (Selby, 2011)
	"""

    DAMP = 8.0
    WHITE = 0.1

    def __init__(self):
        """
		 'wtsInvPrior' : Inverse prior (covariance) matrix per frequency per beam (complex float)
		'wtsPosterior' : Posterior value for inverse prior matrix per frequency per beam (real float)
		    'wtsWeight': Beam weight per frequency per channel (complex float)
		 'wtsDiagonal' : Diagonality of initial prior matrix per frequency per beam (boolean)
		"""

        self.wtsInvPrior = None
        self.wtsPosterior = None
        self.wtsWeight = None
        self.wtsDiagonal = None

    def detBeamWeights(self, beamform, param, maskVec, freq, numChan):
        """
		Computes a vector set of complex-valued beam weights for each channel as a function of frequency. 

		'beamform' : 'Beamform' object
		   'param' : 'Parameters' object
		 'maskVec' : Power mask value across all channels in current time segment (0 if masked; 1 if unmasked)
		    'freq' : Frequencies of interest [Hz]
		 'numChan' : Total number of channels in the array used for processing
		"""

        # Distances between pairs of array elements [numChan, numChan]
        dist = beamform.distances
        # Vector of delays for each channel [numChan, numBeam]
        dt = beamform.dt

        # Number of beams
        numBeam = beamform.numBeam
        # Number of frequencies
        numFreq = len(freq)

        # Minimum and maximum frequencies of the correlated noise band (in which noise occurs)
        fNoiseLow = param.noiseBand[0]
        fNoiseUpp = param.noiseBand[1]
        # Speed of correlated noise at array [km/s]
        vNoise = param.noiseSpeed
        # Noise mode: 1 for correlated; 0 for uncorrelated
        noiseMode = param.correlatedNoise

        print("Correlated noise: %d" % noiseMode)
        print("Noise band: fmin = %2.2f Hz, fmax = %2.2f Hz" % (fNoiseLow, fNoiseUpp))
        print("Noise speed: %2.2f km/s" % vNoise)

        # Prior covariance matrix [numChan, numChan, numFreq]
        priorCov = self.priorCovariance(
            dist, freq, fNoiseLow, fNoiseUpp, vNoise, noiseMode
        )

        # Selby used structured arrays in Fortran to store the following quantities, e.g.,
        # weights[numBeam]%prior[numChan, numChan, numFreq]. Structured arrays are not straightforward in
        # Python; instead create a single object with the same attributes (below), but with an additional
        # dimension (of length 'numBeam') per array, each name beginning with 'wts'.
        self.wtsInvPrior = np.zeros((numBeam, numChan, numChan, numFreq), dtype=complex)
        self.wtsPosterior = np.zeros((numBeam, numFreq), dtype=float)
        self.wtsWeight = np.zeros((numBeam, numFreq, numChan), dtype=complex)
        self.wtsDiagonal = np.ones((numBeam, numFreq), dtype=bool)

        aw = np.zeros(numChan, dtype=complex)

        # Compute a vector set of weights for a set of N channels to generate a minimum-power beam
        # Loop over beams
        for j in range(numBeam):
            # Loop over frequencies
            for i in range(numFreq):

                # Extract the prior covariance matrix [numChan, numChan] for the ith frequency
                prior2D = priorCov[:, :, i]

                # Check if square matrix 'prior2D' is diagonal.
                self.wtsDiagonal[j, i] = isDiagonalMatrix(prior2D, numChan)

                # Since vector 'aw' below only depends on 'dt' and 'freq', computed for each channel, it is
                # constant across all time segments; it depends only on the array geometry, beam recipe, and
                # desired frequencies.
                for k in range(numChan):
                    # Complex numbers are now integrated with the prior covariance matrix
                    aw[k] = cmath.exp(1j * 2.0 * np.pi * freq[i] * dt[k, j])

                # Element-wise multiplication of matrix elements. If 'prior2D' is the identity matrix (i.e.,
                # 'CORRELATED_NOISE' = 0 in network parameter file), then the result below is theoretically
                # real-valued.
                prior = np.multiply(prior2D, np.outer(aw, np.conj(aw)))

                # Invert and decompress the compressed prior matrix after power masking. Note that this inverse
                # can be later extracted from the calculation, mathematically, and performed only once for all
                # beams.
                invPrior = self.invertMaskedMatrix(prior, maskVec)

                # Compute the posterior (i.e., real part of reciprocal of sum of all elements in 'invPrior').
                # Result is a real scalar for a given beam and frequency.
                posterior = 1.0 / np.real(np.sum(invPrior))
                # Compute 'awp' by summing 'invPrior' along the 0th axis. Note that Selby originally took the
                # real part of 'awp', but later allowed the full complex number. Result is a vector of length
                # 'numChan' and complex if there is correlated noise.
                awp = np.sum(invPrior, 0)
                # Compute the beam weights across all channels for the current beam and frequency. Weights are
                # variable complex numbers for correlated noise, but for uncorrelated noise, they are real and
                # equivalent across all channels. For masked channels, the values are always zero.
                weight = posterior * awp

                # Store the following as attributes
                self.wtsInvPrior[j, :, :, i] = invPrior
                self.wtsPosterior[j, i] = posterior
                self.wtsWeight[j, i, :] = weight

    def priorCovariance(self, dist, freq, fNoiseLow, fNoiseUpp, vNoise, noiseMode):
        """
		Computes the prior covariance matrix 'priorCov' which describes the correlation of the noise between 
		seismometers in the array as a function of frequency (Eqns. 26 & 27 of Selby, 2008). Assumes that the 
		stationary part of the noise correlation is due to azimuthally isotropic propagating surface waves. 
		Parameters 'fNoiseLow', 'fNoiseUpp', 'vNoise', and 'noiseMode' are specified in the network parameter 
		file. (Note that this matrix is identical across all time segments, so it really only needs to be 
		computed once and stored into memory.)

		     'dist' : Distances between pairs of channels [km]
		     'freq' : Frequencies of interest [Hz]
		'fNoiseLow' : Minimum frequency of the correlated noise band [Hz]
		'fNoiseUpp' : Maximum frequency of the correlated noise band [Hz] 
		              Noise band includes frequencies up to but not including this value.
		   'vNoise' : Speed of correlated noise at array [km/sec]
		'noiseMode' : Correlated or uncorrelated (boolean)
		 'priorCov' : Prior covariance matrix
		"""

        # Array size of 'dist' is [numChan, numChan]
        numChan = dist.shape[0]
        numFreq = len(freq)

        # The prior covariance matrix is real
        priorCov = np.zeros((numChan, numChan, numFreq), dtype=float)

        for i in range(numFreq):
            # If the noise is correlated
            if noiseMode:
                f = freq[i]
                if (f > fNoiseLow) & (f < fNoiseUpp):
                    # Bessel function of the first kind (zeroth order)
                    J0 = special.j0(dist * 2.0 * np.pi * f / vNoise)
                    # Hollow matrix (diagonal elements are 0; off-diagonal elements are 1). Default
                    # data-types are floats.
                    hollowMatrix = np.ones((numChan, numChan)) - np.identity(numChan)
                    exparg = -1.0 * self.DAMP * (f / fNoiseUpp) * (dist / np.amax(dist))
                    prior2D = J0 * (1.0 - self.WHITE) * np.exp(
                        exparg
                    ) * hollowMatrix + np.identity(numChan)
                else:
                    prior2D = np.identity(numChan, dtype=float)
            # For uncorrelated noise, the prior matrix is the identity matrix for each frequency
            else:
                prior2D = np.identity(numChan, dtype=float)
            # Store prior covariance matrix
            priorCov[:, :, i] = prior2D

        return priorCov

    def invertMaskedMatrix(self, matrix, maskVec):
        """
		Computes the inverse of a square matrix with corresponding power mask applied to the appropriate rows 
		and columns. The mask vector 'maskVec' has length 'numChan', where the input and output matrices have 
		array size [numChan, numChan]. The masked matrix must be compressed and decompressed before and after 
		inversion, respectively. Works on real or complex input matrices.

		 'matrix' : Input matrix to be inverted
		'maskVec' : Power mask value across all channels in current time segment (0 if masked; 1 if unmasked)
		'inverse' : Output inverted matrix
		"""
        maskedMatrix = np.multiply(matrix, np.outer(maskVec, maskVec))

        # Compress 'maskedMatrix' prior to inversion, i.e., delete empty rows and columns, based on power mask
        # vector 'maskVec' values. Resultant matrix is square.
        n = 0
        temp = maskVec
        while n < maskedMatrix.shape[0]:
            # Delete empty rows
            if temp[n] == 0:
                maskedMatrix = np.delete(maskedMatrix, n, 0)
                temp = np.delete(temp, n, 0)
            else:
                n += 1
        m = 0
        temp = maskVec
        while m < maskedMatrix.shape[1]:
            # Delete empty columns
            if temp[m] == 0:
                maskedMatrix = np.delete(maskedMatrix, m, 1)
                temp = np.delete(temp, m, 0)
            else:
                m += 1

        # Compute inverse of compressed matrix.
        inverse = np.linalg.inv(maskedMatrix)

        # Uncompress the inverted matrix by inserting the empty rows and columns that were previously deleted.
        # Resultant matrix is square.
        for n in range(len(maskVec)):
            # Insert empty row
            if maskVec[n] == 0:
                inverse = np.insert(inverse, n, 0.0, axis=0)
        for m in range(len(maskVec)):
            # Insert empty column
            if maskVec[m] == 0:
                inverse = np.insert(inverse, m, 0.0, axis=1)

        return inverse


def isDiagonalMatrix(matrix, N):
    """
	Checks if a matrix is diagonal, assuming that the matrix is square (function is designed for the square
	'priorCov' matrix). Returns boolean value specifying diagonality of the matrix. 

	'matrix' : Input matrix
	     'N' : Number of columns and rows in matrix
	"""
    for n in range(N):
        for m in range(N):
            if (n != m) and (matrix[n, m] != 0.0):
                return False
    return True
