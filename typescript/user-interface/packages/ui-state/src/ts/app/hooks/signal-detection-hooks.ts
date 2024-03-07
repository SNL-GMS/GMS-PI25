import type { CommonTypes, EventTypes, StationTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { findPreferredEventHypothesisByStage } from '@gms/common-model/lib/event';
import type { SignalDetectionHypothesisFaceted } from '@gms/common-model/lib/signal-detection';
import { determineExcludedRanges } from '@gms/common-util';
import includes from 'lodash/includes';
import orderBy from 'lodash/orderBy';
import React, { useEffect, useMemo } from 'react';
import { batch } from 'react-redux';

import type { SignalDetectionsRecord } from '../../types';
import {
  selectEvents,
  selectMissingSignalDetectionsHypothesesForFilterDefinitions,
  selectOpenEventId,
  selectSignalDetections
} from '../api';
import { getFilterDefinitionsForSignalDetectionHypotheses } from '../api/data/signal-detection/get-filter-definitions-for-signal-detection-hypotheses';
import { getFilterDefinitionsForSignalDetections } from '../api/data/signal-detection/get-filter-definitions-for-signal-detections';
import {
  getSignalDetectionsAndSegmentsByStationAndTime,
  shouldSkipGetSignalDetectionsWithSegmentsByStationAndTime
} from '../api/data/signal-detection/get-signal-detections-segments-by-station-time';
import type {
  GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs,
  GetFilterDefinitionsForSignalDetectionsQueryArgs,
  GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs,
  GetSignalDetectionsWithSegmentsByStationAndTimeHistory,
  GetSignalDetectionsWithSegmentsByStationAndTimeQueryArgs
} from '../api/data/signal-detection/types';
import { UIStateError } from '../error-handling/ui-state-error';
import type { AsyncFetchResult } from '../query';
import {
  analystActions,
  selectActionTargetSignalDetectionIds,
  selectCurrentPhase,
  selectDefaultPhase,
  selectOpenIntervalName,
  selectPreferredEventHypothesisByStageForOpenEvent,
  selectSdIdsToShowFk,
  selectSelectedSdIds
} from '../state';
import type { SignalDetectionActionTypes } from '../state/analyst/types';
import {
  determineAllAssociableSignalDetections,
  determineAllDeletableSignalDetections,
  determineAllNonAssociableSignalDetections,
  determineAllValidPhaseChangesForSignalDetections
} from '../util/util';
import { useFetchHistoryStatus } from './fetch-history-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useVisibleStations } from './station-definition-hooks';
import { useViewableInterval } from './waveform-hooks';
import { useStageId } from './workflow-hooks';

/**
 * Defines async fetch result for the signal detections by station history.
 *
 * @see {@link AsyncFetchResult}
 */
export type SignalDetectionsWithSegmentsByStationAndTimeHistoryFetchResult = AsyncFetchResult<
  GetSignalDetectionsWithSegmentsByStationAndTimeHistory
>;

/**
 * Defines async fetch result for the signal detections. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type SignalDetectionFetchResult = AsyncFetchResult<SignalDetectionTypes.SignalDetection[]>;

/**
 * Get the current record of signal detections
 *
 * @returns the signal detection record
 */
export const useSignalDetections = (): SignalDetectionsRecord => {
  return useAppSelector(selectSignalDetections);
};

/**
 * Get all signal detection hypotheses
 *
 * @returns an array of signal detection hypotheses
 */
export const useSignalDetectionHypotheses = (): SignalDetectionTypes.SignalDetectionHypothesis[] => {
  const signalDetections = useSignalDetections();

  return useMemo(
    () =>
      Object.values(signalDetections)?.flatMap(
        signalDetection => signalDetection.signalDetectionHypotheses
      ),
    [signalDetections]
  );
};

/**
 * Get the currently selected signal detections IDs across all displays
 *
 * @returns []
 */
export const useGetSelectedSdIds = (): string[] => {
  return useAppSelector(selectSelectedSdIds);
};

/**
 * Hook that returns a function to set selected SD id's.
 *
 * Updates the redux state with the selected SD id(s).
 *
 * @returns a callback function to set signal detection(s) which accepts a list of
 * sdIds
 */
export const useSetSelectedSdIds = () => {
  const dispatch = useAppDispatch();

  return React.useCallback(
    (sdIds: string[]) => {
      dispatch(analystActions.setSelectedSdIds(sdIds));
    },
    [dispatch]
  );
};

/**
 * Get the currently selected signal detections IDs across all displays
 *
 * @returns []
 */
export const useGetSdIdsToShowFk = (): string[] => {
  return useAppSelector(selectSdIdsToShowFk);
};

/**
 * Hook that returns a function to show selected FKs in Azimuth/Slowness display.
 *
 * Updates the redux state with the selected SD id(s) to show FK(s).
 *
 * @returns a callback function to show FKs which accepts a list of
 * sdIds
 */
export const useSetSdIdsToShowFk = () => {
  const dispatch = useAppDispatch();

  return React.useCallback(
    (sdIds: string[]) => {
      dispatch(analystActions.setSdIdsToShowFk(sdIds));
    },
    [dispatch]
  );
};

/**
 * A hook that can be used to return the current history of the signal detections by station query.
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the history of the `getSignalDetectionWithSegmentsByStationAndTime` queries
 *
 * @returns returns the current history of the signal detections by station query.
 */
export const useGetSignalDetectionsWithSegmentsByStationAndTimeHistory = (): SignalDetectionsWithSegmentsByStationAndTimeHistoryFetchResult => {
  const history = useAppSelector(
    state => state.data.queries.getSignalDetectionWithSegmentsByStationAndTime
  );
  return useFetchHistoryStatus<GetSignalDetectionsWithSegmentsByStationAndTimeQueryArgs>(history);
};

/**
 * @returns the skipped result for the get signal detections by stations query
 */
const useGetSignalDetectionsAndSegmentsByStationsAndTimeSkippedResult = (): SignalDetectionFetchResult => {
  const result = React.useRef({
    data: [],
    pending: 0,
    fulfilled: 0,
    rejected: 0,
    isLoading: false,
    isError: false
  });
  return result.current;
};

/**
 * A hook that issues the requests for the signal detections by stations.
 *
 * @param args the signal detections by stations query arguments
 */
const useFetchSignalDetectionsWithSegmentsByStationsTime = (
  args: GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs
): void => {
  const dispatch = useAppDispatch();
  const history = useGetSignalDetectionsWithSegmentsByStationAndTimeHistory();

  React.useEffect(() => {
    args.stations.forEach(station => {
      const ranges = determineExcludedRanges(
        Object.values(history.data[station.name] ?? []).map(v => ({
          start: v.arg.startTime,
          end: v.arg.endTime
        })),
        { start: args.startTime, end: args.endTime }
      );

      batch(() => {
        ranges.forEach(r => {
          dispatch(
            getSignalDetectionsAndSegmentsByStationAndTime({
              station,
              stageId: args.stageId,
              startTime: r.start,
              endTime: r.end,
              excludedSignalDetections: args.excludedSignalDetections
            })
          ).catch(error => {
            throw new UIStateError(error);
          });
        });
      });
    });
  }, [dispatch, args, history.data]);
};

/**
 * A hook that can be used to retrieve signal detections by stations.
 * Makes an individual async request for each station.
 *
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the signal detections from all requests
 *
 * ! the returned results are filtered so that the results only match what the query args requested
 *
 * @param args the signal detection by stations query arguments
 *
 * @returns the signal detections fetch result.
 */
const useGetSignalDetectionsByStationsAndTime = (
  args: GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs
): SignalDetectionFetchResult => {
  const history = useGetSignalDetectionsWithSegmentsByStationAndTimeHistory();

  // issue any new fetch requests
  useFetchSignalDetectionsWithSegmentsByStationsTime(args);

  // retrieve all signal detections from the state
  const signalDetections = useAppSelector(selectSignalDetections);
  const skippedReturnValue = useGetSignalDetectionsAndSegmentsByStationsAndTimeSkippedResult();

  // filter out the signal detections based on the query parameters
  const data = React.useMemo(
    () =>
      Object.values(signalDetections).filter(sd => {
        const sdh = SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses);
        const arrivalTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
          sdh.featureMeasurements
        )?.arrivalTime.value;
        return (
          args.startTime <= arrivalTime &&
          arrivalTime <= args.endTime &&
          args.stations.find(visStation => visStation.name === sd.station.name)
        );
      }),
    [args.endTime, args.startTime, args.stations, signalDetections]
  );

  return React.useMemo(() => {
    if (
      shouldSkipGetSignalDetectionsWithSegmentsByStationAndTime({
        ...args,
        station: args.stations && args.stations.length > 1 ? args.stations[0] : undefined
      })
    ) {
      return skippedReturnValue;
    }

    return { ...history, data };
  }, [args, data, history, skippedReturnValue]);
};

