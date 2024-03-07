#include "CascadedFilterDescription.hh"

CascadedFilterDescription::CascadedFilterDescription(bool causal,
                                                       std::string comments,
                                                       std::vector<FilterDescriptionWrapper> filterDescriptions,
                                                       CascadedFilterParameters parameters) : filterDescriptions(filterDescriptions),
                                                                                               parameters(parameters),
                                                                                               BaseFilterDescription(causal, comments){};