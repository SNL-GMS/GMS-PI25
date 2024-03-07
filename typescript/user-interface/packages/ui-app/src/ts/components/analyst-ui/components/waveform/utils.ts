import type {
  ChannelTypes,
  CommonTypes,
  ConfigurationTypes,
  EventTypes,
  StationTypes
} from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import {
  getCurrentHypothesis,
  isArrivalTimeMeasurementValue,
  isPhaseMeasurementValue
} from '@gms/common-model/lib/signal-detection/util';
import type { ReceiverLocationResponse } from '@gms/ui-state';
import type { WeavessTypes } from '@gms/weavess-core';

import { SignalDetectionUtils } from '~analyst-ui/common/utils';
import { isSignalDetectionOpenAssociated } from '~analyst-ui/common/utils/event-util';

/**
 * Sort feature predictions with Phase feature measurements
 *
 * @param featurePredictions to sort
 * @returns sorted Feature Predictions
 */
export const sortFeaturePredictions = (
  featurePredictions: EventTypes.FeaturePrediction[]
): EventTypes.FeaturePrediction[] => {
  return featurePredictions.sort((a, b) => {
    if (
      isPhaseMeasurementValue(a.predictionValue.predictedValue) &&
      isPhaseMeasurementValue(b.predictionValue.predictedValue)
    ) {
      const aValue = a.predictionValue.predictedValue.value.toString();
      const bValue = b.predictionValue.predictedValue.value.toString();
      return aValue.localeCompare(bValue);
    }
    return 0;
  });
};

/**
 * Get the alignment time based on station with earliest arrival.
 *
 * @param featurePredictions feature predictions
 * @param baseStationName station name
 * @param phaseToAlignBy phase to align by
 * @returns alignment time or undefined
 */
export const getAlignmentTime = (
  featurePredictions: Record<string, ReceiverLocationResponse>,
  baseStationName: string,
  phaseToAlignBy: string
): number | undefined => {
  if (featurePredictions) {
    const baseFeaturePrediction = featurePredictions[baseStationName]?.featurePredictions?.find(
      fp =>
        fp.phase === phaseToAlignBy &&
        fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
    );
    if (
      baseFeaturePrediction &&
      isArrivalTimeMeasurementValue(baseFeaturePrediction.predictionValue.predictedValue)
    ) {
      return baseFeaturePrediction.predictionValue.predictedValue.arrivalTime.value;
    }
  }
  return undefined;
};

/**
 * Calculate offsets based on station with earliest arrival.
 * Helper function for {@link calculateOffsetsObservedPhase}.
 * Determines if a given signal detection is OpenAssociated and of a specified phase.
 */
const filterByOpenAssociatedAndPhase = (
  sd: SignalDetectionTypes.SignalDetection,
  events: EventTypes.Event[],
  currentOpenEventId: string,
  phaseToOffset: string,
  openIntervalName: string
): boolean => {
  if (isSignalDetectionOpenAssociated(sd, events, currentOpenEventId, openIntervalName)) {
    // Filter for matching phase last because this operation is somewhat heavy.
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
        .featureMeasurements
    );
    return fmPhase.value === phaseToOffset;
  }
  return false;
};

/**
 * Helper function for {@link calculateOffsetsObservedPhase}.
 * Calculates an {@link Offset} using the arrivalTimeFeatureMeasurement derived from
 * a given Signal Detection and baseStationTime.
 */
const calcOffsetFromSignalDetection = (
  sd: SignalDetectionTypes.SignalDetection,
  baseStationTime: number
): number => {
  const arrivalTimeFeatureMeasurement = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  );
  return arrivalTimeFeatureMeasurement
    ? baseStationTime - arrivalTimeFeatureMeasurement.arrivalTime.value
    : undefined;
};

/**
 * Helper function for {@link calculateOffsetsObservedPhase} and {@link calculateOffsetsPredictedPhase}.
 * Calculates an {@link Offset} from a Predicted Feature entry using a given phase and baseStationTime.
 *
 * @param entry
 * @param baseStationTime
 * @param phaseToOffset
 * @returns
 */
