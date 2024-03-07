#ifndef BASE_LINEAR_FILTER_DESCRIPTION_H
#define BASE_LINEAR_FILTER_DESCRIPTION_H

#include "../enums.hh"
#include "BaseFilterDescription.hh"
class BaseLinearFilterDescription : public BaseFilterDescription
{
public:
    BaseLinearFilterDescription(bool causal,
                                std::string comments,
                                double highFrequency,
                                double lowFrequency,
                                int passBandType,
                                int filterDesignModel,
                                int order,
                                bool zeroPhase);

    ~BaseLinearFilterDescription() override = default;

    double lowFrequency;
    double highFrequency;
    int passBandType;
    int filterDesignModel;
    int order;
    bool zeroPhase;

    FILTER_DESCRIPTION_TYPE getFilterDescriptionType() const override
    {
        return FILTER_DESCRIPTION_TYPE::BASE_LINEAR_FILTER_DESCRIPTION;
    };
};

#endif // BASE_LINEAR_FILTER_DESCRIPTION_H