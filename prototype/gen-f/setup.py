import os
import shutil
from pathlib import Path

from setuptools import find_packages, setup

here = Path(__file__).parent.resolve()
long_description = (here / "README.md").read_text(encoding="utf-8")

package_dir = "Src"
package_name = "genf"


shutil.rmtree("build", ignore_errors=True)


def package_files(directory):
    paths = list()

    for (path, directories, filenames) in os.walk(directory, followlinks=True):
        for filename in filenames:
            paths.append(Path(path) / filename)

    paths = [str(path.relative_to(directory)) for path in paths]
    return paths


packaged_data = package_files(os.path.join(package_dir, package_name))


setup(
    name=package_name,
    version="2.2.0",
    description="Python prototype of N. D. Selby's Multiple-Filter Generalized F-Detector",
    long_description_content_type="text/markdown",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
    ],
    packages=find_packages(package_dir),
    package_dir={"": package_dir},
    include_package_data=True,
    package_data={"": packaged_data},
    python_requires=">=3.8, <4",
    install_requires=[
        "matplotlib",
        "numpy",
        "obspy",
        "sqlalchemy",
        "scipy",
        "cx_Oracle",
    ],
    extras_require={"dev": [], "test": ["pytest"]},
    entry_points={"console_scripts": ["gen-f=genf.main:main"]},
)
