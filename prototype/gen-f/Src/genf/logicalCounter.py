import numpy as np


class LogicalCounter:
    """
	Logical counters are used for the 'signalPresent' and 'detecting' objects during the detection phase.
	"""

    def __init__(self):
        """
		'value' : Value of the logical counter object (int)
		"""

        self.value = None

    def initiate(self, value):
        """
		Initializes the logical counter object, either prior to the detection phase ('value' = 0) or when a 
		signal is present, i.e., when the maximum F-stat probability exceeds the significance threshold 
		('value' = 'waitStep'). The parameter 'waitStep' is the calculated from the parameter 'WAIT' from the 
		network parameter file, the number of seconds the detector must wait post-detection to make another 
		detection, but converted to number of sample points.
		"""

        self.value = value

    def decrement(self):
        """
		Decrements the logical counter value by 1 (one time step). When the maximum F-stat no longer exceeds 
		the significance threshold, the 'signalPresent' value decreases by 1. 
		"""

        self.value = np.maximum(0, self.value - 1)

    def state(self):
        """
		Returns the state of the logical counter (boolean). If a signal is present or a detection is still 
		occurring, the state is True.
		"""
        return self.value > 0
