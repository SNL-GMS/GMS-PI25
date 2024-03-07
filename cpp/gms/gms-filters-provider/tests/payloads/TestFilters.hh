#ifndef TestFilters_H
#define TestFilters_H
#include <vector>
#include "../../src/descriptions/CascadedFilterDescription.hh"
#include "../../src/parameters/CascadedFilterParameters.hh"
#include "../../src/wrappers/FilterDescriptionWrapper.hh"
#include "../../src/descriptions/LinearIIRFilterDescription.hh"
#include "../../src/parameters/IIRFilterParameters.hh"
#include "../../src/enums.hh"
#include "TestEnums.hh"

class TestFilters
{
public:
    LinearIIRFilterDescription buildLowPassDesignedFilter() const;    // 0
    LinearIIRFilterDescription buildHighPassDesignedFilter() const;   // 1
    LinearIIRFilterDescription buildBandPassDesignedFilter() const;   // 2
    LinearIIRFilterDescription buildBandRejectDesignedFilter() const; // 3
    LinearIIRFilterDescription buildLowPassFilter() const;            // 0
    LinearIIRFilterDescription buildHighPassFilter() const;           // 1
    LinearIIRFilterDescription buildBandPassFilter() const;           // 2
    LinearIIRFilterDescription buildBandRejectFilter() const;         // 3
    CascadedFilterDescription buildCascade() const;
    CascadedFilterDescription buildDesignedCascade() const;
    LinearIIRFilterDescription buildHighPassCausalFilter() const;
    LinearIIRFilterDescription buildHighPassCausalDesignedFilter() const;
};

#endif // TestFilters_H