/* eslint-disable @typescript-eslint/no-use-before-define */
import type {
  ChannelSegmentTypes,
  ChannelTypes,
  CommonTypes,
  FilterTypes,
  StationTypes
} from '@gms/common-model';
import { ConfigurationTypes, EventTypes, SignalDetectionTypes } from '@gms/common-model';
import { getFilterName } from '@gms/common-model/lib/filter/filter-util';
import { UNFILTERED, UNFILTERED_FILTER } from '@gms/common-model/lib/filter/types';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { QcSegmentType } from '@gms/common-model/lib/qc-segment';
import {
  findAmplitudeFeatureMeasurementValue,
  findArrivalTimeFeatureMeasurement,
  findArrivalTimeFeatureMeasurementUsingSignalDetection,
  findArrivalTimeFeatureMeasurementValue,
  findPhaseFeatureMeasurementValue,
  getCurrentHypothesis,
  isArrivalTimeMeasurementValue
} from '@gms/common-model/lib/signal-detection/util';
import { isNumber } from '@gms/common-util';
import type {
  AnalystWaveformTypes,
  EventStatus,
  ReceiverLocationResponse,
  UiChannelSegment
} from '@gms/ui-state';
import {
  AnalystWaveformUtil,
  AnalystWorkspaceTypes,
  channelSegmentToWeavessChannelSegment
} from '@gms/ui-state';
import type { WaveformDisplayedSignalDetectionConfigurationEnum } from '@gms/ui-state/lib/app/state/waveform/types';
import { WeavessTypes, WeavessUtil } from '@gms/weavess-core';
import type { ChannelSegment, Mask } from '@gms/weavess-core/lib/types';
import { isDataClaimCheck } from '@gms/weavess-core/lib/types';
import type { Draft } from 'immer';
import produce, { original } from 'immer';
import type { WritableDraft } from 'immer/dist/internal';
import flatMap from 'lodash/flatMap';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';
import React from 'react';

import { SignalDetectionUtils } from '~analyst-ui/common/utils';
import {
  getDistanceUsingDistanceUnits,
  getSignalDetectionStatus,
  isSdHypothesisAssociatedToEventHypothesis
} from '~analyst-ui/common/utils/event-util';
import {
  createChannelSegmentString,
  filterSignalDetectionsByStationId,
  getEdgeType,
  getSignalDetectionStatusColor,
  isPeakTroughInWarning,
  shouldDisplaySignalDetection
} from '~analyst-ui/common/utils/signal-detection-util';
import { sortStationDefinitionChannels } from '~analyst-ui/common/utils/station-definition-util';
import { systemConfig } from '~analyst-ui/config/system-config';
import { userPreferences } from '~analyst-ui/config/user-preferences';
import { semanticColors } from '~scss-config/color-preferences';

import { RowLabel } from './components/row-label';
import type { WaveformDisplayProps, WaveformDisplayState } from './types';
import { getAlignmentTime } from './utils';

/**
 * Interface used to bundle all of the parameters need to create the
 * weavess stations for the waveform display.
 */
export interface CreateWeavessStationsParameters {
  defaultStations: StationTypes.Station[];
  measurementMode: AnalystWorkspaceTypes.MeasurementMode;
  featurePredictions: Record<string, ReceiverLocationResponse>;
  signalDetections: SignalDetectionTypes.SignalDetection[];
  signalDetectionActionTargets: string[];
  sdIdsInConflict: string[];
  selectedSdIds: string[];
  events: EventTypes.Event[];
  qcSegmentsByChannelName: Record<string, Record<string, QcSegment>>;
  processingMask: ChannelSegmentTypes.ProcessingMask;
  maskVisibility: Record<string, boolean>;
  channelHeight: number;
  channelFilters: Record<string, FilterTypes.Filter>;
  filterList: FilterTypes.FilterList;
  uiChannelSegments: Record<string, Record<string, UiChannelSegment[]>>;
  startTimeSecs: number;
  endTimeSecs: number;
  zoomInterval: CommonTypes.TimeRange;
  currentOpenEvent?: EventTypes.Event;
  showPredictedPhases: boolean;
  showSignalDetectionUncertainty: boolean;
  distances: EventTypes.LocationDistance[];
  offsets: Record<string, number>;
  phaseToAlignOn?: string;
  stationVisibilityDictionary: AnalystWaveformTypes.StationVisibilityChangesDictionary;
  stations: StationTypes.Station[];
  processingAnalystConfiguration: ConfigurationTypes.ProcessingAnalystConfiguration;
  uiTheme: ConfigurationTypes.UITheme;
  eventStatuses: Record<string, EventStatus>;
  openIntervalName: string;
  displayedSignalDetectionConfiguration: Record<
    WaveformDisplayedSignalDetectionConfigurationEnum,
    boolean
  >;
}

/**
 * Return sorted, filtered stations given sort type and current open event
 *
 * @param props current {@link WaveformDisplayProps}
 * @param sortByDistance override sort mode and sort by distance
 * @returns a {@link StationTypes.Station} array
 */
export function getSortedFilteredDefaultStations(
  props: WaveformDisplayProps,
  sortByDistance = false
): StationTypes.Station[] {
  const { events } = props;

  const currentOpenEvent = events?.find(event => event.id === props.currentOpenEventId);

  const signalDetectionsByStation = props.signalDetections;

  const theStations = props.stationsQuery?.data;
  const filteredStations = theStations
    ? // filter the stations based on the mode setting
      theStations.filter(stationToFilterOnMode =>
        filterStationOnMode(
          props.measurementMode.mode,
          stationToFilterOnMode,
          currentOpenEvent,
          signalDetectionsByStation,
          props.currentStageName
        )
      )
    : [];

  if (sortByDistance) {
    return sortProcessingStations(
      filteredStations,
      AnalystWorkspaceTypes.WaveformSortType.distance,
      props.distances
    );
  }

  return currentOpenEvent
    ? sortProcessingStations(filteredStations, props.selectedSortType, props.distances)
    : filteredStations;
}

/**
 * Calculate the zoom interval for the current open event,
 * 30 seconds before and after the alignment time at the closest station
 *
 * @param props current {@link WaveformDisplayProps}
 * @param sortByDistance override sort mode and sort by distance
 * @returns the zoom interval as a {@link CommonTypes.TimeRange} or undefined
 */
export function calculateZoomIntervalForCurrentOpenEvent(
  props: WaveformDisplayProps,
  sortByDistance = false
): CommonTypes.TimeRange | undefined {
  const zasZoomInterval = props.processingAnalystConfigurationQuery.data?.zasZoomInterval;
  let timeIntervalBuffer = 30;
  if (zasZoomInterval !== undefined && !Number.isNaN(zasZoomInterval)) {
    timeIntervalBuffer = zasZoomInterval / 2;
  }
  const sortedFilteredDefaultStations = getSortedFilteredDefaultStations(props, sortByDistance);
  const sortedVisibleStations = props.getVisibleStationsFromStationList(
    sortedFilteredDefaultStations
  );
  if (
    props.featurePredictionQuery.data &&
    props.featurePredictionQuery.data.receiverLocationsByName &&
    sortedVisibleStations !== undefined &&
    sortedVisibleStations.length > 0
  ) {
    const defaultPhaseAlignment =
      props.processingAnalystConfigurationQuery.data.zasDefaultAlignmentPhase ?? 'P';
    const alignmentTime = getAlignmentTime(
      props.featurePredictionQuery.data.receiverLocationsByName,
      sortedVisibleStations[0].name,
      defaultPhaseAlignment
    );
    if (alignmentTime) {
      return {
        startTimeSecs: alignmentTime - timeIntervalBuffer,
        endTimeSecs: alignmentTime + timeIntervalBuffer
      };
    }
  }

  return undefined;
}

/**
 * Creates CreateWeavessStationsParameters with the required fields used
 * for to creating the weavess stations for the waveform display.
 *
 * @param props The WaveformDisplayProps
 * @param state The WaveformDisplayState
 * @param channelHeight The height of rendered channels in weavess in px
 * @returns CreateWeavessStationsParameters
 */
