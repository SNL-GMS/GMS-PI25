import type {
  ChannelSegmentTypes,
  ChannelTypes,
  EventTypes,
  StationTypes
} from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { findPreferredEventHypothesisByStage } from '@gms/common-model/lib/event';
import { convertToVersionReference } from '@gms/common-model/lib/faceted';
import { Timer } from '@gms/common-util';
import type { CheckboxSearchListTypes } from '@gms/ui-core-components';
import { HotkeyTooltip } from '@gms/ui-core-components';
import type {
  AnalystWaveformTypes,
  EventsFetchResult,
  PredictFeaturesForEventLocationQuery,
  PredictFeaturesForEventLocationResponse,
  QcSegmentFetchResult,
  ReceiverCollection,
  SignalDetectionFetchResult,
  StationQuery
} from '@gms/ui-state';
import {
  AnalystWaveformUtil,
  selectOpenIntervalName,
  selectUiChannelSegments,
  useAllStations,
  useAppDispatch,
  useAppSelector,
  useEffectiveTime,
  useGetAllStationsQuery,
  useGetEvents,
  useGetProcessingAnalystConfigurationQuery,
  useGetSelectedSdIds,
  useGetSignalDetections,
  useGetVisibleStationsFromStationList,
  useKeyboardShortcutConfigurations,
  usePredictFeaturesForEventLocationQuery,
  useQcSegments,
  useRawChannels,
  useStationsVisibility,
  useViewableInterval,
  useZoomInterval,
  waveformActions
} from '@gms/ui-state';
import { AlignWaveformsOn } from '@gms/ui-state/lib/app/state/analyst/types';
import type { WeavessTypes } from '@gms/weavess-core';
import produce from 'immer';
import flatMap from 'lodash/flatMap';
import merge from 'lodash/merge';
import memoize from 'nano-memoize';
import * as React from 'react';

import { SignalDetectionUtils } from '~analyst-ui/common/utils';
import { getDistanceToStationsForPreferredLocationSolutionId } from '~analyst-ui/common/utils/event-util';
import { formatHotkeysForOs } from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import type { PhaseHotkey } from './types';
import { calculateOffsetsObservedPhase, calculateOffsetsPredictedPhase } from './utils';
import { sortProcessingStations } from './weavess-stations-util';

export const MAX_FEATURE_PREDICTION_REQUEST = 500;

/**
 * Takes checkbox items and a station visibility map and returns a function that can update redux when a checkbox is clicked
 *
 * @param checkboxItemsList list of check boxed items
 * @param stationsVisibility station visibility map from redux
 * @returns a function for changing stationsVisibility for on clicking a checkbox on station dropdown
 */
export const useStationsVisibilityFromCheckboxState = (
  checkboxItemsList: CheckboxSearchListTypes.CheckboxItem[]
): ((
  getUpdatedCheckboxItemsList: (
    previousList: CheckboxSearchListTypes.CheckboxItem[]
  ) => CheckboxSearchListTypes.CheckboxItem[]
) => void) => {
  const { stationsVisibility } = useStationsVisibility();
  const dispatch = useAppDispatch();

  return React.useCallback(
    (
      getUpdatedCheckboxItemsList: (
        previousList: CheckboxSearchListTypes.CheckboxItem[]
      ) => CheckboxSearchListTypes.CheckboxItem[]
    ) => {
      const updatedCheckboxItemsList = getUpdatedCheckboxItemsList(checkboxItemsList);
      const newStationsVisibility = produce(stationsVisibility, draft =>
        updatedCheckboxItemsList
          // filter to the checkbox items that we changed
          .filter(checkBoxItem => {
            const previousVersionCheckBoxItem = checkboxItemsList.find(
              item => item.name === checkBoxItem.name
            );
            if (previousVersionCheckBoxItem.checked !== checkBoxItem.checked) {
              return true;
            }
            return false;
          })
          .forEach(checkBoxItem => {
            const stationVisibilityObject: AnalystWaveformTypes.StationVisibilityChanges =
              draft[checkBoxItem.name] ??
              AnalystWaveformUtil.newStationVisibilityChangesObject(
                checkBoxItem.name,
                checkBoxItem.checked
              );
            stationVisibilityObject.visibility = checkBoxItem.checked;
            draft[checkBoxItem.name] = stationVisibilityObject;
          })
      );
      dispatch(waveformActions.setStationsVisibility(newStationsVisibility));
    },
    [checkboxItemsList, dispatch, stationsVisibility]
  );
};

