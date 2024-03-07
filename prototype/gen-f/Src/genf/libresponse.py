# functions to import when calling 'from libresponse import *'
__all__ = ['db2mag', 'mag2db', 'wrap', 'calc_freqaxis', 'compute_resp',
           'scale_fap', 'compute_resp_scalar', 'defap']

# version number
__version__ = "2.2.4"

# import statements
import os                 # i/o operations (path exists, isdirectory, etc.)
import re                 # regular expressions
import numpy as np        # math
import scipy as sp        # scipy
import scipy.interpolate  #  - interpolation functions
import scipy.signal       #  - signal processing
import warnings           # warnings
    
# type hinting (purely for documentation purposes) (see: PEP 484)
# - https://www.python.org/dev/peps/pep-0484/
from typing import overload, Optional, Tuple, Union


#-------------------------------------------------------------------------------
# Hacks
#-------------------------------------------------------------------------------

# add newline to end of warning messages to improve readability
# (see: https://github.com/python/cpython/blob/main/Lib/warnings.py)
def _wrap_formatwarnmsg(func):
    def _formatwarnmsg_wrapped(*args, **kwargs):
        return func(*args, **kwargs) + "\n"  # add a newline to the return value
    _formatwarnmsg_wrapped._iswrapped = True  # avoid rewrapping with Jupyter autoreload
    return _formatwarnmsg_wrapped

# wrap function
if not getattr(warnings._formatwarnmsg, "_iswrapped", False):  # if not yet wrapped
    warnings._formatwarnmsg = _wrap_formatwarnmsg(warnings._formatwarnmsg)


#-------------------------------------------------------------------------------
# Classes
#-------------------------------------------------------------------------------

class ExtraneousDataWarning(UserWarning):
    """Custom warning for when extraneous lines are detected in a response
    block."""
    pass

class ExtrapolationWarning(UserWarning):
    """Custom warning for when extrapolation is required to calculate part of an
    instrument response."""
    pass

class FirCoefficientsWarning(UserWarning):
    """Custom warning for when IIR 'a' coefficients are detected in an FIR
    filter description."""
    pass

class IirCoefficientsWarning(UserWarning):
    """Custom warning for when IIR 'a0' coefficient is not equal to 1."""
    pass

class LineLengthWarning(UserWarning):
    """Custom warning for when the line length exceeds 101 characters. This is a
    hard-coded limit in the original system, and while it doesn't matter in
    Python, a warning is raised to notify the end-user that it has occurred."""
    pass

class UnsupportedResponseWarning(UserWarning):
    """Custom warning for an unsupported instrument response type or format."""
    pass

class interpolate1d(scipy.interpolate.interp1d):
    """Extend scipy interp1d to interpolate/extrapolate per axis in log space"""
    
    def __init__(self, x, y, *args, xspace='linear', yspace='linear', **kwargs):
        self.xspace = xspace
        self.yspace = yspace
        if self.xspace == 'log': x = np.log10(x)
        if self.yspace == 'log': y = np.log10(y)
        super().__init__(x, y, *args, **kwargs)
        
    def __call__(self, x, *args, **kwargs):
        if self.xspace == 'log': x = np.log10(x)
        if self.yspace == 'log':
            return 10**super().__call__(x, *args, **kwargs)
        else:
            return super().__call__(x, *args, **kwargs)


#-------------------------------------------------------------------------------
# Helper functions
#-------------------------------------------------------------------------------

def db2mag(x):
    """Convert decibels to magnitude."""
    return 10**(x/20)

def mag2db(x):
    """Convert magnitude to decibels."""
    return 20*np.log10(x)

def wrap(x, a=[-np.pi, np.pi]):
    """Wrap a list of angles between two values (default [-pi, pi])"""
    x = np.array(x)  # convert to numpy array

    while any(x < a[0]):  # while there are any values less than a[0]
        x[x<a[0]] += np.diff(a)  # shift them up by (a[1]-a[0])

    while any(x > a[1]):  # while there are any values greater than a[1]
        x[x>a[1]] -= np.diff(a)  # shift them up by (a[1]-a[0])

    return x


def calc_freqaxis(minfreq: float, maxfreq: float, numfreq: int = 1024,
    logscale: bool = False) -> Tuple[float, ...]:
    """Computes a frequency axis.

    Examples
    --------

        >>> f = calc_freqaxis(minfreq=.001, maxfreq=20, numfreq=255, logscale=True)
        >>> f = calc_freqaxis(001, 20)
    
    Parameters
    ----------
    minfreq : float
        The starting value of a frequency axis that will be built, in Hertz
    maxfreq : float
        The ending value of a frequency axis that will be built, in Hertz
    numfreq : int
        The number of frequency bins from which to build a frequency axis
        (default: 1024)
    logscale : bool
        If `True`, builds a log-spaced frequency axis (default: `False`)
    
    Returns
    -------
    tuple of floats
        Computed frequency axis
    
    Raises
    ------
    TypeError
        An invalid type is given for an argument
    ValueError
        An invalid value has been given in one of the arguments
    """

    # ARG CHECK: minfreq is int/float
    if not isinstance(minfreq, (float, int)):
        raise TypeError("`minfreq` expects type 'float' or 'int', received '{}'".format(type(minfreq).__name__))

    # ARG CHECK: maxfreq is int/float
    if not isinstance(maxfreq, (float, int)):
        raise TypeError("`maxfreq` expects type 'float' or 'int', received '{}'".format(type(maxfreq).__name__))

    # ARG CHECK: numfreq is int
    if not isinstance(numfreq, int):
        raise TypeError("`numfreq` expects type 'int', received '{}'".format(type(numfreq).__name__))

    # ARG CHECK: logscale is bool
    if not isinstance(logscale, bool):
        raise TypeError("`logscale` expects type 'bool', received '{}'".format(type(logscale).__name__))

    # ARG CHECK: minimum frequency is less than the maximum frequency
    if not minfreq < maxfreq:
        raise ValueError("The minimum frequency must be less than the maximum frequency")

    # ARG CHECK: min/max freq are positive
    if minfreq < 0 or maxfreq < 0:
        raise ValueError("The minimum and maximum frequencies must be positive")

    # ARG CHECK: numfreq is greater than 2
    if numfreq <= 2:
        raise ValueError("The number of frequencies must be greater than 2")

    # compute frequency axis
    if logscale:  # logarithmically spaced (log10)
        f = np.logspace(np.log10(minfreq), np.log10(maxfreq), numfreq)
    else:  # linearly spaced
        f = np.linspace(minfreq, maxfreq, numfreq)

    # return frequency axis
    return tuple(f.tolist())


#-------------------------------------------------------------------------------
# Private functions
#-------------------------------------------------------------------------------


# ----- fap --------------------------------------------------------------------

def _parse_fap(resp_block):
    """Parses a frequency-amplitude-phase (FAP) format instrument response and
    interpolates/extrapolates its values onto a new frequency axis.

    Format
    ------
    FAP response blocks are in the format

                ```
                resp_type  stage_num  inst_name  resp_form  comments
                N
                freq0  amp0  phase0   amp_err0    phase_err0
                freq1  amp1  phase1   amp_err1    phase_err1
                freq2  amp2  phase2   amp_err2    phase_err2
                  :     :      :         :            :
                  :     :      :         :            :
                  :     :      :         :            :
                freqN  ampN  phaseN   amp_errN    phase_errN
                ```

        resp_type   Response type. This should either be "theoretical" or
                    "measured". This value isn't actually used in response
                    calculation, but the original code checks that it's one of
                    these two values.
        
        stage_num   Instrument response stage number. This is not used in
                    response calculation, but it provides metadata for
                    interpretation of the response.
        
        inst_name   Instrument/equipment name. This is not used in response
                    calculation, but it provides metadata for interpretation of
                    the response.
        
        resp_form   Response format. This should be "fap".
        
         comments   Anything beyond the fourth column in the header line is not
                    read by the original code and may be considered a kind of
                    comment. It is most often used to store information about
                    the instrument manufacturer/company name, or the name of
                    the person who contributed the response.

            N       The number of frequencies listed below

          freq      The frequency at which the response is evaluated

           amp      The amplitude evaluated at `freq`

          phase     The phase evaluated at `freq`

         amp_err    The amplitude error evaluated at `freq`

        phase_err   The phase error evaluated at `freq`


    Parameters
    ----------
    resp_block : list or tuple of strs
        A list or tuple containing each line of an entire FAP response block
    
    Returns
    -------
    dict
        Dictionary containing information about the instrument response

        resp_type : str
            Type of instrument response ('theoretical' or 'measured')
        stage_num : int
            The stage number of this response
        inst_name : str
            The name of the instrument
        resp_form : str
            Format of the instrument response coefficients (e.g., 'fap')
        comments : str
            Anything after the fourth column is considered a comment. This is
            most often used to sure information about the instrument
            manufacturer/company name or the name of the person who contributed
            the response.

        coefs : dict
            A dictionary containing information from the original response file

            freqs : tuple of floats
                Frequencies from the original FAP response
            amp : tuple of floats
                Amplitudes from the original FAP response
            phase : tuple of floats
                Phases from the original FAP response
            amp_error : tuple of floats
                Amplitude errors from the original FAP response
            phase_error : tuple of floats
                Phase errors from the original FAP response

    Warns
    -----
    ExtraneousDataWarning
        There are more lines than expected in the response block
    UnsupportedResponseWarning
        The response type is not either "measured" or "theoretical"
    """


    #---------------------------------------------------------------------------
    # parse the header
    #---------------------------------------------------------------------------

    # get the header line and split it into an array
    header = resp_block[0].split()

    # parse the header
    resp_type = header[0].lower()  # response type (measured, theoretical)
    stage_num = header[1].lower()  # stage number
    inst_name = header[2].lower()  # instrument name
    resp_form = header[3].lower()  # response format (should be 'fap')

    # capture the comments verbatim (split() eliminates extraneous spaces)
    if len(header) == 4:
        comments = ""
    else:
        comments = resp_block[0][resp_block[0].index(header[4]):]

    # warn on unsupported response types
    if resp_type not in ('measured', 'theoretical'):
        warnings.warn("Encountered unsupported response type: '{}'".format(resp_type),
            UnsupportedResponseWarning, stacklevel=2)

    # get the number of FAP coefficients to parse
    N = int(resp_block[1])  # convert to integer (if fails, returns ValueError)

    # warn if there are extraneous lines after the FAP block
    extra_lines = [line for line in resp_block[2+N:]              # get each line after the response block
                            if not line.lstrip().startswith("#")  # if it's not a comment line
                            and not len(line.strip()) == 0]       # and it's not a blank line
    if extra_lines:  # if there are extraneous lines
        warnings.warn(
            "Detected {} non-comment/non-blank lines after the end of the '{}' block. ".format(len(extra_lines), resp_form)
            + "These lines will not affect the {} response, and they will be ignored:\n".format(resp_form)
            + ">>{}".format("\n>>".join(extra_lines)),
            ExtraneousDataWarning, stacklevel=2)


    #---------------------------------------------------------------------------
    # parse the FAP coefficients
    #---------------------------------------------------------------------------

    # initialize a list to hold our coefficients
    coefs = {
        'freqs':       [],  # frequencies
        'amp':         [],  # amplitude
        'phase':       [],  # phase
        'amp_error':   [],  # amplitude error
        'phase_error': []   # phase error
    }

    # loop through all the FAP lines and collect the coefficients
    for line in resp_block[2:2+N]:

        # split the line by whitespace
        line_array = line.split()

        # record the cofficients
        coefs['freqs'].append(       float(line_array[0]) )
        coefs['amp'].append(         float(line_array[1]) )
        coefs['phase'].append(       float(line_array[2]) )
        coefs['amp_error'].append(   float(line_array[3]) )
        coefs['phase_error'].append( float(line_array[4]) )


    #---------------------------------------------------------------------------
    # return the data
    #---------------------------------------------------------------------------

    # build a dictionary of all our values
    resp = {
        'resp_type': resp_type,
        'stage_num': stage_num,
        'inst_name': inst_name,
        'resp_form': resp_form,
        'comments':  comments,
        'coefs':     coefs
    }

    # return the dictionary
    return resp

