#ifndef FILTER_DESCRIPTION_WRAPPER_H
#define FILTER_DESCRIPTION_WRAPPER_H
#include <optional>
#include <string>       // std::string
#include "../descriptions/LinearIIRFilterDescription.hh"
#include "../descriptions/LinearFIRFilterDescription.hh"

class FilterDescriptionWrapper
{
private:
    FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE filterType,
                             LinearFIRFilterDescription firDescription);

    FilterDescriptionWrapper(FILTER_DESCRIPTION_TYPE filterType,
                             LinearIIRFilterDescription iirDescription);

    std::optional<LinearIIRFilterDescription> iirDescription;
    std::optional<LinearFIRFilterDescription> firDescription;
    FILTER_DESCRIPTION_TYPE filterType;

public:
    int getFilterTypeValue() const;
    LinearIIRFilterDescription *getIIRDescription();
    LinearFIRFilterDescription *getFIRDescription();
#if (__EMSCRIPTEN__)
    LinearIIRFilterDescription getWasmIIRDescription();
    LinearFIRFilterDescription getWasmFIRDescription();
#endif

    static FilterDescriptionWrapper buildIIR(LinearIIRFilterDescription description);
    static FilterDescriptionWrapper buildFIR(LinearFIRFilterDescription description);
};
#endif // FILTER_DESCRIPTION_WRAPPER_H