export function populateCreateWeavessStationsParameters(
  props: WaveformDisplayProps,
  state: WaveformDisplayState,
  channelHeight: number
): CreateWeavessStationsParameters {
  const { events } = props;

  const currentOpenEvent = events?.find(event => event.id === props.currentOpenEventId);

  const signalDetectionsByStation = props.signalDetections;
  const analystConfiguration = props.processingAnalystConfigurationQuery?.data;

  const sortedFilteredDefaultStations = getSortedFilteredDefaultStations(props);
  const individualWeavesMeasurementMode: AnalystWorkspaceTypes.MeasurementMode = {
    mode: props.measurementMode.mode,
    entries: props.measurementMode.entries
  };

  return {
    defaultStations: sortedFilteredDefaultStations,
    measurementMode: individualWeavesMeasurementMode,
    featurePredictions: props.featurePredictionQuery.data?.receiverLocationsByName,
    signalDetections: signalDetectionsByStation,
    sdIdsInConflict: props.sdIdsInConflict,
    selectedSdIds: props.selectedSdIds,
    signalDetectionActionTargets: props.signalDetectionActionTargets,
    events,
    qcSegmentsByChannelName: props.qcSegments,
    processingMask: props.processingMask,
    maskVisibility: props.maskVisibility,
    channelHeight,
    channelFilters: props.channelFilters,
    uiChannelSegments: props.channelSegments,
    startTimeSecs: props.currentTimeInterval.startTimeSecs,
    endTimeSecs: props.currentTimeInterval.endTimeSecs,
    zoomInterval: props.zoomInterval,
    currentOpenEvent,
    distances: props.distances,
    showPredictedPhases: props.shouldShowPredictedPhases,
    showSignalDetectionUncertainty: props.shouldShowTimeUncertainty,
    displayedSignalDetectionConfiguration: props.displayedSignalDetectionConfiguration,
    offsets: props.offsets,
    phaseToAlignOn: props.phaseToAlignOn,
    stationVisibilityDictionary: props.stationsVisibility,
    stations: props.stationsQuery?.data,
    processingAnalystConfiguration: analystConfiguration,
    uiTheme: props.uiTheme,
    eventStatuses: props.eventStatuses,
    openIntervalName: props.currentStageName,
    filterList: props.filterList
  };
}

/**
 * Filter the stations based on the mode setting.
 *
 * @param mode the mode of the waveform display
 * @param station the station
 * @param signalDetectionsByStation the signal detections for all stations
 */
function filterStationOnMode(
  mode: AnalystWorkspaceTypes.WaveformDisplayMode,
  station: StationTypes.Station,
  currentOpenEvent: EventTypes.Event,
  signalDetectionsByStation: SignalDetectionTypes.SignalDetection[],
  openIntervalName: string
): boolean {
  const preferredEventHypothesisByStage: EventTypes.EventHypothesis = EventTypes.findPreferredEventHypothesisByStage(
    currentOpenEvent,
    openIntervalName
  );
  if (AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT === mode) {
    if (currentOpenEvent) {
      const associatedSignalDetectionHypothesisIds = preferredEventHypothesisByStage?.associatedSignalDetectionHypotheses.map(
        hypothesis => hypothesis.id.id
      );
      const signalDetections = signalDetectionsByStation
        ? signalDetectionsByStation.filter(sd => {
            // filter out the sds for the other stations
            if (sd.station.name !== station.name) {
              return false;
            }
            return includes(
              associatedSignalDetectionHypothesisIds,
              getCurrentHypothesis(sd.signalDetectionHypotheses).id.id
            );
          })
        : [];
      // display the station only if sds were returned
      return signalDetections.length > 0;
    }
  }

  return true; // show all stations (DEFAULT)
}

/**
 * Returns the `green` interval markers.
 *
 * @param startTimeSecs start time seconds for the interval start marker
 * @param endTimeSecs end time seconds for the interval end marker
 */
function getIntervalMarkers(startTimeSecs: number, endTimeSecs: number): WeavessTypes.Marker[] {
  return [
    {
      id: 'startTime',
      color: semanticColors.waveformIntervalBoundary,
      lineStyle: WeavessTypes.LineStyle.SOLID,
      timeSecs: startTimeSecs
    },
    {
      id: 'endTime',
      color: semanticColors.waveformIntervalBoundary,
      lineStyle: WeavessTypes.LineStyle.SOLID,
      timeSecs: endTimeSecs
    }
  ];
}

/**
 * If there are Signal Detections populate Weavess Channel Segment from the FK_BEAM
 * else use the default channel Weavess Channel Segment built
 *
 * @param signalDetections signal detections
 * @ returns channelSegmentDict
 */
export function populateWeavessChannelSegmentAndAddFilter(
  signalDetections: SignalDetectionTypes.SignalDetection[],
  params: CreateWeavessStationsParameters
): Record<string, UiChannelSegment[]> {
  const channelSegmentsRecord: Record<string, UiChannelSegment[]> = {};
  if (signalDetections && signalDetections.length > 0 && params.uiChannelSegments) {
    signalDetections.forEach(signalDetection => {
      const signalDetectionChannelSegmentsRecord =
        params.uiChannelSegments[signalDetection.station.name] ?? {};

      if (signalDetectionChannelSegmentsRecord && !isEmpty(signalDetectionChannelSegmentsRecord)) {
        const allFilters = params.filterList?.filters || [
          {
            withinHotKeyCycle: null,
            unfiltered: null,
            namedFilter: null,
            filterDefinition: null
          }
        ];
        allFilters.forEach(filter => {
          const signalDetectionChannelSegments =
            signalDetectionChannelSegmentsRecord[getFilterName(filter)];
          if (signalDetectionChannelSegments && signalDetectionChannelSegments?.length > 0) {
            channelSegmentsRecord[getFilterName(filter)] = signalDetectionChannelSegments;
          }
        });
      }
    });
  }
  return channelSegmentsRecord;
}

/**
 * Create the amplitude selection windows for a signal detection
 *
 * @param arrivalTime arrival time (signal detection time epoch secs)
 * @param amplitudeMeasurementValue amplitude of signal detection
 * @param measurementMode
 * @returns a WeavessTypes.SelectionWindow[]
 */
export function generateAmplitudeSelectionWindows(
  sdId: string,
  arrivalTime: number,
  amplitudeMeasurementValue: SignalDetectionTypes.AmplitudeMeasurementValue,
  measurementMode: AnalystWorkspaceTypes.MeasurementMode
): WeavessTypes.SelectionWindow[] {
  const selectionStartOffset: number =
    systemConfig.measurementMode.selection.startTimeOffsetFromSignalDetection;
  const selectionEndOffset: number =
    systemConfig.measurementMode.selection.endTimeOffsetFromSignalDetection;
  const { period } = amplitudeMeasurementValue;
  const troughTime: number = amplitudeMeasurementValue.measurementTime; // TODO: Check this when actually plumbing in measurement time
  const peakTime = troughTime + period / 2; // display only period/2
  const isWarning = isPeakTroughInWarning(arrivalTime, period, troughTime, peakTime);
  const isMoveable =
    measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT &&
    systemConfig.measurementMode.peakTroughSelection.isMoveable;

  const selections: WeavessTypes.SelectionWindow[] = [];
  selections.push({
    id: `${systemConfig.measurementMode.peakTroughSelection.id}${sdId}`,
    startMarker: {
      id: 'start',
      color: !isWarning
        ? systemConfig.measurementMode.peakTroughSelection.borderColor
        : systemConfig.measurementMode.peakTroughSelection.warning.borderColor,
      lineStyle: isMoveable
        ? systemConfig.measurementMode.peakTroughSelection.lineStyle
        : systemConfig.measurementMode.peakTroughSelection.nonMoveableLineStyle,
      timeSecs: troughTime,
      minTimeSecsConstraint: arrivalTime + selectionStartOffset
    },
    endMarker: {
      id: 'end',
      color: !isWarning
        ? systemConfig.measurementMode.peakTroughSelection.borderColor
        : systemConfig.measurementMode.peakTroughSelection.warning.borderColor,
      lineStyle: isMoveable
        ? systemConfig.measurementMode.peakTroughSelection.lineStyle
        : systemConfig.measurementMode.peakTroughSelection.nonMoveableLineStyle,
      timeSecs: peakTime,
      maxTimeSecsConstraint: arrivalTime + selectionEndOffset
    },
    isMoveable,
    color: !isWarning
      ? systemConfig.measurementMode.peakTroughSelection.color
      : systemConfig.measurementMode.peakTroughSelection.warning.color
  });
  return selections;
}

