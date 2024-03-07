 
# Gen-F
Python prototype of N. D. Selby's Multiple-Filter Generalized F-Detector

**Table of Contents**

[[_TOC_]]


## References


Selby, N. D. (2008). Application of a generalized F detector at a seismometer array. Bulletin of the 
Seismological Society of America, 98(5), 2469-2481.

Selby, N. D. (2013). A multiple-filter F detector method for medium-aperture seismometer arrays. Geophysical 
Journal International, 192(3), 1189-1195.

Selby, N. D. (2013). A multiple-filter F detector method for medium-aperture seismometer arrays. Geophysical 
Journal International, 192(3), 1189-1195.


## Installation
Gen-F requires an anaconda Python environment.

Find the appropriate conda distribution for your OS.

https://conda.io/projects/conda/en/latest/user-guide/install/index.html


The runtime environment for Gen-F is specified in an the file `environment.yml`.  There is a development environment specified in `environment-dev.yml`, which
is a superset of the `environment.yml` environment; use the dev environment if you are making and committing changes to the code.  It adds in dependencies for
the unit testing and for auto formatting the code.


### Create the environment

```
conda env create -f environment.yml

# or alternatively for the dev env
# conda env create -f environment-dev.yml

```

### Activate the environment

```
conda activate genf
```

### Install genf

#### For use without modifying the code

```
pip install .
```

#### For development / code modificiation

This creates symlinks to the genf repository when installing, rather than copying files.  The end result is that your Python environment "sees" changes that you make
to genf without having to re-install the library.

```
pip install -e .
```


## Using the gen-f command line interface

`gen-f` is a command line tool that allows users to invoke the Gen-F algorithm while specifying configuration such as input data locations, output directory, and seismic array network.

Usage information is provided via the `--help` flag to the tool, and is likely to be more up-to-date than this README:

```
gen-f --help
```

But the minimum arguments are an input directory where .par files reside, a seismic array network name, and a data source, either ims files or the database.  If ims, one must
also indicate a subdirectory where the ims waveforms reside.

For example:

```
gen-f --input Input --network CMAR --data-source ims --ims-data-dir 20050514T000000_20050515T000000
```

This indicates that the tool should use the directory "Input" for input data (par files, ims files), that the seismic array network is "CMAR", and that the tool is to use
ims files rather than a database for waveforms.  The ims files reside in Input/dataArchive/CMAR/20050514T000000_20050515T000000/, with the 'Input' part of that path taken
from the `--input` flag, `CMAR` from the `--network` flag, and '20050514T000000_20050515T000000' from the `--ims-data-dir` flag.

The input directory of the gen-f tool must be of a certain structure and contain certain files.  The tool will assist first-time users in making this directory, providing
configuration and waveform data such that the user may run the Gen-F algorithm over a particular timerange of data from the CMAR network.  To use this functionality, invoke
gen-f with the `--init-input-dir` argument:

```
gen-f --init-input-dir
```

after which one may use this packaged configutration like so:

```
gen-f -i Input -n CMAR -d ims --ims-data-dir 20050514T000000_20050515T000000
```

The gen-f tool will also write out plots as it executes:

```
gen-f -i Input -n CMAR -d ims --ims-data-dir 20050514T000000_20050515T000000 --plot
```

By default, all output is put in `./Output`, though you may specify a specific output directory via the `-o` argument.

```
gen-f -i Input -o my_output_dir -n ARCES -d xxx --plot
```


For further information, see the usage on the gen-f tool:

```
gen-f --help
```


## Development

Check the Installation section for some additions to the environment and how one installs genf to actively work on the code base.

Developers may need to peform actions that users do not, such as running tests or generating an installable artifact.  This section addresses those developer-specific tasks.


### Running tests

Automated tests may be run via pytest, which is a unit test framework for Python.  To invoke pytest on the code base:

```
pytest -v
```

which will run all available tests.  

For more information on pytest see [the official pytest documentation](https://docs.pytest.org/en/7.0.x/). 

### Formatting the code

The code in the repository is formatted using a few different Python utilities.  Autoflake is used to remove unused imports and undefined variables; isort is used to
sort / alphabetize imports; and black is used to format the code.  The script `scripts/format.sh` is a convenience shell script (thus usable on macos and linux) to do all the
needed commands in the right order.  Windows users can simply execute the commands in the order the script does to achieve the same results.

To run the script (macos, linux):

```
./scripts/format.sh
```


### Publishing to artifactory

Publishing to GMS artifactory is done via Gitlab CI in the Gitlab web interface, under CI/CD -> Pipelines -> Publish.  This CI job will package genf as an installable tar.gz
and upload it to gms artifactory.


### Build Source tar for install

Run:

```
python setup.py sdist
```

which will generates an installable tar ball under `./dist`

```
ls dist/
genf-<version>.tar.gz
```

You can then pip install this tar file. 

```
pip install dist/genf-<version>.tar.gz
```


####  Example Install

A concrete example of installing from that tar file:

```
pip install dist/genf-2.0.0.tar.gz
pip list | grep genf
genf    2.0.0
```


