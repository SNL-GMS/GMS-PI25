from typing import List

import numpy as np
from numba import float64, typed
from numba.experimental import jitclass


# Have numba compile this class so that the update method to be compiled and because objects of this class
# are passed into the beam loop compiled code
@jitclass
class LongTermAverage:
    """
	Structure for a single element in an array-like list of LTA objects (noise power, F-stat, X-stat) for 
	recursively computing the LTA. (Since structured arrays are not straightforward in Python as they are in C, 
	each 'LongTermAverage' object is stored in either 1D or 2D lists yet are still accessed through array-like 
	indexing.)

	The noise model in 'MinimumPowerBeam.priorCovariance' assumes that the noise is due to azimuthally 
	isotropic propagating surface waves with constant speed, but in actuality the predominant azimuth of the 
	noise gradually changes with time. To account for this, the calculated value of the minimum-power (MP) 
	F-stat is recursively updated by dividing by the long-term average (LTA) at a given time step. Use of the
	LTA is not meant to enhance detection capability, but rather to reduce the number of false detections 
	(Selby, 2011). See Eqns. 11 & 12 of Selby, 2011. 

	Since the methods here operate on a single element represented by an LTA object, 'value' is a scalar. For
	instance, each frequency of the noise power LTA is represented by an object of this class and initialized
	individually with its respective 'value'.
	"""

    value: float64
    length: int
    gap: int
    step: int
    active: bool
    buffer: List[float]

    def __init__(self, value, length, gap, step, active):
        """
		 'value' : Value used to initialize buffer element (real float)
		'length' : Length of LTA window in number of sample points (integer)
		   'gap' : Length of buffer in number of sample points (integer)
		  'step' : Time point index (integer)
		'active' : LTA is active (True) when a full LTA window is calculated (logical)
		'buffer' : When buffer is full, LTA begins calculation (real float)
		"""

        self.value = value
        self.length = length
        self.gap = gap
        self.step = step
        self.active = active
        # Create the buffer with a length of "gap" filled with "value"
        # Because this is compiled, it must be a numba typed.List
        self.buffer = typed.List.empty_list(float64)
        for _ in range(gap):
            self.buffer.append(value)

    def update(self, valueNew):
        """
		Recursively updates a single element in a given long-term average, represented by a single object of 
		this class. For example, it will update the noise power spectrum at a single frequency, as 'valueNew' 
		is a scalar value. This method also determines if the buffer (gap) of the LTA object is full and if a 
		full LTA window has been calculated, i.e., whether the LTA status is active.

		'valueNew' : New value of the LTA object (real float)
		"""

        # Advance to next time point
        self.step += 1

        # Determine if: 1) time point is past the gap; 2) 'length' worth of time points (full LTA window) has
        # been calculated.
        diff = np.minimum(self.step - self.gap, self.length)

        # If time point is past the gap, start to calculate the LTA
        if diff > 1:
            self.value *= 1.0 - 1.0 / diff
            self.value += self.buffer[0] / diff

        # Shift values in buffer to the left (i.e., in negative direction) by one element. Put new value in
        # last position.
        # Note this next expression is essentially np.roll(self.buffer, -1); self.buffer[-1] = valueNew
        # But the original np.roll didn't have great performance
        # (using a deque size of 'self.gap' then  self.buffer.add(valueNew was much better)
        # but wit compilation this works pretty well
        self.buffer.append(valueNew)
        self.buffer.pop(0)
        # Full LTA window has been calculated, so set LTA status to "active"
        if diff >= self.length:
            self.active = True


def instantiateLTAs(param, noisePower, numBeam):
    """
    Instantiates and initializes long-term averages as C-like structures, mimicking 1D and 2D structured arrays 
    in Python as 1D and 2D comprehension lists, respectively. Each element in these mock arrays is a 
    'LongTermAverage' object.

            'param' : 'Parameters' object
       'noisePower' : Noise power spectrum, normalized (float)
          'numBeam' : Total number of beams in beamset (int)
    'noisePowerLTA' : Noise power LTA (1D list of length 'numFreq')
         'fstatLTA' : Noise F-statistic LTA (2D list of dimensions [numband][numBeam])
         'xstatLTA' : Signal and noise F-statistic LTA (2D list of dimensions [numBand][numBeam])
    """

    # Length of the LTA window in terms of number of samples
    ltaLength = int(np.round(param.ltaLength / param.step))
    # Period of time the LTA lags behind the detector in terms of number of samples
    ltaGap = int(np.round(param.ltaGap / param.step))

    # Instantiate recursive LTA of noise power with initial values from noise power spectrum
    noisePowerLTA = [
        LongTermAverage(noisePower[i], ltaLength, ltaGap, 0, False)
        for i in range(param.numFreq)
    ]
    # Instantiate recursive LTA of noise F-statistic with initial values of unity
    fstatLTA = [
        [LongTermAverage(1.0, ltaLength, ltaGap, 0, False) for i in range(numBeam)]
        for j in range(param.bandpass)
    ]
    # Instantiate recursive LTA of F-statistic (signal and noise) with initial values of unity
    xstatLTA = [
        [LongTermAverage(1.0, ltaLength, ltaGap, 0, False) for i in range(numBeam)]
        for j in range(param.bandpass)
    ]
    return noisePowerLTA, fstatLTA, xstatLTA
