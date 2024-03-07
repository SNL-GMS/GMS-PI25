#include "BaseFilterApplyTests.hh"

void BaseFilterApplyTests::SetUp()
{
    TEST_DATA = TestUtils::getTwoHourDataCopy();
};


TEST_F(BaseFilterApplyTests, BW_LP_CAUSAL_BASE_FILTER)
{
    TestUtils testUtils;
    double *testData = TEST_DATA.data();
    std::vector<double> expected = testUtils.getResultByIndex(TEST_FILTER_TYPE::BW_LP_CAUSAL_DESIGNED_FILTER);
    LinearIIRFilterDescription designedFilter = testUtils.getLinearFilter(TEST_FILTER_TYPE::BW_LP_CAUSAL_DESIGNED_FILTER);
    try
    {
        _filterApply(
            testData,
            BaseFilterApplyTests::TEST_DATA_SIZE,
            TestUtils::DEFAULT_INDEX_OFFSET,
            TestUtils::DEFAULT_INDEX_INCLUDE,
            TestUtils::DEFAULT_TAPER,
            designedFilter.zeroPhase,
            designedFilter.parameters.sosNumerator,
            designedFilter.parameters.sosDenominator,
            designedFilter.parameters.numberOfSos);
        testUtils.precisionCompare(testData, expected.data(), BaseFilterApplyTests::TEST_DATA_SIZE, 11);
    }
    catch (std::exception &e)
    {
        std::cerr << e.what() << std::endl;
        FAIL();
    }
};