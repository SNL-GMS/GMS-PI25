#ifndef IIR_FILTER_PARAMETERS_H
#define IIR_FILTER_PARAMETERS_H

#include <array>
#include <vector>
#include "../constants.hh"
#include "../enums.hh"
#include "BaseFilterParameters.hh"

#if (__EMSCRIPTEN__)

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/em_macros.h>
#include <emscripten/val.h>

#endif
class IIRFilterParameters : public BaseFilterParameters
{
public:
  IIRFilterParameters(int groupDelaySec,
                      bool isDesigned,
                      double sampleRateHz,
                      double sampleRateToleranceHz,
                      std::vector<double> sosNumerator,
                      std::vector<double> sosDenominator,
                      std::vector<double> sosCoefficients);
  std::vector<double> sosNumerator;
  std::vector<double> sosDenominator;
  std::vector<double> sosCoefficients;
  int numberOfSos;


#if (__EMSCRIPTEN__)

  emscripten::val getSosNumeratorAsTypedArray();
  emscripten::val getSosDenominatorAsTypedArray();
  emscripten::val getSosCoefficientsAsTypedArray();

#endif
};

#endif
