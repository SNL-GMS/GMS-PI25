#ifndef FILTER_PROVIDER_H
#define FILTER_PROVIDER_H
#include <string>   // std::string
#include <iostream> // std::cout
#include <sstream>  // std::stringstream
#include <ccomplex>
#include <cmath>


#include "descriptions/CascadedFilterDescription.hh"
#include "descriptions/LinearFIRFilterDescription.hh"
#include "descriptions/LinearIIRFilterDescription.hh"

extern "C"
{
#include <filter_iir.h>
}

class FilterProvider
{
public:
    FilterProvider() = default;

    static void filterApply(CascadedFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
    static void filterApply(LinearIIRFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
    static void filterApply(LinearFIRFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
};

void _filterApply(double * data, int num_data, int index_offset, int index_inc, int taper, int zero_phase, std::vector<double> sos_numerator, std::vector<double> sos_denominator, int num_sos);
void _filterTaper(double * data, int num_data, int index_offset, int index_inc, int taper_samples, int direction);

#endif // FILTER_PROVIDER_H