def _calc_fap(stage, freqs):
    """Internal function to compute FAP response for a given freq axis."""

    # some shorthand
    coefs = stage['coefs']

    # interpolate (and extrapolate, if required) onto the new frequency axis
    interp_amp   = interpolate1d(coefs['freqs'], coefs['amp'],   kind='linear', fill_value='extrapolate', xspace='log', yspace='log')
    interp_phase = interpolate1d(coefs['freqs'], coefs['phase'], kind='linear', fill_value='extrapolate')
    amp   = interp_amp(freqs)    # interpolate onto the master freq axis
    phase = interp_phase(freqs)  # interpolate onto the master freq axis
    # NOTE: we're not doing anything with amp/phase errors. these seem to always
    # be zero, and the original source didn't do anything with them, either.

    # for reference, the MATLAB code extrapolates with constant values. the scipy equivalent is
    # interp_amp   = sp.interpolate.interp1d(coefs['freqs'], coefs['amp'],   kind='linear', fill_value=(coefs['amp'][0], coefs['amp'][-1]), bounds_error=False)
    # interp_phase = sp.interpolate.interp1d(coefs['freqs'], coefs['phase'], kind='linear', fill_value=(coefs['phase'][0], coefs['phase'][-1]), bounds_error=False)

    # there should never be a negative magnitude, but they may arise
    # due to extrapolation. fix those by setting them to zero
    amp[amp < 0] = 0

    # convert arrays to tuples
    amp   = tuple(amp.tolist())
    phase = tuple(phase.tolist())

    # update stage dictionary to include uniform FAP response
    stage.update({
        'freqs': freqs,
        'amp':   amp,
        'phase': phase
        })

    # return the updated response block
    return stage


# ----- paz --------------------------------------------------------------------

def _parse_paz(resp_block):
    """Parses a poles and zeros (PAZ) format instrument response and calculates
    the amplitude and phase given a list of frequencies.
    
    Format
    ------
    PAZ response blocks are in the format

                ```
                resp_type  stage_num  inst_name  resp_form  comments
                A0
                NP
                p0_real   p0_imag    p0_real_err  p0_imag_err
                p1_real   p1_imag    p1_real_err  p1_imag_err
                p2_real   p2_imag    p2_real_err  p2_imag_err
                   :         :            :            :
                   :         :            :            :
                   :         :            :            :
                pNP_real  pNP_imag  pNP_real_err  pNP_imag_err
                NZ
                z0_real   z0_imag    z0_real_err  z0_imag_err
                z1_real   z1_imag    z1_real_err  z1_imag_err
                z2_real   z2_imag    z2_real_err  z2_imag_err
                   :         :            :            :
                   :         :            :            :
                   :         :            :            :
                zNZ_real  zNZ_imag  zNZ_real_err  zNZ_imag_err
                ```

        resp_type   Response type. This should either be "theoretical" or
                    "measured". This value isn't actually used in response
                    calculation, but the original code checks that it's one of
                    these two values.
        
        stage_num   Instrument response stage number. This is not used in
                    response calculation, but it provides metadata for
                    interpretation of the response.
        
        inst_name   Instrument/equipment name. This is not used in response
                    calculation, but it provides metadata for interpretation of
                    the response.
        
        resp_form   Response format. This should be "paz".
        
         comments   Anything beyond the fourth column in the header line is not
                    read by the original code and may be considered a kind of
                    comment. It is most often used to store information about
                    the instrument manufacturer/company name, or the name of
                    the person who contributed the response.

            A0      A0 normalization factor

            NP      Number of poles listed below

         p_real     Real part of the pole

         p_imag     Imaginary part of the pole

        p_real_err  Real part of the pole error

        p_imag_err  Imginary part of the pole error

            NZ      Number of zeros listed below

         z_real     Real part of the zero

         z_imag     Imaginary part of the zero

        z_real_err  Real part of the zero error

        z_imag_err  Imginary part of the zero error


    Parameters
    ----------
    resp_block : list or tuple of strs
        A list or tuple containing each line of an entire PAZ response block
    
    Returns
    -------
    dict
        Dictionary containing information about the instrument response
        
        resp_type : str
            Type of instrument response ('theoretical' or 'measured')
        stage_num : int
            The stage number of this response
        inst_name : str
            The name of the instrument
        resp_form : str
            Format of the instrument response coefficients (e.g., 'paz')
        comments : str
            Anything after the fourth column is considered a comment. This is most
            often used to sure information about the instrument manufacturer/company
            name or the name of the person who contributed the response.

        coefs : dict
            A dictionary containing information from the original response file

            A0 : float
                A0 normalization factor
            poles_real : tuple of floats
                Real parts of poles from the original PAZ response
            poles_imag : tuple of floats
                Imaginary parts of poles from the original PAZ response
            zeros_real : tuple of floats
                Real parts of zeros from the original PAZ response
            zeros_imag : tuple of floats
                Imaginary parts of zeros from the original PAZ response
            poles_real_error : tuple of floats
                Real parts of the pole errors from the original response
            poles_imag_error : tuple of floats
                Imaginary parts of the pole errors from the original response
            zeros_real_error : tuple of floats
                Real parts of the zero errors from the original response
            zeros_imag_error : tuple of floats
                Imaginary parts of the zero errors from the original response

    Warns
    -----
    ExtraneousDataWarning
        There are more lines than expected in the response block
    UnsupportedResponseWarning
        The response type is not either "measured" or "theoretical"

    Raises
    ------
    RuntimeError
        Mismatch between the number of coefficients/errors expected and the
        number read
    """

    #---------------------------------------------------------------------------
    # parse the header
    #---------------------------------------------------------------------------

    # get the header line and split it into an array
    header = resp_block[0].split()

    # parse the header
    resp_type = header[0].lower()  # response type (measured, theoretical)
    stage_num = header[1].lower()  # stage number
    inst_name = header[2].lower()  # instrument name
    resp_form = header[3].lower()  # response format (should be 'paz')

    # capture the comments verbatim (split() eliminates extraneous spaces)
    if len(header) == 4:
        comments = ""
    else:
        comments = resp_block[0][resp_block[0].index(header[4]):]

    # warn on unsupported response types
    if resp_type not in ('measured', 'theoretical'):
        warnings.warn("Encountered unsupported response type: '{}'".format(resp_type),
            UnsupportedResponseWarning, stacklevel=2)

    # get the number of poles and zeros to parse
    # (0=header; 1=A0; 2=NP; 3=first line of poles; 3+NP=NZ)
    NP = int(resp_block[2])
    NZ = int(resp_block[3+NP])

    # warn if there are extraneous lines after the PAZ block
    extra_lines = [line for line in resp_block[4+NP+NZ:]          # get each line after the response block
                            if not line.lstrip().startswith("#")  # if it's not a comment line
                            and not len(line.strip()) == 0]       # and it's not a blank line
    if extra_lines:  # if there are extraneous lines
        warnings.warn(
            "Detected {} non-comment/non-blank lines after the end of the '{}' block. ".format(len(extra_lines), resp_form)
            + "These lines will not affect the {} response, and they will be ignored:\n".format(resp_form)
            + ">>{}".format("\n>>".join(extra_lines)),
            ExtraneousDataWarning, stacklevel=2)


    #---------------------------------------------------------------------------
    # parse the PAZ coefficients
    #---------------------------------------------------------------------------

    # initialize a list to hold our coefficients
    coefs = {
        'A0':               [], # A0 normalization factor
        'poles_real':       [], # poles (real part)
        'poles_imag':       [], # poles (imaginary part)
        'zeros_real':       [], # zeros (real part)
        'zeros_imag':       [], # zeros (imaginary part)
        'poles_real_error': [], # poles (real part) error
        'poles_imag_error': [], # poles (imaginary part) error
        'zeros_real_error': [], # zeros (real part) error
        'zeros_imag_error': []  # zeros (imaginary part) error
    }

    # get the A0 normalization factor
    coefs['A0'] = float(resp_block[1])

    # loop through all the poles and collect the coefficients
    # (0=header; 1=A0; 2=NP; 3=first line of poles)
    for line in resp_block[3:3+NP]:

        # split the line by whitespace
        line_array = line.split()

        # record the cofficients
        coefs['poles_real'].append(       float(line_array[0]) )
        coefs['poles_imag'].append(       float(line_array[1]) )
        coefs['poles_real_error'].append( float(line_array[2]) )
        coefs['poles_imag_error'].append( float(line_array[3]) )

    # loop through all the zeros and collect the coefficients
    # (0=header; 1=A0; 2=NP; 3+NP=NZ; 3+NP+1=first line of zeros)
    for line in resp_block[3+NP+1:3+NP+1+NZ]:

        # split the line by whitespace
        line_array = line.split()

        # record the cofficients
        coefs['zeros_real'].append(       float(line_array[0]) )
        coefs['zeros_imag'].append(       float(line_array[1]) )
        coefs['zeros_real_error'].append( float(line_array[2]) )
        coefs['zeros_imag_error'].append( float(line_array[3]) )

    # quick check to make sure the number of poles and zeros are what we expect
    if (NP != len(coefs['poles_real']) or NP != len(coefs['poles_imag'])
        or NZ != len(coefs['zeros_real']) or NZ != len(coefs['zeros_imag'])):
        raise RuntimeError("Expected {} poles and {} zeros".format(NP, NZ)
            + " but read {} and {} real, and {} and {} imaginary, respectively.".format(
                len(coefs['poles_real']), len(coefs['zeros_real']),
                len(coefs['poles_imag']), len(coefs['zeros_imag']) ))


    #---------------------------------------------------------------------------
    # return the data
    #---------------------------------------------------------------------------

    # build a dictionary of all our values
    resp = {
        'resp_type': resp_type,
        'stage_num': stage_num,
        'inst_name': inst_name,
        'resp_form': resp_form,
        'comments':  comments,
        'coefs':     coefs
    }

    # return the dictionary
    return resp

