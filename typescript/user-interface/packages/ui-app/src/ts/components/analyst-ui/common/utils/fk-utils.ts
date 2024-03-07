import type { ChannelSegmentTypes, EventTypes, StationTypes } from '@gms/common-model';
import { FkTypes, SignalDetectionTypes } from '@gms/common-model';
import { UNFILTERED_FILTER } from '@gms/common-model/lib/filter';
import { convertSecondsToDuration } from '@gms/common-util';
import type { AppDispatch, FkChannelSegmentRecord } from '@gms/ui-state';
import { computeFkSpectra } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import type Immutable from 'immutable';

import { getAssociatedDetections } from './event-util';
import { createChannelSegmentString } from './signal-detection-util';

const logger = UILogger.create('GMS_FK_UTILS', process.env.GMS_FK_UTILS);

/**
 * Utility functions for the Azimuth Slowness Display
 */

/**
 * Finds the Fk Channel Segment using the Azimuth Feature Measurement
 *
 * @param sd Signal Detection
 * @param fkChannelSegments ui-state FkChannelSegmentRecord
 *
 * @returns FkChannelSegment or undefined if not found
 */
export function getFkChannelSegment(
  sd: SignalDetectionTypes.SignalDetection,
  fkChannelSegments: FkChannelSegmentRecord
): ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> | undefined {
  if (!sd) {
    return undefined;
  }
  const { featureMeasurements } = SignalDetectionTypes.Util.getCurrentHypothesis(
    sd.signalDetectionHypotheses
  );
  const azimuthTimeFm = SignalDetectionTypes.Util.findAzimuthFeatureMeasurement(
    featureMeasurements
  );

  // Find the corresponding ChannelSegment using ChannelSegmentDescriptor
  if (azimuthTimeFm?.analysisWaveform?.waveform?.id) {
    const csDescriptorString = createChannelSegmentString(
      azimuthTimeFm.analysisWaveform.waveform.id
    );
    return fkChannelSegments[csDescriptorString];
  }
  return undefined;
}

/**
 * Finds Fk Spectra timeseries
 *
 * @param sd Signal Detection
 * @param fkChannelSegments ui-state FkChannelSegmentRecord
 *
 * @returns FkData or undefined if not found
 */
export function getFkData(
  sd: SignalDetectionTypes.SignalDetection,
  fkChannelSegments: FkChannelSegmentRecord
): FkTypes.FkPowerSpectra | undefined {
  return getFkChannelSegment(sd, fkChannelSegments)?.timeseries[0];
}

/**
 * Dummy query that updates SD Azimuth FM timeseries (FkPowerSpectra) future work
 * The updated SD FM then trickles back down to the Fk Display
 *
 * @param fkInput array
 * @returns void promise
 */
export const computeFk = (
  fkInput: FkTypes.FkInputWithConfiguration,
  dispatch: AppDispatch
): void => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  dispatch(computeFkSpectra(fkInput));
};

/**
 * Find all signal detections associated to the event that have FKs
 *
 * @param event openEvent
 * @param signalDetections all signal detections
 * @returns associated signal detections
 */
export const getAssociatedDetectionsWithFks = (
  event: EventTypes.Event,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  fkChannelSegments: FkChannelSegmentRecord,
  openIntervalName: string
): SignalDetectionTypes.SignalDetection[] => {
  if (event && signalDetections && signalDetections.length > 0) {
    const associatedSds = getAssociatedDetections(event, signalDetections, openIntervalName);
    return associatedSds.filter(sd => sd && getFkData(sd, fkChannelSegments) !== undefined);
  }
  return [];
};

/**
 * TODO: This is a stopgap for getting the updated UI to work with the legacy code. Update the model to reflect the intended configuration.
 *
 * @param legacyConfig the legacy configuration for a single FK
 * @returns the format consumed by the UI
 */
