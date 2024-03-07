import os
import sys

import numpy as np

# import itertools


class Beamform:
    """
	Imports arbitrary beam recipe data from an IDC-formatted beam parameter file. Computes vector slowness 
	for each beam component, offsets, distances between pairs of array elements, and time delays for each beam 
	and channel combination. Note that the only parameters needed from the beam parameter file are 'azi' and
	'slow'. Other necessary attributes are computed in the methods of this class.

	'D2R' : Degrees to radians (float) (Note: Selby uses pi = 3.141592654) [rad/deg]
	"""

    D2R = np.pi / 180.0

    def __init__(self):
        """   
		Attributes for this class correspond to beam recipe data (note that not all are needed in the program):

	          'name' : Name of beam component (string)
	         'btype' : Beam type (string)
	           'rot' : Rotation (string). Each component is assumed to have zero rotation.
	           'std' : Standard deviation (float). Assumed to be 0 for each component.
	           'snr' : Signal-to-noise ratio (float)
	           'azi' : Azimuth of beam component [degrees] (float)
	          'slow' : Slowness of beam component [sec/km] (float)
	         'phase' : Phase of beam component. Field is empty in generic recipe file.
	           'flo' : Low-end corner of bandpass filter [Hz] (float)
	           'fhi' : High-end corner of bandpass filter [Hz] (float)
	          'ford' : Filter order number (int)
	            'zp' : Zero phase (minimum phase) (boolean)
	         'ftype' : Filter type (string)
	         'group' : Group (e.g., vertical component of seismometer) (string)
		'vectorSlow' : Vector slowness of beam component [sec/km] (float)
	       'numBeam' : Total number of beams in beamset (int)
	       'offsets' : (x,y) displacement relative to array coordinates per array element [km] (float)
	     'distances' : Distances between each pair of channels (array elements) [km] (float)
	            'dt' : Delays for each beam and channel combination [sec] (float)
		"""

        self.name = []
        self.btype = []
        self.rot = []
        self.std = []
        self.snr = []
        self.azi = []
        self.slow = []
        self.phase = []
        self.flo = []
        self.fhi = []
        self.ford = []
        self.zp = []
        self.ftype = []
        self.group = []
        self.vectorSlow = []
        self.numBeam = None
        self.offsets = None
        self.distances = None
        self.dt = None

    def readBeamset(self, beamParFilename):
        """
		Reads beam recipe file 'beamParFilename' and computes vector slowness for each beam and total number
		of beams. Assumes IDC format.
		"""

        if not os.path.isfile(beamParFilename):
            print("File path %s does not exist. Exiting...\n" % beamParFilename)
            sys.exit()

        with open(beamParFilename) as f:
            for line in f:
                # Ignore blank lines
                if not line.strip():
                    print(line.rstrip())
                # Ignore comments
                elif line[0] == "#":
                    print(line.rstrip())
                # Ignore header line
                elif line[0:5] == "|name":
                    print(line.rstrip())
                # All other lines correspond to beams
                else:
                    # Read in beam parameters
                    print(line.rstrip())
                    line = line.split()
                    # self.name.append(line[0].replace('_', ''))
                    self.name.append(line[0])
                    self.btype.append(line[1])
                    self.rot.append(line[2])
                    self.std.append(line[3])
                    self.snr.append(float(line[4]))
                    self.azi.append(float(line[5]))
                    self.slow.append(float(line[6]))
                    self.phase.append(line[7])
                    self.flo.append(float(line[8]))
                    self.fhi.append(float(line[9]))
                    self.ford.append(int(line[10]))
                    self.zp.append(int(line[11]))
                    self.ftype.append(line[12])
                    self.group.append(line[13])

                    # Compute vector slowness
                    arg = self.D2R * float(line[5])
                    self.vectorSlow.append(
                        [float(line[6]) * np.sin(arg), float(line[6]) * np.cos(arg)]
                    )

        # Compute number of beams
        self.numBeam = len(self.name)

    def distAndOffset(self, lat, lon, arrayLat, arrayLon, numChan):
        """
		Computes array geometry relative to beam point (array reference point).

		     'lat' : Latitude of set of array elements [deg]
		     'lon' : Longitude of set of array elements [deg]
		'arrayLat' : Latitude of beam point [deg]
		'arrayLon' : Longitude of beam point [deg]
		 'numChan' : Number of channels 

		"""

        # Radius of earth [km]
        REARTH = 6371.0

        self.offsets = np.zeros((numChan, 2), dtype=float)
        self.distances = np.zeros((numChan, numChan), dtype=float)

        colat = (90.0 - arrayLat) * self.D2R
        dkmlat = self.D2R * REARTH
        dkmlon = self.D2R * REARTH * np.sin(colat)

        # Compute offsets of each array element (channel) relative to array coordinates (beam point)
        x = dkmlon * (lon - arrayLon)
        y = dkmlat * (lat - arrayLat)

        self.offsets[:, 0] = x
        self.offsets[:, 1] = y

        # Compute distance between each pair of channels
        for i in range(numChan):
            for j in range(numChan):
                self.distances[j, i] = np.sqrt((x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2)

    def delays(self):
        """
		Computes time delays 'dt' in seconds for each beam and channel combination. Array size is 
		[numChan, numBeam].
		"""

        self.dt = np.matmul(self.offsets, np.transpose(self.vectorSlow))
