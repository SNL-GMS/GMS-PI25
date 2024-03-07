import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';

import {
  isCascadedFilterDefinitionDesigned,
  isLinearFilterDefinitionDesigned
} from './gms-filters/util';

/**
 * Returns true if the filter definition is already designed, false otherwise
 *
 * @param filterDefinition the filter definition to check if it is designed
 * @param sampleRateHz the sample rate to use if provided for checking if the
 * filter definition is designed for that sample rate
 */
export const isDesigned = (filterDefinition: FilterDefinition, sampleRateHz?: number): boolean => {
  if (isLinearFilterDefinition(filterDefinition)) {
    return isLinearFilterDefinitionDesigned(filterDefinition, sampleRateHz);
  }

  if (isCascadedFilterDefinition(filterDefinition)) {
    return isCascadedFilterDefinitionDesigned(filterDefinition, sampleRateHz);
  }
  return false;
};