/**
 * A hook that can be used to retrieve query arguments based on the current state.
 * Accounts for the current interval and visible stations.
 *
 * @param interval interval of time to use as the start and end time
 * {@link GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs.startTime startTime}
 * {@link GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs.endTime endTime}
 * @returns the signal detection by stations and time query args.
 */
export const useQueryArgsForGetSignalDetectionsAndSegmentsByStationsAndTime = (
  interval: CommonTypes.TimeRange
): GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs => {
  const visibleStations = useVisibleStations();
  const stageName = useAppSelector(selectOpenIntervalName);
  const stations = React.useMemo(
    () =>
      visibleStations?.length > 0
        ? orderBy(visibleStations, s => s.name).map((station: StationTypes.Station) => {
            return { name: station.name };
          })
        : [],
    [visibleStations]
  );

  return React.useMemo(
    () => ({
      stations,
      startTime: interval?.startTimeSecs,
      endTime: interval?.endTimeSecs,
      excludedSignalDetections: [],
      stageId: {
        name: stageName
      }
    }),
    [stations, interval, stageName]
  );
};

/**
 * A hook that can be used to retrieve Preferred Event Hypothesis for the current opened event.
 *
 * @param stageId
 * @returns the preferred event hypothesis result
 */
export const usePreferredEventHypothesis = (): EventTypes.EventHypothesis | undefined => {
  const openEventId = useAppSelector(selectOpenEventId);
  const events = useAppSelector(selectEvents);
  const openIntervalName = useAppSelector(selectOpenIntervalName);

  return React.useMemo(() => {
    const eventsList = Object.values(events).map(event => event);
    const openEvent = eventsList.find(e => e.id === openEventId);

    return findPreferredEventHypothesisByStage(openEvent, openIntervalName);
  }, [events, openEventId, openIntervalName]);
};

