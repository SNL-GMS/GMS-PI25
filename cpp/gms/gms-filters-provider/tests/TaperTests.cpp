#include "TaperTests.hh"

void TaperTests::SetUp()
{
    TEST_DATA = TestUtils::getThreeSecondDataCopy();
};

TEST_F(TaperTests, TAPER_1SEC_FWD)
{
    TestUtils testUtils;
    std::vector<double> expected = testUtils.getResultByIndex(TEST_FILTER_TYPE::TAPER_FWD);
    try
    {
        _filterTaper(
            TEST_DATA.data(),
            TaperTests::TEST_DATA_SIZE,
            TestUtils::DEFAULT_INDEX_OFFSET,
            TestUtils::DEFAULT_INDEX_INCLUDE,
            40,
            0);
        testUtils.precisionCompare(TEST_DATA.data(), expected.data(), TaperTests::TEST_DATA_SIZE, 11);
    }
    catch (std::exception &e)
    {
        std::cerr << e.what() << std::endl;
        FAIL();
    }
};

TEST_F(TaperTests, TAPER_1SEC_REV)
{
    TestUtils testUtils;
    std::vector<double> expected = testUtils.getResultByIndex(TEST_FILTER_TYPE::TAPER_REV);
    try
    {
        _filterTaper(
            TEST_DATA.data(),
            TaperTests::TEST_DATA_SIZE,
            TestUtils::DEFAULT_INDEX_OFFSET,
            TestUtils::DEFAULT_INDEX_INCLUDE,
            40,
            1);
        testUtils.precisionCompare(TEST_DATA.data(), expected.data(), TaperTests::TEST_DATA_SIZE, 11);
    }
    catch (std::exception &e)
    {
        std::cerr << e.what() << std::endl;
        FAIL();
    }
};

TEST_F(TaperTests, TAPER_1SEC_BOTH)
{
    TestUtils testUtils;
    std::vector<double> expected = testUtils.getResultByIndex(TEST_FILTER_TYPE::TAPER_BOTH);
    try
    {
        _filterTaper(
            TEST_DATA.data(),
            TaperTests::TEST_DATA_SIZE,
            TestUtils::DEFAULT_INDEX_OFFSET,
            TestUtils::DEFAULT_INDEX_INCLUDE,
            40,
            2);
        testUtils.precisionCompare(TEST_DATA.data(), expected.data(), TaperTests::TEST_DATA_SIZE, 11);
    }
    catch (std::exception &e)
    {
        std::cerr << e.what() << std::endl;
        FAIL();
    }
};