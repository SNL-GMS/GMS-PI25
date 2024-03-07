import type {
  ChannelSegment,
  ChannelSegmentDescriptor,
  ChannelSegmentFaceted,
  TimeSeries
} from '../channel-segment/types';
import type { Units } from '../common/types';
import type { EntityReference, Faceted, VersionReference } from '../faceted';
import type { FilterDefinition, FilterDefinitionUsage } from '../filter';
import type { Channel } from '../station-definitions/channel-definitions/channel-definitions';
import type { Station } from '../station-definitions/station-definitions/station-definitions';

// ***************************************
// Model
// ***************************************
export interface WaveformAndFilterDefinition {
  readonly filterDefinitionUsage?: FilterDefinitionUsage;
  readonly filterDefinition?: FilterDefinition;
  readonly waveform: ChannelSegmentFaceted;
}

/**
 * Represents a measurement of a signal detection feature,
 * including arrival time, azimuth, slowness and phase
 */
export interface FeatureMeasurement {
  readonly channel: VersionReference<'name'> | Channel;
  readonly measuredChannelSegment?: {
    readonly id: ChannelSegmentDescriptor;
  };
  readonly measurementValue: FeatureMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType;
  /** Signal to Noise Ratio as a DoubleValue */
  readonly snr?: DoubleValue;
  /** Only defined in ArrivalTime FM when derived from filter def */
  readonly analysisWaveform?: WaveformAndFilterDefinition;
}

export interface AmplitudeFeatureMeasurement extends FeatureMeasurement {
  readonly measuredValue: AmplitudeMeasurementValue;
  readonly featureMeasurementType:
    | FeatureMeasurementType.AMPLITUDE
    | FeatureMeasurementType.AMPLITUDE_A5_OVER_2
    | FeatureMeasurementType.AMPLITUDE_A5_OVER_2_OR
    | FeatureMeasurementType.AMPLITUDE_ALR_OVER_2
    | FeatureMeasurementType.AMPLITUDEh_ALR_OVER_2
    | FeatureMeasurementType.AMPLITUDE_ANL_OVER_2
    | FeatureMeasurementType.AMPLITUDE_SBSNR
    | FeatureMeasurementType.AMPLITUDE_FKSNR;
}

export interface ArrivalTimeFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: ArrivalTimeMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.ARRIVAL_TIME;
}

export interface AzimuthFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: NumericMeasurementValue;
  readonly featureMeasurementType:
    | FeatureMeasurementType.RECEIVER_TO_SOURCE_AZIMUTH
    | FeatureMeasurementType.SOURCE_TO_RECEIVER_AZIMUTH;
}

export interface SlownessFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: NumericMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.SLOWNESS;
}

export interface PhaseTypeFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: PhaseTypeMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.PHASE;
}

export interface RectilinearityFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: RectilinearityMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.RECTILINEARITY;
}

export interface EmergenceAngleFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: EmergenceAngleMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.EMERGENCE_ANGLE;
}

export interface LongPeriodFirstMotionFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: LongPeriodFirstMotionMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.LONG_PERIOD_FIRST_MOTION;
}

export interface ShortPeriodFirstMotionFeatureMeasurement extends FeatureMeasurement {
  readonly measurementValue: ShortPeriodFirstMotionMeasurementValue;
  readonly featureMeasurementType: FeatureMeasurementType.SHORT_PERIOD_FIRST_MOTION;
}

/**
 * Represents Feature Measurement Value (fields are dependent on type of FM)
 */
export type FeatureMeasurementValue =
  | AmplitudeMeasurementValue
  | ArrivalTimeMeasurementValue
  | NumericMeasurementValue
  | PhaseTypeMeasurementValue
  | RectilinearityMeasurementValue
  | EmergenceAngleMeasurementValue
  | LongPeriodFirstMotionMeasurementValue
  | ShortPeriodFirstMotionMeasurementValue;

/**
 * Generic value object which are the foundational building blocks to
 * the FeatureMeasurementValue definition
 */
export type ValueType = DoubleValue | DurationValue | InstantValue;

/**
 * Represents Feature Measurement Value for a double type.
 */
export interface DoubleValue {
  readonly value: number;
  readonly standardDeviation?: number;
  readonly units: Units;
}

export interface DurationValue {
  readonly value: number;
  readonly standardDeviation?: number;
  readonly units: Units;
}

export interface InstantValue {
  readonly value: number;
  readonly standardDeviation?: number;
}

/**
 * Represents Feature Measurement Value for a amplitude type.
 */
export interface AmplitudeMeasurementValue {
  measurementTime: number; // from a Java Instant string
  measurementWindowDuration: number; // from a Java Duration string
  clipped: boolean;
  measurementWindowStart: number; // from a Java Instant string
  amplitude: DoubleValue;
  period: number;
}

/**
 * Represents Feature Measurement Value for Arrival Time FM Type.
 */
export interface ArrivalTimeMeasurementValue {
  readonly arrivalTime: InstantValue;
  readonly travelTime?: DurationValue;
}

/**
 * Represents Feature Measurement Value for a numeric type.
 */
export interface NumericMeasurementValue {
  readonly measuredValue: DoubleValue;
  readonly referenceTime?: number;
}

/**
 * Represents Feature Measurement Value for a phase type.
 */
export interface PhaseTypeMeasurementValue {
  readonly value: string;
  readonly confidence?: number;
  readonly referenceTime?: number;
}

/**
 * Represents Feature Measurement Value for Rectilinearity
 */
export interface RectilinearityMeasurementValue {
  readonly measuredValue: DoubleValue;
  readonly referenceTime: number;
}

/**
 * Represents Feature Measurement Value for EmergenceAngle
 */
