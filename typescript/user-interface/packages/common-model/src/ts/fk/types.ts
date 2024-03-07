import type { TimeSeries } from '../channel-segment/types';
import type { EntityReference } from '../faceted';
import type { Filter } from '../filter';
import type { Channel } from '../station-definitions/channel-definitions/channel-definitions';
import type { Waveform } from '../waveform/types';

/**
 * Input type for creating new Beam
 */
export interface BeamInput {
  readonly signalDetectionId: string;
  readonly windowParams: WindowParameters;
}

export enum LeadLagPairs {
  LEAD_1_DURATION_4 = 'Lead: 1, Dur: 4',
  LEAD_1_DURATION_6 = 'Lead: 1, Dur: 6',
  LEAD_1_DURATION_9 = 'Lead: 1, Dur: 9',
  LEAD_1_DURATION_11 = 'Lead: 1, Dur: 11'
}

export enum LeadLagPairsAndCustom {
  LEAD_1_DURATION_4 = 'Lead: 1, Dur: 4',
  LEAD_1_DURATION_6 = 'Lead: 1, Dur: 6',
  LEAD_1_DURATION_9 = 'Lead: 1, Dur: 9',
  LEAD_1_DURATION_11 = 'Lead: 1, Dur: 11',
  CUSTOM = 'Custom'
}
export interface LeadLagPairAndString {
  leadLagPairs: LeadLagPairs;
  windowParams: WindowParameters;
}

export enum FkUnits {
  FSTAT = 'FSTAT',
  POWER = 'POWER'
}

// ***************************************
// Model
// ***************************************
/**
 * Fk meta data from the COI
 */
export interface FkMetadata {
  readonly phaseType: string;
  readonly slowDeltaX: number;
  readonly slowDeltaY: number;
  readonly slowStartX: number;
  readonly slowStartY: number;
}

export interface FrequencyBand {
  readonly minFrequencyHz: number;
  readonly maxFrequencyHz: number;
}

export interface WindowParameters {
  readonly leadSeconds: number;
  readonly lengthSeconds: number;
  readonly stepSize: number;
}
export interface FkParams {
  windowParams: WindowParameters;
  frequencyPair: FrequencyBand;
}

export interface FstatData {
  readonly azimuthWf: Waveform;
  readonly slownessWf: Waveform;
  readonly fstatWf: Waveform;
}

/**
 * Fk power spectra COI representation
 */
export interface FkPowerSpectraCOI extends TimeSeries {
  readonly metadata: FkMetadata;
  readonly values: FkPowerSpectrum[];
  readonly stepSize: number;
  readonly windowLead: number;
  readonly windowLength: number;
  readonly lowFrequency: number;
  readonly highFrequency: number;
}

/**
 * Fk power spectra UI representation
 */
export interface FkPowerSpectra extends FkPowerSpectraCOI {
  // Needed for UI processing added when query returns FkPowerSpectraCOI
  readonly fstatData: FstatData;
  readonly configuration: FkConfiguration;
  readonly reviewed: boolean;
}
export interface FkPowerSpectrum {
  readonly power: number[][];
  readonly fstat: number[][];
  readonly quality: number;
  readonly attributes: FkAttributes[];
}

export interface AzimuthSlowness {
  readonly azimuth: number;
  readonly slowness: number;
  readonly azimuthUncertainty: number;
  readonly slownessUncertainty: number;
}
export interface FkAttributes extends AzimuthSlowness {
  readonly peakFStat: number;
  readonly xSlow: number;
  readonly ySlow: number;
}

/**
 * FkFrequencyThumbnail preview Fk at a preset FrequencyBand
 */
export interface FkFrequencyThumbnail {
  readonly frequencyBand: FrequencyBand;
  readonly fkSpectra: FkPowerSpectra;
}

/**
 * Collection of thumbnails by signal detection id
 */
export interface FkFrequencyThumbnailBySDId {
  readonly signalDetectionId: string;
  readonly fkFrequencyThumbnails: FkFrequencyThumbnail[];
}

/**
 * Tracks whether a channel is used to calculate fk
 */

export interface ContributingChannelsConfiguration {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
}

/**
 * Holds the configuration used to calculate an Fk
 */
export interface FkConfiguration {
  readonly maximumSlowness: number;
  readonly mediumVelocity: number;
  readonly numberOfPoints: number;
  readonly normalizeWaveforms: boolean;
  readonly useChannelVerticalOffset: boolean;
  readonly leadFkSpectrumSeconds: number;
  readonly contributingChannelsConfiguration: ContributingChannelsConfiguration[];
}

export interface FkDialogConfiguration {
  readonly frequencyBand: FrequencyBand;
  readonly window: {
    leadSecs: number;
    durationSecs: number;
  };
  readonly maximumSlowness: number;
  readonly mediumVelocity: number;
  readonly numberOfPoints: number;
  readonly normalizeWaveforms: boolean;
  readonly useChannelVerticalOffset: boolean;
  readonly leadFkSpectrumSeconds: number;
  readonly prefilter: Filter;
  readonly selectedChannels: Channel[];
  readonly fkSpectrumDurationSeconds: number;
  readonly stepSizeSeconds: number;
}

export interface FkConfigurationDefaults {
  defaultMaximumSlowness: number;
  defaultNumberOfPoints: number;
  defaultLead: number;
  defaultLength: number;
  defaultStepSize: number;
  fkNeedsReviewRuleSet: {
    phasesNeedingReview: string[];
  };
}

export interface FKPowerSpectrumDefinition {
  windowLead: number;
  windowLength: number;
  startTimeStep: number;
  lowFrequency: number;
  highFrequency: number;
  useChannelVerticalOffsets: boolean;
  phaseType: string;
}

export interface ComputeFkInput {
  readonly startTime: number;
  readonly sampleRate: number;
  readonly sampleCount: number;
  readonly channels: EntityReference<'name'>[];
  readonly windowLead: string;
  readonly windowLength: string;
  readonly lowFrequency: number;
  readonly highFrequency: number;
  readonly useChannelVerticalOffset: boolean;
  readonly phaseType: string;
  readonly normalizeWaveforms: boolean;
  // Optional fields
  readonly slowStartX?: number;
  readonly slowStartY?: number;
  readonly slowDeltaX?: number;
  readonly slowDeltaY?: number;
  readonly slowCountX?: number;
  readonly slowCountY?: number;
}

/**
 * Build FkInput for backend with configuration values to restore
 * with FkSpectra returned in fk configuration
 */

export interface FkInputWithConfiguration {
  readonly fkComputeInput: ComputeFkInput;
  readonly configuration: FkConfiguration;
  readonly signalDetectionId: string;
  readonly windowParams: WindowParameters;
  readonly isThumbnailRequest: boolean;
}
