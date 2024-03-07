import type {
  CascadedFilterDescription,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import { FilterType } from '@gms/common-model/lib/filter/types';

import { areCoefficientsPopulated } from './util';
/**
 * Validates cascaded description before use
 *
 * @param filterDescription CascadedFilterDescription
 */
export function validateCascadedFilterDescription(filterDescription: CascadedFilterDescription) {
  if (filterDescription.filterType !== FilterType.CASCADE) {
    throw new Error(`FilterType must be of type ${FilterType.CASCADE}`);
  }

  if (
    filterDescription.parameters === undefined ||
    filterDescription.filterDescriptions.length === 0
  ) {
    throw new Error(`Filter Descriptions should be defined for Cascade Filter Definition`);
  }

  filterDescription.filterDescriptions.forEach(desc => {
    if (desc.filterType === FilterType.IIR_BUTTERWORTH) {
      areCoefficientsPopulated(desc.parameters.aCoefficients, desc.parameters.bCoefficients);
    } else {
      throw new Error(`FilterType ${FilterType.IIR_BUTTERWORTH} is only supported`);
    }
  });
}

/**
 * Validates linear description before use
 *
 * @param filterDescription LinearFilterDescription
 */

export function validateLinearFilterDescription(filterDescription: LinearFilterDescription) {
  const { aCoefficients, bCoefficients } = filterDescription.parameters;

  if (filterDescription.filterType !== FilterType.IIR_BUTTERWORTH) {
    throw new Error(`FilterType of ${FilterType.IIR_BUTTERWORTH} is only supported`);
  }

  if (
    ((filterDescription as unknown) as CascadedFilterDescription).filterDescriptions !== undefined
  ) {
    throw new Error(
      `Filter Descriptions should be undefined, not expecting Cascade Filter Definition`
    );
  }

  if (aCoefficients && bCoefficients && aCoefficients.length !== bCoefficients.length) {
    throw new Error('Invalid aCoefficients or bCoefficients');
  }
}
