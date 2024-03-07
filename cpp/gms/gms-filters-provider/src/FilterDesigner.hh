#ifndef FILTER_DESIGNER_H
#define FILTER_DESIGNER_H
#include "descriptions/CascadedFilterDescription.hh"
#include "descriptions/LinearFIRFilterDescription.hh"
#include "descriptions/LinearIIRFilterDescription.hh"
#include "wrappers/FilterDescriptionWrapper.hh"
#include <complex>
#include <cmath>
#include <string>
extern "C"
{
#include "filter_iir.h"
}

class FilterDesigner
{
public:
    FilterDesigner() = default;
    static void filterDesign(CascadedFilterDescription *filterDescription);
    static void filterDesign(LinearIIRFilterDescription *filterDescription);
    static void filterDesign(LinearFIRFilterDescription *filterDescription);
};
#endif // FILTER_DESIGNER_H