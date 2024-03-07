#ifndef FILTER_DESIGNER_TESTS_H
#define FILTER_DESIGNER_TESTS_H
#include "gtest/gtest.h"
#include "TestUtils.hh"
#include "../src/enums.hh"
#include "../src/FilterDesigner.hh"
#include "../src/descriptions/LinearIIRFilterDescription.hh"
#include "../src/descriptions/BaseLinearFilterDescription.hh"
class FilterDesignerTests : public ::testing::Test
{
protected:
    TestUtils testUtils;
    FilterDesigner testedClass;
};

#endif // FILTER_DESIGNER_TESTS_H