const calcOffsetFromFeaturePrediction = (
  response: ReceiverLocationResponse,
  baseStationTime: number,
  phaseToOffset: string
): number => {
  const featurePrediction = response.featurePredictions.find(
    fp =>
      fp.phase === phaseToOffset &&
      fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
  );
  if (
    featurePrediction &&
    isArrivalTimeMeasurementValue(featurePrediction.predictionValue.predictedValue)
  ) {
    return baseStationTime - featurePrediction.predictionValue.predictedValue.arrivalTime.value;
  }
  return undefined;
};

/**
 * Calculate offsets alignment on Predicted phase based on station with earliest arrival.
 */
export const calculateOffsetsPredictedPhase = (
  featurePredictions: Record<string, ReceiverLocationResponse>,
  baseStationName: string,
  phaseToOffset: string,
  stations: StationTypes.Station[]
): Record<string, number> => {
  const offsets: Record<string, number> = {};
  if (featurePredictions) {
    const baseFeaturePrediction = featurePredictions[baseStationName].featurePredictions.find(
      fp =>
        fp.phase === phaseToOffset &&
        fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
    );
    if (
      baseFeaturePrediction &&
      isArrivalTimeMeasurementValue(baseFeaturePrediction.predictionValue.predictedValue)
    ) {
      offsets.baseStationTime =
        baseFeaturePrediction.predictionValue.predictedValue.arrivalTime.value;
      Object.entries(featurePredictions).forEach(entry => {
        if (stations.find(s => s.name === entry[0])) {
          offsets[entry[0]] = calcOffsetFromFeaturePrediction(
            entry[1],
            offsets.baseStationTime,
            phaseToOffset
          );
        }
      });
    }
  }
  return offsets;
};

/**
 * Calculate offsets for alignment on Observed phase based on station with earliest arrival.
 * Falls back to Predicted phase if an observed phase is not associated to a channel's open event.
 */
export const calculateOffsetsObservedPhase = (
  signalDetections: SignalDetectionTypes.SignalDetection[],
  featurePredictions: Record<string, ReceiverLocationResponse>,
  baseStationName: string,
  events: EventTypes.Event[],
  currentOpenEventId: string,
  phaseToOffset: string,
  stations: StationTypes.Station[],
  openIntervalName: string
): Record<string, number> => {
  const fmOffsets: Record<string, number> = {};
  const fpOffsets: Record<string, number> = {};
  /** Signal Detections that are openAssociated and match {@link phaseToOffset} */
  const openAssociatedPhaseSDs = signalDetections.filter(sd =>
    filterByOpenAssociatedAndPhase(sd, events, currentOpenEventId, phaseToOffset, openIntervalName)
  );

  const baseStationSD = openAssociatedPhaseSDs.find(sd => sd.station.name === baseStationName);
  // If the base station does not have any Observed phases, default to the Predicted phase
  if (!baseStationSD) {
    const baseFP = featurePredictions[baseStationName].featurePredictions.find(
      fp =>
        fp.phase === phaseToOffset &&
        fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
    );
    if (baseFP && isArrivalTimeMeasurementValue(baseFP.predictionValue.predictedValue)) {
      fmOffsets.baseStationTime = baseFP.predictionValue.predictedValue.arrivalTime.value;
    }
  } else {
    fmOffsets.baseStationTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(baseStationSD.signalDetectionHypotheses)
        .featureMeasurements
    ).arrivalTime.value;
  }

  openAssociatedPhaseSDs.forEach(sd => {
    fmOffsets[sd.station.name] = calcOffsetFromSignalDetection(sd, fmOffsets.baseStationTime);
  });

  const fmEntries = Object.entries(fmOffsets);
  // Remaining phases not associated to the open event should fall back to "predicted" phases
  Object.entries(featurePredictions)
    .filter(entry => !fmEntries.find(fmEntry => fmEntry[0] === entry[0]))
    .forEach(entry => {
      if (stations.find(s => s.name === entry[0])) {
        fpOffsets[entry[0]] = calcOffsetFromFeaturePrediction(
          entry[1],
          fmOffsets.baseStationTime,
          phaseToOffset
        );
      }
    });

  return { ...fmOffsets, ...fpOffsets };
};