/**
 * Internal helper function used by {@link generateSelectionWindows} to
 * create selection windows for a given signal detection.
 *
 * @returns a WeavessTypes.SelectionWindow
 */
function mapSignalDetectionToSelectionWindow(
  sd: SignalDetectionTypes.SignalDetection,
  preferredEventHypothesisByStage: EventTypes.EventHypothesis,
  measurementMode: AnalystWorkspaceTypes.MeasurementMode
): WeavessTypes.SelectionWindow[] {
  const arrivalTimeValue: SignalDetectionTypes.ArrivalTimeMeasurementValue = findArrivalTimeFeatureMeasurementValue(
    getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  );

  // Check if arrival time is set and is a number
  if (!isNumber(arrivalTimeValue.arrivalTime.value)) return undefined;

  const arrivalTime: number = arrivalTimeValue.arrivalTime.value;

  const isSdAssociatedToOpenEvent = isSdHypothesisAssociatedToEventHypothesis(
    getCurrentHypothesis(sd.signalDetectionHypotheses),
    preferredEventHypothesisByStage
  );

  const amplitudeMeasurementValue = findAmplitudeFeatureMeasurementValue(
    getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements,
    SignalDetectionTypes.FeatureMeasurementType.AMPLITUDE_A5_OVER_2
  );

  const selectionStartOffset: number =
    systemConfig.measurementMode.selection.startTimeOffsetFromSignalDetection;
  const selectionEndOffset: number =
    systemConfig.measurementMode.selection.endTimeOffsetFromSignalDetection;

  // measurement.entries is a dictionary where key is the
  // signal detection id and the entry is boolean to show or hide
  // start undefined i.e. not in the map. If in map means SD is either manually
  // added to map to show or be hidden
  let shouldShow;
  if (measurementMode.entries[sd.id] !== undefined) {
    shouldShow = measurementMode.entries[sd.id];
  }

  // display the measurement selection windows if the sd is associated
  // to the open event and its phase is included in one of the measurement mode phases
  // and not excluded in the entries dictionary
  if (
    shouldShow ||
    (measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT &&
      isSdAssociatedToOpenEvent &&
      shouldShow === undefined)
  ) {
    let selections: WeavessTypes.SelectionWindow[] = [
      {
        id: `${systemConfig.measurementMode?.selection?.id}${sd.id}`,
        startMarker: {
          id: 'start',
          color: systemConfig.measurementMode?.selection?.borderColor,
          lineStyle: systemConfig.measurementMode?.selection?.lineStyle,
          timeSecs: arrivalTime + selectionStartOffset
        },
        endMarker: {
          id: 'end',
          color: systemConfig.measurementMode?.selection?.borderColor,
          lineStyle: systemConfig.measurementMode?.selection?.lineStyle,
          timeSecs: arrivalTime + selectionEndOffset
        },
        isMoveable: systemConfig.measurementMode?.selection?.isMoveable,
        color: systemConfig.measurementMode?.selection?.color
      }
    ];

    if (amplitudeMeasurementValue) {
      // Add the amplitude measurement selection windows
      selections = selections.concat(
        generateAmplitudeSelectionWindows(
          sd.id,
          arrivalTime,
          amplitudeMeasurementValue,
          measurementMode
        )
      );
    }
    return selections;
  }
  return [];
}

/**
 * Creates the selection window and markers for weavess for a list of signal detections
 *
 * @param signalDetections signal detections
 * @param currentOpenEvent the current open event
 * @param measurementMode measurement mode
 *
 * @returns a WeavessTypes.SelectionWindow[]
 */
export function generateSelectionWindows(
  signalDetections: SignalDetectionTypes.SignalDetection[],
  currentOpenEvent: EventTypes.Event,
  measurementMode: AnalystWorkspaceTypes.MeasurementMode,
  openIntervalName: string
): WeavessTypes.SelectionWindow[] {
  let preferredEventHypothesisByStage: EventTypes.EventHypothesis;
  if (currentOpenEvent) {
    preferredEventHypothesisByStage = EventTypes.findPreferredEventHypothesisByStage(
      currentOpenEvent,
      openIntervalName
    );
  }

  return flatMap(
    signalDetections
      .map(sd =>
        mapSignalDetectionToSelectionWindow(sd, preferredEventHypothesisByStage, measurementMode)
      )
      .filter(sw => sw !== undefined)
  );
}

/**
 * if the contents of the draft have changed in the new object for a particular key, then
 * replace the draft version with the version in the new object.
 *
 * @param draft the draft on which we are operating
 * @param key the key to check. Must be a key of the type T
 * @param newObj the new object to compare against.
 */
function maybeMutateDraft<T>(draft: WritableDraft<T>, key: keyof T, newObj: T) {
  const orig = original(draft);
  if (!isEqual(orig[key], newObj[key])) {
    draft[key] = (newObj[key] as unknown) as Draft<T[keyof T]>;
  }
}

/**
 * Build a record of channel names to list of pick markers
 *
 * @returns record
 */
function buildChannelNameToPickMarkerRecord(
  station: WeavessTypes.Station,
  signalDetections: SignalDetectionTypes.SignalDetection[]
): Record<string, WeavessTypes.PickMarker[]> {
  // Build a record of channel names to their signal detections
  const pickMarkerRecord: Record<string, WeavessTypes.PickMarker[]> = {};
  station.defaultChannel.waveform.signalDetections.forEach(pickMarker => {
    const signalDetection = signalDetections.find(sd => sd.id === pickMarker.id);
    const workingSignalDetectionHypothesis = getCurrentHypothesis(
      signalDetection.signalDetectionHypotheses
    );
    const arrivalTimeFeatureMeasurement = findArrivalTimeFeatureMeasurement(
      workingSignalDetectionHypothesis.featureMeasurements
    );

    const channelName =
      arrivalTimeFeatureMeasurement?.analysisWaveform?.waveform?.id?.channel?.name ||
      arrivalTimeFeatureMeasurement?.measuredChannelSegment?.id?.channel?.name;

    if (!pickMarkerRecord[channelName]) pickMarkerRecord[channelName] = [];
    pickMarkerRecord[channelName].push(pickMarker);
  });
  return pickMarkerRecord;
}

/**
 * Creates a shallowly-immutable update of the @param existingChannel, such that any
 * changed parameters of that channel are replaced with the version from @param newChannel
 *
 * @param existingChannel the channel as it currently exists
 * @param newChannel What a new channel should look like
 * @returns a copy of @param existingChannel that matches @param newChannel, but that
 * preserves referential equality for any parameters that were unchanged.
 *
 * Note: it does this shallowly, so if any deeply nested value within the channel has changed,
 * this will replace the whole tree. For example, if the start time of @param newChannel.defaultRange has
 * changed, then @param existingChannel.defaultRange will be entirely replaced. This does not provide deep
 * immutability. It is a performance optimization, since deep comparison for deep immutability
 * is time consuming, and the performance hit for rerendering the interiors of a channel is
 * lower than the performance hit for many equality checks.
 */
function updateWeavessChannel(
  existingChannel: WeavessTypes.Channel,
  newChannel: WeavessTypes.Channel
): WeavessTypes.Channel | undefined {
  // Figure out if either/both are undefined or are equal first
  if (!existingChannel && newChannel) {
    return newChannel;
  }
  if ((!newChannel && existingChannel) || isEqual(newChannel, existingChannel)) {
    return existingChannel;
  }
  return produce(existingChannel, draft => {
    // Update any simple parameters that have changed
    Object.keys(existingChannel).forEach((k: keyof WeavessTypes.Channel) => {
      maybeMutateDraft(draft, k, newChannel);
    });
  });
}

/**
 * @param channelSegment a channel segment from which to derive the name
 * @returns a channel label consisting of the second and third elements of the channel name,
 * namely the group or waveform type, and the channel code.
 * @example AS01.SHZ
 * @example beam.SHZ
 */
function getChannelLabelForSplitChannel(channelSegment: WeavessTypes.ChannelSegment) {
  const channelLabel = channelSegment.configuredInputName.split('/')[0].split('.');
  channelLabel.shift();
  return channelLabel.join('.');
}