/**
 * A hook that can be used to retrieve signal detections for the current interval and visible stations.
 *
 * @returns the signal detections result based on the interval parameter
 * otherwise the result is based on the viewable interval.
 */
export const useGetSignalDetections = (): SignalDetectionFetchResult => {
  const [viewableInterval] = useViewableInterval();
  const args = useQueryArgsForGetSignalDetectionsAndSegmentsByStationsAndTime(viewableInterval);
  return useGetSignalDetectionsByStationsAndTime(args);
};

/**
 * builds a record given SignalDetectionHypothesisFacetedList
 *
 * @param signalDetectionHypotheses
 * @returns Record<signalDetectionsHypothesis.id.signalDetectionId, signalDetectionsHypothesis.id.id>
 */
export const buildRecordFromSignalDetectionHypothesisFacetedList = (
  signalDetectionHypotheses: SignalDetectionTypes.SignalDetectionHypothesisFaceted[]
): Record<string, string[]> => {
  const record: Record<string, string[]> = {};
  signalDetectionHypotheses.forEach(signalDetectionsHypothesis => {
    if (!record?.[signalDetectionsHypothesis.id.signalDetectionId])
      record[signalDetectionsHypothesis.id.signalDetectionId] = [];
    record[signalDetectionsHypothesis.id.signalDetectionId].push(signalDetectionsHypothesis.id.id);
  });
  return record;
};

/**
 * builds a record given SignalDetectionHypothesisQueryArgs
 *
 * @param SignalDetectionHypothesisList
 * @returns Record<signalDetectionsHypothesis.id.signalDetectionId, signalDetectionsHypothesis.id.id>
 */
export const buildRecordFromSignalDetectionHypothesisQueryArgs = (
  SignalDetectionHypothesisQueryArgs: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs[]
): Record<string, string[]> => {
  return buildRecordFromSignalDetectionHypothesisFacetedList(
    SignalDetectionHypothesisQueryArgs.map(
      requestArg => requestArg.signalDetectionsHypotheses
    ).flatMap(signalDetectionsHypotheses => signalDetectionsHypotheses)
  );
};

/**
 * A hook that can be used to return the signal detection request history of the
 * getFilterDefinitionsForSignalDetections query.
 *
 * @returns record of requested signal detection id's and hypothesis id's
 */
export const useFilterDefinitionsForSignalDetectionsQueryHistory = (): Record<string, string[]> => {
  const history = useAppSelector(
    state => state.data.queries.getFilterDefinitionsForSignalDetections
  );
  return useMemo(() => {
    const list = Object.values(history).flatMap(key =>
      Object.values(key).flatMap(request => request.arg.signalDetectionsHypotheses)
    );
    return buildRecordFromSignalDetectionHypothesisFacetedList(list);
  }, [history]);
};

