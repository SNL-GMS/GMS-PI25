
#ifndef WASMFILTERDESIGNERTESTS_H
#define WASMFILTERDESIGNERTESTS_H
#include "gtest/gtest.h"
#include "TestUtils.hh"
#include "../src/enums.hh"
#include "../src/EmscriptenBindings.hh"

class WasmFilterDesignerTests : public ::testing::Test
{
protected:
    TestUtils testUtils;
};

#endif // WASMFILTERDESIGNERTESTS_H
