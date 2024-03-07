#include "TestUtils.hh"

void TestUtils::filtersAreEquivalent(CascadedFilterDescription *actual, CascadedFilterDescription *expected) const
{
    TestUtils::parametersAreEquivalent(&actual->parameters, &expected->parameters);

    // ENSURE ORDER AND TYPE HAVE NOT CHANGED
    for (int filterIdx = 0; filterIdx < actual->filterDescriptions.size(); filterIdx++)
    {
        FilterDescriptionWrapper actualWrapper = actual->filterDescriptions.at(filterIdx);
        FilterDescriptionWrapper expectedWrapper = expected->filterDescriptions.at(filterIdx);
        ASSERT_EQ(expectedWrapper.getFilterTypeValue(), actualWrapper.getFilterTypeValue());
        switch (actualWrapper.getFilterTypeValue())
        {
        case FILTER_DESCRIPTION_TYPE::IIR_FILTER_DESCRIPTION:
        {
            TestUtils::filtersAreEquivalent(actualWrapper.getIIRDescription(), expectedWrapper.getIIRDescription());
            break;
        }
        case FILTER_DESCRIPTION_TYPE::FIR_FILTER_DESCRIPTION:
        {
            TestUtils::filtersAreEquivalent(actualWrapper.getFIRDescription(), expectedWrapper.getFIRDescription());
            break;
        }
        default:
        {
            throw std::invalid_argument("Invalid index specified");
        }
        }
    }
};

void TestUtils::filtersAreEquivalent(const BaseLinearFilterDescription *actual, const BaseLinearFilterDescription *expected) const
{
    ASSERT_EQ(actual->highFrequency, expected->highFrequency);
    ASSERT_EQ(actual->lowFrequency, expected->lowFrequency);
    ASSERT_EQ(actual->passBandType, expected->passBandType);
    ASSERT_EQ(actual->filterDesignModel, expected->filterDesignModel);
    ASSERT_EQ(actual->order, expected->order);
    ASSERT_EQ(actual->zeroPhase, expected->zeroPhase);
};

void TestUtils::filtersAreEquivalent(LinearFIRFilterDescription *actual, LinearFIRFilterDescription *expected) const
{
    auto actualBase = static_cast<BaseLinearFilterDescription *>(actual);
    TestUtils::filtersAreEquivalent(actualBase, expected);
    TestUtils::parametersAreEquivalent(&actual->parameters, &expected->parameters);
};

void TestUtils::filtersAreEquivalent(LinearIIRFilterDescription *actual, LinearIIRFilterDescription *expected) const
{
    auto actualBase = static_cast<BaseLinearFilterDescription *>(actual);
    auto expectedBase = static_cast<BaseLinearFilterDescription *>(expected);
    TestUtils::filtersAreEquivalent(actualBase, expectedBase);
    TestUtils::parametersAreEquivalent(&actual->parameters, &expected->parameters);
};

void TestUtils::parametersAreEquivalent(const BaseFilterParameters *actual, const BaseFilterParameters *expected) const
{
    ASSERT_EQ(actual->groupDelaySec, expected->groupDelaySec);
    ASSERT_EQ(actual->isDesigned, expected->isDesigned);
    ASSERT_EQ(actual->sampleRateHz, expected->sampleRateHz);
    ASSERT_EQ(actual->sampleRateToleranceHz, expected->sampleRateToleranceHz);
};

void TestUtils::parametersAreEquivalent(CascadedFilterParameters *actual, CascadedFilterParameters *expected) const
{
    ASSERT_EQ(actual->sampleRateHz, expected->sampleRateHz);
    ASSERT_EQ(actual->sampleRateToleranceHz, expected->sampleRateToleranceHz);
    auto actualBase = static_cast<BaseFilterParameters *>(actual);
    auto expectedBase = static_cast<BaseFilterParameters *>(expected);
    TestUtils::parametersAreEquivalent(actualBase, expectedBase);
};

void TestUtils::parametersAreEquivalent(FIRFilterParameters *actual, FIRFilterParameters *expected) const
{
    ASSERT_EQ(actual->numTransferFunction, expected->numTransferFunction);
    precisionCompare(&actual->transferFunctionB, &expected->transferFunctionB, 11);
    auto actualBase = static_cast<BaseFilterParameters *>(actual);
    auto expectedBase = static_cast<BaseFilterParameters *>(expected);
    TestUtils::parametersAreEquivalent(actualBase, expectedBase);
};

void TestUtils::parametersAreEquivalent(IIRFilterParameters *actual, IIRFilterParameters *expected) const
{
    ASSERT_EQ(actual->numberOfSos, expected->numberOfSos);

    // TODO: When SOSCoefficients is implemented, compare results
    // precisionCompare(&actual->sosCoefficients, &expected->sosCoefficients, 11);

    precisionCompare(&actual->sosDenominator, &expected->sosDenominator, 11);
    precisionCompare(&actual->sosNumerator, &expected->sosNumerator, 11);

    auto actualBase = static_cast<BaseFilterParameters *>(actual);
    auto expectedBase = static_cast<BaseFilterParameters *>(expected);
    TestUtils::parametersAreEquivalent(actualBase, expectedBase);
};