def _calc_paz(stage, freqs):
    """Internal function to compute PAZ response for a given freq axis."""

    # some shorthand
    coefs = stage['coefs']

    # merge real and imaginary parts into complex numbers
    poles = np.array(coefs['poles_real']) + 1j*np.array(coefs['poles_imag'])
    zeros = np.array(coefs['zeros_real']) + 1j*np.array(coefs['zeros_imag'])
    # NOTE: we're not doing anything with pole/zero errors. these seem to always
    # be zero, and the original source didn't do anything with them, either.

    # convert frequencies to angular freq
    w = 2 * np.pi * np.array(freqs)

    # ----- build transfer function ------------------------------------

    # initialize as ones * A0
    H = coefs['A0'] * np.ones(w.shape, dtype=np.complex128)

    # numerator: (i*w - z0)(i*w - z1)(...)
    for z in zeros:
        H *= 1j*w - z

    # denominator: (i*w - p0)(i*w - p1)(...)
    for p in poles:
        H /= 1j*w - p

    # compute amplitude, phase
    amp   = np.abs(H)
    phase = np.angle(H)
    phase = np.rad2deg(np.unwrap(phase))

    # convert arrays to tuples
    amp   = tuple(amp.tolist())
    phase = tuple(phase.tolist())

    # update stage dictionary to include uniform FAP response
    stage.update({
        'freqs': freqs,
        'amp':   amp,
        'phase': phase
        })

    # return the updated stage dict
    return stage


# ----- fir/iir ----------------------------------------------------------------

def _parse_firiir(resp_block):
    """Parses a finite impulse response (FIR) or infinite impulse response (IIR)
    format instrument response and calculates the amplitude and phase given a
    list of frequencies.

    Note that FIR filters should only have 'b' coefficients, but 'a'
    coefficients are detailed in the FIR response below. The original system's
    source code has undocumented support for IIR filter 'a' coefficients within
    an FIR response block. In FIR filter blocks, the number of 'b' coefficients
    is always given as '0', but that value, and subsequent coefficients, are
    nevertheless read and used by the system.

    This function will process both 'fir' response blocks and 'iir' response
    blocks. If an 'fir' response block contains 'a' coefficients, it will raise
    a warning, but it will still parse the 'a' coefficients.
    
    Format
    ------
    FIR/IIR response blocks are in the format

                ```
                resp_type  stage_num  inst_name  resp_form  comments
                fs
                NB
                b0   b0_err
                b1   b1_err
                b2   b2_err
                 :      :
                 :      :
                 :      :
                bNB  bNB_err
                NA
                a0   a0_err
                a1   a1_err
                a2   a2_err
                 :      :
                 :      :
                 :      :
                aNA  aNA_err
                ```

        resp_type   Response type. This should either be "theoretical" or
                    "measured". This value isn't actually used in response
                    calculation, but the original code checks that it's one of
                    these two values.
        
        stage_num   Instrument response stage number. This is not used in
                    response calculation, but it provides metadata for
                    interpretation of the response.
        
        inst_name   Instrument/equipment name. This is not used in response
                    calculation, but it provides metadata for interpretation of
                    the response.
        
        resp_form   Response format. This should be "fir" or "iir".
        
         comments   Anything beyond the fourth column in the header line is not
                    read by the original code and may be considered a kind of
                    comment. It is most often used to store information about
                    the instrument manufacturer/company name, or the name of
                    the person who contributed the response.

            fs      Sample rate the filter was defined at, in Hertz

            NB      Number of 'b' coefficients

            b       Filter 'b' coefficient

           b_err    Error in 'b' coefficient

            NA      Number of 'a' coefficients

            a       Filter 'a' coefficient

           a_err    Error in 'a' coefficient


    Parameters
    ----------
    resp_block : list or tuple of strs
        A list or tuple containing each line of an entire FIR response block
    
    Returns
    -------
    dict
        Dictionary containing information about the instrument response
        
        resp_type : str
            Type of instrument response ('theoretical' or 'measured')
        stage_num : int
            The stage number of this response
        inst_name : str
            The name of the instrument
        resp_form : str
            Format of the instrument response coefficients ('fir' or 'iir')
        comments : str
            Anything after the fourth column is considered a comment. This is
            most often used to sure information about the instrument
            manufacturer/company name or the name of the person who contributed
            the response.

        coefs : dict
            A dictionary containing information from the original response file

            sampling_rate : float
                Sampling rate for which the coefficients are defined, in Hertz
            b : tuple of floats
                'b' coefficients from the original FIR/IIR response
            a : tuple of floats
                'a' coefficients from the original IIR response
            b_error : tuple of floats
                'b' coefficient errors from the original FIR/IIR response
            a_error : tuple of floats
                'a' coefficient errors from the original IIR response

    Warns
    -----
    ExtraneousDataWarning
        There are more lines than expected in the response block
    FirCoefficientsWarning
        Infinite impulse response (IIR) filter 'a' coefficients were detected in
        the description for an FIR filter
    UnsupportedResponseWarning
        The response type is not either "measured" or "theoretical"

    Raises
    ------
    RuntimeError
        Mismatch between the number of coefficients/errors expected and the
        number read
    """

    #---------------------------------------------------------------------------
    # parse the header
    #---------------------------------------------------------------------------

    # get the header line and split it into an array
    header = resp_block[0].split()

    # parse the header
    resp_type = header[0].lower()  # response type (measured, theoretical)
    stage_num = header[1].lower()  # stage number
    inst_name = header[2].lower()  # instrument name
    resp_form = header[3].lower()  # response format (should be 'fir')

    # capture the comments verbatim (split() eliminates extraneous spaces)
    if len(header) == 4:  # if there's only four columns (i.e., no comments)
        comments = ""
    else:  # everything following the fourth column is the header
        comments = resp_block[0][resp_block[0].index(header[3] + " ")+len(header[3]):].lstrip()
        # this complicated line is basically saying, "find the fourth column
        # (header[3]) in the header line (resp_block[0]), followed by a space,
        # and then get everything after that (X[X.index():]), and strip all the
        # leading spaces (lstrip)

    # warn on unsupported response types
    if resp_type not in ('measured', 'theoretical'):
        warnings.warn("Encountered unsupported response type: '{}'".format(resp_type),
            UnsupportedResponseWarning, stacklevel=2)

    # get the number of b coefficients to parse
    # (0=header; 1=sampling_rate; 2=nb; 3=first line of b coefs; 3+NB=NA)
    NB = int(resp_block[2])
    NA = int(resp_block[3+NB])

    # warn if there are 'a' coefficients for an FIR filter
    if resp_form == 'fir' and NA > 0:
        warnings.warn(
            "{} 'a' coefficients encountered while parsing FIR filter. FIR filters should ".format(NA)
            + "have zero 'a' coefficients. The coefficients will be parsed, but if an IIR "
            + "filter is desired, consider changing the response type from 'fir' to 'iir'.",
            FirCoefficientsWarning, stacklevel=2)

    # warn if there are extraneous lines after the FIR block
    extra_lines = [line for line in resp_block[4+NB+NA:]          # get each line after the response block
                            if not line.lstrip().startswith("#")  # if it's not a comment line
                            and not len(line.strip()) == 0]       # and it's not a blank line
    if extra_lines:  # if there are extraneous lines
        warnings.warn(
            "Detected {} non-comment/non-blank lines after the end of the '{}' block. ".format(len(extra_lines), resp_form)
            + "These lines will not affect the {} response, and they will be ignored:\n".format(resp_form)
            + ">>{}".format("\n>>".join(extra_lines)),
            ExtraneousDataWarning, stacklevel=2)


    #---------------------------------------------------------------------------
    # parse the FIR/IIR coefficients
    #---------------------------------------------------------------------------

    # initialize a list to hold our coefficients
    coefs = {
        'sampling_rate': [],  # sampling rate, in Hertz
        'b':             [],  # b coefficients
        'a':             [],  # a coefficients (should be 0 for FIR)
        'b_error':       [],  # b coefficient errors
        'a_error':       []   # a coefficient errors
    }

    # get the sampling rate
    coefs['sampling_rate'] = float(resp_block[1])

    # loop through, and collect, all the b coefficients
    # (0=header; 1=sampling_rate; 2=NB; 3=first line of b coefficients)
    for line in resp_block[3:3+NB]:

        # split the line by whitespace
        line_array = line.split()

        # record the cofficients
        coefs['b'].append(       float(line_array[0]) )
        coefs['b_error'].append( float(line_array[1]) )

    # loop through, and collect, all the a coefficients
    # (0=header; 1=sampling_rate; 2=NB; 3+NB=NA; 3+NB+1=first line of a coefficients)
    for line in resp_block[3+NB+1:3+NB+1+NA]:

        # split the line by whitespace
        line_array = line.split()

        # record the cofficients
        coefs['a'].append(       float(line_array[0]) )
        coefs['a_error'].append( float(line_array[1]) )

    # quick check to make sure NB, NA match the number of coefficients we were
    # able to read; if not, raise an error
    if NB != len(coefs['b']) or NA != len(coefs['a']):
        raise RuntimeError("Expected {} `b` coefficients and {} `a` coefficients".format(NB, NA)
            + " but read {} and {}, respectively.".format(len(coefs['b']), len(coefs['a'])) )


    #---------------------------------------------------------------------------
    # return the data
    #---------------------------------------------------------------------------

    # build a dictionary of all our values
    resp = {
        'resp_type': resp_type,
        'stage_num': stage_num,
        'inst_name': inst_name,
        'resp_form': resp_form,
        'comments':  comments,
        'coefs':     coefs,
    }

    # return the dictionary
    return resp

# _parse_fir() and _parse_iir() are literally the same as _parse_firiir()
_parse_iir = _parse_firiir
_parse_fir = _parse_firiir