/**
 * Create a split channel from the station's default channel
 *
 * @param id split channel name
 * @param station station which owns the channel
 * @param filterName
 * @param channelSegment
 * @param pickMarkers
 * @param distanceToEvent
 * @returns
 */
export function createSplitChannel(
  id: string,
  station: WeavessTypes.Station,
  filterName: string,
  channelSegment: ChannelSegment,
  splitChannelTime: number,
  splitChannelPhase: string,
  distanceToEvent?: EventTypes.LocationDistance,
  pickMarkers: WeavessTypes.PickMarker[] = []
): WeavessTypes.Channel {
  return {
    ...station.defaultChannel,
    name: (
      <RowLabel
        stationName={station.name}
        channelLabel={getChannelLabelForSplitChannel(channelSegment)}
      />
    ),
    id,
    waveform: {
      ...station.defaultChannel.waveform,
      channelSegmentsRecord: {
        [filterName]: [channelSegment]
      },
      signalDetections: pickMarkers
    },
    azimuth: distanceToEvent?.azimuth || 0,
    distance: getDistanceUsingDistanceUnits(
      distanceToEvent?.distance,
      userPreferences.distanceUnits
    ),
    splitChannelTime,
    splitChannelPhase
  };
}

/**
 * Gets a unique id for the split channel
 *
 * @param station the parent station to the channel segment
 * @param channelSegment the channel segment to be rendered in the split channel
 * @param index the index (order) it will be rendered in the dom
 * @returns a unique string id for the split channel
 */
function createSplitChannelId(
  station: WeavessTypes.Station,
  channelSegment: WeavessTypes.ChannelSegment,
  index: number
) {
  const { data } = channelSegment.dataSegments[0];
  let splitId = `${index}`;

  // If available use a stronger key
  if (isDataClaimCheck(data)) {
    // Key cannot be the data.id because if it contains the filterId it could prevent necessary re-renders
    splitId = `${channelSegment.channelName}${data.startTimeSecs}${data.endTimeSecs}${data.domainTimeRange.startTimeSecs}${data.domainTimeRange.endTimeSecs}`;
  }

  return `${station.id}.split.${splitId}`;
}

/**
 * Updates station's default channel to return multiple channels in the case
 * where the station at the given time contains multiple channel segments.
 *
 * @returns Channel list
 */
export function updateSplitChannels(
  existingWeavessStation: WeavessTypes.Station,
  station: WeavessTypes.Station,
  params: CreateWeavessStationsParameters
): WeavessTypes.Channel[] {
  if (!station.defaultChannel.splitChannelTime) return undefined;
  const filterName = getFilterName(params.channelFilters[station.name]);

  // Build a record of channel names to their signal detections
  const signalDetections: Record<
    string,
    WeavessTypes.PickMarker[]
  > = buildChannelNameToPickMarkerRecord(station, params.signalDetections);

  const distanceToEvent = params.distances
    ? params.distances.find(d => d.id === station.name)
    : undefined;

  const { channelSegmentsRecord } = station.defaultChannel.waveform;

  // The filtered data might not be in the channel segment record yet
  if (channelSegmentsRecord[filterName]) {
    // Find the channel segments that will be split
    const channelSegments = channelSegmentsRecord[filterName].filter(channelSegment => {
      return !!channelSegment.dataSegments.find(dataSegment => {
        if (isDataClaimCheck(dataSegment.data)) {
          const { startTimeSecs, endTimeSecs } = dataSegment.data;
          return (
            station.defaultChannel.splitChannelTime >= startTimeSecs &&
            station.defaultChannel.splitChannelTime <= endTimeSecs
          );
        }
        return false;
      });
    });
    // Each channel segment will be split into its own split weavess channel
    return channelSegments.map((channelSegment, index) => {
      const id = createSplitChannelId(station, channelSegment, index);

      const filteredSignalDetections = signalDetections[channelSegment.configuredInputName] || [];

      return createSplitChannel(
        id,
        station,
        filterName,
        channelSegment,
        station.defaultChannel.splitChannelTime,
        station.defaultChannel.splitChannelPhase,
        distanceToEvent,
        filteredSignalDetections
      );
    });
  }

  // Return the existing split channels in the case where we did not update them
  return existingWeavessStation.splitChannels;
}

/**
 * Updates a Weavess station, treating the station as an immutable object, and thus preserving
 * strict equality for unchanged parameters inside of the station
 *
 * @param existingWeavessStation the existing @interface WeavessTypes.Station to update
 * @param station station
 * @param selectedFilter selected filter
 * @param channelSegmentsRecord channel segment dictionary
 * @param signalDetections signal detections
 * @param params CreateWeavessStationsParameters the parameters required for
 * @returns a new @interface WeavessTypes.Station with any changed parameters updated.
 */
export function updateWeavessStation(
  existingWeavessStation: WeavessTypes.Station,
  station: StationTypes.Station,
  selectedFilter: FilterTypes.Filter,
  channelSegmentsRecord: Record<string, UiChannelSegment[]>,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  params: CreateWeavessStationsParameters
): WeavessTypes.Station {
  return produce(existingWeavessStation, draft => {
    const newStation = createWeavessStation(
      station,
      selectedFilter,
      channelSegmentsRecord,
      signalDetections,
      params
    );

    newStation.defaultChannel.splitChannelTime = draft.defaultChannel.splitChannelTime;
    newStation.defaultChannel.splitChannelPhase = draft.defaultChannel.splitChannelPhase;

    // Update any simple parameters that have changed
    Object.keys(existingWeavessStation).forEach((k: keyof WeavessTypes.Station) => {
      if (k === 'nonDefaultChannels' || k === 'defaultChannel') return; // handle separately
      maybeMutateDraft(draft, k, newStation);
    });

    if (newStation.defaultChannel.splitChannelTime) {
      draft.splitChannels = updateSplitChannels(existingWeavessStation, newStation, params);
    }

    draft.defaultChannel = updateWeavessChannel(
      existingWeavessStation.defaultChannel,
      newStation.defaultChannel
    );

    draft.nonDefaultChannels = updateWeavessNonDefaultChannels(
      existingWeavessStation,
      newStation,
      station,
      params
    );
  });
}

/**
 * Updates a Weavess station's non default channels, treating the channels as an immutable object,
 * and thus preserving strict equality for unchanged parameters inside of the non default channels
 *
 * @param draftWeavessStation
 * @param existingStation
 * @param newStation
 * @param station
 * @param params
 * @returns
 */
function updateWeavessNonDefaultChannels(
  existingStation: WeavessTypes.Station,
  newStation: WeavessTypes.Station,
  station: StationTypes.Station,
  params: CreateWeavessStationsParameters
): WeavessTypes.Channel[] {
  const modStation = produce(existingStation, draft => {
    // remove any nonDefaultChannels that are hidden
    draft.nonDefaultChannels.forEach((chan, index) => {
      if (!newStation.nonDefaultChannels.find(c => c.id === chan.id)) {
        draft.nonDefaultChannels.splice(index, 1);
      }
    });

    // Get the order of the Station Definition raw channels
    // to build the order of the weavess channels
    const sortedRawChannels = sortStationDefinitionChannels(station.allRawChannels);

    // Used to check the channel is visible before adding weavess channel
    const stationVis = params.stationVisibilityDictionary[station.name];

    // Add weavess channel to nonDefaultChannels. Use the order of the sorted raw channels.
    // Determine which WeavessChannel to add depending on if the channel has been updated
    // Review how sorting is being done and could we just sort based
    // on Weavess Channels?
    const channelsWithNewlyVisible: WeavessTypes.Channel[] = [];
    // Flag if any channels are hidden or are newly made visible
    let addedHidChannel = false;
    sortedRawChannels.forEach(channel => {
      if (AnalystWaveformUtil.isChannelVisible(channel.name, stationVis)) {
        const newChannel = WeavessUtil.findChannelInStation(newStation, channel.name);
        const currentChannel = WeavessUtil.findChannelInStation(existingStation, channel.name);
        const updatedChannel = updateWeavessChannel(currentChannel, newChannel);
        // Replace existing channel with updated channel if it was changed. If that
        // channel was hidden then we will use the new list of channels
        if (updatedChannel !== currentChannel) {
          channelsWithNewlyVisible.push(updatedChannel);
          const index = draft.nonDefaultChannels.findIndex(chan => chan.id === newChannel.id);
          if (index === -1) {
            // Added a channel previously hid
            addedHidChannel = true;
          } else {
            // eslint-disable-next-line no-param-reassign
            draft.nonDefaultChannels[index] = updatedChannel;
          }
        } else if (currentChannel) {
          channelsWithNewlyVisible.push(currentChannel);
        }
      } else {
        // Hid a channel
        addedHidChannel = true;
      }
    });
    // If we added a hidden channel or any channels are hidden then use the new list
    if (addedHidChannel) {
      draft.nonDefaultChannels = channelsWithNewlyVisible;
    }
  });
  return modStation.nonDefaultChannels;
}