/**
 * A hook that can be used to return the signal detection hypothesis request history of the
 * getFilterDefinitionsForSignalDetectionHypotheses query as
 * [recordFilterDefinitionsForSignalDetectionHypothesesNoEventHypothesis,
 * recordFilterDefinitionsForSignalDetectionHypothesesEventHypothesis]
 *
 * @returns record of requested signal detection id's and hypothesis id's
 */
export const useFilterDefinitionsForSignalDetectionHypothesesQueryHistory = () => {
  const history = useAppSelector(
    state => state.data.queries.getFilterDefinitionsForSignalDetectionHypotheses
  );
  return useMemo(() => {
    const list = Object.values(history).flatMap(key =>
      Object.values(key).flatMap(request => request.arg)
    );
    const SignalDetectionHypothesisListNoEventHypothesis = list.filter(requestArg => {
      return !requestArg.eventHypothesis;
    });
    const SignalDetectionHypothesisListEventHypothesis = list.filter(requestArg => {
      return !!requestArg.eventHypothesis;
    });
    const recordFilterDefinitionsForSignalDetectionHypothesesNoEventHypothesis = buildRecordFromSignalDetectionHypothesisQueryArgs(
      SignalDetectionHypothesisListNoEventHypothesis
    );
    const recordFilterDefinitionsForSignalDetectionHypothesesEventHypothesis = buildRecordFromSignalDetectionHypothesisQueryArgs(
      SignalDetectionHypothesisListEventHypothesis
    );
    return [
      recordFilterDefinitionsForSignalDetectionHypothesesNoEventHypothesis,
      recordFilterDefinitionsForSignalDetectionHypothesesEventHypothesis
    ] as const;
  }, [history]);
};

/**
 * A hook that can be used to retrieve and store named filter definitions for signal detections.
 */
