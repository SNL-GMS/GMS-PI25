/* eslint-disable @typescript-eslint/no-magic-numbers */
import type {
  CascadedFilterDefinition,
  CascadedFilterDescription,
  CascadedFilterParameters,
  FilterDefinition,
  LinearFilterDefinition,
  LinearFilterDescription,
  LinearFilterParameters
} from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';

export const DEFAULT_PRECISION = 11; // number of decimal places

export function numberPrecisionCompare(
  a: number,
  b: number,
  precision: number = DEFAULT_PRECISION
): void {
  const actual = parseFloat((Math.abs(b - a) * 1e-8).toFixed(precision));
  const expected = parseFloat((Math.abs(b) * 1e-8).toFixed(precision));
  expect(actual).toBeLessThanOrEqual(expected);
}

export function precisionCompare(
  a: number[] | Float64Array,
  b: number[] | Float64Array,
  precision: number = DEFAULT_PRECISION
): void {
  expect((a === undefined && b !== undefined) || (a !== undefined && b === undefined)).toBeFalsy();
  expect(a.length === b.length).toBeTruthy();
  a.every((val, i) => numberPrecisionCompare(val, b[i], precision));
}

export function areLinearFilterParamsEquivalent(
  expected: LinearFilterParameters,
  actual: LinearFilterParameters
) {
  expect(actual.groupDelaySec).toEqual(expected.groupDelaySec);
  expect(actual.sampleRateHz).toEqual(expected.sampleRateHz);
  expect(actual.sampleRateToleranceHz).toEqual(expected.sampleRateToleranceHz);
  precisionCompare(actual.aCoefficients, expected.aCoefficients);
  precisionCompare(actual.bCoefficients, expected.bCoefficients);
}

export function areLinearFilterDescEquivalent(
  expected: LinearFilterDescription,
  actual: LinearFilterDescription
) {
  expect(actual.causal).toEqual(expected.causal);
  expect(actual.comments).toEqual(expected.comments);
  expect(actual.filterType).toEqual(expected.filterType);
  expect(actual.highFrequency).toEqual(expected.highFrequency);
  expect(actual.lowFrequency).toEqual(expected.lowFrequency);
  expect(actual.order).toEqual(expected.order);
  expect(actual.passBandType).toEqual(expected.passBandType);
  expect(actual.zeroPhase).toEqual(expected.zeroPhase);
  areLinearFilterParamsEquivalent(expected.parameters, actual.parameters);
}
export function areCascadedFilterParametersEquivalent(
  actual: CascadedFilterParameters,
  expected: CascadedFilterParameters
) {
  expect(actual.groupDelaySec).toEqual(expected.groupDelaySec);
  expect(actual.sampleRateHz).toEqual(expected.sampleRateHz);
  expect(actual.sampleRateToleranceHz).toEqual(expected.sampleRateToleranceHz);
}

export function areCascadedFilterEquivalent(
  expected: CascadedFilterDescription,
  actual: CascadedFilterDescription
) {
  expect(actual.causal).toEqual(expected.causal);
  expect(actual.comments).toEqual(expected.comments);
  expect(actual.filterType).toEqual(expected.filterType);
  areCascadedFilterParametersEquivalent(actual.parameters, expected.parameters);
  for (let count = 0; count < actual.filterDescriptions.length; count += 1) {
    areLinearFilterDescEquivalent(
      actual.filterDescriptions[count],
      expected.filterDescriptions[count]
    );
  }
}

function areLinearFilterDefinitionsEquivalent(
  expected: LinearFilterDefinition,
  actual: LinearFilterDefinition
) {
  expect(actual.name).toEqual(expected.name);
  expect(actual.comments).toEqual(expected.comments);
  areLinearFilterDescEquivalent(expected.filterDescription, actual.filterDescription);
}

function areCascadedFilterDefinitionsEquivalent(
  expected: CascadedFilterDefinition,
  actual: CascadedFilterDefinition
) {
  expect(actual.name).toEqual(expected.name);
  expect(actual.comments).toEqual(expected.comments);
  areCascadedFilterEquivalent(expected.filterDescription, actual.filterDescription);
}

export function areFilterDefinitionsEquivalent(
  expected: FilterDefinition,
  actual: FilterDefinition
) {
  if (isLinearFilterDefinition(actual) && isLinearFilterDefinition(expected)) {
    areLinearFilterDefinitionsEquivalent(expected, actual);
  } else if (isCascadedFilterDefinition(actual) && isCascadedFilterDefinition(expected)) {
    areCascadedFilterDefinitionsEquivalent(expected, actual);
  } else {
    throw new Error('Filter Definitions are mismatched');
  }
}
