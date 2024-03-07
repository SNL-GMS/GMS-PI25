import type { CommonTypes } from '@gms/common-model';
import { EventTypes, SignalDetectionTypes } from '@gms/common-model';
import {
  findPreferredEventHypothesisByStage,
  findPreferredLocationSolution
} from '@gms/common-model/lib/event';
import { chunkRanges, determineExcludedRanges } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import flatMap from 'lodash/flatMap';
import intersection from 'lodash/intersection';
import uniq from 'lodash/uniq';
import * as React from 'react';
import { batch } from 'react-redux';

import type {
  EventStatus,
  FindEventsByAssociatedSignalDetectionHypothesesArgs,
  FindEventStatusInfoByStageIdAndEventIdsProps,
  FindEventStatusInfoByStageIdAndEventIdsQuery
} from '../api';
import {
  eventManagerApiSlice,
  selectEvents,
  selectOpenEventId,
  useGetProcessingAnalystConfigurationQuery,
  useUpdateEventStatusMutation
} from '../api';
import { findEventsByAssociatedSignalDetectionHypotheses } from '../api/data/event/find-events-by-assoc-sd-hypotheses';
import {
  getEventsWithDetectionsAndSegmentsByTime,
  shouldSkipGetEventsWithDetectionsAndSegmentsByTime
} from '../api/data/event/get-events-detections-segments-by-time';
import type {
  FindEventsByAssociatedSignalDetectionHypothesesHistory,
  FindEventsByAssociatedSignalDetectionHypothesesQueryArgs,
  GetEventsWithDetectionsAndSegmentsByTimeHistory,
  GetEventsWithDetectionsAndSegmentsByTimeQueryArgs
} from '../api/data/event/types';
import { UIStateError } from '../error-handling/ui-state-error';
import type { AsyncFetchResult } from '../query';
import { useProduceAndHandleSkip } from '../query/util';
import { selectOpenIntervalName } from '../state';
import { useFetchHistoryStatus } from './fetch-history-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useGetSignalDetections } from './signal-detection-hooks';
import { useViewableInterval } from './waveform-hooks';

const logger = UILogger.create('GMS_LOG_EVENT_MANAGER', process.env.GMS_LOG_EVENT_MANAGER);

/**
 * Defines async fetch result for the events by time history.
 *
 * @see {@link AsyncFetchResult}
 */
export type EventsWithDetectionsAndSegmentsByTimeHistoryFetchResult = AsyncFetchResult<
  GetEventsWithDetectionsAndSegmentsByTimeHistory
>;

export type EventsByAssociatedSignalDetectionHypothesesHistoryFetchResult = AsyncFetchResult<
  FindEventsByAssociatedSignalDetectionHypothesesHistory
>;

/**
 * Defines async fetch result for the events. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type EventsFetchResult = AsyncFetchResult<EventTypes.Event[]>;

/**
 * A hook that can be used to return the current history of the events by time query.
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the history of the `getEventsWithDetectionsAndSegmentsByTime` queries
 *
 * @returns returns the current history of the events by time query.
 */
export const useGetEventsWithDetectionsAndSegmentsByTimeHistory = (): EventsWithDetectionsAndSegmentsByTimeHistoryFetchResult => {
  const history = useAppSelector(
    state => state.data.queries.getEventsWithDetectionsAndSegmentsByTime
  );
  return useFetchHistoryStatus<GetEventsWithDetectionsAndSegmentsByTimeQueryArgs>(history);
};

/**
 * @returns the skipped result for the get signal detections by stations query
 */
