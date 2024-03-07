#include "LinearIIRFilterDescription.hh"

LinearIIRFilterDescription::LinearIIRFilterDescription(IIRFilterParameters parameters,
                                                       bool causal,
                                                       std::string comments,
                                                       double highFrequency,
                                                       double lowFrequency,
                                                       int passBandType,
                                                       int filterDesignModel,
                                                       int order,
                                                       bool zeroPhase) : parameters(parameters),
                                                                        BaseLinearFilterDescription(causal,
                                                                                                    comments,
                                                                                                    highFrequency,
                                                                                                    lowFrequency,
                                                                                                    passBandType,
                                                                                                    filterDesignModel,
                                                                                                    order,
                                                                                                    zeroPhase){};