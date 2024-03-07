import { BeamformingTemplateTypes } from '../../../src/ts/common-model';
import type { VersionReference } from '../../../src/ts/faceted';
import { convertToVersionReference } from '../../../src/ts/faceted';
import { eventHypothesis } from '../event';
import { signalDetectionsData } from '../signal-detections';
import { PD01Channel, PD02Channel, PD03Channel } from '../station-definitions';

const channelVersionReferences: VersionReference<'name'>[] = [
  PD01Channel,
  PD02Channel,
  PD03Channel
].map(channel => convertToVersionReference(channel, 'name'));

export const beamDescription: BeamformingTemplateTypes.BeamDescription = {
  beamSummation: BeamformingTemplateTypes.BeamSummation.COHERENT,
  beamType: BeamformingTemplateTypes.BeamType.EVENT,
  phase: 'P',
  samplingType: BeamformingTemplateTypes.SamplingType.SNAPPED,
  twoDimensional: true
};

export const beamformingTemplate: BeamformingTemplateTypes.BeamformingTemplate = {
  beamDescription,
  beamDuration: 300,
  inputChannels: channelVersionReferences,
  leadDuration: 5,
  minWaveformsToBeam: 2,
  orientationAngleToleranceDeg: 5,
  sampleRateToleranceHz: 0.5,
  station: { effectiveAt: 1689026400, name: 'PDAR' }
};

export const beamformingTemplatesByPhase: BeamformingTemplateTypes.BeamformingTemplatesByPhase = {
  P: beamformingTemplate
};

export const beamformingTemplatesByStationByPhase: BeamformingTemplateTypes.BeamformingTemplatesByStationByPhase = {
  PDAR: beamformingTemplatesByPhase
};

export const beamformingTemplatesByBeamTypeByStationByPhase: BeamformingTemplateTypes.BeamformingTemplatesByBeamTypeByStationByPhase = {
  EVENT: beamformingTemplatesByStationByPhase,
  FK: beamformingTemplatesByStationByPhase
};

export const beamParameters: BeamformingTemplateTypes.BeamParameters = {
  eventHypothesis,
  location: {
    latitudeDegrees: 42.76738,
    longitudeDegrees: -109.5579,
    depthKm: 0,
    elevationKm: 2.215
  },
  minWaveformsToBeam: 0,
  orientationAngles: { horizontalAngleDeg: 90 },
  orientationAngleToleranceDeg: 5,
  receiverToSourceAzimuthDeg: 10,
  sampleRateHz: 25,
  sampleRateToleranceHz: 1,
  signalDetectionHypothesis: signalDetectionsData[0].signalDetectionHypotheses[0],
  slownessSecPerDeg: 0
};
export const beamDefinition: BeamformingTemplateTypes.BeamDefinition = {
  beamDescription,
  beamParameters
};
