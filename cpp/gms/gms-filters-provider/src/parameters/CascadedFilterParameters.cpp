#include "CascadedFilterParameters.hh"

CascadedFilterParameters::CascadedFilterParameters(int groupDelaySec,
                                                   bool isDesigned,
                                                   double sampleRateHz,
                                                   double sampleRateToleranceHz) : BaseFilterParameters(groupDelaySec,
                                                                                                        isDesigned,
                                                                                                        sampleRateHz,
                                                                                                        sampleRateToleranceHz){};