export function convertLegacyFkConfiguration(
  legacyConfig: FkTypes.FkConfiguration,
  station: StationTypes.Station,
  selectedFk: FkTypes.FkPowerSpectra // TODO: handle defaults if this is undefined
): FkTypes.FkDialogConfiguration {
  // TODO: Get this from config
  const DEFAULT_SPECTRUM_DURATION: FkTypes.FkDialogConfiguration['fkSpectrumDurationSeconds'] = 300;
  return {
    leadFkSpectrumSeconds: legacyConfig.leadFkSpectrumSeconds,
    frequencyBand: {
      minFrequencyHz: selectedFk?.lowFrequency,
      maxFrequencyHz: selectedFk?.highFrequency
    },
    maximumSlowness: legacyConfig.maximumSlowness,
    mediumVelocity: legacyConfig.mediumVelocity,
    normalizeWaveforms: legacyConfig.normalizeWaveforms,
    numberOfPoints: legacyConfig.numberOfPoints,
    prefilter: UNFILTERED_FILTER, // TODO: get real prefilter
    selectedChannels:
      station?.allRawChannels?.filter(
        channel =>
          legacyConfig.contributingChannelsConfiguration.find(ch => ch.name === channel.name)
            ?.enabled
      ) ?? [],
    useChannelVerticalOffset: legacyConfig.useChannelVerticalOffset,
    window: { leadSecs: selectedFk?.windowLead, durationSecs: selectedFk?.windowLength },
    fkSpectrumDurationSeconds: DEFAULT_SPECTRUM_DURATION,
    stepSizeSeconds: selectedFk?.stepSize
  };
}

// TODO: this is a stopgap to allow us to interface with the legacy API at the service. Update/remove this as we update the data model
export function convertToLegacyFkConfiguration(
  newConfig: FkTypes.FkDialogConfiguration
): FkTypes.FkConfiguration {
  return {
    contributingChannelsConfiguration: newConfig.selectedChannels.map(chan => ({
      enabled: true,
      id: chan.name,
      name: chan.name
    })),
    leadFkSpectrumSeconds: newConfig.leadFkSpectrumSeconds,
    maximumSlowness: newConfig.maximumSlowness,
    mediumVelocity: newConfig.mediumVelocity,
    normalizeWaveforms: newConfig.normalizeWaveforms,
    numberOfPoints: newConfig.numberOfPoints,
    useChannelVerticalOffset: newConfig.useChannelVerticalOffset
  };
}

export function getFkParams(fk: FkTypes.FkPowerSpectra): FkTypes.FkParams {
  if (!fk) {
    return undefined;
  }
  return {
    frequencyPair: {
      maxFrequencyHz: fk.highFrequency,
      minFrequencyHz: fk.lowFrequency
    },
    windowParams: {
      leadSeconds: fk.windowLead,
      lengthSeconds: fk.windowLength,
      stepSize: fk.stepSize
    }
  };
}

/**
 * Returns an Fk Configuration for the correct phase
 */
export function getDefaultFkConfigurationForSignalDetection(
  sd: SignalDetectionTypes.SignalDetection,
  station: StationTypes.Station,
  selectedFk: FkTypes.FkPowerSpectra
): FkTypes.FkDialogConfiguration {
  // Check and see if SD is well formed
  if (
    !sd ||
    !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses) ||
    !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
      .featureMeasurements
  ) {
    return undefined;
  }
  const phase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  ).value;
  if (!phase) {
    return undefined;
  }

  let mediumVelocity = 0;
  if (phase.toLowerCase().startsWith('p') || phase.toLowerCase().endsWith('p')) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 5.8;
  } else if (phase.toLowerCase().startsWith('s') || phase.toLowerCase().endsWith('s')) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 3.6;
  } else if (phase === 'Lg') {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 3.5;
  } else if (phase === 'Rg') {
    mediumVelocity = 3;
  } else {
    // Cause Tx or N...undefined behavior ok
    mediumVelocity = 1;
  }
  return {
    ...convertLegacyFkConfiguration(FkTypes.Util.defaultFkConfiguration, station, selectedFk),
    mediumVelocity,
    selectedChannels: station?.allRawChannels ?? []
  };
}

/**
 * Gets the user-set fk unit for a given fk id, or returns the default unit
 *
 * @param fkId the id of the fk
 */
export function getFkUnitForSdId(
  sdId: string,
  fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>
): FkTypes.FkUnits {
  return fkUnitsForEachSdId.has(sdId) ? fkUnitsForEachSdId.get(sdId) : FkTypes.FkUnits.FSTAT;
}

/**
 * Formats a frequency band into a string for the drop down
 *
 * @param band Frequency band to format
 */
export function frequencyBandToString(band: FkTypes.FrequencyBand): string {
  return `${band.minFrequencyHz} - ${band.maxFrequencyHz} Hz`;
}

/**
 * Calculates start time for fk service
 *
 * @param wfStartTime start of the signal detection beam
 * @param arrivalTime arrival time of the signal detection
 * @param leadTime lead time for fk calculation
 * @param stepSize step size for fk calculation
 *
 * @return epoch seconds representing the start time for fk calculation
 */
