
#ifndef CASCADED_FILTER_DESCRIPTION_H
#define CASCADED_FILTER_DESCRIPTION_H

#include <stdexcept>
#include "../parameters/CascadedFilterParameters.hh"

class CascadedFilterDescription : public BaseFilterDescription
{
public:
  CascadedFilterDescription(bool causal,
                            std::string comments,
                            std::vector<FilterDescriptionWrapper> filterDescriptions,
                            CascadedFilterParameters parameters);
  std::vector<FilterDescriptionWrapper> filterDescriptions;
  CascadedFilterParameters parameters;
};

#endif // CASCADED_FILTER_DESCRIPTION_H