def _calc_firiir(stage, freqs, use_a_coefficients=None):
    """Internal function to compute FIR/IIR response for a given freq axis."""

    # we'll need the frequency axis to be a numpy array for selections later
    freqs = np.array(freqs)

    # some shorthand
    coefs = stage['coefs']

    # if `use_a_coefficients` is None, detect whether fir or iir filter
    if use_a_coefficients is None:

        # use coefficients if IIR filter
        if stage['resp_form'] == "iir":
            use_a_coefficients = True

        # don't use if FIR filter
        else:
            use_a_coefficients = False

    # if we're using 'a' coefficients with an FIR filter, show a warning so the
    # end-user knows what's going on
    if stage['resp_form'] == "fir" and use_a_coefficients and coefs['a']:
        warnings.warn(
            "Applying {} 'a' coefficients in an FIR filter stage. FIR filters should ".format(len(coefs['a']))
            + "have zero 'a' coefficients. If an IIR filter is desired, consider changing "
            + "the response type from 'fir' to 'iir'.", FirCoefficientsWarning, stacklevel=2)

    # for some reason things get very weird with phase unwrapping when trying to
    # compute the frequency response if the maximum frequency is greater than
    # the Nyquist frequency--even for frequencies below the Nyquist. this
    # happens in both MATLAB's `freqz` command, as well as computing things
    # manually. therefore, we'll compute the frequency response with a healthy
    # amount of samples from [0, Nyquist] normalized as [0, pi], and then
    # interpolate/extrapolate onto our master frequency axis.
    numfreq = 2048

    # create a normalized frequency axis between [0 pi]
    fs = coefs['sampling_rate']         # sampling rate
    fnyq = fs/2                         # nyquist freq
    f = np.linspace(0, fnyq, numfreq)   # frequency axis
    w = f/fnyq * np.pi                  # normalized frequency

    # ----- build transfer function ------------------------------------

    # initialize numerator and denominators
    Hnum = np.zeros(w.shape, dtype=np.complex128)
    Hden = np.zeros(w.shape, dtype=np.complex128)

    # numerator: b0*e^(-iw*0) + b1*e^(-iw*1) + ...
    for n, b in enumerate(coefs['b']):
        Hnum += b*np.exp(-1j*w*n)

    # determine whether we're processing 'a' coefficients
    if use_a_coefficients:

        # denominator: a0*e^(-iw*0) + a1*e^(-iw*1) + ...
        for n, a in enumerate(coefs['a']):
            Hden += a*np.exp(-1j*w*n)

            # issue a friendly warning if a0 != 1
            if n == 0 and a != 1:
                warnings.warn("Expected a0 = 1, but found {:g}. ".format(a)
                    + "It is common practice that all 'a' coefficients are normalized by a0, "
                    + "and so the first 'a' coefficient is usually equal to exactly 1. Are you "
                    + "sure that a0 has not been accidentally left out of the response file?",
                    IirCoefficientsWarning, stacklevel=2)

    # final transfer function
    H = Hnum
    if any(Hden):  # divide by the denominator if there were a coefficients
        H /= Hden
    # NOTE: we're not doing anything with b/a errors. these seem to always be
    # zero, and the original source didn't do anything with them, either.

    # MATLAB computes this transfer function a little differently in the `freqz`
    # command. it performs
    #    >>> s = exp(1i * 2 * pi * freqs / sampling_rate )
    #    >>> polyval(b,s) ./ polyval(a,s)
    # where b and a are padded on the right with zeros to be the same size,
    # notice that the exponential in MATLAB's version is positive, and `polyval`
    # starts with the largest exponential and decrements, whereas our
    # implementation has a negative in the exponential, starts with the smallest
    # exponential, and increments. Somehow this ends up being the same, and is
    # also equivalent in MATLAB to
    #    >>> s = exp(-i * 2 * pi * freqs / sampling_rate )
    #    >>> polyval(flip(b),s) ./ polyval(flip(a),s)
    # so there must be some mathemathical equivalence after doing some algebra.

    # compute amplitude, phase
    amp   = np.abs(H)
    # if any(Hden):  # if there were any a coefficients
    #     phase = np.angle(H)
    #     phase = np.rad2deg(np.unwrap(phase))  # unwrap phase and convert to degrees
    # else:  # standard FIR phase response is constant (N-1)/(2*Fs)
    #     phase = np.ones(len(H)) * (len(H)-1)/(2*coefs['sampling_rate'])
    phase = np.zeros(len(H))  # hard-coded to be zero in the system

    # interpolate (and extrapolate, if required) onto the new frequency axis
    interp_amp   = interpolate1d(f, amp,   kind='linear', fill_value='extrapolate')
    interp_phase = interpolate1d(f, phase, kind='linear', fill_value='extrapolate')
    amp   = interp_amp(freqs)    # interpolate onto the master freq axis
    phase = interp_phase(freqs)  # interpolate onto the master freq axis

    # for FIR/IIR filters, it's probably more accurate for the response to be
    # constant beyond the Nyquist freq than it is to extrapolate
    amp[freqs>fnyq] = amp[freqs<=fnyq][-1]
    phase[freqs>fnyq] = phase[freqs<=fnyq][-1]

    # there should never be a negative magnitude, but they may arise
    # due to extrapolation. fix those by setting them to zero
    amp[amp < 0] = 0

    # convert arrays to tuples
    freqs = tuple(freqs.tolist())
    amp   = tuple(amp.tolist())
    phase = tuple(phase.tolist())

    # update stage dictionary to include uniform FAP response
    stage.update({
        'freqs': freqs,
        'amp':   amp,
        'phase': phase
        })

    # return the updated stage dict
    return stage

# force _calc_fir() to use 'a' coefficients if they're available (default
# behavior in the original system). _calc_iir() needs no adjustment.
_calc_iir = _calc_firiir
def _calc_fir(*args, **kwargs):
    return _calc_firiir(*args, **kwargs, use_a_coefficients=True)


# ----- delay --------------------------------------------------------------------

def _parse_delay(resp_block):
    """*UNSUPPORTED* Parses a delay response block.

    Although 'delay' stages exist within many instrument response files, the
    original system does not appear to actually do anything with them. As a
    result, this function exists only to make it easier to code a delay stage
    parser at a later date.

    Since 'delay' stages are not used within the original system, their format
    is speculation. However, in every case encountered, they only seem to
    contain a single number, so the presumed format is not difficult to infer.
    
    Format
    ------
    'delay' response blocks are in the format

                ```
                resp_type  stage_num  inst_name  resp_form  comments
                tau
                ```

        resp_type   Response type. This should either be "theoretical" or
                    "measured". This value isn't actually used in response
                    calculation, but the original code checks that it's one of
                    these two values.
        
        stage_num   Instrument response stage number. This is not used in
                    response calculation, but it provides metadata for
                    interpretation of the response.
        
        inst_name   Instrument/equipment name. This is not used in response
                    calculation, but it provides metadata for interpretation of
                    the response.
        
        resp_form   Response format. This should be "paz".
        
         comments   Anything beyond the fourth column in the header line is not
                    read by the original code and may be considered a kind of
                    comment. It is most often used to store information about
                    the instrument manufacturer/company name, or the name of
                    the person who contributed the response.
        
           tau      Delay


    Parameters
    ----------
    resp_block : list or tuple of strs
        A list or tuple containing each line of an entire delay response block
    
    Returns
    -------
    dict
        Dictionary containing information about the instrument response
        
        resp_type : str
            Type of instrument response ('theoretical' or 'measured')
        stage_num : int
            The stage number of this response
        inst_name : str
            The name of the instrument
        resp_form : str
            Format of the instrument response coefficients (e.g., 'delay')
        comments : str
            Anything after the fourth column is considered a comment. This is most
            often used to sure information about the instrument manufacturer/company
            name or the name of the person who contributed the response.

        coefs : dict
            A dictionary containing information from the original response file

            tau : float
                Delay (unknown units)

    Warns
    -----
    UnsupportedResponseWarning
        The response type is not either "measured" or "theoretical"
    """

    # display a warning that delay stages are unsupported
    warnings.warn("'delay' stages are unsupported. This response block will be "
        + "parsed, but will not contribute to the overall instrument response.",
        UnsupportedResponseWarning, stacklevel=2)

    #---------------------------------------------------------------------------
    # parse the header
    #---------------------------------------------------------------------------

    # get the header line and split it into an array
    header = resp_block[0].split()

    # parse the header
    resp_type = header[0].lower()  # response type (measured, theoretical)
    stage_num = header[1].lower()  # stage number
    inst_name = header[2].lower()  # instrument name
    resp_form = header[3].lower()  # response format (should be 'delay')

    # capture the comments verbatim (split() eliminates extraneous spaces)
    if len(header) == 4:
        comments = ""
    else:
        comments = resp_block[0][resp_block[0].index(header[4]):]

    # warn on unsupported response types
    if resp_type not in ('measured', 'theoretical'):
        warnings.warn("Encountered unsupported response type: '{}'".format(resp_type),
            UnsupportedResponseWarning, stacklevel=2)

    # warn if there are extraneous lines after the PAZ block
    extra_lines = [line for line in resp_block[2:]          # get each line after the response block
                            if not line.lstrip().startswith("#")  # if it's not a comment line
                            and not len(line.strip()) == 0]       # and it's not a blank line
    if extra_lines:  # if there are extraneous lines
        warnings.warn(
            "Detected {} non-comment/non-blank lines after the end of the '{}' block. ".format(len(extra_lines), resp_form)
            + "These lines will not affect the {} response, and they will be ignored:\n".format(resp_form)
            + ">>{}".format("\n>>".join(extra_lines)),
            ExtraneousDataWarning, stacklevel=2)


    #---------------------------------------------------------------------------
    # parse the delay coefficients
    #---------------------------------------------------------------------------

    # initialize a list to hold our coefficients
    coefs = {
        'tau': [] # delay
    }

    # get the delay
    coefs['tau'] = float(resp_block[1])


    #---------------------------------------------------------------------------
    # return the data
    #---------------------------------------------------------------------------

    # build a dictionary of all our values
    resp = {
        'resp_type': resp_type,
        'stage_num': stage_num,
        'inst_name': inst_name,
        'resp_form': resp_form,
        'comments':  comments,
        'coefs':     coefs
    }

    # return the dictionary
    return resp


# ----- evalresp --------------------------------------------------------------------

def _calc_evalresp(file, freqs):
    """Internal function to compute FAP response from a SEED RESP file."""

    # attempt to load evalresp from obspy
    import obspy, obspy.signal

    # open the response file and save each line to a big list
    with open(file, 'r') as f:
        file_raw = f.read().splitlines()

    # evalresp requires all responses have a time range for which they're
    # valid. unfortunately, some poorly-made RESP files have multiple responses
    # with different starting dates, but forget to close the time ranges with
    # end dates. so, make a list of all the start_dates listed in the RESP file,
    # and we'll find the most recent one and select that response.
    start_dates   = []  # list to hold the start dates
    i_start_dates = []  # list to hold the line numbers of the start dates

    # loop through each line in the resp file
    for i, line in enumerate(file_raw):

        # look for start date lines
        if line.lstrip().upper().startswith("B052F22"):

            # if a start date line is found, convert to a UTCDateTime object
            # and append to the list of start_dates
            start_dates.append( obspy.UTCDateTime(line.split()[-1]) )
            i_start_dates.append(i)  # also append the line number

    # manually add EOF as an index (since that'll always be the last line of the last response)
    i_start_dates.append(i+1)

    # figure out the starting/ending indices of the most recent (in time) response
    first_resp_start = i_start_dates[np.argmax(start_dates)]    # start of the time window
    first_resp_end   = i_start_dates[np.argmax(start_dates)+1]  # end of the time window
    first_resp_date  = np.amax(start_dates)  # get the actual date

    # slice the most recent response
    first_resp = file_raw[first_resp_start:first_resp_end]

    # warn if there are multiple start dates so the user knows that this code
    # arbitrarily picks the latest response
    if len(start_dates) > 1:
        warnings.warn(
            "Detected {} unique responses in RESP file associated with different dates. ".format(len(start_dates))
            + "This code is evaluating only the latest response: {}. ".format(first_resp_date)
            + "If this is not the right response, remove extraneous responses from "
            + "your RESP file: {}".format(file), ExtraneousDataWarning, stacklevel=2)

    # convert freqs to a numpy float64 array, because the obspy function below
    # only accepts that format
    freqs = np.array(freqs, dtype=np.float64)

    # return complex response, freq from evalresp
    H = obspy.signal.invsim.evalresp_for_frequencies(  # nearly undocumented function
        np.nan,            # dt (unused)
        freqs,             # freq axis that we want to evaluate response on
        file,              # /path/to/resp_file
        first_resp_date+1, # UTC datetime at which to evaluate RESP (1 s after latest start_date)
        units='DEFAULT')   # default units ('def' in evalresp, undocumented in obspy)

    # now that the complex frequency reponse function has been calculated, we
    # need to figure out how to scale the units. it's hard to know what order
    # response stages will be in, so search for physical input units in all
    # possible blocks to determine unit type

    # loop through all the lines in the latest time window
    for line in first_resp:

        # look for input unit lines in all possible SEED blockettes
        if line.lstrip().upper().startswith((
            "B041F06", "B042F06", "B043F06", "B044F06", "B045F05", "B046F05", "B049F06",
            "B052F08", "B053F05", "B054F05", "B055F04", "B056F04", "B061F06", "B062F05")):

            # strip everything before the units. a typical input units line looks like:
            # 'B053F05     Response in units lookup:              M/S - VELOCITY IN METERS PER SECOND'
            units = line.strip().upper()                           # strip whitespace on both sides of string
            units = re.sub(r"B[0-9]+F[0-9]+ ", "", units).strip()  # strip blockette/field code
            units = re.sub(r"^[^:]+:", "", units).strip()          # strip everything left of ":"
            # now it should look like 'M/S - VELOCITY IN METERS PER SECOND'

            # default unit scale and number of times to integrate data
            unit_scale = 1
            nintegrate = 0

            # check units and scale appropriately (regex inspired from evalresp source
            # - https://github.com/iris-edu/evalresp/blob/master/libsrc/evalresp/input.c)

            # ground motion (centi, milli, micro, nano)
            if re.search(r"^[CMUN]?M", units):

                # note unit type
                unit_type = "ground motion"

                # determine scaling prefix
                if   units[0:2] == "CM": unit_scale = 1e-2
                elif units[0:2] == "MM": unit_scale = 1e-3
                elif units[0:2] == "UM": unit_scale = 1e-6
                elif units[0:2] == "NM": unit_scale = 1e-9

                # determine number of times to integrate

                # acceleration
                if re.search(r"^[CMUN]?M/(S\*\*2|SEC\*\*2|S/S|SEC/SEC)", units):
                    nintegrate = 2

                # velocity
                elif re.search(r"^[CMUN]?M/(S|SEC)", units):
                    nintegrate = 1

            # pressure (hecto, kilo)
            elif re.search(r"^[HK]?PA", units):

                # note unit type
                unit_type = "pressure"

                # determine scaling prefix
                if   units[0:3] == "HPA": unit_scale = 1e2
                elif units[0:3] == "KPA": unit_scale = 1e3

    # scale the data appropriately
    H /= unit_scale  # convert to standard unit (e.g., counts / cm --> cts / m)
    if unit_type == "ground motion":
        H /= 1e9  # to nanometers
    else:
        pass  # we currently only scale ground motion to a different SI prefix

    # integrate the data (note: since H is in units of cts/nm and the meters are
    # in the denominator, frequency-domain integration is done by multiplying
    # instead of dividing by iw)
    H *= 1j * 2*np.pi*freqs

    # convert complex response to amplitude, phase
    amp = np.abs(H)
    phase = np.rad2deg(np.unwrap(np.angle(H)))

    # convert arrays to tuples
    freqs = tuple(freqs.tolist())
    amp   = tuple(amp.tolist())
    phase = tuple(phase.tolist())

    # return FAP
    return freqs, amp, phase