/**
 * Creates a station for weavess with the waveform data map
 *
 * @param station station
 * @param selectedFilter selected filter
 * @param channelSegmentsRecord channel segment dictionary
 * @param signalDetections signal detections
 * @param params CreateWeavessStationsParameters the parameters required for
 *
 * @returns a WaveformWeavessStation
 */
export function createWeavessStation(
  station: StationTypes.Station,
  selectedFilter: FilterTypes.Filter,
  channelSegmentsRecord: Record<string, UiChannelSegment[]>,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  params: CreateWeavessStationsParameters
): WeavessTypes.Station {
  const distanceToEvent = params.distances
    ? params.distances.find(d => d.id === station.name)
    : undefined;

  const stationVisObject = params.stationVisibilityDictionary[station.name];
  const nonDefaultChannels = createWeavessNonDefaultChannels(station, params, signalDetections);
  return {
    id: station.name,
    name: station.name,
    distance: getDistanceUsingDistanceUnits(
      distanceToEvent?.distance,
      userPreferences.distanceUnits
    ),
    azimuth: distanceToEvent ? distanceToEvent.azimuth : 0,
    distanceUnits: userPreferences.distanceUnits,
    defaultChannel: createWeavessDefaultChannel(
      station,
      selectedFilter,
      channelSegmentsRecord,
      signalDetections,
      params
    ),
    nonDefaultChannels,
    areChannelsShowing: AnalystWaveformUtil.isStationExpanded(stationVisObject),
    hasQcMasks: hasMasks(
      station.allRawChannels,
      params.qcSegmentsByChannelName,
      params.processingMask,
      params.uiTheme.colors.qcMaskColors,
      params.maskVisibility,
      params.zoomInterval
    )
  };
}

/**
 * Builds a filter description which will eventually be displayed on the bottom right of the waveform
 * Allows an opportunity to insert an error in case filtering did not complete successfully.
 *
 * @param f the filter from which to generate the description
 * @returns WeavessTypes.ChannelDescription | string
 */
function buildFilterDescription(
  channelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]>,
  f: FilterTypes.Filter
): WeavessTypes.ChannelDescription | string {
  const filterName = getFilterName(f);
  if (Object.keys(channelSegmentsRecord).length === 0) {
    return '';
  }
  if (f?._uiIsError) {
    return {
      message: getFilterName(f),
      isError: !!f._uiIsError,
      tooltipMessage: 'Filtering operation failed'
    } as WeavessTypes.ChannelDescription;
  }
  return filterName;
}

/**
 * Creates a default channel waveform for weavess
 *
 * @param station a processing station
 * @param selectedFilter the currently selected filter
 * @param filterUiChannelSegments dictionary of channel segment id (filter id) to filtered channel segment
 * @param signalDetections signal detections
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 *
 * @returns a WeavessTypes.Channel
 */
export function createWeavessDefaultChannel(
  station: StationTypes.Station,
  // These params will be used in creating default channel when we have Signal Detections
  selectedFilter: FilterTypes.Filter,
  filterUiChannelSegments: Record<string, UiChannelSegment[]>,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  params: CreateWeavessStationsParameters
): WeavessTypes.Channel {
  // Build a default channel segment to use if no Signal Detections are found
  // The segment type is FK_BEAM since that is all that is drawn on the default channels
  const stationOffset = params.offsets[station.name];

  const waveform = createWeavessDefaultChannelWaveform(
    station,
    signalDetections,
    selectedFilter,
    filterUiChannelSegments,
    params
  );
  const description = buildFilterDescription(
    waveform.channelSegmentsRecord,
    params.channelFilters[station.name]
  );
  return {
    id: station.name,
    name: <RowLabel stationName={station.name} signalDetections={signalDetections} />,
    description,
    height: params.channelHeight,
    timeOffsetSeconds: stationOffset || 0,
    baseStationTime: params.offsets.baseStationTime ?? null,
    waveform
  };
}

/**
 * Creates a non default channel for weavess
 *
 * @param station a processing station
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 *
 * @returns a WeavessTypes.Channel[]
 */
export function createWeavessNonDefaultChannels(
  station: StationTypes.Station,
  params: CreateWeavessStationsParameters,
  stationsSignalDetections: SignalDetectionTypes.SignalDetection[]
): WeavessTypes.Channel[] {
  // sds are only displayed on the default channel;
  // hide all non-default channels in measurement mode

  // Check the station is showing the channels and the channel is visible before creating weavess channel
  const { offsets } = params;
  const stationVis = params.stationVisibilityDictionary[station.name];

  // if in measurement mode or if the channels are not showing then return an empty array
  if (
    AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT === params.measurementMode.mode ||
    !stationVis.isStationExpanded
  ) {
    return [];
  }

  // Sort the channels based on the channel grouping and orientation
  const rawChannelsToProcess = sortStationDefinitionChannels(station.allRawChannels);

  // Build the visible child channels to return
  return rawChannelsToProcess
    .map(channel => {
      if (!AnalystWaveformUtil.isChannelVisible(channel.name, stationVis)) {
        return undefined;
      }
      const rawChannelSignalDetections = stationsSignalDetections.filter(
        sd =>
          SignalDetectionUtils.getSignalDetectionAnalysisWaveformChannelName(sd) === channel.name
      );
      const channelOffset = offsets[station.name];
      const nonDefaultChannel = createWeavessNonDefaultChannel(
        channel,
        params,
        channelOffset,
        rawChannelSignalDetections
      );
      nonDefaultChannel.name = <span className="station-name__channel-name">{channel.name}</span>;
      return nonDefaultChannel;
    })
    .filter(channel => channel !== undefined);
}

/**
 * Creates a non default channel for weavess
 *
 * @param channel a processing channel
 * @param params CreateWeavessStationsParameters the parameters required for
 * @param stationOffset offset in seconds
 *
 * @returns a WeavessTypes.Channel
 */
export function createWeavessNonDefaultChannel(
  channel: ChannelTypes.Channel,
  params: CreateWeavessStationsParameters,
  channelOffset: number,
  rawChannelSignalDetections: SignalDetectionTypes.SignalDetection[]
): WeavessTypes.Channel {
  const nonDefaultChannelSegments = getChannelSegments(
    channel.name,
    params.channelFilters,
    params.uiChannelSegments,
    params.uiTheme
  );

  const channelDistance = params.distances?.find(distance => distance.id === channel.name);

  const waveform = createWeavessNonDefaultChannelWaveform(
    nonDefaultChannelSegments,
    channel,
    params,
    rawChannelSignalDetections
  );
  const description = buildFilterDescription(
    waveform.channelSegmentsRecord,
    params.channelFilters[channel.name]
  );

  return {
    id: channel.name,
    name: channel.name,
    description,
    timeOffsetSeconds: channelOffset || 0,
    baseStationTime: params.offsets.baseStationTime ?? null,
    height: params.channelHeight,
    waveform,
    distance: getDistanceUsingDistanceUnits(
      channelDistance?.distance,
      userPreferences.distanceUnits
    ),
    azimuth: channelDistance?.azimuth,
    distanceUnits: userPreferences.distanceUnits
  };
}

/**
 * Updates the list of UiChannelSegments with the isSelected flag
 * set to try if signal detection is in the SdIds' list.
 *
 * @param selectedSdIds
 * @param selectedFilter
 * @param signalDetections
 * @param uiChannelSegments
 * @returns Record<string, WeavessTypes.ChannelSegment[]>
 */
