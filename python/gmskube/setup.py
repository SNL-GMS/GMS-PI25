from setuptools import setup
"""
To rebuild, run python3 setup.py
"""

VERSION = "0.1.0"

setup(
    name="gmskube",
    version=VERSION,
    description=(
        "A command line application to manage gms instances on Kubernetes"
    ),
    packages=["gmskube"],
    python_requires=">=3.10",
    tests_require=["pytest"],
    install_requires=["pyyaml",
                      "requests",
                      "rich"]
)
