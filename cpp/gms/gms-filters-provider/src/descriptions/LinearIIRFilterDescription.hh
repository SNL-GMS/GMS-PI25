#ifndef LINEAR_IIR_FILTER_DESCRIPTION_H
#define LINEAR_IIR_FILTER_DESCRIPTION_H
#include "BaseLinearFilterDescription.hh"
#include "../parameters/IIRFilterParameters.hh"
#include "../enums.hh"

class LinearIIRFilterDescription : public BaseLinearFilterDescription
{
public:
  LinearIIRFilterDescription(IIRFilterParameters parameters,
                             bool causal,
                             std::string comments,
                             double highFrequency,
                             double lowFrequency,
                             int passBandType,
                             int filterDesignModel,
                             int order,
                             bool zeroPhase);

  IIRFilterParameters parameters;
  
  virtual FILTER_DESCRIPTION_TYPE getFilterDescriptionType() const
  {
    return FILTER_DESCRIPTION_TYPE::IIR_FILTER_DESCRIPTION;
  };
};

#endif // LINEAR_IIR_FILTER_DESCRIPTION
