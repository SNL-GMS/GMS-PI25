#ifndef CASCADED_FILTERS_PARAMETERS_H
#define CASCADED_FILTERS_PARAMETERS_H

#include <stdexcept>
#include <vector>
#include "BaseFilterParameters.hh"
#include "../constants.hh"
#include "../descriptions/BaseLinearFilterDescription.hh"
#include "../wrappers/FilterDescriptionWrapper.hh"

#if (__EMSCRIPTEN__)

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/em_macros.h>
#include <emscripten/val.h>

#endif

class CascadedFilterParameters : public BaseFilterParameters
{
public:
  CascadedFilterParameters(int groupDelaySec,
                           bool isDesigned,
                           double sampleRateHz,
                           double sampleRateToleranceHz);
};

#endif // CASCADED_FILTERS_PARAMETERS_H