#-------------------------------------------------------------------------------
# Main functions
#-------------------------------------------------------------------------------

@overload
def compute_resp(file: str) -> Tuple[
    Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]:
    """Python doesn't support function overloading. This function definition
    is for documentation purposes, only. It will be overwritten by the
    subsequent definition.
    
    This function is called in the form:
    >>> freq, amp, phase = compute_resp(file)
    """
    ...

@overload
def compute_resp(file: str, freqs: Tuple[float, ...]) -> Tuple[
    Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]:
    """Python doesn't support function overloading. This function definition
    is for documentation purposes, only. It will be overwritten by the
    subsequent definition.
    
    This function is called in the form:
    >>> freq, amp, phase = compute_resp(file, freqs)
    """
    ...

@overload
def compute_resp(file: str, minfreq: float, maxfreq: float, numfreq: float, logscale: bool = False) -> Tuple[
    Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]:
    """Python doesn't support function overloading. This function definition
    is for documentation purposes, only. It will be overwritten by the
    subsequent definition.
    
    This function is called in the forms:
    >>> freq, amp, phase = compute_resp(file, minfreq, maxfreq, numfreq)
    >>> freq, amp, phase = compute_resp(file, minfreq, maxfreq, numfreq, logscale)
    """
    ...

def compute_resp(file: str, *args: Optional[Union[Tuple[float, ...], float, bool]],
    **kwargs: Optional[Union[Tuple[float, ...], float, bool]]) -> Union[list, Tuple[
    Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]]:
    """Parses a GMS instrument response file.
    
    This function reads a GMS instrument response file which may contain an
    arbitrary number of *stages* in the following formats:
    
        * `FAP` (Frequency, Amplitude, Phase)
        * `PAZ` (Poles and Zeros)
        * `FIR` (Finite Impulse Response filter coefficients)
    
    As this function walks through a response file, it parses and records each
    *stage*. Once each stage is parsed, it loops through the stages and
    computes, interpolates, and/or extrapolates (raising a warning if it does
    so) `amplitude` and `phase` onto the default or requested `frequency` axis
    and adds them to a list. After processing every *stage*, it convolves (i.e.,
    spectral multiplication) all the stages together, producing a final
    instrument response.

    The default frequency axis is 1024 samples long and attempts to be linearly
    generated between 0.0001 and 100 Hz, but these extents may be reduced
    depending on the narrowest extents of any frequency axes defined in any FAP
    or FIR stages. For example, if a response file contains a FAP stage defined
    over [1,100] Hz and a FIR stage defined for a Nyquist frequency of 50 Hz,
    the final response will have a frequency axis ranging from [1,50] Hz. If a
    frequency axis or min/max/numfreq are provided as arguments, those arguments
    override this behavior, and the function attempts to extrapolate the
    appropriate response for each stage onto the requested frequency axis.
    
    Examples
    --------
    
        Define frequency axis parameters
        >>> fs   = 40.   # sampling rate (Hz)
        >>> fnyq = fs/2  # Nyquist frequency
        >>> n    = 100   # number of frequency bins
        >>> f = numpy.linspace(0., fnyq, n)  # frequency axis
    
        Use the default frequency axis (from .0001 to 100 Hz)
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir")
    
        OR, provide a frequency axis
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", freqs=f)
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", f)
    
        OR, provide parameters to *build* a frequency axis
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", minfreq=0., maxfreq=fnyq, numfreq=n, logscale=False)
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", minfreq=0., maxfreq=fnyq, numfreq=n)
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", 0., fnyq, n, False)
        >>> [f, amp, ph] = compute_resp("/path/to/example.pazfir", 0., fnyq, n)

        For debugging purposes, add `DEBUG=True` (NOTE: it must be specified as
        a keyword argument) to any of the above function calls to return a
        dictionary with all the stage information rather than the combined
        response, e.g.,
        >>> stages = compute_resp("/path/to/example.pazfir", f, DEBUG=True)
    
    Parameters 1
    ------------
    file : str
        The full filepath and name to the response file
        (e.g.,`/path/to/example.pazfir`)
    
    Parameters 2
    ------------
    file : str
        The full filepath and name to the response file
        (e.g.,`/path/to/example.pazfir`)
    freqs : list of floats
        A list of frequencies (i.e., a frequency axis) upon which all the
        responses will be computed/interpolated, in Hertz
    
    Parameters 3
    ------------
    file : str
        The full filepath and name to the response file
        (e.g.,`/path/to/example.pazfir`)
    minfreq : float
        The starting value of a frequency axis that will be built, in Hertz
    maxfreq : float
        The ending value of a frequency axis that will be built, in Hertz
    numfreq : float
        The number of frequency bins from which to build a frequency axis
    logscale : bool
        If `True`, builds a log-spaced frequency axis (default: `False`)
    
    Returns
    -------
    frequency : list of floats
        A list of frequencies (i.e., a frequency axis) upon which all the
        responses were computed, in Hertz
    amplitude : list of floats
        The amplitude of the cascaded instrument response, evaluated at each
        frequency
    phase : list of floats
        The phase of the cascaded instrument response, evaluated at each
        frequency, in degrees
    
    Raises
    ------
    FileNotFoundError
        Cannot find the response file
    IsADirectoryError
        Attempted to read a directory, not a file
    TypeError
        One of the provided arguments is an invalid type, or an invalid number
        of arguments were supplied
    ValueError
        An invalid value has been given in one of the arguments
    
    Warns
    -----
    UnsupportedResponseWarning
        An unsupported response type or format was encountered in the file
    UserWarning
        Warns on an obscure edge-case where the functional length of a line in
        the response file is greater than 101 characters
    """

    #---------------------------------------------------------------------------
    # initialization
    #---------------------------------------------------------------------------

    # get the DEBUG parameter and remove it from kwargs, if it exists
    DEBUG = kwargs.pop('DEBUG') if 'DEBUG' in kwargs else False

    # list of supported keywords/arguments
    supported_args = ('freqs', 'minfreq', 'maxfreq', 'numfreq', 'logscale')

    # default values
    default_minfreq  = 0.0001  # Hz
    default_maxfreq  = 100.    # Hz
    default_numfreq  = 1024    # number of frequencies to compute
    default_logscale = False   # False = linear frequency axis

    # get the number of arguments supplied (positional + keyword)
    nargin = 1  # there's always at least one argument: `file`
    nargin += len(args)    # add positional arguments
    nargin += len(kwargs)  # add keyword arguments


    # argument checks
    # --------------------------------------------------------------------------

    # ARG CHECK: file is a string
    if not isinstance(file, str):
        raise TypeError("`file` expects type 'str', received '{}'".format(type(file).__name__))

    # ARG CHECK: file/path exists
    if not os.path.exists(file):
        raise FileNotFoundError("File does not exist: '{}'".format(file))

    # ARG CHECK: `file` is not a directory
    if os.path.isdir(file):
        raise IsADirectoryError("'{}' is a directory, not a file".format(file))

    # ARG CHECK: there's exactly 1, 2, 4, or 5 arguments
    #     1: file
    #     2: file, freqs
    #     4: file, minfreq, maxfreq, numfreq
    #     5: file, minfreq, maxfreq, numfreq, log_scale
    if nargin not in (1,2,4,5):
        raise TypeError("Invalid number of arguments ({}), requires exactly 1, 2, 4, or 5".format(nargin))

    # ARG CHECK: all keyword arguments are supported
    if kwargs:
        for key in kwargs:
            if key not in supported_args:
                raise TypeError("Invalid keyword argument: '{}'".format(key))

    # ARG CHECK: if there's only two arguments, the second should be `freqs`
    if nargin == 2 and kwargs and 'freqs' not in kwargs:
        raise TypeError("If supplying only two arguments, the second argument must be `freqs`")


    # deal with combinations of positional/keyword args
    # --------------------------------------------------------------------------
    # the previous ARG CHECKS made sure we have the right number of arguments,
    # so now we need to figure out what those arguments are

    # start with all the arguments as blank
    freqs    = None
    minfreq  = None
    maxfreq  = None
    numfreq  = None
    logscale = None

    # if there are any positional args, assign them
    if args:

        # if there's only two arguments, and the one after file is positional,
        # it must be a frequency axis
        if nargin == 2 and len(args) == 1:
            freqs = args[0]

        # otherwise, there are multiple positional arguments, so they should be
        # parameters to build a frequency axis, instead
        else:
            for i in range(len(args)):
                if   i == 0: minfreq  = args[0]
                elif i == 1: maxfreq  = args[1]
                elif i == 2: numfreq  = args[2]
                elif i == 3: logscale = args[3]

    # now check that there aren't any keyword arguments that were also given as
    # positional arguments
    if freqs is not None and 'freqs' in kwargs:
        raise TypeError("`freqs` provided as both a positional and keyword argument")

    elif minfreq is not None and 'minfreq' in kwargs:
        raise TypeError("`minfreq` provided as both a positional and keyword argument")

    elif maxfreq is not None and 'maxfreq' in kwargs:
        raise TypeError("`maxfreq` provided as both a positional and keyword argument")

    elif numfreq is not None and 'numfreq' in kwargs:
        raise TypeError("`numfreq` provided as both a positional and keyword argument")

    elif logscale is not None and 'logscale' in kwargs:
        raise TypeError("`logscale` provided as both a positional and keyword argument")

    # if we've reached here, it means the keyword arguments were not already
    # assigned positionally, and we've established that all the keywords are
    # supported. now go ahead and assign them
    if kwargs:  # if there are any keyword args
        for key, val in kwargs.items():  # loop through them and assign them
            if   key == 'freqs':    freqs    = val
            elif key == 'minfreq':  minfreq  = val
            elif key == 'maxfreq':  maxfreq  = val
            elif key == 'numfreq':  numfreq  = val
            elif key == 'logscale': logscale = val

    # if logscale hasn't been set by keyword or position, yet, set it to default
    if logscale is None:
        logscale = default_logscale


    # finish argument checks
    # --------------------------------------------------------------------------
    # so far we've done some basic arg checks (file, number of arguments), and
    # then we worked out how to assign various combinations of positional and
    # keyword arguments. now we'll finish checking whether the values of those
    # arguments we assigned are valid.

    # Parameters 1: use default frequency axis
    if nargin == 1:

        # we've already checked that `file` is OK, so nothing more to do here
        pass


    # Parameters 2: frequency axis is provided
    elif nargin == 2:

        # ARG CHECK: frequency axis is a list or a tuple (or a numpy array)
        if not isinstance(freqs, (list, tuple, np.ndarray)):  # numpy array is fine, too
            raise TypeError("`freqs` expects type 'list' or 'tuple', received '{}'".format(type(freqs).__name__))

        # ARG CHECK: if it's a numpy array, make sure it's 1D
        if isinstance(freqs, np.ndarray):
            if freqs.ndim != 1:
                raise TypeError("`freqs` is not a 1D array, ndim={}".format(freqs.ndim))


    # Parameters 3: parameters for frequency axis are provided
    else: 

        # ARG CHECK: minfreq is int/float
        if not isinstance(minfreq, (float, int)):
            raise TypeError("`minfreq` expects type 'float' or 'int', received '{}'".format(type(minfreq).__name__))

        # ARG CHECK: maxfreq is int/float
        if not isinstance(maxfreq, (float, int)):
            raise TypeError("`maxfreq` expects type 'float' or 'int', received '{}'".format(type(maxfreq).__name__))

        # ARG CHECK: numfreq is int
        if not isinstance(numfreq, int):
            raise TypeError("`numfreq` expects type 'int', received '{}'".format(type(numfreq).__name__))

        # ARG CHECK: logscale is bool
        if not isinstance(logscale, bool):
            raise TypeError("`logscale` expects type 'bool', received '{}'".format(type(logscale).__name__))


    #---------------------------------------------------------------------------
    # open and parse the response file
    #---------------------------------------------------------------------------

    # open the response file and save each line to a big list
    with open(file, 'r') as f:
        file_raw = f.read().splitlines()


    ############################################################################
    # check if this is a SEED RESP file, and if so, process with evalresp
    ############################################################################

    # set a flag indicating whether this is a SEED RESP file. default to False,
    # but we're about to check if it should be switched to True
    resp_file = False

    # loop through each line and search for indications it's a SEED RESP file
    for line in file_raw:

        # detect if this appears to be a SEED RESP file
        # - B050F03 = station name
        # - B052F22 = start date
        # - B053F03 = transfer function type
        if line.lstrip().startswith(("B050F03", "B052F22", "B053F03")):

            # raise a warning
            warnings.warn("file '{}' appears to be a SEED RESP file. ".format(file)
                + "RESP files are not officially supported by libresponse, but it will be processed "
                + "with evalresp and converted to FAP with 'obspy.signal.invsim.evalresp'.",
                 UserWarning, stacklevel=1)

            # this is a resp file, so set the resp file flag to True
            resp_file = True

            # break out of the for loop--we're going to outsource all our
            # processing to evalresp
            break

    # if this is a resp file, --STOP THE PRESSES-- and offload all processing
    # to evalresp. this is technically unsupported and calls obspy, which may
    # or may not change functionality in the future, so there's no reason to
    # continue on and further integrate evalresp "stages" into the code
    if resp_file:

        # make a quick frequency axis onto which we'll interpolate the response
        if nargin == 1:
            freqs = calc_freqaxis(default_minfreq, default_maxfreq, default_numfreq, default_logscale)

        elif nargin == 2:
            pass

        else:
            freqs = calc_freqaxis(minfreq, maxfreq, numfreq, logscale)

        # call evalresp to compute the FAP
        freqs, amp, phase = _calc_evalresp(file, freqs)

        # return the response
        return freqs, amp, phase

    ############################################################################
    # otherwise, process it ourselves
    ############################################################################


    # pre-allocate an array to store just the lines with usable information
    file_data = []

    # it wasn't a RESP file, so we'll process it like a GMS response file     
    for i, line in enumerate(file_raw):  # loop through each line of the file

        # skip the line if it's a comment or blank
        if line.lstrip().startswith('#') or len(line.strip()) == 0:
            continue

        # append the line to our array
        file_data.append(line)

        # an unusual relic of history: the original source is hard-coded to
        # only read the first 101 characters of any line. if the line is a
        # comment line, it doesn't matter, but if it's a line with usable
        # information, this could cause trouble. this is an obscure
        # edge-case, but let's be friendly and raise a warning if we detect
        # this so that future researchers don't spend days tracking down why
        # their response file doesn't work as intended.
        if len(line) > 101:
            warnings.warn("Line is greater than 101 characters long. This is a hard-coded "
                + "line length limit in the original source and may result in unexpected behavior.\n"
                + "On {}:{} '{}'".format(file, i, line),
                LineLengthWarning, stacklevel=1)



    # search the response file for header lines
    # --------------------------------------------------------------------------
    # header lines have the format:
    #
    #     resp_type  stage_num  inst_name  resp_form  comments
    #
    # resp_type    Response type. This should either be "theoretical" or
    #              "measured". This value isn't actually used in response
    #              calculation, but the original code checks that it's one of
    #              these two values.
    #
    # stage_num    Instrument response stage number. This is not used in
    #              response calculation, but it provides metadata for
    #              interpretation of the response.
    #
    # inst_name    Instrument/equipment name. This is not used in response
    #              calculation, but it provides metadata for interpretation of
    #              the response.
    #
    # resp_form    Response format. This should be "fap", "paz", or "fir". There
    #              is additionally a "delay" format which is common among the
    #              response files, but the original code never uses them. This
    #              code detects them and throws a warning.
    #
    # comments     Anything beyond the fourth column in the header line is not
    #              read by the original code and may be considered a kind of
    #              comment. It is most often used to store information about the
    #              instrument manufacturer/company name, or the name of the
    #              person who contributed the response.

    # pre-allocate a list to hold indices of the header lines
    header_idx = []

    # loop through each line of the usable information
    for i, line in enumerate(file_data):

        # split the line into an array, separated by whitespace
        line_array = line.split()

        # criteria for determining this is a header line:
        #   1. it has at least 4 columns, AND
        #   2a. the first column is 'measured' or 'theoretical', OR
        #   2b. the fourth column is 'fap', 'paz', 'fir', 'iir', or 'delay'
        if len(line_array) >= 4 and (
            line_array[0].lower() in ('measured', 'theoretical')
            or line_array[3].lower() in ('fap', 'paz', 'fir', 'iir', 'delay') ):

            # add this row number to the list of header indices
            header_idx.append(i)

    # add the end-of-file to the list of indices, since it forms the end of
    # the final response block. since Python uses zero-based indexing, the len()
    # function, here, will return a number which is actually 1 larger than the
    # maximum possible index--which is what we want for the code below.
    header_idx.append(len(file_data))


    # parse each stage
    # --------------------------------------------------------------------------
    # Loop through each response block--from its header line to the next header
    # line, which is the start of the next block--detect the response format,
    # and send the whole block to the appropriate response parser. It's
    # plausible that some unanticipated blocks won't be detected by the header
    # detection algorithm above, but that will just result in passing extra
    # lines to each response-format parser. Since the format of each response
    # explicitly declares how many lines to expect, the extra lines at the end
    # will simply go unprocessed without affecting the rest of the response.

    # start a list to hold response stages
    stages = []

    # loop through each header line
    for i in range(len(header_idx)-1):  # note: the last index is end-of-file

        # select the whole block, from the current header line up to, but not
        # including, the next header line
        resp_block = file_data[header_idx[i]:header_idx[i+1]]

        # get the current header line and split it into an array
        header = resp_block[0].split()

        # get the response type from the header (measured, theoretical)
        resp_type = header[0].lower()
        # NOTE: warnings regarding unsupported response types are relegated to
        #       the individual response calculation methods

        # get the response format from the header (fap, paz, fir, delay)
        resp_form = header[3].lower()

        # pass this block to the appropriate parser
        if   resp_form == 'fap':   resp_dict = _parse_fap(resp_block)
        elif resp_form == 'paz':   resp_dict = _parse_paz(resp_block)
        elif resp_form == 'fir':   resp_dict = _parse_fir(resp_block)
        elif resp_form == 'iir':   resp_dict = _parse_iir(resp_block)
        elif resp_form == 'delay': resp_dict = _parse_delay(resp_block)
        else:  # warn on unsupported response format and skip this block
            warnings.warn("Encountered unsupported response format: '{}'. ".format(resp_form)
                + "Skipped response block parsing...", UnsupportedResponseWarning, stacklevel=1)
            continue

        # add this stage to the stages list (check for `None` ensures delay
        # stage is not added unless it is implemented)
        if resp_dict is not None:
            stages.append(resp_dict)


    # find the overall min/max frequency axis extent from the response stages
    # --------------------------------------------------------------------------

    # set the initial extent to [0, inf]
    stages_minfreq = 0
    stages_maxfreq = np.inf

    # loop through stages and reduce extent of the freq axis as necessary
    for stage in stages:

        # if there is a sampling rate defined, then there is a nyquist freq
        if 'sampling_rate' in stage['coefs']:

            # calculate nyquist frequency
            fnyq = stage['coefs']['sampling_rate'] / 2

            # reduce maxfreq to the nyquist, if necessary
            stages_maxfreq = np.amin([stages_maxfreq, fnyq])

        # fap responses have both upper and lower limits
        elif 'freqs' in stage['coefs']:

            # reduce frequency axis extends, if necessary
            stages_minfreq = np.amax( [stages_minfreq, np.amin(stage['coefs']['freqs'])] )
            stages_maxfreq = np.amin( [stages_maxfreq, np.amax(stage['coefs']['freqs'])] )


    # build master frequency axis
    # --------------------------------------------------------------------------

    # Parameters 1: use default frequency axis
    if nargin == 1:

        # use the minimum extent of frequencies for the freq axis
        minfreq = np.amax([default_minfreq, stages_minfreq])
        maxfreq = np.amin([default_maxfreq, stages_maxfreq])

        # make a default frequency axis
        freqs = calc_freqaxis(minfreq, maxfreq, default_numfreq, default_logscale)


    # Parameters 2: frequency axis is provided
    elif nargin == 2:

        # convert to a standard tuple
        if isinstance(freqs, list):  # if it's a list
            freqs = tuple(freqs)

        elif isinstance(freqs, np.ndarray):  # if it's a numpy array
            freqs = tuple(freqs.tolist())


    # Parameters 3: parameters for frequency axis are provided
    else: 

        # make a frequency axis from the parameters
        freqs = calc_freqaxis(minfreq, maxfreq, numfreq, logscale)


    # warn if extrapolation will be necessary because freq axis goes beyond
    # the maximum extents of the stages
    if freqs[0] < stages_minfreq or stages_maxfreq < freqs[-1]:
        warnings.warn("Requested frequency axis contains values outside the defined response. "
            + "Instrument response defined for: [{:g},{:g}] Hz. Requested: [{:g},{:g}] Hz.".format(
                stages_minfreq, stages_maxfreq, freqs[0], freqs[-1] ),
            ExtrapolationWarning, stacklevel=1)


    #---------------------------------------------------------------------------
    # compute/interpolate/extrapolate each stage to a uniform frequency axis
    #---------------------------------------------------------------------------

    # loop through each stage
    for i, stage in enumerate(stages):

        # some shorthand
        resp_form = stage['resp_form']

        # compute FAP response onto master freq axis for each response type
        if   resp_form == "fap":  stage = _calc_fap(stage, freqs)
        elif resp_form == "paz":  stage = _calc_paz(stage, freqs)
        elif resp_form == 'fir':  stage = _calc_fir(stage, freqs)
        elif resp_form == 'iir':  stage = _calc_iir(stage, freqs)
        elif resp_form == 'delay': continue  # we've already warned it's not contributing to the total response
        else:
            raise RuntimeError("Invalid stage form '{}'. The code should not have reached this statement.".format(
                stage['resp_form']))


    #---------------------------------------------------------------------------
    # convolve all stages together
    #---------------------------------------------------------------------------

    # initialize a transfer function (after some testing, this is better done
    # in polar coords rather than complex numbers because the phase information
    # will disappear when computing amp*exp(1j*phase) for small amplitudes)
    #H = np.ones(len(freqs), dtype=np.complex128)
    Ham = np.ones(len(freqs), dtype=np.float64)   # amplitude
    Hph = np.zeros(len(freqs), dtype=np.float64)  # phase

    # multiply all the stages together
    for stage in stages:

        # skip stages without master freq axis (these stages are unsupported,
        # e.g., 'delay' stage)
        if 'freqs' not in stage:
            continue

        # get stage ampltude/phase
        amp   = np.array(stage['amp'])
        phase = np.array(stage['phase'])

        # rewrap phase between
        phase = wrap(np.deg2rad(phase))  # wrap between [-pi, pi]
        phase = np.rad2deg(np.unwrap(phase))  # unwrap and convert to degrees

        # convolve stage with master response
        #H *= amp*np.exp(1j*phase)
        Ham *= amp
        Hph += phase

    # convert the final transfer function back into amplitude and phase
    #amp   = np.abs(H)
    #phase = np.angle(H)
    #phase = np.rad2deg(np.unwrap(phase))  # unwrap phase and convert to degrees

    # convert amplitude and phase to tuples
    amp   = tuple(Ham.tolist())
    phase = tuple(Hph.tolist())

    # DEBUG: uncomment this line to return all the stage info, instead
    if DEBUG:
        return stages

    # return the final response
    return freqs, amp, phase