export const useGetFilterDefinitionsForSignalDetections = () => {
  const dispatch = useAppDispatch();
  const stageId = useStageId();
  const signalDetections = useSignalDetections();
  const requestedSignalDetectionIds = useFilterDefinitionsForSignalDetectionsQueryHistory();
  const [
    requestedSignalDetectionIdsForSignalDetectionHypothesesQuery,
    requestedSignalDetectionIdsForSignalDetectionHypothesesWithEventQuery
  ] = useFilterDefinitionsForSignalDetectionHypothesesQueryHistory();
  const missingSignalDetectionsHypothesesForFilterDefinitions = useAppSelector(
    selectMissingSignalDetectionsHypothesesForFilterDefinitions
  );

  const eventHypothesis = usePreferredEventHypothesis();
  const signalDetectionsHypothesesIds: SignalDetectionHypothesisFaceted[] = useMemo(() => {
    const ids: SignalDetectionHypothesisFaceted[] = Object.values(signalDetections)
      // Do not return unsaved SD Hypothesis since they do not exist in the backend
      // So no default filter can be queried
      .filter(sd => !sd._uiHasUnsavedChanges)
      .flatMap(value =>
        value.signalDetectionHypotheses.map(signalDetectionHypothesis => ({
          id: signalDetectionHypothesis.id
        }))
      );
    return ids.filter(
      signalDetectionHypothesisId =>
        !requestedSignalDetectionIds?.[signalDetectionHypothesisId.id.signalDetectionId]?.includes(
          signalDetectionHypothesisId.id.id
        )
    );
  }, [requestedSignalDetectionIds, signalDetections]);

  const signalDetectionsHypothesesIdsForSignalDetectionHypothesesQuery: SignalDetectionHypothesisFaceted[] = useMemo(() => {
    return missingSignalDetectionsHypothesesForFilterDefinitions.filter(
      signalDetectionHypothesisIdForFilterDefinitions =>
        !requestedSignalDetectionIdsForSignalDetectionHypothesesQuery?.[
          signalDetectionHypothesisIdForFilterDefinitions.id.signalDetectionId
        ]?.includes(signalDetectionHypothesisIdForFilterDefinitions.id.id)
    );
  }, [
    missingSignalDetectionsHypothesesForFilterDefinitions,
    requestedSignalDetectionIdsForSignalDetectionHypothesesQuery
  ]);

  const signalDetectionsHypothesesIdsForSignalDetectionHypothesesWithEventQuery: SignalDetectionHypothesisFaceted[] = useMemo(() => {
    return missingSignalDetectionsHypothesesForFilterDefinitions.filter(
      signalDetectionHypothesisIdForFilterDefinitions =>
        !requestedSignalDetectionIdsForSignalDetectionHypothesesWithEventQuery?.[
          signalDetectionHypothesisIdForFilterDefinitions.id.signalDetectionId
        ]?.includes(signalDetectionHypothesisIdForFilterDefinitions.id.id)
    );
  }, [
    missingSignalDetectionsHypothesesForFilterDefinitions,
    requestedSignalDetectionIdsForSignalDetectionHypothesesWithEventQuery
  ]);

  useEffect(() => {
    batch(() => {
      if (signalDetectionsHypothesesIds?.length) {
        const requestArgsEvent: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
          stageId: {
            name: stageId.definitionId.name
          },
          signalDetectionsHypotheses: signalDetectionsHypothesesIds
        };
        dispatch(getFilterDefinitionsForSignalDetections(requestArgsEvent)).catch(error => {
          throw new UIStateError(error);
        });
      }
      if (signalDetectionsHypothesesIdsForSignalDetectionHypothesesQuery?.length) {
        const requestArgsEvent: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs = {
          stageId: {
            name: stageId.definitionId.name
          },
          signalDetectionsHypotheses: signalDetectionsHypothesesIdsForSignalDetectionHypothesesQuery
        };
        dispatch(getFilterDefinitionsForSignalDetectionHypotheses(requestArgsEvent)).catch(
          error => {
            throw new UIStateError(error);
          }
        );
      }
      if (
        signalDetectionsHypothesesIdsForSignalDetectionHypothesesWithEventQuery?.length &&
        eventHypothesis
      ) {
        const requestArgsEvent: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs = {
          stageId: {
            name: stageId.definitionId.name
          },
          signalDetectionsHypotheses: signalDetectionsHypothesesIdsForSignalDetectionHypothesesWithEventQuery,
          // the open event hypothesis will be undefined if no event is opened
          eventHypothesis
        };
        dispatch(getFilterDefinitionsForSignalDetectionHypotheses(requestArgsEvent)).catch(
          error => {
            throw new UIStateError(error);
          }
        );
      }
    });
  }, [
    dispatch,
    eventHypothesis,
    signalDetectionsHypothesesIds,
    signalDetectionsHypothesesIdsForSignalDetectionHypothesesQuery,
    signalDetectionsHypothesesIdsForSignalDetectionHypothesesQuery?.length,
    signalDetectionsHypothesesIdsForSignalDetectionHypothesesWithEventQuery,
    stageId
  ]);
};

/**
 * ! Updates to the switch statement MUST be mirrored in selectValidActionTargetSignalDetectionIds selector
 * Hook to determine action targets by type
 *
 * @returns a function that determines signal detections action targets by type
 */
export const useDetermineActionTargetsByType = () => {
  const actionTargetSignalDetectionIds = useAppSelector(selectActionTargetSignalDetectionIds);
  const defaultPhase = useAppSelector(selectDefaultPhase);
  const currentPhase = useAppSelector(selectCurrentPhase);
  const preferredEventHypothesisByStageForOpenEvent = useAppSelector(
    selectPreferredEventHypothesisByStageForOpenEvent
  );
  const signalDetections = useAppSelector(selectSignalDetections);
  const selectedSignalDetectionsCurrentHypotheses = Object.values(signalDetections)
    .filter(sd => includes(actionTargetSignalDetectionIds, sd.id))
    .map(sd => SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses));

  const determineActionTargetsByType = React.useCallback(
    (type: SignalDetectionActionTypes): string[] => {
      switch (type) {
        case 'associate':
          return determineAllAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'unassociate':
        case 'reject associate':
          return determineAllNonAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'delete':
        case 'phase':
          return determineAllDeletableSignalDetections(selectedSignalDetectionsCurrentHypotheses);
        case 'default phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            defaultPhase
          );
        case 'current phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            currentPhase
          );
        default:
          return actionTargetSignalDetectionIds;
      }
    },
    [
      actionTargetSignalDetectionIds,
      currentPhase,
      defaultPhase,
      preferredEventHypothesisByStageForOpenEvent,
      selectedSignalDetectionsCurrentHypotheses
    ]
  );

  return React.useCallback(
    (type: SignalDetectionActionTypes): string[] => {
      return determineActionTargetsByType(type);
    },
    [determineActionTargetsByType]
  );
};