/**
 * If a current interval is not open, then this will query for 'nowish.' Otherwise, query for the
 * effective time from the current interval.
 *
 * @returns the list of all station definitions from the query for all stations
 */
export const useWaveformStations = (): StationQuery =>
  // We should hit a non-ideal state because there is no current interval if we fetch 'nowish'.
  // This prevents us from caching stations effectiveAt a time of `null` (1970),
  // which would just use memory for no reason. Querying for the same effective time as other
  // displays, however, will result in a cache hit.
  useGetAllStationsQuery(useEffectiveTime());

/**
 * Build the receiver param for the usePredictFeaturesForEventLocationQuery call
 *
 * @param channels channels to build receivers for
 * @param stations stations to build receivers for
 * @returns ReceiverCollection[] an array of ReceiverCollections each one has a max size of 500 receivers
 */
export const buildReceiversForFeaturePredictionQuery = (
  channels: ChannelTypes.Channel[],
  stations: StationTypes.Station[]
): ReceiverCollection[] => {
  const receivers: ReceiverCollection[] = [];
  if (channels) {
    const channelBandTypes = channels.map(channel => channel.channelBandType);
    const receiverMap = new Map<string, ChannelTypes.Channel[]>(
      channelBandTypes.map(channelBandType => [channelBandType, []])
    );
    channels.forEach(channel => receiverMap.get(channel.channelBandType).push(channel));

    receiverMap.forEach((channelArray, channelBandType) => {
      if (channelArray.length < MAX_FEATURE_PREDICTION_REQUEST) {
        receivers.push({
          receiverBandType: channelBandType,
          receiverDataType: null,
          receiverLocationsByName: Object.fromEntries(
            channelArray.map(channel => [channel.name, channel.location] || [])
          )
        });
      } else {
        for (let i = 0; i < channelArray.length; i += MAX_FEATURE_PREDICTION_REQUEST) {
          receivers.push({
            receiverBandType: channelBandType,
            receiverDataType: null,
            receiverLocationsByName: Object.fromEntries(
              channelArray
                .slice(i, i + MAX_FEATURE_PREDICTION_REQUEST)
                .map(channel => [channel.name, channel.location] || [])
            )
          });
        }
      }
    });
  }

  if (stations) {
    receivers.push({
      receiverBandType: null,
      receiverDataType: null,
      receiverLocationsByName: Object.fromEntries(
        stations.map(station => [station.name, station.location] || [])
      )
    });
  }

  return receivers;
};

/**
 * Given two feature prediction queries, merges their data objects and returns the result
 *
 * @param priorityQuery
 * @param defaultQuery
 */
export const combineFeaturePredictionQueries = (
  priorityQuery: PredictFeaturesForEventLocationQuery,
  defaultQuery: PredictFeaturesForEventLocationQuery
): PredictFeaturesForEventLocationQuery => {
  if (priorityQuery.isFetching || priorityQuery.isLoading || priorityQuery.isError) {
    return produce(priorityQuery, draft => {
      // if the query is loading or fetching or errored return an undefined data object to prevent loading old data
      draft.data = undefined;
    });
  }
  if (defaultQuery.data && defaultQuery.isSuccess) {
    return produce(priorityQuery, draft => {
      merge(draft.data.receiverLocationsByName, defaultQuery.data.receiverLocationsByName);
      draft.data.isRequestingDefault = true;
    });
  }
  if (priorityQuery.data && (defaultQuery.isFetching || defaultQuery.isLoading)) {
    // if we are requesting default data but it is still loading still set the flag
    return produce(priorityQuery, draft => {
      draft.data.isRequestingDefault = true;
    });
  }
  return priorityQuery;
};

const memoizedCombineFeaturePredictionQueries = memoize(combineFeaturePredictionQueries);

/**
 * Subscribe to the feature prediction for location solution query, for use in the waveform component.
 *
 * @param eventResult The result of the latest event query
 * @param currentOpenEventId The currently open event ID for use in creating the feature prediction query
 * @returns the result of the predict features for location solution query, from redux
 */