def scale_fap(calib: float, calper: float, frequency: Tuple[float, ...],
    amplitude: Tuple[float, ...], phase: Tuple[float, ...]) -> Tuple[
    Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]:
    """Calibrates a FAP by scaliing according to CALIB and CALPER

    This function scales a FAP according to CALIB and CALPER, returning a
    calibrated FAP. At the CALPER, the magniitude of the response should be
    equal to 1/CALIB, with units of counts per nanometer.

    Examples
    --------
    
        >>> freq, amp, phase = scale_fap(calib, calper, freq, amp, phase)

    Parameters
    ----------
    calib : float
        The calibration constant, in units of nanometers / digital count
    calper : float
        The period at which the calibration constant is valid, in units of
        seconds
    frequency : list of floats
        A list of frequencies from the FAP, in Hertz
    amplitude : list of floats
        The magnitude of the instrument response, evaluated at each frequency
    phase : list of floats
        The phase of the instrument response, evaluated at each frequency, in
        degrees

    Returns
    -------
    frequency : list of floats
        A list of frequencies from the FAP, in Hertz
    amplitude : list of floats
        The calibrated amplitudes of the instrument response, in counts/nm
    phase : list of floats
        The same phase as the input (scaling amplitude does not affect phase)    
    """

    # let's work with frequency instead of period
    calfreq = 1/calper

    # some shorthand
    freq = frequency
    amp  = amplitude

    # convert to numpy arrays for convenience
    freq  = np.array(frequency)
    amp   = np.array(amplitude)
    phase = np.array(phase)  # (unused in this function, but kept for consistency)

    # warn if our requested calfreq is outside the bounds of the FAP,
    # requiring extrapolation
    if calfreq < np.amin(freq) or np.amax(freq) < calfreq:
        warnings.warn("CALPER ({:.1g} Hz) is outside the range of the FAP response [{:g},{:g}].".format(
            1/calper, freq[0], freq[-1]), ExtrapolationWarning, stacklevel=1)

    # get the magnitude at calfreq (interpolate/extrapolate, where necessary)
    cal_interp = interpolate1d(freq, amp, kind='linear', fill_value='extrapolate', xspace='log', yspace='log')
    norm_amp = cal_interp(calfreq) 

    # normalize the FAP about CALPER by dividing by the magnitude there
    amp /= norm_amp

    # multiply in 1/CALIB to calibrate the FAP to counts/nm
    # (reciprocal because CALIB is in units of nm/counts)
    amp *= (1/calib)

    # convert numpy arrays to tuples
    freq  = tuple(freq.tolist())
    amp   = tuple(amp.tolist())
    phase = tuple(phase.tolist())

    # return FAP
    return freq, amp, phase


