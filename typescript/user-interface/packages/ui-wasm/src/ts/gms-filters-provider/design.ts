import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';

import { cascadedFilterDesign, iirFilterDesign } from './gms-filters/filter-design';

/**
 * Designs a Filter Definition by populating the coefficients
 *
 * @param filterDefinition the filter definition to design
 * @returns the designed filter definition
 */
export const design = async (filterDefinition: FilterDefinition): Promise<FilterDefinition> => {
  if (isLinearFilterDefinition(filterDefinition)) {
    const filterDesc = await iirFilterDesign(filterDefinition.filterDescription);
    return {
      name: filterDefinition.name,
      comments: filterDefinition.comments,
      filterDescription: filterDesc
    };
  }

  if (isCascadedFilterDefinition(filterDefinition)) {
    const filterDesc = await cascadedFilterDesign(filterDefinition.filterDescription);
    return {
      name: filterDefinition.name,
      comments: filterDefinition.comments,
      filterDescription: filterDesc
    };
  }

  throw new Error(`Invalid filter definition provided, unable to design filter definition`);
};
