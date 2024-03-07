
#ifndef BASE_FILTERAPPLY_TESTS_H
#define BASE_FILTERAPPLY_TESTS_H
#include <string>
#include <vector>
#include "gtest/gtest.h"
#include "TestUtils.hh"
#include "../src/enums.hh"
#include "../src/FilterProvider.hh"

class BaseFilterApplyTests : public ::testing::Test
{
public:
    void SetUp() override;
    static const int TEST_DATA_SIZE = 12000;
    std::array<double,TEST_DATA_SIZE>  TEST_DATA;
};

#endif // TAPER_TESTS_H
