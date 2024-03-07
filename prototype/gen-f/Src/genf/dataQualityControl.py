import numpy as np
from scipy import signal


class DataQualityControl:
    """
	Performs data quality control on waveform data over a single processing interval (i.e., time segment): 
	(1) upsamples waveform data from native frequency to desired sampling rate; (2) applies a wide bandpass
	filter with Hann functional form, equivalent to Selby's; (3) masks out channels with anomalous power.
	"""

    def __init__(self):
        """
		 'mask' : Power mask for channels in the array [boolean]
		'array' : Stream object containing waveform data and metadata for all channels in processing interval
		"""

        self.mask = None
        self.array = None

    def performDataQualityControl(self, array, newSampRate, filterFreq, threshold):
        """
		Performs all three steps of data quality control (upsampling, bandpass filtering, power masking) on
		waveform data for all channels over a single processing interval.

		      'array' : Stream object containing waveform data and metadata for all channels in processing
		                interval
		'newSampRate' : Desired sample rate [Hz]
         'filterFreq' : Four corners specifying Hann bandpass filter [Hz]
          'threshold' : Maximum power ratio for masking
		"""

        # Upsample waveform data from native to desired sampling rate, as specified in network parameter file
        newArray = self.upsampleData(array, newSampRate)

        # Apply bandpass filter to waveform data. Set 'array' attribute to final array.
        self.array = self.bandpassFilterSelby(newArray, filterFreq)

        # Mask out channels in the array with anomalous power. Set 'mask' attribute to output power mask.
        self.mask = self.applyPowerMask(newArray, threshold)

    def upsampleData(self, array, newSampRate):
        """
		Upsamples waveform data for all traces in a given time segment from native frequency to desired 
		sampling rate as specified in the network parameter file. Only resamples data if the desired sampling 
		rate is higher, i.e., will not downsample data. Upsampled data are still stored in 'array' with 
		metadata reflecting the new sampling rate.

		      'array' : Stream object containing waveform data and metadata for all channels in processing
		                interval
		'newSampRate' : Desired sample rate [Hz] 
		"""

        # Number of traces in the array
        len(array)

        # Array after upsampling
        newArray = []

        # Loop over each trace in current stream object
        for tr in array:

            # Waveform data prior to upsampling
            waveform = tr.data
            # Original number of points per waveform
            npts = tr.stats.npts
            # Native sampling rate in data
            nativeRate = tr.stats.sampling_rate

            # Only resample if new sampling rate exceeds native sampling rate
            if newSampRate > nativeRate:

                # Length of upsampled signal
                num = int(npts * (newSampRate / nativeRate))

                # Upsample waveform and modify trace, keeping all other metadata
                waveform = signal.resample(waveform, num)
                tr.data = waveform
                tr.stats.sampling_rate = newSampRate
                tr.stats.npts = num
                tr.delta = 1.0 / newSampRate

                # Append new array with upsampled trace
                newArray.append(tr)
            else:
                # Append with original trace
                newArray.append(tr)

        # Assume native rate for last trace is same for all traces to avoid excessive print statements
        if newSampRate > nativeRate:
            print("Upsample waveform data to desired sample rate")
            print("   Native sample rate: %d Hz" % nativeRate)
            print("   Desired sample rate: %d Hz" % newSampRate)
        else:
            print("Preserve native sampling rate")
            print("   Native sample rate: %d Hz" % nativeRate)
            print("   Desired sample rate: %d Hz" % newSampRate)

        return newArray

    def bandpassFilterSelby(self, array, filterFreq):
        """
		Performs Selby's method of bandpass filtering with a Hann function for all traces in the current
		time segment. Filtered data are still stored in 'array'. 

		     'array' : Stream object containing waveform data and metadata for all channels in processing
		               interval
		'filterFreq' : Four corners specifying Hann bandpass filter [Hz]
		"""

        print("Apply bandpass filter to waveform data")

        # Filter parameters
        c1 = filterFreq[0]  # Lower edge of passband (zero amplitude)
        c2 = filterFreq[1]  # Lower edge of passband (max amplitude)
        c3 = filterFreq[2]  # Upper edge of passband (max amplitude)
        c4 = filterFreq[3]  # Upper edge of passband (zero amplitude)

        print("   Filter (Hz): %1.2f %1.2f %1.2f %1.2f" % (c1, c2, c3, c4))

        # Array after filtering
        newArray = []

        # Number of traces in the array
        len(array)
        # Loop over each trace in current stream object
        for tr in array:
            # Waveform data
            waveform = tr.data
            # Signal length (number of sample points per waveform)
            npts = tr.stats.npts
            # Sample spacing in waveforms [sec]
            delta = tr.stats.delta
            # Time axis points [sec]
            t = delta * np.arange(0, npts, dtype=float)

            # Size of 1D FFT with zero-padding (next power-of-two)
            pos = np.ceil(np.log2(npts))
            N = int(pow(2, pos))

            # Frequencies in Fourier transform (zeroth frequency is on left-hand side)
            f = fftFreq(N, delta)

            # Design bandpass filter
            H1 = (((f < c1) | (f > c4)) + 0.0) * 0.0
            H2 = (
                (((f >= c1) & (f <= c2)) + 0.0)
                * 0.5
                * (1.0 - np.cos(np.pi * (f - c1) / (c2 - c1)))
            )
            H3 = (((f > c2) & (f < c3)) + 0.0) * 1.0
            H4 = (
                (((f >= c3) & (f <= c4)) + 0.0)
                * 0.5
                * (1.0 + np.cos(np.pi * (f - c3) / (c4 - c3)))
            )
            H = H1 + H2 + H3 + H4

            # Compute 1D DFT. Waveforms are of length 12480 and zero-padded to length 'N'.
            transform = np.fft.fft(waveform, N)

            # Filtered waveform is the inverse FFT of the filtered transform. Multiplication of the FFT by
            # the Hann filter 'H' preserves only positive frequencies by nulling negative frequencies. The
            # factor of two is applied in Selby's code to compensate for this nulling. Keep only real part
            # of ifft'd filtered waveform.
            filtWaveform = ((2.0 * np.fft.ifft(H * transform)).real)[0 : len(waveform)]

            # Update trace data with filtered data
            tr.data = filtWaveform

            # Append new array with modified trace
            newArray.append(tr)

        return newArray

    def applyPowerMask(self, array, threshold):
        """
		Applies power mask across all channels in the current time segment based on the maximum power ratio 
		specified in the network parameter file. The sum of squares is calculated for each channel. Channels 
		with a sum of squares several times larger or smaller, based on the threshold value, than the array 
		median for the particular segment under consideration are excluded from subsequent processing 
		(pg. 1566 of Selby, 2011).

		    'array' : Stream object containing waveform data and metadata for all channels in processing
		              interval
		'threshold' : Maximum power ratio for masking
		"""

        print("Mask out channels with anomalous power")
        print("   Max power ratio: %1.2f" % threshold)

        numTrace = len(array)
        power = np.zeros(numTrace, dtype=float)
        mask = np.zeros(numTrace, dtype=np.int32)
        # Compute power (sum of squares) in each channel
        for i in range(numTrace):
            tr = array[i]
            power[i] = np.sum(tr.data * tr.data) / tr.stats.npts
        # Ratio of power across channels to array median
        ratio = power / np.median(power)
        # Check if channels have anomalous power (assign value of 0)
        for i in range(numTrace):
            if ratio[i] > threshold or ratio[i] < 1.0 / threshold:
                mask[i] = 0
            else:
                mask[i] = 1
        print("   Power mask:", mask)

        return mask


def fftFreq(N, d):
    """
	Computes frequencies in NumPy's 1D FFT, starting with zeroth frequency. Assumes N is even. 

	'N' : Number of 1D FFT samples
	'd' : Sample spacing in time domain [sec]
	'f' : Frequencies in 1D FFT [Hz]
	"""

    fR = np.arange(0, N / 2, dtype=float)
    fL = np.arange(-N / 2, 0, dtype=float)
    f = np.concatenate((fR, fL)) / (d * N)

    return f
