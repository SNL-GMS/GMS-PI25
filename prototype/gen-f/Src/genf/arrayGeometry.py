import os
import sys

import numpy as np


class ArrayGeometry:
    """
	Read in array geometry information from specified network geometry file.
	"""

    def __init__(self):
        """
		 'numSites' : Number of sites (array elements)
		 'arrayRef' : Array reference point, i.e., beam point (lat, lon)
		 	'sites' : Site names
		 'channels' : Site channels
		  'siteLat' : Site latitudinal coordinate [deg]
		  'siteLon' : Site longitudinal coordinate [deg]
		"""

        self.numSites = None
        self.arrayRef = None
        self.sites = []
        self.channels = []
        self.siteLat = []
        self.siteLon = []

    def readArrayGeometryFile(self, arrayGeomFilename):
        """
		Read in array geometry information from specified network geometry file.
		"""

        if not os.path.isfile(arrayGeomFilename):
            print("File path %s does not exist. Exiting...\n" % arrayGeomFilename)
            sys.exit()

        with open(arrayGeomFilename) as f:

            print("\n")
            header = f.readline()
            print(header.rstrip())
            header = header.split()
            self.numSites = int(header[0])
            self.arrayRef = np.array([float(header[1]), float(header[2])], dtype=float)

            for line in f:
                print(line.rstrip())
                line = line.split()
                self.sites.append(line[0])
                self.channels.append(line[1])
                self.siteLat.append(float(line[2]))
                self.siteLon.append(float(line[3]))

    def importArrayGeometryDatabase(self, wfDict, arrayRef):
        """
		Extract array geometry information from the database via waveform metadata. The array reference 
		point 'arrayRef' is specified by the beam point data in the array parameter file (e.g., CMAR.par). 

		'wfDict' : 
		"""

        self.arrayRef = arrayRef

        latLon = np.array(wfDict["latlon"])
        self.numSites = np.shape(latLon)[0]

        print("\nNumber of sites: %d" % self.numSites)
        print("Beam point: %2.7f  %2.7f" % (self.arrayRef[0], self.arrayRef[1]))
        print("Array geometry:")

        for n in range(self.numSites):
            tr = wfDict["traces"][n]
            self.sites.append(tr.stats.station)
            self.channels.append(tr.stats.channel)
            self.siteLat.append(latLon[n, 0])
            self.siteLon.append(latLon[n, 1])
            print(
                "%s  %s  %2.7f  %2.7f"
                % (tr.stats.station, tr.stats.channel, latLon[n, 0], latLon[n, 1])
            )