void TestUtils::precisionCompare(std::vector<double> *a, std::vector<double> *b, const int precision) const
{
    bool areEitherVecNull = (a->empty()) || (b->empty());
    ASSERT_FALSE(areEitherVecNull);
    ASSERT_EQ(a->size(), b->size());
    TestUtils::precisionCompare(a->data(), b->data(), a->size(), precision);
}

void TestUtils::precisionCompare(const double *a, const double *b, const ulong arraySize, const int precision) const
{
    for (int sizeIdx = 0; sizeIdx < arraySize; sizeIdx++)
    {
        double actual = a[sizeIdx];
        double expected = b[sizeIdx];
        double difference = abs(actual - expected);
        EXPECT_LE(difference, 1e-11);
    }
}

LinearIIRFilterDescription TestUtils::getLinearFilter(TEST_FILTER_TYPE type) const
{
    switch (type)
    {
    case TEST_FILTER_TYPE::BW_LP_CAUSAL_FILTER:
        return testFilters.buildLowPassFilter();
    case TEST_FILTER_TYPE::BW_LP_CAUSAL_DESIGNED_FILTER:
        return testFilters.buildLowPassDesignedFilter();
    case TEST_FILTER_TYPE::BW_HP_NONCAUSAL_FILTER:
        return testFilters.buildHighPassFilter();
    case TEST_FILTER_TYPE::BW_HP_NONCAUSAL_DESIGNED_FILTER:
        return testFilters.buildHighPassDesignedFilter();
    case TEST_FILTER_TYPE::BW_BP_CAUSAL_FILTER:
        return testFilters.buildBandPassFilter();
    case TEST_FILTER_TYPE::BW_BP_CAUSAL_DESIGNED_FILTER:
        return testFilters.buildBandPassDesignedFilter();
    case TEST_FILTER_TYPE::BW_BR_NONCAUSAL_FILTER:
        return testFilters.buildBandRejectFilter();
    case TEST_FILTER_TYPE::BW_BR_NONCAUSAL_DESIGNED_FILTER:
        return testFilters.buildBandRejectDesignedFilter();
    default:
        throw std::invalid_argument("Invalid index specified");
    }
};

CascadedFilterDescription TestUtils::getCascadedFilter(TEST_FILTER_TYPE type) const
{
    switch (type)
    {
    case TEST_FILTER_TYPE::CASCADED_FILTER_LPHP_FILTER:
        return testFilters.buildCascade();
    case TEST_FILTER_TYPE::CASCADED_FILTER_LPHP_DESIGNED_FILTER:
        return testFilters.buildDesignedCascade();
    default:
        throw std::invalid_argument("Invalid index specified");
    }
};

std::array<double, TestData::TWO_HOUR_DATA_SIZE> TestUtils::getTwoHourDataCopy()
{
    std::array<double, TestData::TWO_HOUR_DATA_SIZE> clone;
    std::copy(std::begin(TestData::TWO_HOUR_DATA), std::end(TestData::TWO_HOUR_DATA), std::begin(clone));
    return clone;
};

std::array<double, TestData::THREE_SECOND_DATA_SIZE> TestUtils::getThreeSecondDataCopy()
{
    std::array<double, TestData::THREE_SECOND_DATA_SIZE> clone;
    std::copy(std::begin(TestData::THREE_SECOND_DATA), std::end(TestData::THREE_SECOND_DATA), std::begin(clone));
    return clone;
};

std::vector<double> TestUtils::getResultByIndex(TEST_FILTER_TYPE index) const
{
    switch (index)
    {
    case TEST_FILTER_TYPE::BW_LP_CAUSAL_DESIGNED_FILTER:
        return std::vector<double>(TestData::BW_LP_CAUSAL_RESULTS);
    case TEST_FILTER_TYPE::BW_HP_NONCAUSAL_DESIGNED_FILTER:
        return std::vector<double>(TestData::BW_HP_NONCAUSAL_RESULTS);
    case TEST_FILTER_TYPE::BW_BP_CAUSAL_DESIGNED_FILTER:
        return std::vector<double>(TestData::BW_BP_CAUSAL_RESULTS);
    case TEST_FILTER_TYPE::BW_BR_NONCAUSAL_DESIGNED_FILTER:
        return std::vector<double>(TestData::BW_BR_NONCAUSAL_RESULTS);
    case TEST_FILTER_TYPE::CASCADED_FILTER_LPHP_DESIGNED_FILTER:
        return std::vector<double>(TestData::CASCADED_FILTER_LPHP_RESULTS);
    case TEST_FILTER_TYPE::TAPER_FWD:
        return std::vector<double>(TestData::TAPER_FWD_RESULTS);
    case TEST_FILTER_TYPE::TAPER_REV:
        return std::vector<double>(TestData::TAPER_REV_RESULTS);
    case TEST_FILTER_TYPE::TAPER_BOTH:
        return std::vector<double>(TestData::TAPER_BOTH_RESULTS);
    default:
        throw std::invalid_argument("Invalid index specified");
    }
};

std::string TestUtils::to_string_with_precision(const double input, const int precision = 6) const
{
    std::ostringstream out;
    out.precision(precision);
    out << std::fixed << input;
    return std::move(out).str();
}