def compute_resp_scalar(freq: float, calib: float, calper: float, file: str) -> float:
    """Computes a scalar calibration factor for a particular frequency
    
    This function computes a scalar calibration factor for a specific frequency
    provided CALIB, CALPER, and a response file. The output will be in the same
    units as CALIB (i.e., nanometers per count).

    Examples
    --------
    
        >>> scale = compute_resp_scalar(freq, calib, calper, "/path/to/resp_file")
        >>> calibrated_waveform = waveform * scale

    Parameters
    ----------
    freq : float
        The frequency at which to compute a calibration factor, in Hertz
    calib : float
        The calibration constant, in units of nanometers / digital count
    calper : float
        The period at which the calibration constant is valid, in units of
        seconds
    file : str
        The full filepath and name to the response file
        (e.g.,`/path/to/example.pazfir`)

    Returns
    -------
    float
        A new calibration factor valid at the specific frequency, in units of
        nanometers per count
    """

    # compute the FAP from the response file
    fap_freq, fap_amp, fap_phase = compute_resp(file)

    # scale the FAP according to CALIB and CALPER
    fap_freq, fap_amp, fap_phase = scale_fap(calib, calper, fap_freq, fap_amp, fap_phase)

    # get the magnitude just at the requested frequency
    cal_interp = interpolate1d(fap_freq, fap_amp, kind='linear', fill_value='extrapolate', xspace='log', yspace='log')
    cal_amp = cal_interp(freq)  # units of counts/nm

    # get the correct scale from the amplitude (nm/count)
    scale = 1/cal_amp

    # return the scale
    return scale


