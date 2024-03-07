#include "FIRFilterParameters.hh"

FIRFilterParameters::FIRFilterParameters(int groupDelaySec,
                                         bool isDesigned,
                                         double sampleRateHz,
                                         double sampleRateToleranceHz,
                                         std::vector<double> transferFunctionB) : transferFunctionB(transferFunctionB),
                                                                                  BaseFilterParameters(groupDelaySec,
                                                                                                       isDesigned, 
                                                                                                       sampleRateHz, 
                                                                                                       sampleRateToleranceHz)
{
  this->numTransferFunction = transferFunctionB.size() / 3;
};
#if (__EMSCRIPTEN__)

emscripten::val FIRFilterParameters::getTransferFunctionAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(transferFunctionB.size(), transferFunctionB.data()));
}

#endif