import numpy as np

# import itertools


class FrequencyTimeAnalysis:
    """
	Performs frequency-time analysis on waveform data over a single processing interval (i.e., time segment) 
	according to Selby's hybrid time-frequency multiple-filter	approach (Selby, 2013), whereby each channel 
	waveform per time segment is filtered by a set of narrowband Hann filters. A narrowband filter is generated 
	or each of the frequencies to be analyzed 'freq', so the number of filters 'numFilt' is equal to 'numFreq'. 
	The Hann filter replicates the exact functional form of Selby's, which could not be replicated using Python's 
	canned Hann filter.
	"""

    def __init__(self, freq, numFilt, fmin, fmax, delta, npts):
        """
		All values are real unless otherwise specified:

		   'freq' : Frequencies of interest [Hz] (float)
		'numFilt' : Number of narrowband filters (int)
		   'fmin' : Minimum frequency [Hz] (float)
		   'fmax' : Maximum frequency [Hz] (float)
		  'delta' : Sample spacing in waveforms [sec] (float)
		   'npts' : Number of sample points in waveforms to be filtered (int)
		      'N' : Length of FFT with zero-padding (int)
		  'value' : Filtered waveforms for each frequency and channel [npts, numFreq, numChan] (complex float)
		      'f' : FFT frequencies [Hz] (float)
		   'comb' : Narrowband filter functions per frequency of interest (float)
		"""

        self.freq = freq
        self.numFilt = numFilt
        self.fmin = fmin
        self.fmax = fmax
        self.delta = delta
        self.npts = npts
        self.N = None
        self.time = None
        self.value = None
        self.x = None
        self.f = None
        self.comb = None

    def narrowbandFilters(self):
        """
		Produces a set of narrowband Hann filters, one per frequency of interest, used for frequency-time 
		analysis. 
 		"""

        # Next power-of-two value >= npts, the no. of waveform samples, for the zero-padded FFT
        self.N = int(nextPow2(self.npts))

        # Normalize fmin and fmax by native sampling frequency.
        fnorm = 1.0 / self.delta
        f0 = self.fmin / fnorm
        f1 = self.fmax / fnorm
        df = (f1 - f0) / (self.numFilt - 1)

        # Selby uses 'iover = optdef(1,overlap)' where overlap = 2
        iover = 2
        fc = (f0 - df * iover) + df * np.arange(0, self.numFilt + 2 * iover)

        corners = np.zeros((self.numFilt, 3), dtype=float)
        for i in range(self.numFilt):
            for j in range(3):
                corners[i, j] = fc[i + j * iover]

        # x-axis values 'x' are normalized between (0, N].
        # x = np.arange(1., self.N + 1.) / self.N
        x = np.arange(0.0, self.N) / self.N
        # 'comb' contains the set of filter functions
        self.comb = np.zeros((self.N, self.numFilt), dtype=float)

        # Generate narrowband Hanning filters of length 'N', given three corners, 'c1', 'c2', and 'c3'. (Selby
        # uses four points or corners, but the middle two are equivalent, so only the three unique corners are
        # retained here.)
        # Loop through no. of filters
        for n in range(self.numFilt):

            c1 = corners[n, 0]
            c2 = corners[n, 1]
            c3 = corners[n, 2]

            # Generate nth narrowband filter with Hanning functional form. Peak is at point x = c2.
            H1 = (((x < c1) | (x > c3)) + 0.0) * 0.0
            H2 = (
                (((x >= c1) & (x < c2)) + 0.0)
                * 0.5
                * (1.0 - np.cos(np.pi * (x - c1) / (c2 - c1)))
            )
            H3 = (x == c2) * 1.0
            H4 = (
                (((x > c2) & (x <= c3)) + 0.0)
                * 0.5
                * (1.0 + np.cos(np.pi * (x - c2) / (c3 - c2)))
            )
            H = H1 + H2 + H3 + H4
            self.comb[:, n] = H

        self.x = x
        self.f = np.fft.fftfreq(self.N, d=self.delta)
        self.time = self.delta * np.arange(0, self.npts, dtype=float)

        print(
            "Frequency range: fmin = %2.3f Hz, fmax = %2.3f Hz" % (self.fmin, self.fmax)
        )
        print("Number of filters: %i" % self.numFilt)
        print("Frequencies:")
        print(self.freq)

    def mfanSeismicArray(self, array):
        """
		Variable 'array' contains all data, i.e., metadata and waveforms (traces), in a given time segment. This 
		method assumes that all traces in the array contain the same number of points and sampling frequency
		after any upsampling. Relies on output from 'narrowbandFilters' method in this class.

		'array' : Stream object of waveform data in time segment
 		"""

        self.value = np.zeros((self.npts, self.numFilt, len(array)), dtype=complex)

        # Loop over all waveforms in the array
        for n in range(len(array)):

            # Extract nth waveform in array
            tr = array[n]
            waveform = tr.data

            # Compute 1D DFT. Waveforms are zero-padded to length 'N'.
            transform = np.fft.fft(waveform, self.N)

            # Apply the comb of filters to a tiled copy of the transform. Array size of comb: [N, numFilt]
            filtTransforms = np.multiply(
                self.comb, np.transpose(np.tile(transform, (self.numFilt, 1)))
            )

            value1d = np.zeros((self.npts, self.numFilt), dtype=complex)

            for m in range(self.numFilt):
                filtTransform = filtTransforms[:, m]
                filtWaveform = np.fft.ifft(filtTransform)
                value1d[:, m] = filtWaveform[0 : len(waveform)]
            self.value[:, :, n] = value1d


def nextPow2(npts):
    """
	Returns the next power-of-two value 'N' for input 'npts'.
	"""

    # Position of set bit in N
    pos = np.ceil(np.log2(npts))
    N = pow(2, pos)

    return N
