#include "IIRFilterParameters.hh"

IIRFilterParameters::IIRFilterParameters(int groupDelaySec,
                                         bool isDesigned,
                                         double sampleRateHz,
                                         double sampleRateToleranceHz,
                                         std::vector<double> sosNumerator,
                                         std::vector<double> sosDenominator,
                                         std::vector<double> sosCoefficients) : sosNumerator(sosNumerator),
                                                                                sosDenominator(sosDenominator),
                                                                                sosCoefficients(sosCoefficients),
                                                                                BaseFilterParameters(groupDelaySec, isDesigned, sampleRateHz, sampleRateToleranceHz){
                                                                                    this->numberOfSos = sosNumerator.size() / 3;
                                                                                };

#if (__EMSCRIPTEN__)

emscripten::val IIRFilterParameters::getSosNumeratorAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosNumerator.size(), sosNumerator.data()));
}

emscripten::val IIRFilterParameters::getSosDenominatorAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosDenominator.size(), sosDenominator.data()));
}

emscripten::val IIRFilterParameters::getSosCoefficientsAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosCoefficients.size(), sosCoefficients.data()));
}

#endif