import type {
  CascadedFilterDefinition,
  CascadedFilterDescription,
  LinearFilterDefinition,
  LinearFilterDescription
} from '../../src/ts/filter/types';
import {
  BandType,
  FilterType,
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '../../src/ts/filter/types';

const linearFilterDescription: LinearFilterDescription = Object.freeze({
  filterType: FilterType.IIR_BUTTERWORTH,
  causal: true,
  comments: 'Test description comments',
  highFrequency: 0.8,
  lowFrequency: 0.3,
  order: 2,
  passBandType: BandType.BAND_PASS,
  zeroPhase: true,
  parameters: null
});

const sampleFilterDefinition: LinearFilterDefinition = Object.freeze({
  id: 'Sample Filter Definition Name',
  name: 'Sample Filter Definition Name',
  comments: 'Sample Filter Definition Comments',
  filterDescription: linearFilterDescription
});

const cascadedFilterDescription: CascadedFilterDescription = Object.freeze({
  comments: 'description comments',
  causal: true,
  filterType: FilterType.CASCADE,
  filterDescriptions: [
    {
      causal: true,
      comments: 'Test description 1 comments',
      filterType: FilterType.IIR_BUTTERWORTH,
      highFrequency: 0.8,
      lowFrequency: 0.3,
      order: 1,
      passBandType: BandType.BAND_PASS,
      zeroPhase: false,
      parameters: null
    } as LinearFilterDescription,
    {
      causal: false,
      comments: 'Test description 2 comments',
      filterType: FilterType.IIR_BUTTERWORTH,
      highFrequency: 0.9,
      lowFrequency: 0.4,
      order: 2,
      passBandType: BandType.BAND_PASS,
      zeroPhase: true,
      parameters: null
    } as LinearFilterDescription
  ],
  parameters: {
    groupDelaySec: 1,
    sampleRateHz: 40,
    sampleRateToleranceHz: 20
  }
});

const sampleCascadedFilterDefinition: CascadedFilterDefinition = Object.freeze({
  id: 'Sample Cascaded Filter Definition Name',
  name: 'Sample Cascaded Filter Definition Name',
  comments: 'Sample Cascaded Filter Definition Comments',
  filterDescription: cascadedFilterDescription
});

describe('Common Model Filter List Types Test', () => {
  it('is defined is defined', () => {
    expect(isLinearFilterDefinition).toBeDefined();
    expect(isCascadedFilterDefinition).toBeDefined();
  });

  it('can check if linear filter definition', () => {
    expect(isLinearFilterDefinition(undefined)).toBeFalsy();
    expect(isLinearFilterDefinition(sampleFilterDefinition)).toBeTruthy();
    expect(isLinearFilterDefinition(sampleCascadedFilterDefinition)).toBeFalsy();
  });

  it('can check if cascaded filter definition', () => {
    expect(isCascadedFilterDefinition(undefined)).toBeFalsy();
    expect(isCascadedFilterDefinition(sampleCascadedFilterDefinition)).toBeTruthy();
    expect(isCascadedFilterDefinition(sampleFilterDefinition)).toBeFalsy();
  });
});