export const useFeaturePredictionQueryByLocationForWaveformDisplay = (
  eventResult: EventsFetchResult,
  currentOpenEventId: string,
  phaseToAlignOn?: string
): PredictFeaturesForEventLocationQuery => {
  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);
  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const stations = useAllStations();

  const locationSolutionForOpenEvent = React.useMemo(() => {
    let solution: EventTypes.LocationSolution;

    if (eventResult.data) {
      const openEvent = eventResult.data.find(event => event.id === currentOpenEventId);
      if (openEvent) {
        const eventHypothesis = findPreferredEventHypothesisByStage(openEvent, openIntervalName);
        const locationSolution = eventHypothesis.locationSolutions.find(
          ls => ls.id === eventHypothesis.preferredLocationSolution.id
        );
        solution = locationSolution;
      }
    }
    return solution;
  }, [currentOpenEventId, eventResult.data, openIntervalName]);

  const rawChannels = useRawChannels();

  const receivers = React.useMemo(
    () => buildReceiversForFeaturePredictionQuery(rawChannels, stations),
    [rawChannels, stations]
  );

  const priorityPhases = processingAnalystConfiguration.data?.priorityPhases;

  const defaultQuery = usePredictFeaturesForEventLocationQuery({
    sourceLocation: locationSolutionForOpenEvent?.location ?? undefined,
    receivers,
    phases: priorityPhases && !priorityPhases.includes(phaseToAlignOn) ? [phaseToAlignOn] : null
  });

  const priorityQuery = usePredictFeaturesForEventLocationQuery({
    sourceLocation: locationSolutionForOpenEvent?.location ?? undefined,
    receivers,
    phases: processingAnalystConfiguration.data?.priorityPhases
  });

  return memoizedCombineFeaturePredictionQueries(priorityQuery, defaultQuery);
};

/**
 * Creates a function to be called when weavess mounts
 * Note, this will cause update when the weavess zoom interval renders.
 *
 * @returns a function to be called when weavess mounts.
 */
export const useOnWeavessMount = (): ((weavess: WeavessTypes.WeavessInstance) => void) => {
  const [zoomInterval] = useZoomInterval();
  // To avoid capturing the value, we store it in a ref so we
  // can pass down a referentially stable function
  // that does not cause renders when zoomInterval changes
  // which, in this case, we don't want, since we're just
  // trying to provide a function that is called once, when
  // WEAVESS mounts
  const zoomIntervalRef = React.useRef(zoomInterval);
  zoomIntervalRef.current = zoomInterval;
  return React.useCallback((weavess: WeavessTypes.WeavessInstance) => {
    if (weavess?.waveformPanelRef) {
      weavess?.waveformPanelRef.zoomToTimeWindow(zoomIntervalRef.current);
    }
  }, []);
};

/**
 * Helper method to reduce cognitive complexity
 * calculates offsets
 */
const calculateOffsets = (
  alignWaveformsOn: AlignWaveformsOn,
  currentOpenEventId: string,
  eventResultData: EventTypes.Event[],
  featurePredictionQueryData: PredictFeaturesForEventLocationResponse,
  phaseToAlignOn: string,
  signalDetectionsQueryData: SignalDetectionTypes.SignalDetection[],
  sortedVisibleStations: StationTypes.Station[],
  stations: StationTypes.Station[],
  openIntervalName: string
) => {
  if (alignWaveformsOn === AlignWaveformsOn.OBSERVED_PHASE) {
    return calculateOffsetsObservedPhase(
      signalDetectionsQueryData || [],
      featurePredictionQueryData.receiverLocationsByName,
      sortedVisibleStations[0].name,
      eventResultData,
      currentOpenEventId,
      phaseToAlignOn,
      stations,
      openIntervalName
    );
  }
  if (alignWaveformsOn === AlignWaveformsOn.PREDICTED_PHASE) {
    return calculateOffsetsPredictedPhase(
      featurePredictionQueryData.receiverLocationsByName,
      sortedVisibleStations[0].name,
      phaseToAlignOn,
      stations
    );
  }
  return null;
};

/**
 * Calculates the number of seconds each channel and station waveform is offset from the base station
 *
 * @returns a record of offsets with key: station/channel name value: offset in seconds
 */