export function updateSelectedChannelSegments(
  selectedSdIds: string[],
  selectedFilter: FilterTypes.Filter,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  uiChannelSegments: Record<string, UiChannelSegment[]>,
  uiTheme: ConfigurationTypes.UITheme
): Record<string, WeavessTypes.ChannelSegment[]> {
  const channelSegments: Record<string, WeavessTypes.ChannelSegment[]> = {};
  if (uiChannelSegments && Object.keys(uiChannelSegments).length > 0) {
    let filterName = getFilterName(selectedFilter);

    // If the filter is not cached fall back
    if (!uiChannelSegments[filterName]) filterName = UNFILTERED;

    // Create a record of just the uiChannelSegment.channelSegment's
    channelSegments[filterName] = uiChannelSegments[filterName].map(uiCs =>
      channelSegmentToWeavessChannelSegment(uiCs, {
        waveformColor: uiTheme.colors.waveformRaw,
        labelTextColor: uiTheme.colors.waveformFilterLabel
      })
    );

    // Modify isSelected value for all selected signal detection ids
    selectedSdIds.forEach(sdId => {
      const signalDetection = signalDetections.find(sd => sd.id === sdId);
      const arrivalTimeFm = findArrivalTimeFeatureMeasurementUsingSignalDetection(signalDetection);

      if (signalDetection && arrivalTimeFm?.analysisWaveform?.waveform?.id) {
        // Reference unfiltered to ensure channelSegmentDescriptor matches
        const uiChannelSegmentIndex = uiChannelSegments[UNFILTERED].findIndex(
          chanSegment =>
            createChannelSegmentString(arrivalTimeFm.analysisWaveform.waveform.id) ===
            createChannelSegmentString(chanSegment.channelSegmentDescriptor)
        );

        if (uiChannelSegmentIndex >= 0 && channelSegments?.[filterName]?.[uiChannelSegmentIndex]) {
          channelSegments[filterName][uiChannelSegmentIndex] = produce(
            channelSegments[filterName][uiChannelSegmentIndex],
            draft => {
              draft.isSelected = true;
            }
          );
        }
      }
    });
  }
  return channelSegments;
}

/**
 * Creates a default channel waveform for weavess
 *
 * @param station a processing station
 * @param signalDetections signal detections
 * @param selectedFilter current selected filter
 * @param uiChannelSegments map of channel segment id (filter id) to filtered channel segment
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 *
 * @returns a WeavessTypes.ChannelWaveformContent
 */
export function createWeavessDefaultChannelWaveform(
  station: StationTypes.Station,
  signalDetections: SignalDetectionTypes.SignalDetection[],
  selectedFilter: FilterTypes.Filter,
  uiChannelSegments: Record<string, UiChannelSegment[]>,
  params: CreateWeavessStationsParameters
): WeavessTypes.ChannelWaveformContent {
  const channelSegments = updateSelectedChannelSegments(
    params.selectedSdIds,
    selectedFilter,
    signalDetections,
    uiChannelSegments,
    params.uiTheme
  );
  return {
    channelSegmentId: getFilterName(selectedFilter),
    channelSegmentsRecord: channelSegments,
    predictedPhases: buildPredictedPhasePickMarkers(station.name, params),
    signalDetections: buildSignalDetectionPickMarkers(signalDetections, params),
    masks: undefined,
    markers: {
      verticalMarkers: getIntervalMarkers(params.startTimeSecs, params.endTimeSecs),
      selectionWindows: generateSelectionWindows(
        signalDetections,
        params.currentOpenEvent,
        params.measurementMode,
        params.openIntervalName
      )
    }
  };
}

/**
 * Builds the Weavess Signal Detections used in a WeavessChannel
 *
 * @param signalDetections
 * @returns list of Weavess Pick Markers
 */
function buildSignalDetectionPickMarkers(
  signalDetections: SignalDetectionTypes.SignalDetection[],
  params: CreateWeavessStationsParameters
): WeavessTypes.PickMarker[] {
  return signalDetections
    ? signalDetections.map(detection => {
        const assocStatus = getSignalDetectionStatus(
          detection,
          params.events,
          params.currentOpenEvent ? params.currentOpenEvent.id : undefined,
          params.eventStatuses,
          params.openIntervalName
        );
        const color = getSignalDetectionStatusColor(assocStatus, params.uiTheme);
        const arrivalTimeFeatureMeasurementValue = findArrivalTimeFeatureMeasurementValue(
          getCurrentHypothesis(detection.signalDetectionHypotheses).featureMeasurements
        );
        const fmPhase = findPhaseFeatureMeasurementValue(
          getCurrentHypothesis(detection.signalDetectionHypotheses).featureMeasurements
        );
        const sdUncertainty = arrivalTimeFeatureMeasurementValue.arrivalTime?.standardDeviation;
        const timeSecs = arrivalTimeFeatureMeasurementValue?.arrivalTime?.value
          ? arrivalTimeFeatureMeasurementValue.arrivalTime.value
          : 0; // it's okay for 0 case since value is epoch seconds
        const isConflicted = !!includes(params.sdIdsInConflict, detection.id);
        const shouldDisplaySd = shouldDisplaySignalDetection(
          assocStatus,
          getEdgeType(
            { startTimeSecs: params.startTimeSecs, endTimeSecs: params.endTimeSecs },
            timeSecs
          ),
          isConflicted,
          params.displayedSignalDetectionConfiguration
        );
        return {
          timeSecs,
          uncertaintySecs: sdUncertainty || 0,
          showUncertaintyBars: sdUncertainty && params.showSignalDetectionUncertainty,
          label: fmPhase.value,
          id: detection.id,
          color,
          isConflicted,
          isDisabled: !shouldDisplaySd,
          isSelected: params.selectedSdIds?.find(id => id === detection.id) !== undefined,
          isActionTarget:
            params.signalDetectionActionTargets?.find(id => id === detection.id) !== undefined,
          isDraggable: !getCurrentHypothesis(detection.signalDetectionHypotheses).deleted
        };
      })
    : [];
}

/**
 * Function to check if a phase marker should be displayed depending on its status as a priority phase
 * or a selected default/non-priority phase
 *
 * @param fpPhase
 * @param phaseToAlignOn
 * @param config
 * @returns
 */
export function isDisplayedPhase(
  fpPhase: string,
  phaseToAlignOn: string,
  config: ConfigurationTypes.ProcessingAnalystConfiguration
): boolean {
  return config?.priorityPhases.includes(fpPhase) || fpPhase === phaseToAlignOn;
}

/**
 * Builds the Weavess Predicted Phases used in a WeavessChannel
 *
 * @param station
 * @returns list of Weavess Pick Markers
 */
export function buildPredictedPhasePickMarkers(
  receiverName: string,
  params: CreateWeavessStationsParameters
): WeavessTypes.PickMarker[] {
  if (params.showPredictedPhases && params.featurePredictions) {
    return params.featurePredictions[receiverName]?.featurePredictions
      .filter(
        fp =>
          isArrivalTimeMeasurementValue(fp.predictionValue.predictedValue) &&
          isDisplayedPhase(
            fp.phase,
            params.phaseToAlignOn,
            params.processingAnalystConfiguration
          ) &&
          !fp.extrapolated
      )
      .map((fp, index) => {
        const { predictedValue } = fp.predictionValue;
        if (isArrivalTimeMeasurementValue(predictedValue)) {
          return {
            timeSecs: predictedValue.arrivalTime.value,
            uncertaintySecs: predictedValue.arrivalTime.standardDeviation,
            showUncertaintyBars: false,
            label: fp.phase,
            id: `${index}`,
            color: params.uiTheme.colors.predictionSDColor,
            filter: `opacity(${params.uiTheme.display.predictionSDOpacity})`,
            isConflicted: false,
            isSelected: false,
            isActionTarget: false,
            isDraggable: false
          };
        }
        return undefined;
      });
  }
  return [];
}

/**
 * Determines if a default channel should display mask indicator label
 * depending on presence of QC segments in non-default channels
 * within waveform display zoom interval
 *
 * @param channels
 * @param qcSegmentsByChannelName
 * @param qcMaskColors
 * @param maskVisibility
 * @param zoomInterval
 * @returns boolean
 */
