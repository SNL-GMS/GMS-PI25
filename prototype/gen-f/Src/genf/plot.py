import os
import matplotlib.pyplot as plt
import numpy as np

#from scipy import interpolate
from scipy.interpolate import griddata
#from scipy.interpolate import Rbf
import scipy.special as sc
import scipy.stats as ss


def plot_fplots(
    fstatTime_C, fstatBeams_C, fstatTime_U, fstatBeams_U, azi, slow, numSites, degF, outputDirectory,
):

    # Parameters for non-central F distribution which reduces to the central F distribution when lambda = 0
    K = numSites
    N1 = degF
    N2 = N1 * (K - 1)
    # Set lambda to 0 for theoretical F curve (In non-central case, lambda = N1(snr)^2.)
    lamb = 0

    fstat = np.linspace(0., 5., 100)
    fprob = ss.ncf.pdf(fstat, N1, N2, lamb)

    kwargs = dict(alpha=0.5, density=True, bins=200)
    plt.hist(fstatTime_U, **kwargs, label='Correlated Noise = 0')
    plt.hist(fstatTime_C, **kwargs, facecolor='r', label='Correlated Noise = 1')
    plt.plot(fstat, fprob, 'k', label='Theoretical')
    plt.legend()
    plt.xlim(0, 12)
    plt.xlabel('F')
    plt.ylabel('%')
    plt.grid(True)
    plt.title('Observed F distribution')
    plt.gcf().set_size_inches(7, 5)
    plt.savefig(os.path.join(outputDirectory, "F_distribution_histogram.png"))
    plt.close("all")

    # Azimuth and slowness coordinates for both correlated and uncorrelated cases
    theta = np.radians(azi)
    r = slow

    # Overall maximum and minimum fstat values
    fmax = np.max([np.max(fstatBeams_C), np.max(fstatBeams_U)])
    fmin = np.min([np.min(fstatBeams_C), np.min(fstatBeams_U)])

    # Use griddata for unstructured data
    x = r * np.cos(theta)
    y = r * np.sin(theta)

    points = np.ndarray((len(x), 2))
    points[:,0] = x
    points[:,1] = y

    rmin = -1. * np.max(slow)
    rmax = np.max(slow)
    xi, yi = np.mgrid[rmin:rmax:100j, rmin:rmax:100j]

    # Interpolate data for both correlated and uncorrelated cases
    zi_c = griddata(points, fstatBeams_C, (xi, yi), method='cubic')
    zi_u = griddata(points, fstatBeams_U, (xi, yi), method='cubic')

    # Convert back to polar
    ri = np.sqrt(xi*xi + yi*yi)
    ti = np.arctan2(yi, xi)

    # Polar plot
    #fig = plt.figure()
    cmin = fmin
    cmax = fmax
    colormap = 'Spectral'
    ax = plt.subplot(121, polar=True)
    cf = plt.contourf(ti, ri, zi_u, 12, vmin=cmin, vmax=cmax, cmap=colormap)
    #cf = plt.contourf(ti, ri, zi_u, 12, cmap=colormap)
    c = plt.scatter(theta, r, c=fstatBeams_U, s=0.1, cmap=colormap)
    ax.scatter(theta, r, color='k', marker='+')
    ax.set_rmax(np.max(slow))
    ax.set_theta_zero_location("N")
    ax.set_rlabel_position(75)
    ax.set_theta_direction(-1)
    cbar = plt.colorbar(c)
    plt.clim(cmin, cmax)
    plt.title('F_DS: CORRELATED_NOISE = 0')

    ax = plt.subplot(122, polar=True)
    cf = plt.contourf(ti, ri, zi_c, 12, vmin=cmin, vmax=cmax, cmap=colormap)
    #cf = plt.contourf(ti, ri, zi_c, 12, cmap=colormap)
    c = plt.scatter(theta, r, c=fstatBeams_C, s=0.1, cmap=colormap)
    ax.scatter(theta, r, color='k', marker='+')
    ax.set_rmax(np.max(slow))
    ax.set_theta_zero_location("N")
    ax.set_rlabel_position(75)
    ax.set_theta_direction(-1)
    cbar = plt.colorbar(c)
    plt.clim(cmin, cmax)
    plt.title('F_MPAVE: CORRELATED_NOISE = 1')

    plt.gcf().set_size_inches(18, 6)
    plt.savefig(os.path.join(outputDirectory, "F_distribution_polar.png"))
    plt.close("all")

def plot_beamset(beamform, outputDirectory, network):
    ax = plt.subplot(111, polar=True)
    ax.plot(np.deg2rad(beamform.azi), beamform.slow, "ro")
    plt.savefig(os.path.join(outputDirectory, f"{network}_beamset.png"))
    plt.close("all")


def plot_instrument_response(NP, outputDirectory):
    plt.figure(num=None, figsize=(6, 4), facecolor="w", edgecolor="k")
    plt.plot(NP.respFreq, NP.respAmp)
    plt.title("FAP instrument response")
    plt.xlabel("Frequency [Hz]")
    plt.ylabel("Amplitude [counts/nm]")
    plt.savefig(os.path.join(outputDirectory, "instrumentResponse.png"))
    plt.close("all")

def plot_noise_power_spectrum(freq, noisePower, outputDirectory):
    plt.figure(num=None, figsize=(6, 4), facecolor="w", edgecolor="k")
    plt.plot(freq, noisePower)
    plt.title("Noise Power Spectrum (convolved)")
    plt.xlabel("Frequency [Hz]")
    plt.ylabel("Noise power (unitless)")
    plt.savefig(os.path.join(outputDirectory, "noisePower.png"))
    plt.close("all")

