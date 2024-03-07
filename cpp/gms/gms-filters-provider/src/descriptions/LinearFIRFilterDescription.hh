#ifndef LINEAR_FIR_FILTER_DESCRIPTION_H
#define LINEAR_FIR_FILTER_DESCRIPTION_H
#include "../descriptions/BaseLinearFilterDescription.hh"
#include "../parameters/FIRFilterParameters.hh"
#include "../enums.hh"

class LinearFIRFilterDescription : public BaseLinearFilterDescription
{
public:
  LinearFIRFilterDescription(FIRFilterParameters parameters,
                             bool causal,
                             std::string comments,
                             double cutoffHigh,
                             double cutoffLow,
                             int filterBandType,
                             int filterDesignModel,
                             int filterOrder,
                             bool zeroPhase);

  FIRFilterParameters parameters;
  FILTER_DESCRIPTION_TYPE getFilterDescriptionType() const override
  {
    return FILTER_DESCRIPTION_TYPE::FIR_FILTER_DESCRIPTION;
  };
};

#endif // LINEAR_FIR_FILTER_DESCRIPTION