export function hasMasks(
  channels: ChannelTypes.Channel[],
  qcSegmentsByChannelName: Record<string, Record<string, QcSegment>>,
  processingMask: ChannelSegmentTypes.ProcessingMask,
  qcMaskColors: Partial<Record<ConfigurationTypes.QCMaskTypes, string>>,
  maskVisibility: Record<string, boolean>,
  zoomInterval: CommonTypes.TimeRange
): boolean {
  const masks = flatMap(
    channels.map(channel =>
      buildMasks(
        channel.name,
        qcSegmentsByChannelName,
        processingMask,
        qcMaskColors,
        maskVisibility
      )
    )
  );
  return (
    masks &&
    masks.length > 0 &&
    masks.some(
      mask =>
        (mask.startTimeSecs >= zoomInterval.startTimeSecs && // start time within interval OR
          mask.startTimeSecs <= zoomInterval.endTimeSecs) ||
        (mask.endTimeSecs >= zoomInterval.startTimeSecs && // end time within interval OR
          mask.endTimeSecs <= zoomInterval.endTimeSecs) ||
        (mask.startTimeSecs <= zoomInterval.startTimeSecs && // mask spans entire interval
          mask.endTimeSecs >= zoomInterval.endTimeSecs)
    )
  );
}

/**
 * Builds weavess masks from QcSegments
 *
 * @param channelName The name of the channel to build masks for
 * @param qcSegmentsByChannelName The QcSegments object
 * @param processingMask The processing mask to build a mask for
 * @param qcMaskColors The color object from processing config
 * @param maskVisibility Mask visibility Map
 * @returns WeavessTypes.Mask[]
 */
export function buildMasks(
  channelName: string,
  qcSegmentsByChannelName: Record<string, Record<string, QcSegment>>,
  processingMask: ChannelSegmentTypes.ProcessingMask,
  qcMaskColors: Partial<Record<ConfigurationTypes.QCMaskTypes, string>>,
  maskVisibility: Record<string, boolean>
): Mask[] {
  let masks: Mask[] = [];
  if (qcSegmentsByChannelName[channelName]) {
    masks = Object.values(qcSegmentsByChannelName[channelName])
      .filter(
        qcSegment =>
          maskVisibility[
            qcSegment.versionHistory[qcSegment.versionHistory.length - 1].rejected
              ? ConfigurationTypes.QCMaskTypes.REJECTED
              : ConfigurationTypes.QCMaskTypes[
                  qcSegment.versionHistory[qcSegment.versionHistory.length - 1].category
                ]
          ]
      )
      .filter(
        qcSegment =>
          qcSegment.versionHistory[qcSegment.versionHistory.length - 1].type !== QcSegmentType.GAP
      )
      .map(qcSegment => {
        const qcSegmentVersion = qcSegment.versionHistory[qcSegment.versionHistory.length - 1];
        return {
          id: qcSegment.id,
          startTimeSecs: qcSegmentVersion.startTime,
          endTimeSecs: qcSegmentVersion.endTime,
          color:
            qcMaskColors[
              qcSegmentVersion.rejected
                ? ConfigurationTypes.QCMaskTypes.REJECTED
                : ConfigurationTypes.QCMaskTypes[qcSegmentVersion.category]
            ],
          isProcessingMask: false
        };
      });

    if (
      processingMask != null &&
      maskVisibility[ConfigurationTypes.QCMaskTypes.PROCESSING_MASKS] &&
      processingMask.appliedToRawChannel.name === channelName
    ) {
      const processingMaskVersion =
        processingMask.maskedQcSegmentVersions[processingMask.maskedQcSegmentVersions.length - 1];
      const processingMaskEntry: Mask = {
        id: processingMask.id,
        startTimeSecs: processingMaskVersion.startTime,
        endTimeSecs: processingMaskVersion.endTime,
        color: qcMaskColors.processingMask,
        isProcessingMask: true
      };
      masks.push(processingMaskEntry);
    }
  }

  return masks;
}

/**
 * Creates a non default channel waveform for weavess
 *
 * @param nonDefaultChannel non default channel
 * @param channel processing channel
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 *
 * @returns a WeavessTypes.ChannelWaveformContent
 */
export function createWeavessNonDefaultChannelWaveform(
  nonDefaultChannel: {
    channelSegmentId: string;
    channelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]>;
  },
  channel: ChannelTypes.Channel,
  params: CreateWeavessStationsParameters,
  rawChannelSignalDetections: SignalDetectionTypes.SignalDetection[]
): WeavessTypes.ChannelWaveformContent {
  const masks = buildMasks(
    channel.name,
    params.qcSegmentsByChannelName,
    params.processingMask,
    params.uiTheme.colors.qcMaskColors,
    params.maskVisibility
  );
  return {
    channelSegmentId: nonDefaultChannel.channelSegmentId,
    channelSegmentsRecord: nonDefaultChannel.channelSegmentsRecord,
    signalDetections: buildSignalDetectionPickMarkers(rawChannelSignalDetections, params),
    // if the mask category matches the enabled masks then return the mask else skip it
    masks,
    predictedPhases: buildPredictedPhasePickMarkers(channel.name, params),
    markers: {
      verticalMarkers: getIntervalMarkers(params.startTimeSecs, params.endTimeSecs)
    }
  };
}

/**
 * Creates the weavess stations for the waveform display.
 *
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 *
 * @returns a WeavessTypes.WeavessStation[]
 */
export function createWeavessStations(
  params: CreateWeavessStationsParameters,
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType,
  existingWeavessStations: WeavessTypes.Station[]
): WeavessTypes.Station[] {
  const weavessStations = AnalystWaveformUtil.getVisibleStations(
    params.stationVisibilityDictionary,
    params.stations
  )
    // filter the stations based on the mode setting
    .filter(stationToFilterOnMode =>
      filterStationOnMode(
        params.measurementMode.mode,
        stationToFilterOnMode,
        params.currentOpenEvent,
        params.signalDetections,
        params.openIntervalName
      )
    )
    .map(station => {
      const selectedFilter: FilterTypes.Filter =
        params.channelFilters[station.name] ?? UNFILTERED_FILTER;
      const signalDetectionsForStation = filterSignalDetectionsByStationId(
        station.name,
        params.signalDetections
      );
      const channelSegmentsRecord = populateWeavessChannelSegmentAndAddFilter(
        signalDetectionsForStation,
        params
      );

      const existingStation = existingWeavessStations.find(s => s.id === station.name);
      return existingStation
        ? updateWeavessStation(
            existingStation,
            station,
            selectedFilter,
            channelSegmentsRecord,
            signalDetectionsForStation,
            params
          )
        : createWeavessStation(
            station,
            selectedFilter,
            channelSegmentsRecord,
            signalDetectionsForStation,
            params
          );
    })
    .filter(weavessStation => weavessStation !== undefined);
  // Return the weavess station list sorted by station name
  return sortWaveformList(weavessStations, selectedSortType);
}

/**
 * Initial split of station's default channel to return multiple channels in the case
 * where the station at the given time contains multiple channel segments
 *
 * @returns WeavessTypes.Station with split channels
 */
function splitWeavessStation(
  existingWeavessStation: WeavessTypes.Station,
  station: WeavessTypes.Station,
  channelSegments: WeavessTypes.ChannelSegment[],
  signalDetections: Record<string, WeavessTypes.PickMarker[]>,
  distanceToEvent: EventTypes.LocationDistance,
  filterName: string,
  timeSecs: number,
  phase: string
): WeavessTypes.Station {
  return produce(existingWeavessStation, draft => {
    draft.defaultChannel.splitChannelTime = timeSecs;
    draft.defaultChannel.splitChannelPhase = phase;
    draft.splitChannels = channelSegments.map((channelSegment, index) => {
      const id = createSplitChannelId(station, channelSegment, index);
      const filteredSignalDetections = signalDetections[channelSegment.configuredInputName] || [];

      return createSplitChannel(
        id,
        station,
        filterName,
        channelSegment,
        timeSecs,
        phase,
        distanceToEvent,
        filteredSignalDetections
      );
    });
  });
}