/**
 * TODO: Remove if/when we convert the UI TimeRange to use the same property keys.
 * Converts a UI time range to the Weavess format.
 *
 * @param timeRange a time range in the common model format
 * @returns a timeRange in the weavess format
 */
export const convertToWeavessTimeRange = (
  timeRange: CommonTypes.TimeRange
): WeavessTypes.TimeRange => ({
  startTimeSecs: timeRange.startTimeSecs,
  endTimeSecs: timeRange.endTimeSecs
});

/**
 * Gets the parent station for a provided channel.
 *
 * @param channel the channel or channel name for which to find the parent station
 * @param stations the list of all stations to search
 * @returns the station object from that list (by reference)
 */
export const getStationContainingChannel = (
  channel: ChannelTypes.Channel | string,
  stations: StationTypes.Station[]
): StationTypes.Station =>
  stations.find(s => {
    const channelName = typeof channel === 'string' ? channel : channel.name;
    return !!s.allRawChannels.find(c => c.name === channelName);
  });

function getChannelElementString(channelName: string) {
  let elementString = channelName;
  if (channelName.includes('/')) {
    const splitString = channelName.split('/');
    elementString = splitString.shift();
  }
  return elementString;
}

function getStationNameFromChannelName(channelName: string) {
  return channelName.split('.')?.[0];
}

/**
 * @throws errors if the channel name or station name is invalid for building a row label
 */
const validateChannelName = (channelName: string, stationName: string) => {
  if (!channelName) {
    throw new Error('Cannot get channel name. No channel name provided.');
  }
  const elementString = getChannelElementString(channelName);

  if (!elementString || elementString.length === 0 || !elementString.includes('.')) {
    throw new Error('Cannot get channel name. Channel name format invalid.');
  }
  const elements = elementString.split('.');
  if (elements.length !== 3) {
    throw new Error(
      'Cannot get channel name. Channel name format invalid. Channel name must have a three-part STATION.GROUP.CODE format'
    );
  }
  if (stationName !== getStationNameFromChannelName(channelName)) {
    throw new Error('Invalid signal detection. Station has channel from a different station.');
  }
};

/**
 * Gets the channel orientation code from a channel name string
 */
function getChannelOrientation(channelName: string) {
  const elements = getChannelElementString(channelName).split('.');
  return elements[2];
}

/**
 * Parses a channel name string, and returns a group label
 * * `beam` if a beam
 * * Raw channel group name (eg, AS01), if a channel group
 * * `temp` if a temp channel
 */
function getChannelGroupLabel(channelName: string) {
  const waveformChannelType = SignalDetectionUtils.parseWaveformChannelType(channelName);
  if (
    waveformChannelType === 'Detection beam' ||
    waveformChannelType === 'Event beam' ||
    waveformChannelType === 'Fk beam'
  ) {
    return 'beam';
  }
  if (waveformChannelType === 'Raw channel') {
    return channelName.split('.')[1]; // channel group
  }
  if (waveformChannelType === 'N/A') {
    return 'temp';
  }
  throw new Error(`Cannot parse channel group label. Invalid channel name: ${channelName}`);
}

/**
 * Interface for managing the relevant row label data to build the row labels
 */
interface RowLabelData {
  stationName: string;
  groupLabel: string;
  channelOrientation: string;
  waveformType:
    | 'N/A'
    | 'Raw channel'
    | 'Fk beam'
    | 'Event beam'
    | 'Detection beam'
    | 'Mixed beam'
    | 'Mixed'
    | undefined;
  tooltip?:
    | 'Multiple raw channels'
    | 'Multiple beam types'
    | 'Multiple beam and channel types'
    | 'Multiple channel types'
    | 'Multiple waveform types'
    | 'Multiple waveform and channel types';
}

/**
 * From a waveform type string, return true if a beam. False if not.
 */
function isBeam(waveformType: RowLabelData['waveformType']): boolean {
  return (
    waveformType === 'Fk beam' ||
    waveformType === 'Event beam' ||
    waveformType === 'Detection beam' ||
    waveformType === 'Mixed beam'
  );
}

/**
 * Gets the waveform type from two different row label objects
 */
