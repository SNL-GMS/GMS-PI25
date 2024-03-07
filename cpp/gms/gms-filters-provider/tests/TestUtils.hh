#ifndef TestUtils_H
#define TestUtils_H
#include <vector>
#include <string>
#include <math.h>
#include "gtest/gtest.h"
#include "payloads/TestData.hh"
#include "payloads/TestEnums.hh"
#include "payloads/TestFilters.hh"

class TestUtils
{

private:
    TestFilters testFilters;

public:
    static const int DEFAULT_INDEX_OFFSET = 0;
    static const int DEFAULT_INDEX_INCLUDE = 1;
    static const int DEFAULT_TAPER = 0;

    static std::array<double, TestData::TWO_HOUR_DATA_SIZE> getTwoHourDataCopy();
    static std::array<double, TestData::THREE_SECOND_DATA_SIZE> getThreeSecondDataCopy();
     LinearIIRFilterDescription getLinearFilter(TEST_FILTER_TYPE type) const;
     CascadedFilterDescription getCascadedFilter(TEST_FILTER_TYPE type) const;
     std::vector<double> getResultByIndex(TEST_FILTER_TYPE index) const;
     void filtersAreEquivalent(CascadedFilterDescription *actual, CascadedFilterDescription *expected) const;
     void filtersAreEquivalent(const BaseLinearFilterDescription *actual, const BaseLinearFilterDescription *expected) const;
     void filtersAreEquivalent(LinearIIRFilterDescription *actual, LinearIIRFilterDescription *expected) const;
     void filtersAreEquivalent(LinearFIRFilterDescription *actual, LinearFIRFilterDescription *expected) const;
     void parametersAreEquivalent(const BaseFilterParameters *actual, const BaseFilterParameters *expected) const;
     void parametersAreEquivalent(CascadedFilterParameters *actual, CascadedFilterParameters *expected) const;
     void parametersAreEquivalent(IIRFilterParameters *actual, IIRFilterParameters *expected) const;
     void parametersAreEquivalent(FIRFilterParameters *actual, FIRFilterParameters *expected) const;
     void precisionCompare(std::vector<double> *a, std::vector<double> *b, const int precision) const;
     void precisionCompare(const double *a, const double *b, const ulong arraySize, const int precision) const;
     std::string to_string_with_precision(const double input, const int precision) const;
};
#endif // TestUtils_H