const useGetEventsWithDetectionsAndSegmentsByTimeSkippedResult = (): EventsFetchResult => {
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
 * A hook that issues the requests for the events by time query. This hooks will call out to the events
 * service and if there is new data for the specified TimeRange will update the Events, Signal detections,
 * and channel segments associated with the events in the given TimeRange.
 *
 * You will need to subscribe to the useGetEvents, useGetSignalDetection, and useGetChannelSegments hooks
 * to get the data resulting from the any updated data.
 *
 * ! the fetches will be chunked based on the processing configuration
 *
 * @param args the events by time query arguments
 */
const useFetchEventsWithDetectionsAndSegmentsByTime = (
  args: GetEventsWithDetectionsAndSegmentsByTimeQueryArgs
): void => {
  const dispatch = useAppDispatch();

  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const history = useGetEventsWithDetectionsAndSegmentsByTimeHistory();

  const maxTimeRangeRequestInSeconds =
    processingAnalystConfiguration.data?.endpointConfigurations
      ?.getEventsWithDetectionsAndSegmentsByTime?.maxTimeRangeRequestInSeconds;

  React.useEffect(() => {
    const ranges = determineExcludedRanges(
      Object.values(history.data.eventsWithDetectionsAndSegmentsByTime ?? []).map(v => ({
        start: v.arg.startTime,
        end: v.arg.endTime
      })),
      { start: args.startTime, end: args.endTime }
    );

    if (ranges && ranges.length > 0) {
      // chunk up the data requests based on the `maxTimeRangeRequestInSeconds`
      const chunkedRanges = chunkRanges(ranges, maxTimeRangeRequestInSeconds);

      if (chunkedRanges && chunkedRanges.length > 0) {
        batch(() => {
          chunkedRanges.forEach(r => {
            dispatch(
              getEventsWithDetectionsAndSegmentsByTime({
                stageId: args.stageId,
                startTime: r.start,
                endTime: r.end
              })
            ).catch(error => {
              throw new UIStateError(error);
            });
          });
        });
      }
    }
  }, [dispatch, args, history.data, maxTimeRangeRequestInSeconds]);
};

/**
 * A hook that returns the fetch results for events by time.
 *
 *  This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the events from all requests
 *
 * ! the returned results are filtered so that the results only match what the query args requested
 *
 * @param args the query props data
 * @returns the events with segments and signal detections by time query. If skipped, the returned data will be set to `null`
 */
const useGetEventsByTime = (
  args: GetEventsWithDetectionsAndSegmentsByTimeQueryArgs
): EventsFetchResult => {
  const history = useGetEventsWithDetectionsAndSegmentsByTimeHistory();

  useFetchEventsWithDetectionsAndSegmentsByTime(args);

  const signalDetectionsResult = useGetSignalDetections();

  const openIntervalName = useAppSelector(selectOpenIntervalName);

  // retrieve all events from the state
  const events = useAppSelector(selectEvents);

  const skippedReturnValue = useGetEventsWithDetectionsAndSegmentsByTimeSkippedResult();

  const shouldSkip = shouldSkipGetEventsWithDetectionsAndSegmentsByTime(args);

  const emptyArray = React.useRef<EventTypes.Event[]>([]);

  const data = React.useMemo(() => (shouldSkip ? emptyArray.current : Object.values(events)), [
    events,
    shouldSkip
  ]);

  // filter the events based on the query args using the preferred hypothesis
  const filteredData = React.useMemo(() => {
    const sdhIds = flatMap(
      signalDetectionsResult.data?.map(sd => sd.signalDetectionHypotheses.map(sdh => sdh.id.id))
    );

    return data.filter(event => {
      const preferredEventHypothesis = findPreferredEventHypothesisByStage(event, openIntervalName);
      const locationSolution = findPreferredLocationSolution(
        preferredEventHypothesis.id.hypothesisId,
        event.eventHypotheses
      );

      const time = locationSolution?.location?.time;
      // check that the event time falls between the start and end time or if we have a visible SD that with an association
      return (
        (time >= args.startTime && time <= args.endTime) ||
        intersection(
          preferredEventHypothesis.associatedSignalDetectionHypotheses.map(sdh => sdh.id.id),
          sdhIds
        ).length > 0
      );
    });
  }, [args.endTime, args.startTime, data, openIntervalName, signalDetectionsResult.data]);

  return React.useMemo(() => {
    if (shouldSkipGetEventsWithDetectionsAndSegmentsByTime(args)) {
      return skippedReturnValue;
    }
    return { ...history, data: filteredData };
  }, [args, history, filteredData, skippedReturnValue]);
};

/**
 * A hook that can be used to retrieve query arguments based on the current state.
 * Accounts for the current interval and visible stations.
 *
 * @param interval interval of time to use as the start and end time
 * @returns the events with detections and segments by time query args.
 */
export const useQueryArgsForGetEventsWithDetectionsAndSegmentsByTime = (
  interval: CommonTypes.TimeRange
): GetEventsWithDetectionsAndSegmentsByTimeQueryArgs => {
  const stageName = useAppSelector(state => state.app.workflow.openIntervalName);
  return React.useMemo(
    () => ({
      startTime: interval?.startTimeSecs,
      endTime: interval?.endTimeSecs,
      stageId: {
        name: stageName
      }
    }),
    [interval, stageName]
  );
};

const useQueryArgsForFindEventsByAssociatedSignalDetectionHypotheses = (
  interval: CommonTypes.TimeRange
): FindEventsByAssociatedSignalDetectionHypothesesArgs => {
  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);

  const args = useQueryArgsForGetEventsWithDetectionsAndSegmentsByTime(interval);
  const eventsByTime = useGetEventsByTime(args);

  const signalDetectionsResult = useGetSignalDetections();

  const emptyArray = React.useRef<EventTypes.Event[]>([]);

  const signalDetectionHypotheses = React.useMemo(() => {
    // !wait for the signal detections and events by time to be completed until querying for associated events
    const signalDetections =
      !signalDetectionsResult.isLoading && !eventsByTime.isLoading
        ? signalDetectionsResult.data
        : emptyArray.current;

    const hypotheses: Record<string, SignalDetectionTypes.SignalDetectionHypothesis> = {};
    signalDetections.forEach(signalDetection => {
      // Don't query for things with unsaved changes, the server will spit back bad request errors
      if (
        signalDetection._uiHasUnsavedChanges ||
        signalDetection._uiHasUnsavedEventSdhAssociation
      ) {
        return;
      }
      const hypothesis = SignalDetectionTypes.Util.getCurrentHypothesis(
        signalDetection.signalDetectionHypotheses
      );

      hypotheses[hypothesis.id.id] = hypothesis;
    });
    return Object.values(hypotheses);
  }, [eventsByTime.isLoading, signalDetectionsResult.data, signalDetectionsResult.isLoading]);

  return React.useMemo(
    () => ({
      signalDetectionHypotheses,
      stageId: { name: openIntervalName }
    }),
    [openIntervalName, signalDetectionHypotheses]
  );
};