function getWaveformType(rowLabelData: RowLabelData, reducedRow: RowLabelData) {
  if (rowLabelData.waveformType === reducedRow.waveformType) {
    return rowLabelData.waveformType;
  }
  if (isBeam(rowLabelData.waveformType) && isBeam(reducedRow.waveformType)) {
    return 'Mixed beam';
  }

  return 'Mixed';
}

/**
 * Gets the group label (after the station, before the channel code) from two input
 * row label objects
 */
function getGroupLabel(rowLabelData: RowLabelData, reducedRow: RowLabelData) {
  const waveformType =
    rowLabelData.waveformType === reducedRow.waveformType ? rowLabelData.waveformType : 'Mixed';

  if (isBeam(waveformType)) {
    if (rowLabelData.waveformType !== reducedRow.waveformType) {
      return '*';
    }
    return 'beam';
  }
  if (waveformType === 'Mixed') {
    return '*';
  }
  if (rowLabelData.groupLabel === reducedRow.groupLabel) {
    return rowLabelData.groupLabel;
  }
  if (waveformType === 'Raw channel') {
    return 'raw';
  }
  throw new Error('Cannot get row group label.');
}

/**
 * Gets a tooltip from two input label data objects
 */
function getTooltipLabel(rowLabelData: RowLabelData, reducedRow: RowLabelData) {
  if (
    reducedRow.waveformType === 'Raw channel' &&
    rowLabelData.waveformType === 'Raw channel' &&
    (reducedRow.groupLabel !== rowLabelData.groupLabel ||
      reducedRow.channelOrientation !== rowLabelData.channelOrientation)
  ) {
    return 'Multiple raw channels';
  }
  if (
    isBeam(reducedRow.waveformType) &&
    isBeam(rowLabelData.waveformType) &&
    reducedRow.waveformType !== rowLabelData.waveformType
  ) {
    if (reducedRow.channelOrientation === rowLabelData.channelOrientation) {
      return 'Multiple beam types';
    }
    return 'Multiple beam and channel types';
  }
  if (reducedRow.waveformType !== rowLabelData.waveformType) {
    if (reducedRow.channelOrientation === rowLabelData.channelOrientation) {
      return 'Multiple waveform types';
    }
    return 'Multiple waveform and channel types';
  }
  if (reducedRow.channelOrientation !== rowLabelData.channelOrientation) {
    return 'Multiple channel types';
  }
  return undefined;
}

/**
 * Creates a single row label object from two input objects
 */
const reduceRowLabel = (reducedRow: RowLabelData, rowLabelData) => {
  if (!reducedRow) {
    return rowLabelData;
  }
  if (reducedRow.stationName !== rowLabelData.stationName) {
    throw new Error('Cannot build a row label out of channels from multiple stations.');
  }
  return {
    stationName: rowLabelData.stationName,
    waveformType: getWaveformType(rowLabelData, reducedRow),
    channelOrientation:
      rowLabelData.channelOrientation === reducedRow.channelOrientation
        ? rowLabelData.channelOrientation
        : '*',
    groupLabel: getGroupLabel(rowLabelData, reducedRow),
    tooltip: getTooltipLabel(rowLabelData, reducedRow)
  };
};

/**
 * Computes the channel label name from a list of SD from a station.
 * Returning three components in the string if consistent
 * first: 'station name' or throws exception if mixed
 * second: 'beam', 'temp', the channel group, 'raw' or '*' if mixed
 * third: 'channel orientation code' i.e. 'SHZ' or '*' if mixed
 * if list is empty then returns empty string
 *
 * @param signalDetections for one station
 * @returns station string
 */