def defap(waveform: Tuple[float, ...], sample_rate: float,
    frequency: Tuple[float, ...], amplitude: Tuple[float, ...], phase: Tuple[float, ...],
    water_level: Optional[float] = None, window: Optional[dict] = None) -> Tuple[float, ...]:
    """Deconvolves a FAP instrument response from a timeseries

    This function takes a timeseries and an instrument reponse, defined in terms
    of `frequency`, `amplitude`, and `phase` (degrees), and deconvolves the
    instrument response. To prevent instability in the deconvolution, it may be
    necessary to set a water level or a filter window which reduces the
    "exploding" effect of dividing by very small numbers near the edges of the
    instrument response function.

    Parameters
    ----------
    waveform : list or tuple of floats
        Waveform from which you intend to remove the instrument response
    sample_rate : float
        Sample rate of the waveform, in Hz
    frequency : list or tuple of floats
        Frequency bins of the FAP response
    amplitude : list or tuple of floats
        Amplitudes corresponding to the provided frequency bins
    phase : list or tuple of floats
        Phase corresponding to the provided frequency bins, in degrees
    water_level : float, optional
        Magnitude of water leveling to apply to the instrument response to
        prevent division by very small numbers, in units of decibels below the
        maximum power of the data
    window : dict
        A dictionarty containing information to construct a filter window to
        reduce instability in deconvolution as a result of dividing by very
        small values on the edges of the instrument response. The following
        windows are currently implemented: cosine.

        type : 'cosine'
            Type of windowing function to be used
        corners : list or tuple of [float, float, float, float]
            Describes the four corners of the tapered cosine window, in Hz

        type : 'db_cosine'
            Type of windowing function to be used
        corners : list or tuple of [float, float, float, float]
            Describes the four corners of the tapered cosine window, in dB down

    Returns
    -------
    tuple of floats
        The input waveform with the instrument response removed
    """

    #---------------------------------------------------------------------------
    # initialization
    #---------------------------------------------------------------------------

    # some conventions so we don't get confused in the code:
    #   x,X   input waveform (time, freq domain)
    #   y,Y   output waveform (inst. resp. deconvolved) (time, freq domain)
    #   H     input FAP, rectangular coordinates
    #   Hamp  input FAP, amplitude spectrum (polar coords)
    #   Hph   input FAP, phase     spectrum (polar coords)
    #   fh    input frequency axis (from the FAP)
    #   G     output FAP, rectangular coordinates
    #   Gamp  output FAP, amplitude spectrum (polar coords)
    #   Gph   output FAP, phase     spectrum (polar coords)
    #   fg    output frequency axis (same as freq axis of fft'd input data)


    # --------------- reprocess the phase spectrum ---------------    
    # It's hard to know what state the phase spectrum of the FAP will be in when
    # we get it (it could be be wrapped or unwrapped), so let's wrap it and then
    # subsequenctly re-unwrap it. This will give us a well-behaved and
    # continuous phase spectrum suitable for interpolation onto our desired
    # frequency axis.

    # convert FAP input to numpy arrays, for convenience
    waveform  = np.array(waveform)
    frequency = np.array(frequency)
    amplitude = np.array(amplitude)
    phase     = np.array(phase)

    # some shorthand
    fh = frequency  # frequency axis for the input FAP data

    # amplitude spectrum doesn't change with phase, so for clarity, let's just
    # put it into our "H" naming convention
    Hamp = amplitude

    # re-wrap the phase spectrum between [-180, 180]
    Hph = wrap(phase, a=[-180, 180])

    # re-unwrap the newly-wrapped phase spectrum
    Hph = np.unwrap(Hph, discont=180)


    # --------------- interpolate FAP onto data's freq axis ---------------
    # The clever way to get the FAP response onto the same frequency axis as the
    # input waveform would be to keep track of whether or not we have an even or
    # odd number of samples in the data, interpolate the FAP onto a list of
    # unique positive frequencies, and do the appropriate mirroring about f = 0
    # Hz. The easier way is to just figure out the input data's frequency axis,
    # whatever it is, and interpolate twice--once on the positive side, and once
    # on the negative side. The easy way is slower (since we'll sometimes be
    # interpolating onto the same frequency bin twice: once each for the
    # positive and negative sides), but it's easier to understand. Since this is
    # research code, it's usually better to opt for the way that's easier to
    # understand, so that's what we'll do.

    # make interpolators for input FAP amplitude and phase
    Iamp = interpolate1d(fh, Hamp, kind='linear', fill_value='extrapolate', xspace='log', yspace='log')
    Iph  = interpolate1d(fh, Hph,  kind='linear', fill_value='extrapolate')

    # some shorthand
    x = waveform  # input waveform (convention: lowercase = time domain)

    # fft the input data
    X = np.fft.fft(x)  # (convention: uppercase = freq domain)

    # make a symmetric frequency axis for the fft'd data
    fg = np.fft.fftfreq(len(X), 1/sample_rate)

    # make selection masks for the positive and negative frequencies
    # (note: filters/responses are undefined @ 0 Hz, so we'll leave f[0] alone)
    fpos = fg > 0  # positive frequencies
    fneg = fg < 0  # negative frequencies

    # pre-allocate some arrays to hold the interpolated/output inst. response
    # (note: 0 @ f=0 Hz means that the time-domain data is zero-mean. this is
    # what we generally want with seismic data, but if we're careless about this
    # later when we're trying to deconvolve, we'll get a divide-by-zero error.)
    Gamp = np.zeros(fg.shape)
    Gph  = np.zeros(fg.shape)

    # interpolate the FAP onto the data's freq axis
    # (note: amplitude is symmetric about f = 0 Hz, but phase is antisymmetric)
    Gamp[fpos] =  Iamp( fg[fpos])  # interpolate FAP amps  onto positive freqs
    Gamp[fneg] =  Iamp(-fg[fneg])  # interpolate FAP amps  onto negative freqs
    Gph[fpos]  =  Iph( fg[fpos])   # interpolate FAP phase onto positive freqs
    Gph[fneg]  = -Iph(-fg[fneg])   # interpolate FAP phase onto negative freqs

    # there should not be negative amplitudes, so zero those if they happen
    Gamp[Gamp < 0] = 0

    # put the interpolated response into rectangular coordinates so we can
    # deconvolve it later
    G = Gamp * np.exp(1j*np.deg2rad(Gph))


    # --------------- build a window function ---------------

    # check if we've specified a window type
    if not window:  # if there's no window
        
        # then our window function is just a rectangular window (a bunch of ones)
        wnd = np.ones(fg.shape)
        
    # otherwise, build a proper window function
    else:
        
        # --------------- cosine window ---------------
        # This is a window that goes from 0 to 1 between co[0] and co[1], and
        # from 1 to 0 between co[2] and co[3]. Tt is in the shape of a
        # half-cycle of a sine/cosine, from peak-to-peak.
        
        if window['type'].lower() == 'cosine':
            
            # some shorthand
            co = window['corners']  # cosine corner frequencies
            
            # get the bandwidth between f1-f2 and f3-f4
            bwlo = co[1] - co[0]
            bwhi = co[3] - co[2]
            
            # pre-allocate our window with ones (i.e., a rectangle window)
            wnd = np.ones(fg.shape)
            
            # set everything outside the freq limits to 0
            wnd[np.abs(fg) <= co[0]] = 0  # < lowest corner
            wnd[np.abs(fg) >= co[3]] = 0  # > highest corner
            
            # following cos(w*t), we'll make pseudo "frequency" and "time"
            # variables such that the "period" (1/f) of the cosine spans twice
            # the bandwidth between our corners, and the "time" axis will go
            # from [0, bandwidth]
            
            # from co[0] to co[1] (abs selects both positive and negative freqs)
            sel = (co[0] <= np.abs(fg)) & (np.abs(fg) <= co[1])  # selection mask
            if np.sum(sel) > 1:  # only apply window function if the corner isn't 0 or nyquist
                w = 2 * np.pi * 1/(2*bwlo)      # frequency; period spans 2x (co[1]-co[0])
                t = fg[sel]                     # "time" axis that is actually our frequency bins
                t = t - co[0]*np.sign(fg[sel])  # make time go from [0, bwlo]; sign() deals with negative freqs
                wnd[sel] = (1-np.cos(w*t))/2    # taper
            
            # from co[2] to co[3] (abs selects both positive and negative freqs)
            sel = (co[2] <= np.abs(fg)) & (np.abs(fg) <= co[3])  # selection mask
            if np.sum(sel) > 1:  # only apply window function if the corner isn't 0 or nyquist
                w = 2 * np.pi * 1/(2*bwhi)      # frequency; period spans 2x (co[3]-co[2])
                t = fg[sel]                     # "time" axis that is actually our frequency bins
                t = t - co[2]*np.sign(fg[sel])  # make time go from [0, dfhi]; sign() deals with negative freqs
                wnd[sel] = (1+np.cos(w*t))/2    # taper
            
        
        # --------------- dB cosine window ---------------        
        # This is the same as the the Cosine window, but the corners are
        # determined by the 'dB down' points relative to the maximum amplitude
        # of the FAP response. f1 and f4 will be 0 Hz and Nyquist, but f2 and f3
        # will be the points on the passband, closest to the maximum, that are
        # the speicifed dB less than the maximum.
        
        if window['type'].lower() == 'db_cosine':
            
            # some shorthand
            dbco = window['corners']          # db down from the max amp to determine corners
            fnyq = sample_rate/2              # Nyquist frequency
            df   = sample_rate/len(waveform)  # frequency bin spacing

            # pre-allocate our array of initial corner frequencies
            co = [0, 0, fnyq, fnyq]  # [f1, f2, f3, f4]
            # (f1=f2=0 and f3=f4=fnyq indicate no windowing on that side)
            
            # find the index of the maximum amplitude in the FAP response
            imax = np.argmax(Hamp)
            
            # find the freqs corresponding to the db down left of the max amp
            for i in range(0,2):
                
                # calculate the amplitude we're going to search for to find corners
                co_amp = Hamp[imax] * db2mag(dbco[i])
                
                # make a list of frequencies whose amplitude is less than that,
                # and which lie to the left of the maximum amplitude
                freqs = fh[(Hamp <= co_amp) & (fh <= fh[imax])]
                
                # set the corner to the right-most frequency, which is the
                # frequency closest to the corner amplitude
                if any(freqs):  # only do this if we actually found a frequency
                    co[i] = freqs[-1]  # set the ith corner to the rightmost freq

            # find the freqs corresponding to the db down right of the max amp
            for i in range(2,4):
                
                # calculate the amplitude we're going to search for to find corners
                co_amp = Hamp[imax] * db2mag(dbco[i])
                
                # make a list of frequencies whose amplitude is less than that,
                # and which lie to the right of the maximum amplitude
                freqs = fh[(Hamp <= co_amp) & (fh >= fh[imax])]
                
                # set the corner to the left-most frequency, which is the
                # frequency closest to the corner amplitude
                if any(freqs):  # only do this if we actually found a frequency
                    co[i] = freqs[0]  # set the ith corner to the leftmost freq


            # fix some corner weirdness that could conceivably have occurred

            # prevent zero-width windows (except at the limits)
            if co[0] == co[1] and co[0] != 0:    co[0] -= df
            if co[2] == co[3] and co[3] != fnyq: co[3] += df
            if co[0] < 0:    co[0] = 0
            if co[3] > fnyq: co[3] = fnyq

            # last ditch effort to catch weirdness
            # 0 <= f1 <= f2 <= f3 <= f4 <= fnyq
            co = np.array(co)  # makes comparisons easier
            if not all((0 <= co) & (co <= fnyq)) or not all(np.diff(co) >= 0):
                raise RuntimeError("Something went wrong with the autolimits. "
                    + "Corner frequencies should be 0 <= f1 <= f2 <= f3 <= f4 <= fnyq. "
                    + "Found " + co.__str__())


            # get the bandwidth between f1-f2 and f3-f4
            bwlo = co[1] - co[0]
            bwhi = co[3] - co[2]
                    
            # pre-allocate our window with ones (i.e., a rectangle window)
            wnd = np.ones(fg.shape)
            
            # set everything outside the freq limits to 0
            wnd[np.abs(fg) <= co[0]] = 0  # < lowest corner
            wnd[np.abs(fg) >= co[3]] = 0  # > highest corner
            
            # following cos(w*t), we'll make pseudo "frequency" and "time" variables
            # such that the "period" (1/f) of the cosine spans twice the bandwidth
            # between our corners, and the "time" axis will go from [0, bandwidth]
            
            # from co[0] to co[1] (abs selects both positive and negative freqs)
            sel = (co[0] <= np.abs(fg)) & (np.abs(fg) <= co[1])  # selection mask
            if np.sum(sel) > 1:  # only apply window function if the corner isn't 0 or nyquist
                w = 2 * np.pi * 1/(2*bwlo)      # frequency; period spans 2x (co[1]-co[0])
                t = fg[sel]                     # "time" axis that is actually our frequency bins
                t = t - co[0]*np.sign(fg[sel])  # make time go from [0, bwlo]; sign() deals with negative freqs
                wnd[sel] = (1-np.cos(w*t))/2    # taper
            
            # from co[2] to co[3] (abs selects both positive and negative freqs)
            sel = (co[2] <= np.abs(fg)) & (np.abs(fg) <= co[3])  # selection mask
            if np.sum(sel) > 1:  # only apply window function if the corner isn't 0 or nyquist
                w = 2 * np.pi * 1/(2*bwhi)      # frequency; period spans 2x (co[3]-co[2])
                t = fg[sel]                     # "time" axis that is actually our frequency bins
                t = t - co[2]*np.sign(fg[sel])  # make time go from [0, dfhi]; sign() deals with negative freqs
                wnd[sel] = (1+np.cos(w*t))/2    # taper
        
    # --------------- apply water level to response ---------------

    # if we have specified a water level
    if water_level:
        
        # figure out the minimum amplitude, below which we water level
        minamp = np.amax(Gamp) * db2mag(water_level)

        # make a selection mask for parts of the amplitude spectrum < minamp
        sel = Gamp < minamp
        sel[0] = False  # don't select f = 0 Hz

        # water level the response by replacing all small magnitudes with minamp
        G[sel] = G[sel] * minamp / Gamp[sel]
        
        
    # --------------- deconvolve the transfer function ---------------

    # pre-allocate our filtered waveform. Y[0] = 0, so the waveform is de-meaned
    # (note: the 0th element of an fft is the magnitude at 0 Hz, which is equal to
    # the sum of the data in the time domain. since ifft divides by the length of
    # the data, it works out that if X[0] == val, then it adds a DC offset to the
    # time-domain of val/len(X). therefore, if we set this to 0, it removes the DC
    # offset.)
    Y = np.zeros_like(X)

    # divide the filter response out of the original waveform (don't process 0 Hz)
    Y[1:] = X[1:] / G[1:]

    # apply the window
    Y = Y * wnd

    # return back to the time domain
    y = np.fft.ifft(Y).real  # discard imaginary components

    # return the response-removed waveform
    return tuple(y.tolist())
