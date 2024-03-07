#include "FilterDescriptionWrapper.hh"

FilterDescriptionWrapper::FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE filterType,
                                                   LinearFIRFilterDescription firDescription) : filterType(filterType),
                                                                                                firDescription(firDescription){};
FilterDescriptionWrapper::FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE filterType,
                                                   LinearIIRFilterDescription iirDescription) : filterType(filterType),
                                                                                                iirDescription(iirDescription){};

int FilterDescriptionWrapper::getFilterTypeValue() const
{
    return filterType;
};

LinearIIRFilterDescription *FilterDescriptionWrapper::getIIRDescription()
{
    return &iirDescription.value();
};
LinearFIRFilterDescription *FilterDescriptionWrapper::getFIRDescription()
{
    return &firDescription.value();
};

#if (__EMSCRIPTEN__)
LinearIIRFilterDescription FilterDescriptionWrapper::getWasmIIRDescription()
{
    return iirDescription.value();
};
LinearFIRFilterDescription FilterDescriptionWrapper::getWasmFIRDescription()
{
    return firDescription.value();
};
#endif

FilterDescriptionWrapper FilterDescriptionWrapper::buildIIR(LinearIIRFilterDescription description)
{
    return FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE::IIR_FILTER_DESCRIPTION, description);
};
FilterDescriptionWrapper FilterDescriptionWrapper::buildFIR(LinearFIRFilterDescription description)
{
    return FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE::FIR_FILTER_DESCRIPTION, description);
};