export const getChannelLabelAndToolTipFromSignalDetections = (
  signalDetections: SignalDetectionTypes.SignalDetection[]
): { channelLabel: string; tooltip: string } => {
  if (!signalDetections || signalDetections.length === 0) {
    return { channelLabel: '', tooltip: undefined };
  }
  const signalDetectionsLabelData = signalDetections.map<RowLabelData>(sd => {
    const sdh = getCurrentHypothesis(sd.signalDetectionHypotheses);
    const sdfm = sdh?.featureMeasurements?.length > 0 ? sdh.featureMeasurements[0] : undefined;
    validateChannelName(sdfm.channel.name, sdh.station.name);
    return {
      stationName: sdh.station.name,
      channelOrientation: getChannelOrientation(sdfm.channel.name),
      waveformType: SignalDetectionUtils.parseWaveformChannelType(sdfm.channel.name),
      groupLabel: getChannelGroupLabel(sdfm.channel.name)
    };
  });
  const rowLabel = signalDetectionsLabelData.reduce<RowLabelData>(reduceRowLabel, undefined);
  const channelLabel = `${rowLabel.groupLabel}.${rowLabel.channelOrientation}`;
  return {
    channelLabel: channelLabel === '*.*' ? '*' : channelLabel,
    tooltip: rowLabel.tooltip
  };
};

/**
 * Given a channel, returns the station name
 *
 * @param derivedChannelName
 */
export const getStationNameFromChannel = (channel: ChannelTypes.Channel): string => {
  if (channel.name) {
    let elementString = channel.name;
    if (channel.name.includes('/')) {
      const splitString = channel.name.split('/');
      elementString = splitString.shift();
    }
    const elements = elementString.split('.');
    return elements[0];
  }
  return '';
};

/**
 * Pulls all Weavess-related hotkeys from the analyst config's keyboard shortcuts
 * and formats them them to a {@link WeavessTypes.HotKeysConfiguration} object
 *
 * @param keyboardShortcuts Keyboard shortcuts from the analyst config
 * @returns Weavess hotkey configuration object
 */
export function buildWeavessHotkeys(
  keyboardShortcuts: ConfigurationTypes.KeyboardShortcutConfigurations
) {
  // Hotkey configurations
  const {
    resetSelectedWaveformAmplitudeScaling,
    resetAllWaveformAmplitudeScaling,
    zoomOutFully,
    zoomOutOneStep,
    zoomInOneStep,
    pageDown,
    pageUp,
    panLeft,
    panRight,
    editSignalDetectionUncertainty,
    toggleCurrentPhaseMenu,
    toggleCommandPalette,
    toggleAlignment,
    hideMeasureWindow,
    closeCreateSignalDetectionOverlay
  } = keyboardShortcuts.hotkeys;

  // DragEvent configurations
  const {
    scaleWaveformAmplitude,
    drawMeasureWindow,
    createQcSegments
  } = keyboardShortcuts.dragEvents;

  const {
    viewQcSegmentDetails,
    createSignalDetectionWithCurrentPhase,
    createSignalDetectionWithDefaultPhase,
    createSignalDetectionNotAssociatedWithWaveformCurrentPhase,
    createSignalDetectionNotAssociatedWithWaveformDefaultPhase
  } = keyboardShortcuts.clickEvents;

  /**
   * All {@link ConfigurationTypes.HotkeyConfiguration} assembled
   * into a keyed object so it can be cleanly iterated upon.
   */
  const allHotkeyConfigurations = {
    resetSelectedWaveformAmplitudeScaling,
    resetAllWaveformAmplitudeScaling,
    viewQcSegmentDetails,
    zoomOutFully,
    zoomOutOneStep,
    zoomInOneStep,
    pageDown,
    pageUp,
    panLeft,
    panRight,
    editSignalDetectionUncertainty,
    scaleWaveformAmplitude,
    drawMeasureWindow,
    createQcSegments,
    createSignalDetectionWithCurrentPhase,
    createSignalDetectionWithDefaultPhase,
    createSignalDetectionNotAssociatedWithWaveformCurrentPhase,
    createSignalDetectionNotAssociatedWithWaveformDefaultPhase,
    toggleCurrentPhaseMenu,
    toggleCommandPalette,
    toggleAlignment,
    hideMeasureWindow,
    closeCreateSignalDetectionOverlay
  };

  // Make weavess-ready
  const weavessHotkeys: WeavessTypes.HotKeysConfiguration = {};
  Object.keys(allHotkeyConfigurations).forEach(
    (configName: keyof typeof allHotkeyConfigurations) => {
      weavessHotkeys[configName] = {
        combos: [...allHotkeyConfigurations[configName].combos],
        description: allHotkeyConfigurations[configName].description,
        category: 'Waveform Display'
      };
    }
  );
  return weavessHotkeys;
}
