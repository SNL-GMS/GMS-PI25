#ifndef EMSCRIPTEN_BINDINGS_H
#define EMSCRIPTEN_BINDINGS_H
#include "descriptions/CascadedFilterDescription.hh"
#include "descriptions/LinearFIRFilterDescription.hh"
#include "descriptions/LinearIIRFilterDescription.hh"
#include "FilterProvider.hh"
#include "FilterDesigner.hh"

/**
 * This section must remain in the Extern C. Note the use of the double* pointer style array.
 * This allows the C code to execute against an allocated memory space and it significantly faster
 * than trying to execute against any other kind of allocated memory that crosses the WASM boundary
 */
extern "C"
{
    void cascadedFilterApply(CascadedFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
    void iirFilterApply(LinearIIRFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
    void firFilterApply(LinearFIRFilterDescription *filterDescription, double *data, int numberOfData, int taper, bool removeGroupDelay, int indexOffset, int indexInclude);
}
CascadedFilterDescription cascadedFilterDesign(CascadedFilterDescription filterDescription);
LinearIIRFilterDescription iirFilterDesign(LinearIIRFilterDescription filterDescription);
LinearFIRFilterDescription firFilterDesign(LinearFIRFilterDescription filterDescription);

#if (__EMSCRIPTEN__)

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/em_macros.h>

EMSCRIPTEN_KEEPALIVE

EMSCRIPTEN_BINDINGS(GmsCoiFilters)
{
    emscripten::register_vector<FilterDescriptionWrapper>("VectorFilterDescriptionWrapper");
    emscripten::register_vector<double>("VectorDouble");
    emscripten::register_vector<std::string>("VectorString");
    emscripten::constant("MAX_NAME_SIZE", MAX_NAME_SIZE);
    emscripten::constant("MAX_COMMENT_SIZE", MAX_COMMENT_SIZE);
    emscripten::constant("MAX_FILTER_ORDER", MAX_FILTER_ORDER);
    emscripten::constant("MAX_POLES", MAX_POLES);
    emscripten::constant("MAX_SOS", MAX_SOS);
    emscripten::constant("MAX_TRANSFER_FUNCTION", MAX_TRANSFER_FUNCTION);
    emscripten::constant("MAX_FILTER_DESCRIPTIONS", MAX_FILTER_DESCRIPTIONS);

    emscripten::enum_<FILTER_COMPUTATION_TYPE>("FilterComputationType")
        .value("FIR", FIR)
        .value("IIR", IIR)
        .value("AR", AR)
        .value("PM", PM);

    emscripten::enum_<FILTER_DESIGN_MODEL>("FilterDesignModel")
        .value("BUTTERWORTH", BUTTERWORTH)
        .value("CHEBYSHEV_I", CHEBYSHEV_I)
        .value("CHEBYSHEV_II", CHEBYSHEV_II)
        .value("ELLIPTIC", ELLIPTIC);

    emscripten::enum_<FILTER_BAND_TYPE>("FilterBandType")
        .value("LOW_PASS", LOW_PASS)
        .value("HIGH_PASS", HIGH_PASS)
        .value("BAND_PASS", BAND_PASS)
        .value("BAND_REJECT", BAND_REJECT);

    emscripten::enum_<FILTER_DESCRIPTION_TYPE>("FilterDescriptionType")
        .value("FIR_FILTER_DESCRIPTION", FIR_FILTER_DESCRIPTION)
        .value("IIR_FILTER_DESCRIPTION", IIR_FILTER_DESCRIPTION);

    emscripten::class_<BaseFilterParameters>("BaseFilterParameters")
        .constructor<int, bool, double, double>()
        .property("groupDelaySec", &BaseFilterParameters::groupDelaySec)
        .property("isDesigned", &BaseFilterParameters::isDesigned)
        .property("sampleRateHz", &BaseFilterParameters::sampleRateHz)
        .property("sampleRateToleranceHz", &BaseFilterParameters::sampleRateToleranceHz);

    emscripten::class_<IIRFilterParameters, emscripten::base<BaseFilterParameters>>("IIRFilterParameters")
        .constructor<int, bool, double, double, std::vector<double>, std::vector<double>, std::vector<double>>()
        .function("getSosNumeratorAsTypedArray", &IIRFilterParameters::getSosNumeratorAsTypedArray)
        .function("getSosDenominatorAsTypedArray", &IIRFilterParameters::getSosDenominatorAsTypedArray)
        .function("getSosCoefficientsAsTypedArray", &IIRFilterParameters::getSosCoefficientsAsTypedArray);

    emscripten::class_<FIRFilterParameters, emscripten::base<BaseFilterParameters>>("FIRFilterParameters")
        .constructor<int, bool, double, double, std::vector<double>>()
        .function("getTransferFunctionAsTypedArray", &FIRFilterParameters::getTransferFunctionAsTypedArray);

    emscripten::class_<CascadedFilterParameters, emscripten::base<BaseFilterParameters>>("CascadedFilterParameters")
        .constructor<int, bool, double, double>();

    emscripten::class_<FilterDescriptionWrapper>("FilterDescriptionWrapper")
        .function("getFilterTypeValue", &FilterDescriptionWrapper::getFilterTypeValue)
        .function("getWasmIIRDescription", &FilterDescriptionWrapper::getWasmIIRDescription)
        .function("getWasmFIRDescription", &FilterDescriptionWrapper::getWasmFIRDescription)
        .class_function("buildIIR", &FilterDescriptionWrapper::buildIIR)
        .class_function("buildFIR", &FilterDescriptionWrapper::buildFIR);

    emscripten::class_<BaseFilterDescription>("BaseFilterDescription")
        .constructor<bool, std::string>()
        .property("causal", &BaseFilterDescription::causal)
        .property("comments", &BaseFilterDescription::comments);

    emscripten::class_<CascadedFilterDescription, emscripten::base<BaseFilterDescription>>("CascadedFilterDescription")
        .constructor<bool, std::string, std::vector<FilterDescriptionWrapper>, CascadedFilterParameters>()
        .property("parameters", &CascadedFilterDescription::parameters)
        .property("filterDescriptions", &CascadedFilterDescription::filterDescriptions);

    emscripten::class_<BaseLinearFilterDescription, emscripten::base<BaseFilterDescription>>("BaseLinearFilterDescription")
        .constructor<bool, std::string, double, double, int, int, int, bool>()
        .property("highFrequency", &BaseLinearFilterDescription::highFrequency)
        .property("lowFrequency", &BaseLinearFilterDescription::lowFrequency)
        .property("passBandType", &BaseLinearFilterDescription::passBandType)
        .property("filterDesignModel", &BaseLinearFilterDescription::filterDesignModel)
        .property("order", &BaseLinearFilterDescription::order)
        .property("zeroPhase", &BaseLinearFilterDescription::zeroPhase);

    emscripten::class_<LinearIIRFilterDescription, emscripten::base<BaseLinearFilterDescription>>("LinearIIRFilterDescription")
        .constructor<IIRFilterParameters, bool, std::string, double, double, int, int, int, int>()
        .property("parameters", &LinearIIRFilterDescription::parameters);

    emscripten::class_<LinearFIRFilterDescription, emscripten::base<BaseLinearFilterDescription>>("LinearFIRFilterDescription")
        .constructor<FIRFilterParameters, bool, std::string, double, double, int, int, int, int>()
        .property("parameters", &LinearFIRFilterDescription::parameters);

    emscripten::function("cascadedFilterDesign", &cascadedFilterDesign);
    emscripten::function("iirFilterDesign", &iirFilterDesign);
    emscripten::function("firFilterDesign", &firFilterDesign);
};

#endif
#endif // EMSCRIPTEN_BINDINGS_H