/**
 * Splits weavess stations in the case where the station at the given time contains multiple channel segments.
 *
 * @param stationId the station id to be split
 * @param timeSecs the time at which to attempt the split
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 * @param selectedSortType the sort type, or order of the stations
 * @param existingWeavessStations the current array of weavess stations
 * @returns a WeavessTypes.WeavessStation[]
 */
export function splitWeavessStations(
  stationId: string,
  timeSecs: number,
  params: CreateWeavessStationsParameters,
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType,
  existingWeavessStations: WeavessTypes.Station[],
  phase: string
): WeavessTypes.Station[] {
  const stationIndex = existingWeavessStations.findIndex(station => station.name === stationId);
  if (stationIndex < 0) return existingWeavessStations;

  const station = existingWeavessStations[stationIndex];
  const filterName = getFilterName(params.channelFilters[stationId]);

  if (!station?.defaultChannel?.waveform?.channelSegmentsRecord?.[filterName])
    return existingWeavessStations;

  const channelSegments = station.defaultChannel.waveform.channelSegmentsRecord[filterName].filter(
    channelSegment => {
      return !!channelSegment.dataSegments.find(dataSegment => {
        if (isDataClaimCheck(dataSegment.data)) {
          const { startTimeSecs, endTimeSecs } = dataSegment.data;
          return timeSecs >= startTimeSecs && timeSecs <= endTimeSecs;
        }

        return false;
      });
    }
  );

  // Build a record of channel names to their signal detections
  const signalDetections: Record<
    string,
    WeavessTypes.PickMarker[]
  > = buildChannelNameToPickMarkerRecord(station, params.signalDetections);

  const distanceToEvent = params.distances
    ? params.distances.find(d => d.id === station.name)
    : undefined;

  const weavessStations = existingWeavessStations.map(
    (existingWeavessStation, existingWeavessStationIndex) => {
      if (existingWeavessStationIndex === stationIndex && channelSegments.length > 1) {
        return splitWeavessStation(
          existingWeavessStation,
          station,
          channelSegments,
          signalDetections,
          distanceToEvent,
          filterName,
          timeSecs,
          phase
        );
      }
      return produce(existingWeavessStation, draft => {
        delete draft.defaultChannel.splitChannelTime;
        delete draft.splitChannels;
      });
    }
  );

  // Return the weavess station list sorted by station name
  return sortWaveformList(weavessStations, selectedSortType);
}

/**
 * Determine if we need to split the weavess stations for creating new signal detection
 *
 * @param stationId the station id to be split
 * @param timeSecs the time at which to attempt the split
 * @param params CreateWeavessStationsParameters the parameters required for
 * creating the weavess stations for the waveform display.
 * @param existingWeavessStations the current array of weavess stations
 * @returns true if we need to split
 */
export function determineSplitWeavessStations(
  stationId: string,
  timeSecs: number,
  params: CreateWeavessStationsParameters,
  existingWeavessStations: WeavessTypes.Station[]
): boolean {
  const stationIndex = existingWeavessStations.findIndex(station => station.name === stationId);
  if (stationIndex < 0) return false;

  const station = existingWeavessStations[stationIndex];
  const filterName = getFilterName(params.channelFilters[stationId]);

  if (!station?.defaultChannel?.waveform?.channelSegmentsRecord?.[filterName]) return false;

  // find the channelSegments for timeSecs
  const channelSegments = station.defaultChannel.waveform.channelSegmentsRecord[filterName].filter(
    channelSegment => {
      return !!channelSegment.dataSegments.find(dataSegment => {
        if (isDataClaimCheck(dataSegment.data)) {
          const { startTimeSecs, endTimeSecs } = dataSegment.data;
          return timeSecs >= startTimeSecs && timeSecs <= endTimeSecs;
        }
        return false;
      });
    }
  );

  return channelSegments.length > 1;
}

/**
 * Clears out open split channels
 *
 * @param existingWeavessStations the current array of weavess stations
 * @returns an array of weavess stations without split channels
 */
export function clearSplitWeavessStations(
  existingWeavessStations: WeavessTypes.Station[]
): WeavessTypes.Station[] {
  return existingWeavessStations.map(existingWeavessStation => {
    return produce(existingWeavessStation, draft => {
      delete draft.defaultChannel.splitChannelTime;
      delete draft.splitChannels;
    });
  });
}

/**
 * Gets the raw channel's channelSegments for the currently applied filter
 *
 * @param channelName Id of the channel
 * @param channelFilters Mapping of ids to filters
 * @param uiChannelSegments Raw or filtered channel segments for child channel
 *
 * @returns an object containing a channelSegmentId, list of channel segments, and the type of segment
 */
export function getChannelSegments(
  channelName: string,
  channelFilters: Record<string, FilterTypes.Filter>,
  uiChannelSegments: Record<string, Record<string, UiChannelSegment[]>>,
  uiTheme: ConfigurationTypes.UITheme
): {
  channelSegmentId: string;
  channelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]>;
} {
  // Get the ChannelSegment map for the channel name from the Waveform Cache
  // The key to the map is the waveform filter name
  const channelSegments = (uiChannelSegments && uiChannelSegments[channelName]) ?? {};
  const channelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]> = {};
  Object.keys(channelSegments).forEach(filterId => {
    channelSegmentsRecord[filterId] = channelSegments[filterId].map(uiCs =>
      channelSegmentToWeavessChannelSegment(uiCs, {
        waveformColor: uiTheme.colors.waveformRaw,
        labelTextColor: uiTheme.colors.waveformFilterLabel
      })
    );
  });
  return { channelSegmentId: getFilterName(channelFilters[channelName]), channelSegmentsRecord };
}

/**
 * sort WeavessStations based on SortType
 *
 * @param stations WeavessStations
 * @param waveformSortType Alphabetical or by distance to selected event
 *
 * @returns sortedWeavessStations
 */
export function sortWaveformList(
  stations: WeavessTypes.Station[],
  waveformSortType: AnalystWorkspaceTypes.WaveformSortType
): WeavessTypes.Station[] {
  // apply sort based on sort type
  let sortedStations: WeavessTypes.Station[] = [];
  // Sort by distance if in global scan
  if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.distance) {
    sortedStations = sortBy<WeavessTypes.Station>(stations, [station => station.distance]);
  } else if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.stationNameAZ) {
    sortedStations = orderBy<WeavessTypes.Station>(stations, [station => station.name], ['asc']);
  } else if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.stationNameZA) {
    sortedStations = orderBy<WeavessTypes.Station>(stations, [station => station.name], ['desc']);
  }
  return sortedStations;
}

/**
 * sort waveform list based on sort type
 *
 * @param stations StationDefinition list
 * @param waveformSortType Alphabetical or by distance to selected event
 * @distance distance to stations list
 *
 * @returns sortedWeavessStations
 */
export function sortProcessingStations(
  stations: StationTypes.Station[],
  waveformSortType: AnalystWorkspaceTypes.WaveformSortType,
  distances: EventTypes.LocationDistance[]
): StationTypes.Station[] {
  // apply sort based on sort type
  let sortedStations: StationTypes.Station[] = [];
  // Sort by distance if in global scan

  if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.distance) {
    sortedStations = sortBy<StationTypes.Station>(
      stations,
      station => distances.find(source => source.id === station.name)?.distance.degrees
    );
    // For station name sort, order a-z by station config name
  } else if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.stationNameAZ) {
    sortedStations = orderBy<StationTypes.Station>(stations, [station => station.name], ['asc']);
  } else if (waveformSortType === AnalystWorkspaceTypes.WaveformSortType.stationNameZA) {
    sortedStations = orderBy<StationTypes.Station>(stations, [station => station.name], ['desc']);
  }
  return sortedStations;
}

/**
 * Returns a list of phases that are present for FP alignment
 *
 * @param fpForCurrentOpenEvent a list of the feature predictions for open event
 * @returns a list of phases that may be aligned
 */
export function getAlignablePhases(
  fpForCurrentOpenEvent: EventTypes.FeaturePrediction[]
): string[] {
  if (!fpForCurrentOpenEvent || fpForCurrentOpenEvent.length <= 0) return [];
  return systemConfig.defaultSdPhases.filter(phase => {
    return fpForCurrentOpenEvent.filter(fp => fp.phase === phase).length > 0;
  });
}