export interface EmergenceAngleMeasurementValue {
  readonly measuredValue: DoubleValue;
  readonly referenceTime: number;
}

/**
 * Represents Feature Measurement Value for LongPeriodFirstMotion
 */
export interface LongPeriodFirstMotionMeasurementValue {
  readonly value: string;
  readonly confidence: number;
  readonly referenceTime: number;
}
/**
 * Represents Feature Measurement Value for ShortPeriodFirstMotion
 */
export interface ShortPeriodFirstMotionMeasurementValue {
  readonly value: string;
  readonly confidence: number;
  readonly referenceTime: number;
}

/**
 * Represents Feature Measurement Value for first motion.
 */
export interface FirstMotionMeasurementValue extends FeatureMeasurement {
  readonly value: string;
  readonly confidence: number;
  readonly referenceTime: number;
}

export enum AmplitudeType {
  AMPLITUDE_A5_OVER_2 = 'AMPLITUDE_A5_OVER_2',
  AMPLITUDE_A5_OVER_2_OR = 'AMPLITUDE_A5_OVER_2_OR',
  AMPLITUDE_ALR_OVER_2 = 'AMPLITUDE_ALR_OVER_2',
  AMPLITUDEh_ALR_OVER_2 = 'AMPLITUDEh_ALR_OVER_2',
  AMPLITUDE_ANL_OVER_2 = 'AMPLITUDE_ANL_OVER_2',
  AMPLITUDE_SBSNR = 'AMPLITUDE_SBSNR',
  AMPLITUDE_FKSNR = 'AMPLITUDE_FKSNR'
}

/**
 * Enumeration of feature measurement type names
 */
export enum FeatureMeasurementType {
  ARRIVAL_TIME = 'ARRIVAL_TIME',
  RECEIVER_TO_SOURCE_AZIMUTH = 'RECEIVER_TO_SOURCE_AZIMUTH',
  SOURCE_TO_RECEIVER_AZIMUTH = 'SOURCE_TO_RECEIVER_AZIMUTH',
  SLOWNESS = 'SLOWNESS',
  PHASE = 'PHASE',
  EMERGENCE_ANGLE = 'EMERGENCE_ANGLE',
  PERIOD = 'PERIOD',
  RECTILINEARITY = 'RECTILINEARITY',
  SNR = 'SNR',
  AMPLITUDE = 'AMPLITUDE',
  AMPLITUDE_A5_OVER_2 = 'AMPLITUDE_A5_OVER_2',
  AMPLITUDE_A5_OVER_2_OR = 'AMPLITUDE_A5_OVER_2_OR',
  AMPLITUDE_ALR_OVER_2 = 'AMPLITUDE_ALR_OVER_2',
  AMPLITUDEh_ALR_OVER_2 = 'AMPLITUDEh_ALR_OVER_2',
  AMPLITUDE_ANL_OVER_2 = 'AMPLITUDE_ANL_OVER_2',
  AMPLITUDE_SBSNR = 'AMPLITUDE_SBSNR',
  AMPLITUDE_FKSNR = 'AMPLITUDE_FKSNR',
  LONG_PERIOD_FIRST_MOTION = 'LONG_PERIOD_FIRST_MOTION',
  SHORT_PERIOD_FIRST_MOTION = 'SHORT_PERIOD_FIRST_MOTION',
  SOURCE_TO_RECEIVER_DISTANCE = 'SOURCE_TO_RECEIVER_DISTANCE'
}

/**
 * Signal detection hypothesis id interface
 */
export interface SignalDetectionHypothesisId {
  readonly id: string;
  readonly signalDetectionId: string;
}

/**
 * Faceted Signal Detection Hypothesis
 */
export interface SignalDetectionHypothesisFaceted {
  readonly id: SignalDetectionHypothesisId;
}

/**
 * Signal detection hypothesis interface used in Signal detection
 */
export interface SignalDetectionHypothesis extends Faceted<SignalDetectionHypothesisFaceted> {
  readonly monitoringOrganization: string;
  readonly deleted: boolean;
  readonly station: VersionReference<'name'> | Station; // Based on COI this might be a full station (but is not needed in ui)
  readonly featureMeasurements: FeatureMeasurement[];
  readonly parentSignalDetectionHypothesis?: SignalDetectionHypothesisFaceted | null;
}

/**
 * Represents a Signal detection
 */
export interface SignalDetection {
  readonly id: string;
  readonly monitoringOrganization: string;
  readonly station: EntityReference<'name', Station>;
  readonly signalDetectionHypotheses: SignalDetectionHypothesis[];
  /** indicates if an signal detection has unsaved changes: the number represents the last time it was changed (epoch seconds) */
  readonly _uiHasUnsavedChanges?: number;
  /** indicates if an signal detection has unsaved association changes: the number represents the last time it was changed (epoch seconds) */
  readonly _uiHasUnsavedEventSdhAssociation?: number;
}

export interface SignalDetectionsWithChannelSegments {
  readonly signalDetections: SignalDetection[];
  readonly channelSegments: ChannelSegment<TimeSeries>[];
}

/**
 * Basic info for a hypothesis
 */
export interface ConflictingSdHypData {
  readonly eventId: string;
  readonly phase: string;
  readonly arrivalTime: number;
  readonly stationName?: string;
  readonly eventTime?: number;
}

/**
 * Signal Detection Status either deleted or
 * association status to event
 */
export enum SignalDetectionStatus {
  OPEN_ASSOCIATED = 'Open',
  COMPLETE_ASSOCIATED = 'Completed',
  OTHER_ASSOCIATED = 'Other',
  UNASSOCIATED = 'Unassociated',
  DELETED = 'Deleted'
}
