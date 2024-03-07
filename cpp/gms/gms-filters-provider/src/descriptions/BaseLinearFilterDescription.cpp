#include "BaseLinearFilterDescription.hh"

BaseLinearFilterDescription::BaseLinearFilterDescription(bool causal,
                                                         std::string comments,
                                                         double highFrequency,
                                                         double lowFrequency,
                                                         int passBandType,
                                                         int filterDesignModel,
                                                         int order,
                                                         bool zeroPhase) : BaseFilterDescription(causal, comments),
                                                                           highFrequency(highFrequency),
                                                                           lowFrequency(lowFrequency),
                                                                           passBandType(passBandType),
                                                                           filterDesignModel(filterDesignModel),
                                                                           order(order),
                                                                           zeroPhase(zeroPhase){};
