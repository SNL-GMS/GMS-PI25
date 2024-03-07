import numpy as np


class PassbandFilters:
    """
	Generates detection frequency filters based on the passbands provided in the network parameter file. 
	Each frequency filter assumes the exact functional form of Selby's Hann filters, which could not be 
	replicated using Python's canned Hann filter function (see Fig. 1 in Selby, 2013).
	"""

    def __init__(self):
        """
		'passbandFilters' : Profile of each passband as a function of frequency [numFreq, numBand]
		        'numBand' : Number of passbands
		           'degF' : Degrees of freedom per passband
		"""

        self.passbandFilters = None
        self.numBand = None
        self.degF = None
        self.width = None

    def generatePassbandFilters(self, freq, corners):
        """
		Generates the set of passband filters with a Hann functional form, each a function of frequency given 
		its corresponding corners. Hann filter corners for the set of passbands are specified in the network 
		parameter file and are stored in an array of dimensions ['BANDPASS', 4], where 'BANDPASS' is the number 
		of passbands. The length of each passband filter is the number of frequencies of interest 'numFreq'. 

		   'freq' : Frequencies of interest [Hz]
		'corners' : Hann filter corners for the set of passband filters [numBand, 4]
		"""

        # Number of passband filters (same as param.bandpass)
        self.numBand = corners.shape[0]

        # Set of passband filters
        self.passbandFilters = np.zeros((len(freq), self.numBand), dtype=float)

        # Loop over number of passbands
        for n in range(self.numBand):

            # Extract corners for current passband
            c1 = corners[n, 0]
            c2 = corners[n, 1]
            c3 = corners[n, 2]
            c4 = corners[n, 3]

            # Design passband across frequencies of interest, similar to Selby's Hann filter in the class
            # 'DataQualityControl'.
            H1 = (((freq < c1) | (freq > c4)) + 0.0) * 0.0
            H2 = (
                (((freq >= c1) & (freq <= c2)) + 0.0)
                * 0.5
                * (1.0 - np.cos(np.pi * (freq - c1) / (c2 - c1)))
            )
            H3 = (((freq > c2) & (freq < c3)) + 0.0) * 1.0
            H4 = (
                (((freq >= c3) & (freq <= c4)) + 0.0)
                * 0.5
                * (1.0 + np.cos(np.pi * (freq - c3) / (c4 - c3)))
            )
            H = H1 + H2 + H3 + H4
            self.passbandFilters[:, n] = H

            print("Passband %d (Hz): %1.2f %1.2f %1.2f %1.2f" % (n, c1, c2, c3, c4))

        # Degrees of freedom, i.e., sum of passband values for all frequencies, for each passband. 'degF' is a
        # vector of length 'numBand'.
        self.degF = np.sum(self.passbandFilters, axis=0)