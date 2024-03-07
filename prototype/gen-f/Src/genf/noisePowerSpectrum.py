import itertools
import os
import sys

from scipy import interpolate
import numpy as np

from .libresponse import scale_fap
from .db import db_call


class NoisePowerSpectrum:
    """
	Generates noise power spectrum for initializing the noise power LTA: imports noise power spectrum data and
	frequency-amplitude-phase instrument response data from specified files, modulates the noise power spectrum 
	with the instrument response, and normalizes the noise power by its first element. The final noise power is
	returned by method 'modulateNoiseSpectrum' and does not replace the respective attribute in this class.
	"""

    def __init__(self):
        """
		Attributes below correspond to imported values from file:

		    'npFreq' : Noise power frequencies [Hz] 
	    'noisePower' : Noise power spectrum [nm^2/Hz]
		  'respFreq' : Instrument response frequency [Hz] 
		   'respAmp' : Instrument response amplitude [counts/nm] 
		 'respPhase' : Instrument response phase [deg]
		"""

        self.npFreq = []
        self.noisePower = []
        self.respFreq = []
        self.respAmp = []
        self.respPhase = []

    def readNoisePowerSpectrum(self, noiseSpectrumFilename):
        """
		Reads noise power spectrum from specified file 'noiseSpectrumFilename' in network parameter file. 
		In Peterson's low-noise model provided in NLNM_DP.dat, the noise has units of nm^2/Hz.
		"""

        if not os.path.isfile(noiseSpectrumFilename):
            print("File path %s does not exist. Exiting...\n" % noiseSpectrumFilename)
            sys.exit()

        with open(noiseSpectrumFilename) as f:
            print("\n")
            for line in f:
                print(line.rstrip())
                line = line.split()
                self.npFreq.append(float(line[0]))
                self.noisePower.append(float(line[1]))

    def readInstrumentResponseFilename(self, responseFilename):
        """
		Reads FAP instrument response from specified file 'responseFilename' in network parameter file. 
		Amplitude units are given in counts/nm.
		"""

        if not os.path.isfile(responseFilename):
            print("File path %s does not exist. Exiting...\n" % responseFilename)
            sys.exit()

        with open(responseFilename) as f:
            print("\n")
            # Skip two header lines
            for line in itertools.islice(f, 2, None):  # start=2, stop=None
                print(line.rstrip())
                line = line.split()
                self.respFreq.append(float(line[0]))
                self.respAmp.append(float(line[1]))
                self.respPhase.append(float(line[2]))

    def importInstrumentResponseDatabase(self, calib, calper, respParFilename):
        """
		Import FAP instrument response from database using methods in 'libresponse.py' via input parameter
	    file 'respParFilename'. This method assumes that data processing is performed for a single channel with 
        identical instruments across all array elements, such that the response for one element reasonably 
		represents the response for all elements.

         'calib' : Calibration constant [nm/count] (float)
        'calper' : Period at which the calibration constant is valid [sec] (float)
		"""

        sol_dict = db_call(respParFilename)

        # Extract freq, amp, and phase as tuples
        freq = sol_dict['freq'][0]
        amp = sol_dict['amp'][0]
        phase = sol_dict['phase'][0]

        self.respFreq, self.respAmp, self.respPhase = scale_fap(calib, calper, freq, amp, phase)

    def modulateNoisePowerSpectrum(self, freq):
        """
		Modulates the noise power spectrum with the FAP instrument response data. 

              'freq' : Frequencies of interest [Hz] (float)
		'noisePower' : Noise power spectrum, normalized (float)
		"""

        # Interpolate noise power and instrument response at desired frequencies
        fI = interpolate.interp1d(self.npFreq, self.noisePower)
        noisePower = fI(freq)
        fI = interpolate.interp1d(self.respFreq, self.respAmp)
        respAmp = fI(freq)
        # Modulate noise power with instrument response power, i.e., square of response amplitude. Units are
        # now in counts^2/Hz.
        noisePower *= respAmp * respAmp
        # Normalize by zeroth element to obtain final noise power spectrum, now unitless
        noisePower /= noisePower[0]

        return noisePower