const useFindEventsByAssociatedSignalDetectionHypothesesHistory = (): EventsByAssociatedSignalDetectionHypothesesHistoryFetchResult => {
  const history = useAppSelector(
    state => state.data.queries.findEventsByAssociatedSignalDetectionHypotheses
  );
  return useFetchHistoryStatus<FindEventsByAssociatedSignalDetectionHypothesesArgs>(history);
};

const useFetchEventsByAssociatedSignalDetectionHypotheses = (
  args: FindEventsByAssociatedSignalDetectionHypothesesQueryArgs
): void => {
  const dispatch = useAppDispatch();
  const history = useFindEventsByAssociatedSignalDetectionHypothesesHistory();

  const utilizedSdHypothesesIds = React.useMemo(
    () =>
      uniq(
        flatMap(
          Object.values(history.data.eventsByAssociatedSignalDetectionHypotheses ?? []).map(
            v => v.arg.signalDetectionHypotheses
          )
        ).map(sdh => sdh.id.id)
      ).sort(),
    [history.data.eventsByAssociatedSignalDetectionHypotheses]
  );

  const filteredArgs = React.useMemo(
    () => ({
      signalDetectionHypotheses: uniq(
        args.signalDetectionHypotheses.filter(
          sdHypothesis => !utilizedSdHypothesesIds.includes(sdHypothesis.id.id)
        )
      ).sort(),
      stageId: args.stageId
    }),
    [args, utilizedSdHypothesesIds]
  );

  React.useEffect(() => {
    dispatch(findEventsByAssociatedSignalDetectionHypotheses(filteredArgs)).catch(error => {
      throw new UIStateError(error);
    });
  }, [dispatch, filteredArgs]);
};

/**
 * A hook that can be used to retrieve events for the current interval.
 * Also obtains edge events outside interval if they are associated to SDs within interval
 *
 * @returns the events results for the viewable interval.
 */
export const useGetEvents = (): EventsFetchResult => {
  const [viewableInterval] = useViewableInterval();

  const args = useQueryArgsForGetEventsWithDetectionsAndSegmentsByTime(viewableInterval);
  const eventsByTime = useGetEventsByTime(args);

  const eventsByAssociatedSignalDetectionHypothesesArgs = useQueryArgsForFindEventsByAssociatedSignalDetectionHypotheses(
    viewableInterval
  );
  useFetchEventsByAssociatedSignalDetectionHypotheses(
    eventsByAssociatedSignalDetectionHypothesesArgs
  );

  return eventsByTime;
};

