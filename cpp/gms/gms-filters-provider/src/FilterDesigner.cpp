#include "FilterDesigner.hh"

void FilterDesigner::filterDesign(CascadedFilterDescription *filterDescription)
{
  int groupDelay{0};
  // Design each filter.
  // Don't check is_designed, just force a new design operation.
  for (int childCount{0}; childCount < filterDescription->filterDescriptions.size(); childCount++)
  {
    auto childFilter{&filterDescription->filterDescriptions.at(childCount)};
    auto childType{childFilter->getFilterTypeValue()};
    switch (childType)
    {
    case FILTER_DESCRIPTION_TYPE::IIR_FILTER_DESCRIPTION:
    {
      auto childDesc{childFilter->getIIRDescription()};
      FilterDesigner::filterDesign(childDesc);
      groupDelay += childDesc->parameters.groupDelaySec;
      break;
    }
    case FILTER_DESCRIPTION_TYPE::FIR_FILTER_DESCRIPTION:
    {
      auto childDesc{childFilter->getFIRDescription()};
      FilterDesigner::filterDesign(childDesc);
      groupDelay += childDesc->parameters.groupDelaySec;
      break;
    }
    default:
    {
      throw std::invalid_argument("Invalid FilterDescriptionType");
    }
    }
  }

  // Set composite group delay.
  filterDescription->parameters.groupDelaySec = groupDelay;
  filterDescription->parameters.isDesigned = true;
};

void FilterDesigner::filterDesign(LinearFIRFilterDescription *filterDescription)
{
  throw std::invalid_argument("Not Implemented: LinearFIRFilterDescription Design ");
};

void FilterDesigner::filterDesign(LinearIIRFilterDescription *filterDescription)
{
  if (filterDescription->parameters.numberOfSos > MAX_SOS)
  {
    throw std::overflow_error("Size of SOSs is larger than MAX_SOS");
  }
  std::array<double, MAX_SOS> sosNum;
  std::array<double, MAX_SOS> sosDenom;

  filter_design_iir(
      static_cast<FILTER_DESIGN_MODEL>(filterDescription->filterDesignModel),
      static_cast<FILTER_BAND_TYPE>(filterDescription->passBandType),
      filterDescription->lowFrequency,
      filterDescription->highFrequency,
      filterDescription->parameters.sampleRateHz,
      filterDescription->order,
      sosNum.data(), sosDenom.data(), &filterDescription->parameters.numberOfSos);

  int size{filterDescription->parameters.numberOfSos * 3};
  std::copy(&sosNum[0], &sosNum[size], std::back_inserter(filterDescription->parameters.sosNumerator));
  std::copy(&sosDenom[0], &sosDenom[size], std::back_inserter(filterDescription->parameters.sosDenominator));
  filterDescription->parameters.groupDelaySec = 0;
  filterDescription->parameters.isDesigned = true;
};
