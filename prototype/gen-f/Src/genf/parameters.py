import os
import sys

import numpy as np


class Parameters:
    """
	Reads in parameters from specified station parameter file. The default value for 'significance' is set 
	here, but is overidden if provided in the station parameter file. The signal-to-noise ratio 'snr' is also 
	set here, as Selby declares it in his 'runLoad.sh' file. 

	Note that the 'Beamform' class assumes IDC formatting and that only Hann filters are used for processing,
	parameters 'beamParFileType', 'ftanType', and 'ftanWidth' are not implemented. The parameter 'whitenNoise'
	is also irrelevant (i.e., has no effect), since Selby only uses it as a conditional statement to update 
	long-term averages, a process that is assumed in the detection process. Since long-term averaging is 
	assumed and no I/O LTA text file is needed here, parameters 'useLta' and 'ltaFilename' are also irrelevant.

	The parameter 'segmentLength' is only relevant for processing database waveform data, not for 
	processing waveforms from IMS files.  The default segment length is five minutes (300 seconds).

	         'snr' : Signal-to-noise ratio threshold for detection (float)
	'significance' : Probability of a detection with an SNR greater than preset threshold (float)
	                 (Eqn. 13 of Selby, 2011)
	    'interval' : Default segment length without overlap [sec] (float)
	"""

    snr = 2.5
    significance = 0.95
    interval = 300.0
    minChannels = 3

    def __init__(self, snr=None):
        """
		Descriptions below obtained from 'genF_parFileExplanation.txt'.
	
	              'beamPoint' : Array reference point in lat/lon [deg] (float)
	        'beamParFileType' : Format of beamParFile: standard DFX beam recipe file format (string)
	        'beamParFilename' : Path to beam parameter file 
	         	 'sampleRate' : Sample rate used for processing [Hz] (float) 
	         	                If greater than native sampling rate, data are upsampled; if less than native 
	         	                sampling rate, data are NOT downsampled.
	                 'window' : Duration of processing window [sec] (float)
  	                   'step' : Processing step size [sec]
	                'overlap' : Overlap between data segments [sec]
	                   'wait' : Number of seconds detector must wait post-detection to make a new detection 
	                            [sec] (float)
	             'filterFreq' : Entire bandpass filter range for the detector [Hz] (float)
	               'bandpass' : Number of individual passbands used by the detector (int)
	        'bandpassFilters' : Specifications of individual passbands [Hz] (float)
	           	   'ftanType' : Taper window applied for frequency-time analysis (string)
	              'ftanWidth' :  
	            'whitenNoise' : Boolean to turn on noise whitening through default noise spectrum, resulting 
	                            in Fw  statistic (Selby, 2008)
	  'noiseSpectrumFilename' : Path to default noise spectrum (e.g., Peterson's low-noise model)
		'updateNoiseSpectrum' : Boolean to update noise spectrum in real time (for noise whitening vs. default)
	        'correlatedNoise' : Boolean to use correlated noise model for determining channel weighting and to 
	                            create MP beam, which results in Fmp statistic (Eqns. 12 & 27 of Selby, 2008)
	             'noiseSpeed' : Velocity of correlated noise at array [km/s] 
	                            Should typically be Lg, Rg velocity.
	              'noiseBand' : Passband in which correlated noise occurs (array-specific)
	                 'useLta' : Boolean to adjust the Fmp by dividing by Flta, resulting in Fmpave statistic 
	                            (Eqn. 11 of Selby, 2011) Accounts for azimuthally anisotropic nature of noise.	 
	                 'ltaGap' : Period of time the Flta lags behind the detector [sec] (float)
	              'ltaLength' : Duration of the Flta [sec] (float)
	            'ltaFilename' : File where FstatLTA statistics are stored, carried over between segments
	          'maxPowerRatio' : Threshold for identifying noisy channels (float)
	                            Same as 'noise_thresh' in 'find_noisy_channels' 
	           'signalUpdate' : Length of time after a detection where detector is allowed to update f-stat, 
	                            azimuth, and slowness [sec] (float). Preserves initial detection time when 
	                            threshold was initially exceeded.
		'responseFapFilename' : Path to instrument response file for deconvolution
                       'fmin' : Minimum frequency obtained from network parameter file [Hz] (float)
                       'fmax' : Maximum frequency obtained from network parameter file [Hz] (float)
                    'numFreq' : Number of frequencies of interest (int)
                       'freq' : Frequencies of interest to be used throughout program [Hz] (float)
		"""

        self.beamPoint = None
        self.beamParFileType = None
        self.beamParFilename = None
        self.sampleRate = None
        self.window = None
        self.step = None
        self.overlap = None
        self.wait = None
        self.filterFreq = None
        self.bandpass = None
        self.passbandFilters = None
        self.ftanType = None
        self.ftanWidth = None
        self.whitenNoise = None
        self.noiseSpectrumFilename = None
        self.updateNoiseSpectrum = None
        self.correlatedNoise = None
        self.noiseSpeed = None
        self.noiseBand = None
        self.useLta = None
        self.ltaGap = None
        self.ltaLength = None
        self.ltaFilename = None
        self.maxPowerRatio = None
        self.signalUpdate = None
        self.responseType = None
        self.responseFilename = None
        self.fmin = None
        self.fmax = None
        self.numFreq = None
        self.freq = None
        if snr is not None:
            self.snr = snr

    def readParameters(self, parFilename):
        """
		Read network parameter file
		"""

        if not os.path.isfile(parFilename):
            print("File path %s does not exist. Exiting...\n" % parFilename)
            sys.exit()

        with open(parFilename) as f:
            for line in f:
                print(line.rstrip())
                line = line.split()
                if line[0] == "BEAM_POINT":
                    self.beamPoint = np.array(
                        [float(line[1]), float(line[2])], dtype=float
                    )
                elif line[0] == "BEAM_PAR_FILE_TYPE":
                    self.beamParFileType = line[1]
                elif line[0] == "BEAM_PAR_FILE":
                    self.beamParFilename = line[1]
                elif line[0] == "SIGNIFICANCE":
                    self.significance = np.float(line[1])
                elif line[0] == "SAMPLE_RATE":
                    self.sampleRate = int(line[1])
                elif line[0] == "WINDOW":
                    self.window = float(line[1])
                elif line[0] == "STEP":
                    self.step = float(line[1])
                elif line[0] == "OVERLAP":
                    self.overlap = float(line[1])
                elif line[0] == "WAIT":
                    self.wait = float(line[1])
                elif line[0] == "FILTER":
                    self.filterFreq = np.array(
                        [
                            float(line[1]),
                            float(line[2]),
                            float(line[3]),
                            float(line[4]),
                        ],
                        dtype=float,
                    )
                elif line[0] == "BANDPASS":
                    self.bandpass = int(line[1])
                    self.passbandFilters = np.zeros([self.bandpass, 4], dtype=float)
                    for i in range(self.bandpass):
                        temp = f.readline()
                        print(temp.rstrip())
                        temp = temp.split()
                        self.passbandFilters[i, :] = [
                            temp[0],
                            temp[1],
                            temp[2],
                            temp[3],
                        ]
                elif line[0] == "FTAN_TYPE":
                    self.ftanType = line[1]
                elif line[0] == "FTAN_WIDTH":
                    self.ftanWidth = line[1]
                elif line[0] == "WHITEN_NOISE":
                    self.whitenNoise = line[1]
                elif line[0] == "NOISE_SPECTRUM":
                    self.noiseSpectrumFilename = line[1]
                elif line[0] == "UPDATE_NOISE_SPECTRUM":
                    self.updateNoiseSpectrum = int(line[1])
                elif line[0] == "CORRELATED_NOISE":
                    self.correlatedNoise = int(line[1])
                elif line[0] == "NOISE_SPEED":
                    self.noiseSpeed = float(line[1])
                elif line[0] == "NOISE_BAND":
                    self.noiseBand = np.array(
                        [float(line[1]), float(line[2])], dtype=float
                    )
                elif line[0] == "USE_LTA":
                    self.useLta = line[1]
                elif line[0] == "LTA_GAP":
                    self.ltaGap = float(line[1])
                elif line[0] == "LTA_LENGTH":
                    self.ltaLength = float(line[1])
                elif line[0] == "LTA_FILE":
                    self.ltaFile = line[1]
                elif line[0] == "MAX_POWER_RATIO":
                    self.maxPowerRatio = float(line[1])
                elif line[0] == "SIGNAL_UPDATE":
                    self.signalUpdate = float(line[1])
                elif line[0] == "RESPONSE":
                    self.responseType = line[1]
                    self.responseFilename = line[2]

    def generateFrequencies(self):
        """
        Generates the frequencies of interest 'freq' and number of frequencies 'numFreq' from the minimum 
        and maximum frequencies in the network parameter file.
        """

        # Minimum and maximum frequencies (in Hz) obtained from network parameter file
        self.fmin, self.fmax = self.filterFreq[0], self.filterFreq[3]
        # Number of frequencies depends on window size (in sec) specified in network parameter file
        self.numFreq = 1 + int(self.window * (self.fmax - self.fmin))
        # Frequencies (in Hz) of interest to be used throughout program
        self.freq = self.fmin + np.arange(0, self.numFreq) * (self.fmax - self.fmin) / (self.numFreq - 1)