/**
 * Wraps the hook from the event manager api slice to allow for reuse of
 * Returns the query result for the event status by stage and event ids query.
 *
 * The useEventStatusQuery hook wraps the RTK query hook
 * useFindEventStatusInfoByStageIdAndEventIdsQuery; to allow for reuse of
 * configuration, i.e. specifying when to skip the query.
 *
 * @returns the event status by stage and event ids. If skipped, the return will be null
 */
export const useEventStatusQuery = (): FindEventStatusInfoByStageIdAndEventIdsQuery => {
  const stageName = useAppSelector(state => state.app.workflow.openIntervalName);
  const eventResults = useGetEvents();
  const data: FindEventStatusInfoByStageIdAndEventIdsProps = React.useMemo(() => {
    return {
      stageId: { name: stageName },
      eventIds: eventResults?.data?.map(event => event.id)
    };
  }, [eventResults.data, stageName]);

  const skip =
    data.stageId?.name == null ||
    data.eventIds == null ||
    data.eventIds.length < 1 ||
    eventResults.pending > 0;

  return useProduceAndHandleSkip(
    eventManagerApiSlice.useFindEventStatusInfoByStageIdAndEventIdsQuery(data, { skip }),
    skip
  );
};

/**
 * @returns function that will create a new {@link EventStatus} according to the
 * structure for new events and new virtual events.
 */
export const useCreateNewEventStatus = () => {
  const [updateEventStatusMutation] = useUpdateEventStatusMutation();
  const stageName = useAppSelector(selectOpenIntervalName);

  return React.useCallback(
    async (eventId: string) => {
      const newEventStatus: EventStatus = {
        stageId: {
          name: stageName
        },
        eventId,
        eventStatusInfo: {
          eventStatus: EventTypes.EventStatus.NOT_COMPLETE,
          activeAnalystIds: []
        }
      };
      await updateEventStatusMutation(newEventStatus);
    },
    [stageName, updateEventStatusMutation]
  );
};

/**
 * @returns function that will update an existing {@link EventStatus} according to the
 * structure for rejected/deleted events.
 */
export const useRejectDeleteEventStatus = () => {
  const [updateEventStatusMutation] = useUpdateEventStatusMutation();
  const eventStatuses: Record<string, EventStatus> = useEventStatusQuery()?.data;
  const openEventId = useAppSelector(selectOpenEventId);

  return React.useCallback(
    (eventIds: string[]) => {
      eventIds.forEach(async id => {
        const eventStatus = eventStatuses ? eventStatuses[id] : undefined;
        if (!eventStatus) {
          logger.warn(`Could not locate/update EventStatus for event ${id}`);
          return;
        }

        // If the rejected/deleted event is open (IN_PROGRESS) do not change eventStatus
        if (
          id === openEventId &&
          eventStatus.eventStatusInfo.eventStatus === EventTypes.EventStatus.IN_PROGRESS
        )
          return;
        // Otherwise set to NOT_COMPLETE
        const updatedEventStatus: EventStatus = {
          ...eventStatus,
          eventStatusInfo: {
            ...eventStatus.eventStatusInfo,
            eventStatus: EventTypes.EventStatus.NOT_COMPLETE
          }
        };
        await updateEventStatusMutation(updatedEventStatus);
      });
    },
    [eventStatuses, openEventId, updateEventStatusMutation]
  );
};

/**
 * !Not complete, duplicate events are not yet sent to database
 *
 * @returns function that will create a new {@link EventStatus} according to the
 * structure for new, duplicated events.
 */
export const useDuplicateEventStatus = () => {
  // TODO: future work: update duplicated event status once duplicated events are in the DB
  // const [updateEventStatusMutation] = useUpdateEventStatusMutation();
  // const eventStatuses: Record<string, EventStatus> = useEventStatusQuery().data;
  const stageName = useAppSelector(selectOpenIntervalName);

  return React.useCallback(
    (eventIds: string[]) => {
      eventIds.forEach(id => {
        const newEventStatus: EventStatus = {
          stageId: {
            name: stageName
          },
          eventId: id,
          eventStatusInfo: {
            activeAnalystIds: [],
            eventStatus: EventTypes.EventStatus.NOT_COMPLETE
          }
        };
        logger.warn(
          `Duplicate event: should only publish EventStatus for Duplicated Events once they exist in the DB.`,
          newEventStatus
        );
      });
    },
    [stageName]
  );
};
