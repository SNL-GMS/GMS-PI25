import type {
  FkConfiguration,
  FkConfigurationDefaults,
  FkParams,
  FKPowerSpectrumDefinition,
  FrequencyBand,
  LeadLagPairAndString,
  WindowParameters
} from './types';
import { LeadLagPairs } from './types';

// TODO: Review to see what might make more sense as part of configuration
// Width/height of y and x axis respectively
export const SIZE_OF_FK_RENDERING_AXIS_PX = 35;

/**
 * Hard-coded lead/lag options
 */

export const LeadLagPairsValues: WindowParameters[] = [
  {
    leadSeconds: 1,
    lengthSeconds: 4,
    stepSize: undefined
  },
  {
    leadSeconds: 1,
    lengthSeconds: 6,
    stepSize: undefined
  },
  {
    leadSeconds: 1,
    lengthSeconds: 9,
    stepSize: undefined
  },
  {
    leadSeconds: 1,
    lengthSeconds: 11,
    stepSize: undefined
  }
];

export const LeadLagValuesAndDisplayString: LeadLagPairAndString[] = [
  {
    leadLagPairs: LeadLagPairs.LEAD_1_DURATION_4,
    windowParams: LeadLagPairsValues[0]
  },
  {
    leadLagPairs: LeadLagPairs.LEAD_1_DURATION_6,
    windowParams: LeadLagPairsValues[1]
  },
  {
    leadLagPairs: LeadLagPairs.LEAD_1_DURATION_9,
    windowParams: LeadLagPairsValues[2]
  },
  {
    leadLagPairs: LeadLagPairs.LEAD_1_DURATION_11,
    windowParams: LeadLagPairsValues[3]
  }
];

/** Default Frequency Bands */
export const FrequencyBands: FrequencyBand[] = [
  {
    minFrequencyHz: 0.5,
    maxFrequencyHz: 2
  },
  {
    minFrequencyHz: 1,
    maxFrequencyHz: 2.5
  },
  {
    minFrequencyHz: 1.5,
    maxFrequencyHz: 3
  },
  {
    minFrequencyHz: 2,
    maxFrequencyHz: 4
  },
  {
    minFrequencyHz: 3,
    maxFrequencyHz: 6
  }
];

/**
 * Approximate conversion between degrees and km
 */
export function degreeToKmApproximate(degree: number): number {
  const DEGREES_IN_CIRCLE = 360;
  const RAD_EARTH = 6371;
  const TWO_PI = Math.PI * 2;
  return degree / (DEGREES_IN_CIRCLE / (RAD_EARTH * TWO_PI));
}

/**
 * Approximate conversion between km and degrees
 */
export function kmToDegreesApproximate(km: number): number {
  const DEGREES_IN_CIRCLE = 360;
  const RAD_EARTH = 6371;
  const TWO_PI = Math.PI * 2;
  return km * (DEGREES_IN_CIRCLE / (RAD_EARTH * TWO_PI));
}

export const defaultFkPowerSpectrum: FKPowerSpectrumDefinition = {
  windowLead: 5,
  windowLength: 10,
  startTimeStep: 2,
  lowFrequency: 1.25,
  highFrequency: 3.25,
  useChannelVerticalOffsets: true,
  phaseType: 'P'
};

export const fkConfigurationDefaults: FkConfigurationDefaults = {
  defaultMaximumSlowness: 40,
  defaultNumberOfPoints: 81,
  defaultLead: 1,
  defaultLength: 4,
  defaultStepSize: 5,
  fkNeedsReviewRuleSet: {
    phasesNeedingReview: ['P', 'Pg', 'Pn']
  }
};

/**
 * Returns an empty FK Spectrum configuration. The values are NOT default values,
 * but instead values that will make it obvious within the UI that a correct
 * configuration was never added to the FK
 */
export const defaultFkConfiguration: FkConfiguration = {
  contributingChannelsConfiguration: [],
  maximumSlowness: fkConfigurationDefaults.defaultMaximumSlowness,
  mediumVelocity: 1,
  normalizeWaveforms: false,
  numberOfPoints: fkConfigurationDefaults.defaultNumberOfPoints,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: fkConfigurationDefaults.defaultLead
};

/**
 * Returns default FkParams for when no Fk is available
 *
 * @returns default populated FkParams
 */
export function getDefaultFkParams(): FkParams {
  return {
    frequencyPair: {
      minFrequencyHz: defaultFkPowerSpectrum.lowFrequency,
      maxFrequencyHz: defaultFkPowerSpectrum.highFrequency
    },
    windowParams: {
      leadSeconds: fkConfigurationDefaults.defaultLead,
      lengthSeconds: fkConfigurationDefaults.defaultLength,
      stepSize: fkConfigurationDefaults.defaultStepSize
    }
  };
}