export function calculateStartTimeForFk(
  wfStartTime: number,
  arrivalTime: number,
  leadTime: number,
  stepSize: number
): number {
  if (
    wfStartTime === undefined ||
    arrivalTime === undefined ||
    leadTime === undefined ||
    stepSize === undefined
  ) {
    logger.error('Cannot calculate fk start time with undefined parameters');
    return undefined;
  }
  const stepTime = arrivalTime - wfStartTime - leadTime;
  const numberOfSteps = Math.floor(stepTime / stepSize);
  if (numberOfSteps < 0) {
    logger.error(
      'Cannot calculate fk start time. Wf start time is not far enough before arrival time'
    );
    return undefined;
  }
  const timeBeforeArrival = stepSize * numberOfSteps + leadTime;
  return arrivalTime - timeBeforeArrival;
}

/**
 * Helper function that builds the ComputeFk Input object. Shared by computeFk and computeFkFrequencyThumbnails
 *
 * @param userContext user context for current user
 * @param input FkInput sent by UI
 * @param sdHyp signal detection hypothesis for fk
 * @param areThumbnails (Modifies sample rate so Thumbnails only returns one spectrum in fk)
 *
 * @returns fk input
 */
export const createComputeFkInput = (
  detection: SignalDetectionTypes.SignalDetection,
  fkParams: FkTypes.FkParams,
  configuration: FkTypes.FkDialogConfiguration,
  isThumbnailRequest: boolean,
  fkChannelSegment: FkChannelSegmentRecord
): FkTypes.FkInputWithConfiguration => {
  if (!fkParams || !detection || !configuration) {
    return undefined;
  }

  const ONE_MINUTE = 60;
  const FOUR_MINUTES = 240;
  // Get arrivalTime segment to figure out length in secs
  // Lookup the Azimuth feature measurement and get the fkDataId (channel segment id)
  const arrivalFMV = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(detection.signalDetectionHypotheses)
      ?.featureMeasurements
  );
  const fkData = getFkData(detection, fkChannelSegment);
  const maximumSlownessInSPerDegree = FkTypes.Util.kmToDegreesApproximate(
    configuration.maximumSlowness
  );

  // Set start and end time based on arrival segment if it exists,
  // else default to one minute before and 4 minutes after arrival time
  const startTime = fkData ? fkData.startTime : arrivalFMV.arrivalTime.value - ONE_MINUTE;
  const endTime = fkData ? fkData.endTime : arrivalFMV.arrivalTime.value + FOUR_MINUTES;
  // For thumbnail with sample count of 1 just use arrival start time
  const offsetStartTime = isThumbnailRequest
    ? startTime
    : calculateStartTimeForFk(
        startTime,
        arrivalFMV.arrivalTime.value,
        fkParams.windowParams.leadSeconds,
        fkParams.windowParams.stepSize
      );

  // Sample rate inverse of step size. If thumbnail set rate so we only get one spectrum back from service
  const sampleRate = isThumbnailRequest
    ? 1 / (endTime - offsetStartTime)
    : 1 / fkParams.windowParams.stepSize;

  // const endTime = arrivalSegment.startTime + (arrivalSegment.timeseries[0].sampleCount / sampleRate);
  // Compute sample count if thumbnail only want one spectrum
  const timeSpanAvailable = endTime - startTime;
  const sampleCount = isThumbnailRequest
    ? 1
    : Math.floor(timeSpanAvailable / fkParams.windowParams.stepSize);

  const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(detection.signalDetectionHypotheses)
      .featureMeasurements
  );
  return {
    fkComputeInput: {
      startTime: offsetStartTime,
      sampleRate,
      sampleCount,
      channels: configuration.selectedChannels,
      windowLead: convertSecondsToDuration(fkParams.windowParams.leadSeconds),
      windowLength: convertSecondsToDuration(fkParams.windowParams.lengthSeconds),
      lowFrequency: fkParams.frequencyPair.minFrequencyHz,
      highFrequency: fkParams.frequencyPair.maxFrequencyHz,
      useChannelVerticalOffset: configuration.useChannelVerticalOffset,
      phaseType: fmPhase.value,
      normalizeWaveforms: configuration.normalizeWaveforms,
      slowCountX: Math.floor(configuration.numberOfPoints),
      slowCountY: Math.floor(configuration.numberOfPoints),
      slowStartX: -maximumSlownessInSPerDegree,
      slowStartY: -maximumSlownessInSPerDegree,
      slowDeltaX: (maximumSlownessInSPerDegree * 2) / configuration.numberOfPoints,
      slowDeltaY: (maximumSlownessInSPerDegree * 2) / configuration.numberOfPoints
    },
    configuration: convertToLegacyFkConfiguration(configuration),
    signalDetectionId: detection.id,
    isThumbnailRequest,
    windowParams: fkParams.windowParams
  };
};