export const useWaveformOffsets = (): Record<string, number> => {
  // Redux dependencies
  const alignWaveformsOn = useAppSelector(state => state.app.analyst.alignWaveformsOn);
  const phaseToAlignOn = useAppSelector(state => state.app.analyst.phaseToAlignOn);
  const selectedSortType = useAppSelector(state => state.app.analyst.selectedSortType);
  const currentOpenEventId = useAppSelector(state => state.app.analyst.openEventId);
  const openIntervalName = useAppSelector(selectOpenIntervalName);

  // Query Dependencies
  const eventResult = useGetEvents();
  const signalDetectionsQuery = useGetSignalDetections();
  const stations = useWaveformStations();
  const getVisibleStationsFromStationList = useGetVisibleStationsFromStationList();

  const rawChannels = useRawChannels();

  const featurePredictionQuery = useFeaturePredictionQueryByLocationForWaveformDisplay(
    eventResult,
    currentOpenEventId,
    phaseToAlignOn
  );

  const emptyOffsets = React.useRef({});

  return React.useMemo(() => {
    if (featurePredictionQuery.data && featurePredictionQuery.data.receiverLocationsByName) {
      const distances = getDistanceToStationsForPreferredLocationSolutionId(
        eventResult.data.find(event => event.id === currentOpenEventId),
        stations.data,
        openIntervalName,
        rawChannels
      );

      const sortedStations = sortProcessingStations(stations.data, selectedSortType, distances);
      const sortedVisibleStations = getVisibleStationsFromStationList(sortedStations);

      if (sortedVisibleStations !== undefined && sortedVisibleStations.length > 0) {
        return (
          calculateOffsets(
            alignWaveformsOn,
            currentOpenEventId,
            eventResult.data,
            featurePredictionQuery.data,
            phaseToAlignOn,
            signalDetectionsQuery.data,
            sortedVisibleStations,
            stations.data,
            openIntervalName
          ) || emptyOffsets.current
        );
      }
    }
    return emptyOffsets.current;
  }, [
    featurePredictionQuery.data,
    eventResult.data,
    stations.data,
    openIntervalName,
    signalDetectionsQuery.data,
    rawChannels,
    selectedSortType,
    getVisibleStationsFromStationList,
    currentOpenEventId,
    alignWaveformsOn,
    phaseToAlignOn
  ]);
};

/**
 * Filters the signal detections in the current viewable interval down to only ones visible accounting for offset
 *
 * @param isSyncedToWaveformDisplay if the list should be filtered, if false the filtering is bypassed
 * @returns an array of filtered signal detections
 */
export const useVisibleSignalDetections = (
  isSyncedToWaveformDisplay: boolean
): SignalDetectionFetchResult => {
  const offsets = useWaveformOffsets();
  const [zoomInterval] = useZoomInterval();
  const signalDetections = useGetSignalDetections();

  return React.useMemo(() => {
    Timer.start(`[Waveform Hooks]: Build filtered SD List`);
    const filteredDetections = [];
    // if either zoomInterval or offsets are undefined/null dont filter
    // if not synced don't filter
    if (signalDetections.isLoading || !isSyncedToWaveformDisplay || !zoomInterval) {
      Timer.end(`[Waveform Hooks]: Build filtered SD List`);

      return signalDetections;
    }

    signalDetections.data.forEach(sd => {
      const channelName = SignalDetectionUtils.getSignalDetectionChannelName(sd);
      let receiverName = sd.station.name;
      const beamType = SignalDetectionUtils.parseWaveformChannelType(channelName);
      if (beamType === 'Raw channel') {
        receiverName = channelName;
      }

      const offset = offsets[receiverName] || 0;
      const arrivalTimeFeatureMeasurementValue = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
        SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
          .featureMeasurements
      );

      if (
        arrivalTimeFeatureMeasurementValue?.arrivalTime?.value >=
          zoomInterval.startTimeSecs - offset &&
        arrivalTimeFeatureMeasurementValue.arrivalTime.value <= zoomInterval.endTimeSecs - offset
      ) {
        filteredDetections.push(sd);
      }
    });
    Timer.end(`[Waveform Hooks]: Build filtered SD List`);

    // Keep the query meta data
    return produce(signalDetections, draft => {
      draft.data = filteredDetections;
    });
  }, [isSyncedToWaveformDisplay, offsets, signalDetections, zoomInterval]);
};

/**
 * Helper hook to to get the mask visibility record
 *
 * @returns mask visibility record
 */
