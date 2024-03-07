#!/bin/sh -e
set -x
TARGETS="Src setup.py tests"
autoflake --remove-all-unused-imports --recursive --remove-unused-variables --in-place $TARGETS --exclude=__init__.py
isort --profile black $TARGETS
black $TARGETS

