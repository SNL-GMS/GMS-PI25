#!/bin/bash

# clean; prepare folders for building 
rm -rf ../typescript/user-interface/packages/ui-wasm/src/ts/wasm/
rm -rf ../typescript/user-interface/packages/ui-wasm/lib/wasm/
rm -rf emcmake-build

mkdir -p emcmake-build
mkdir -p ../typescript/user-interface/packages/ui-wasm/src/ts/wasm
mkdir -p ../typescript/user-interface/packages/ui-wasm/lib/wasm


# build wasm
cd emcmake-build
emcmake cmake ..
make

# copy over files to the typescript packages
cp -R wasm/* ../../typescript/user-interface/packages/ui-wasm/src/ts/wasm
cp -R wasm/* ../../typescript/user-interface/packages/ui-wasm/lib/wasm
