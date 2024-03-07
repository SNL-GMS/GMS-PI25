import os
import sys

import numpy as np
from obspy.core import read


class Wavedata:
    """
	Reads in all IMS files and data from a specified directory 'imsDirectory'. Removes IMS data that are not 
	associated with the site-channel combinations provided in the network geometry file. Subtracts mean value
	from each waveform in each IMS file.
	"""

    def __init__(self):
        """
	    'imsFilenames' : List of IMS filenames
	         'imsData' : List of stream objects containing data from all IMS files
	          'numIMS' : Number of IMS files in directory
    	"""

        self.imsFilenames = None
        self.imsData = []
        self.numIMS = None

    def readIMSFilenames(self, imsDirectory):
        """
		Read in IMS filenames from a specified directory 'imsDirectory'.
		"""

        if not os.path.exists(imsDirectory):
            print("\nFile path %s does not exist. Exiting..." % imsDirectory)
            sys.exit()

        filenames = []
        for file in os.listdir(imsDirectory):
            ext = os.path.splitext(file)[-1].lower()
            if ext == ".ims":
                filenames.append(file)
                print(file)

        print("\nSort IMS filenames in chronological order")
        self.imsFilenames = sorted(filenames, reverse=False)

        # No. of IMS files
        self.numIMS = len(self.imsFilenames)

    def readIMSData(self, imsDirectory):
        """
		Each multiplexed IMS file is imported into a Stream object using the 'read()' function. 'imsData' is a 
		list of Stream objects. Streams are list-like objects that contain multiple Trace objects (i.e, 
		continuous time series and related header information). Each Trace object has an attribute called 
		'data' pointing to a NumPy ndarray of the time series and the attribute 'stats' which contains all 
		meta information in a dictionary-like Stats object. Both attributes 'starttime' and 'endtime' of the 
		Stats object are UTCDateTime objects (see ObsPy for more details). Default attributes of Stats are: 
	
		'sampling_rate' : Sampling rate [Hz] (float)
		                  Default value is 1.0
		        'delta' : Sampling distance [sec] (float)
		                  Default value is 1.0.
		        'calib' : Calibration factor (float) 
		                  Default value is 1.0.
		         'npts' : Number of sample points (int) 
		                  Default value is 0, i.e., no data present
		      'network' : Network code (string) 
		                  Default is an empty string
		     'location' : Location code (string) 
		                  Default is an empty string
		      'station' : Station code (string) 
		                  Default is an empty string
		      'channel' : Channel code (string) 
		                  Default is an empty string
		    'starttime' : Date and time of first data sample given as UTCDateTime 
		                  Default value is “1970-01-01T00:00:00.0Z”
		      'endtime' : Date and time of last data sample given as UTCDateTime 
		                  Default value is “1970-01-01T00:00:00.0Z”
		"""

        if not self.imsFilenames:
            print("\nNo IMS filenames contained in list. Exiting...")
            sys.exit()

        # Loop over IMS files (time segments)
        for filename in self.imsFilenames:
            # Read each IMS file into a Stream object
            st = read(imsDirectory + "/" + filename)
            print("\nReading %s" % filename)
            # To print metadata for all Trace objects in Stream, set: allTraces = True
            allTraces = False
            print("\n" + st.__str__(extended=allTraces))

            # Mend (concatenate) trace data that are split at the turn of the hour for identical network,
            # station, and channel. Trace data that are split are recorded in consecutive traces in the IMS
            # files, so test if first two traces are split segments:
            trA = st[0]
            networkA = trA.stats.network
            stationA = trA.stats.station
            channelA = trA.stats.channel
            trB = st[1]
            networkB = trB.stats.network
            stationB = trB.stats.station
            channelB = trB.stats.channel

            # If the first two traces are split segments, then the recorded data are at the turn of the hour.
            # Every two consecutive traces represent a single (overlapping) time segment and must be mended.
            if (
                (networkA == networkB)
                and (stationA == stationB)
                and (channelA == channelB)
            ):
                print("\nMending split traces...")
                numTrace = len(st)
                for i, x in enumerate(st):
                    if i % 2 == 0:
                        trA = st[i]
                        trB = st[i + 1]
                        trA.data = np.append(trA.data, trB.data)
                        # Append the new mended trace to the end of the original list of traces
                        st.append(trA)
                # Delete all previous split traces, saving the new mended traces
                del st[:numTrace]
                # Append the final Stream object to the list
                self.imsData.append(st)
                print("\n" + st.__str__(extended=allTraces))
            # If traces do not require mending
            else:
                # Append the current Stream object to the list
                self.imsData.append(st)

    def pruneSegments(self, arrayGeom):
        """
		Matches IMS data to network array geometry (site-channel combinations) provided in netowrk geometry 
		file. Removes data that are not associated with the desired sites (array elements) and channels. 

		'arrayGeom' : ArrayGeometry object
		"""

        # Loop over each Stream object (IMS file) in complete set of IMS data
        for st in self.imsData:
            # Store trace indices that match site and channel combinations
            matches = []
            numTrace = len(st)
            # Loop over each trace in current stream object
            for i, tr in enumerate(st):
                # Site and channel for current trace
                trSite = tr.stats.station
                trChan = tr.stats.channel
                # Check if current site is in list of desired sites
                indices = [m for m, s in enumerate(arrayGeom.sites) if trSite in s]
                for n in indices:
                    # Check if current channel is a match for the specified channel
                    if arrayGeom.channels[n] == trChan:
                        matches.append(i)
            # Append traces that are matches
            for j in range(len(matches)):
                st.append(st[j])
            # Delete all original traces and save matched traces
            del st[:numTrace]
            print("\n" + st.__str__(extended=False))

    def demeanSegments(self):
        """
		Demean, i.e. subtract the mean value from, individual waveforms in all IMS files.
		"""

        # Loop over each stream object (IMS file) in IMS data
        for st in self.imsData:
            # Loop over each trace in current stream object
            for tr in st:
                # Demean the trace
                tr.detrend("demean")