export const useMaskVisibility = (): Record<string, boolean> => {
  const maskVisibility = useAppSelector(state => state.app.waveform.maskVisibility);
  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();

  // start with the mask default visibility and add any changes in redux state
  return React.useMemo(
    () => ({
      ...processingAnalystConfigurationQuery.data?.qcMaskTypeVisibilities,
      ...maskVisibility
    }),
    [maskVisibility, processingAnalystConfigurationQuery.data]
  );
};

/**
 * Helper hook to set up the params and request the masks for the waveform display
 *
 * @returns qc masks record
 */
export const useQcMasksForWaveformDisplay = (): QcSegmentFetchResult => {
  const [viewableInterval] = useViewableInterval();
  const channels = useRawChannels();
  const channelVersionReferences = React.useMemo(
    () => channels.map(channel => convertToVersionReference(channel, 'name')),
    [channels]
  );

  const args = React.useMemo(
    () => ({
      startTime: viewableInterval?.startTimeSecs,
      endTime: viewableInterval?.endTimeSecs,
      channels: channelVersionReferences
    }),
    [channelVersionReferences, viewableInterval]
  );
  return useQcSegments(args);
};

/**
 * Hook to obtain a single processing mask from UI channel segments in Redux
 * for the waveform display
 * Produces empty object if 0 or >1 signal detections selected
 *
 * @param signalDetectionResults signal detection query results
 * @returns
 */
export const useProcessingMaskForWaveformDisplay = (
  signalDetectionResults: SignalDetectionFetchResult
): ChannelSegmentTypes.ProcessingMask => {
  const uiChannelSegments = useAppSelector(selectUiChannelSegments);
  const selectedSdIds = useGetSelectedSdIds();

  const selectedSegmentChannelNames = React.useMemo(
    () =>
      signalDetectionResults.data
        ? flatMap(
            signalDetectionResults.data.filter(sd => selectedSdIds.includes(sd.id)),
            sd => sd.signalDetectionHypotheses[0].featureMeasurements[0].channel.name
          )
        : [],
    [selectedSdIds, signalDetectionResults.data]
  );

  return React.useMemo(
    () =>
      selectedSdIds.length === 1 && Object.keys(uiChannelSegments).length > 0
        ? flatMap(
            flatMap(Object.values(uiChannelSegments), segments =>
              segments.Unfiltered.filter(segment =>
                selectedSegmentChannelNames.includes(segment.channelSegment.id.channel.name)
              )
            ),
            segment => segment.processingMasks
          )[0]
        : null,
    [selectedSdIds.length, selectedSegmentChannelNames, uiChannelSegments]
  );
};

export const useGetPhaseHotkeys = (): PhaseHotkey[] => {
  const currentPhase = useAppSelector(state => state.app.analyst.currentPhase);
  const phaseLists = useGetProcessingAnalystConfigurationQuery()?.data?.phaseLists;
  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();
  return React.useMemo(() => {
    const defaultPhaseLabelAssignment =
      phaseLists?.length > 0 ? phaseLists[0].defaultPhaseLabelAssignment : null;
    const currentPhaseHotkey: PhaseHotkey = {
      hotkey: `${formatHotkeysForOs(
        keyboardShortcutConfigurations?.hotkeys?.currentPhaseLabel?.combos[0]
      )}`,
      phase: currentPhase,
      tooltip: (
        <HotkeyTooltip
          info="Current Phase"
          hotkey={formatHotkeysForOs(
            keyboardShortcutConfigurations?.hotkeys?.currentPhaseLabel?.combos[0]
          )}
        />
      )
    };
    const defaultPhaseHotkey: PhaseHotkey = {
      hotkey: `${formatHotkeysForOs(
        keyboardShortcutConfigurations?.hotkeys?.defaultPhaseLabel?.combos[0]
      )}`,
      phase: defaultPhaseLabelAssignment,
      tooltip: (
        <HotkeyTooltip
          info="Default Phase"
          hotkey={formatHotkeysForOs(
            keyboardShortcutConfigurations?.hotkeys?.defaultPhaseLabel?.combos[0]
          )}
        />
      )
    };
    return [currentPhaseHotkey, defaultPhaseHotkey];
  }, [
    currentPhase,
    keyboardShortcutConfigurations?.hotkeys?.currentPhaseLabel?.combos,
    keyboardShortcutConfigurations?.hotkeys?.defaultPhaseLabel?.combos,
    phaseLists
  ]);
};
