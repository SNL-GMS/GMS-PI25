import type {
  CascadedFilterDefinition,
  CascadedFilterDescription,
  LinearFilterDefinition,
  LinearFilterDescription,
  LinearFilterParameters
} from '@gms/common-model/lib/filter/types';

/**
 * Returns true if the coefficients are populated; false otherwise.
 *
 * @param aCoefficients the `a` coefficients
 * @param bCoefficients the `b` coefficients
 * @returns true if the coefficients are populated; false otherwise
 */
export const areCoefficientsPopulated = (
  aCoefficients: number[],
  bCoefficients: number[]
): boolean =>
  aCoefficients != null &&
  bCoefficients != null &&
  aCoefficients.length > 0 &&
  bCoefficients.length > 0;

/**
 * Returns true if the linear filter description is designed; false otherwise.
 *
 * @param parameters the filter definition parameters
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isLinearFilterParametersDesigned = (
  parameters: LinearFilterParameters,
  sampleRateHz?: number
): boolean => {
  const { aCoefficients, bCoefficients } = parameters || {
    aCoefficients: null,
    bCoefficients: null
  };
  return (
    parameters.sampleRateHz != null &&
    (sampleRateHz == null || sampleRateHz === parameters.sampleRateHz) &&
    areCoefficientsPopulated(aCoefficients, bCoefficients)
  );
};

/**
 * Returns true if the linear filter description is designed; false otherwise.
 *
 * @param filterDefinition the filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
const isLinearFilterDescriptionDesigned = (
  filterDescription: LinearFilterDescription,
  sampleRateHz?: number
): boolean => {
  return isLinearFilterParametersDesigned(filterDescription.parameters, sampleRateHz);
};

/**
 * Returns true if the linear filter definition is designed; false otherwise.
 *
 * @param filterDefinition the linear filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isLinearFilterDefinitionDesigned = (
  filterDefinition: LinearFilterDefinition,
  sampleRateHz?: number
): boolean => isLinearFilterDescriptionDesigned(filterDefinition.filterDescription, sampleRateHz);

/**
 * Returns true if the cascaded filter definition is designed; false otherwise.
 *
 * @param filterDefinition the cascaded filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isCascadedFilterDefinitionDesigned = (
  filterDefinition: CascadedFilterDefinition,
  sampleRateHz?: number
): boolean =>
  filterDefinition.filterDescription.filterDescriptions.every(desc =>
    isLinearFilterDescriptionDesigned(desc, sampleRateHz)
  );

/**
 * Returns true if the cascaded filter description is designed; false otherwise.
 *
 * @param filterDescription the cascaded filter description
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isCascadedFilterDescriptionDesigned = (
  filterDescription: CascadedFilterDescription,
  sampleRateHz?: number
): boolean =>
  filterDescription.filterDescriptions.every(desc =>
    isLinearFilterDescriptionDesigned(desc, sampleRateHz)
  );
