import type { CommonTypes, EventTypes, SignalDetectionTypes } from '../common-model';
import type { VersionReference } from '../faceted';
import type { FilterDefinition } from '../filter';
import type {
  Channel,
  Orientation
} from '../station-definitions/channel-definitions/channel-definitions';
import type { Station } from '../station-definitions/station-definitions/station-definitions';

export enum SamplingType {
  SNAPPED = 'SNAPPED',
  INTERPOLATED = 'INTERPOLATED'
}

export enum BeamSummation {
  COHERENT = 'COHERENT',
  INCOHERENT = 'INCOHERENT',
  RMS = 'RMS'
}

export enum BeamType {
  CONTINUOUS_LOCATION = 'CONTINUOUS_LOCATION',
  DETECTION = 'DETECTION',
  EVENT = 'EVENT',
  FK = 'FK'
}

export enum InterpolationMethod {
  NEAREST_SAMPLE = 'Nearest Sample',
  INTERPOLATED = 'Interpolated'
}

export interface BeamDescription {
  readonly beamSummation: BeamSummation;
  readonly beamType: BeamType;
  readonly phase: string;
  readonly samplingType: SamplingType;
  readonly twoDimensional: boolean;
  readonly prefilterDefinition?: FilterDefinition;
}

export interface BeamformingTemplate {
  readonly beamDescription: BeamDescription;
  readonly inputChannels: VersionReference<'name'>[] | Channel[];
  readonly minWaveformsToBeam: number;
  readonly orientationAngleToleranceDeg: number;
  readonly sampleRateToleranceHz: number;
  readonly station: VersionReference<'name'> | Station;
  readonly beamDuration?: number;
  readonly leadDuration?: number;
}

export interface BeamParameters {
  eventHypothesis: EventTypes.EventHypothesis;
  location: CommonTypes.Location;
  minWaveformsToBeam: number;
  orientationAngles: Orientation;
  orientationAngleToleranceDeg: number;
  receiverToSourceAzimuthDeg: number;
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  signalDetectionHypothesis: SignalDetectionTypes.SignalDetectionHypothesis;
  slownessSecPerDeg: number;
}

export interface BeamDefinition {
  beamDescription: BeamDescription;
  beamParameters: BeamParameters;
}

export type BeamformingTemplatesByPhase = Record<string, BeamformingTemplate>;

export type BeamformingTemplatesByStationByPhase = Record<string, BeamformingTemplatesByPhase>;

export type BeamformingTemplatesByBeamTypeByStationByPhase = Record<
  string,
  BeamformingTemplatesByStationByPhase
>;