def plot_narrowband_filters(fta, numFreq, outputDirectory):
    plt.figure(num=None, figsize=(12, 5), facecolor="w", edgecolor="k")
    for n in range(numFreq):
        plt.plot(fta.f, fta.comb[:, n])
    plt.xlim([-10.0, 10.0])
    plt.title("FTA Narrowband Hanning Filters")
    plt.xlabel("Frequency [Hz]")
    plt.ylabel("Filter amplitude")
    plt.rc("font", size=10)
    plt.rc("figure", titlesize=10)
    plt.rc("xtick", labelsize=10)
    plt.rc("ytick", labelsize=10)
    plt.rc("axes", titlesize=10)
    plt.rc("axes", labelsize=10)
    plt.savefig(os.path.join(outputDirectory, "narrowbandFilters.png"))
    plt.close("all")


def plot_passband_filters(
    passbandFilters, fta, freq, numFreq, corners, outputDirectory
):
    plt.figure(num=None, figsize=(7, 6), facecolor="w", edgecolor="k")
    # Set markers for up to 7 plots (passbands)
    markers = ["H", "D", "s", "o", "v", "^", "x"]

    for m in range(numFreq):
        plt.plot(fta.f, fta.comb[:, m], color="xkcd:light grey")
    for n in range(passbandFilters.numBand):
        if n == 3:
            color = "r"
        else:
            color = "k"
        plt.plot(
            freq,
            passbandFilters.passbandFilters[:, n],
            color=color,
            marker=markers[n],
            markerfacecolor="w",
            markersize=6,
            label=str(corners[n, :]),
        )
    plt.xlim([0.0, 7.0])
    plt.rc("font", size=10)
    plt.rc("figure", titlesize=10)
    plt.rc("axes", titlesize=10)
    plt.rc("axes", labelsize=10)
    plt.rc("xtick", labelsize=10)
    plt.rc("ytick", labelsize=10)
    plt.title("Passband filters")
    plt.xlabel("Frequency [Hz]")
    plt.ylabel("Filter amplitude")
    plt.legend(loc="upper right")
    plt.savefig(os.path.join(outputDirectory, "passbandFilters.png"))
    plt.close("all")


def plot_traces(detection, plotTitle, samplingRate, step, overlap, subdir):

    # Root filename for each plot contains detection date and time
    filenameRoot = str(detection.dateTime).translate({ord(i): None for i in "-:"})[0:15]

    # Plot F-statistic trace
    plt.figure(figsize=(12, 5))
    plt.plot(
        np.arange(len(detection.statTrace)) * step / 60., 
        detection.statTrace, 
        color="b"
    )
    plt.title("Processing interval: " + plotTitle)
    plt.xlabel("Time [min]")
    plt.legend(["FSTAT"])
    plt.grid(True)
    plt.autoscale(enable=True, axis="x", tight=True)
    plt.savefig(os.path.join(subdir, f"{filenameRoot}_fstat.png"))
    
    # Plot F-probability trace
    plt.figure(figsize=(12, 5))
    plt.plot(
        np.arange(len(detection.probTrace)) * step / 60., 
        detection.probTrace, 
        color="b"
    )
    plt.title("Processing interval: " + plotTitle)
    plt.xlabel("Time [min]")
    plt.legend(["FPROB"])
    plt.grid(True)
    plt.autoscale(enable=True, axis="x", tight=True)
    plt.savefig(os.path.join(subdir, f"{filenameRoot}_fprob.png"))
    
    # Plot detection beam trace
    plt.figure(figsize=(12, 5))
    plt.plot(
        np.arange(len(detection.beamTrace)) / (60. * samplingRate) - overlap / 60.,
        detection.beamTrace,
        color="b",
    )
    plt.title("Processing interval: " + plotTitle)
    plt.xlabel("Time [min]")
    plt.legend(["BEAM"])
    plt.grid(True)
    plt.autoscale(enable=True, axis="x", tight=True)
    plt.savefig(os.path.join(subdir, f"{filenameRoot}_detBeam.png"))
    plt.close("all")



def plot_beamweights(detection, arrayGeom, numChan, freq, numFreq, subdir):
    # Plot beam weights for detection beam at each frequency of interest. If fewer frequencies at which
    # to plot weights is desired, note that 'fi' below is an index, not a frequency in Hz, and adjust
    # the range statment. Note: Selby only keeps real part of complex weights in detection object.

    filenameRoot = str(detection.dateTime).translate({ord(i): None for i in "-:"})[0:15]
    for fi in range(numFreq):
        # Take element-wise absolute value in rare case of negative value
        wts = np.abs(detection.weights[fi, :])
        plt.figure(num=None, figsize=(7, 6), facecolor="w", edgecolor="k")
        for k in range(numChan):
            plt.scatter(
                arrayGeom.siteLon[k],
                arrayGeom.siteLat[k],
                color="r",
                marker="o",
                s=wts[k] * 25000,
                alpha=0.2,
            )
            plt.scatter(
                arrayGeom.siteLon[k], arrayGeom.siteLat[k], color="k", marker="x", s=30
            )
        plt.title("Weights: Beam %i, %1.2f Hz" % (detection.beam, freq[fi]))
        plt.xlabel("Longitude [deg]")
        plt.ylabel("Latitude [deg]")
        fstr = str("%1.2f" % freq[fi])
        plt.savefig(os.path.join(subdir, f"{filenameRoot}_beamWts_{fstr}Hz.png"))
        plt.close("all")
