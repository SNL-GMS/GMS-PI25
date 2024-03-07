import type { EventTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { IS_NODE_ENV_DEVELOPMENT } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { isDraft, original } from 'immer';
import isEqual from 'lodash/isEqual';

import type { ChannelName, UiChannelSegment } from '../../../../types';
import { fetchEventsWithDetectionsAndSegmentsByTime } from '../../../../workers';
import type { EventsWithDetectionsAndSegmentsFetchResults } from '../../../../workers/waveform-worker/operations/fetch-events-detections-segments-by-time';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import { updateStationsVisibilityForSignalDetections } from '../../../state/waveform/operations';
import type { AppDispatch, AppState } from '../../../store';
import type { DataState } from '../types';
import { mutateUiChannelSegmentsRecord } from '../waveform/mutate-channel-segment-record';
import { config } from './endpoint-configuration';
import type { GetEventsWithDetectionsAndSegmentsByTimeQueryArgs } from './types';

const logger = UILogger.create('GMS_LOG_FETCH_EVENTS', process.env.GMS_LOG_FETCH_EVENTS);

/**
 * Helper function used to determine if the getEventsWithDetectionsAndSegmentsByTime query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetEventsWithDetectionsAndSegmentsByTime = (
  args: GetEventsWithDetectionsAndSegmentsByTimeQueryArgs
): boolean =>
  !args ||
  args.startTime == null ||
  args.endTime == null ||
  args.stageId == null ||
  args.stageId?.name == null;

/** validate event data received from the backend; check for duplicates */
const validateEventData = (state: DataState, event: EventTypes.Event) => {
  // validate the received events; check for any duplicates and differences
  if (IS_NODE_ENV_DEVELOPMENT) {
    if (state.events[event.id] !== undefined) {
      const originalEvent = isDraft(state.events[event.id])
        ? original<EventTypes.Event>(state.events[event.id])
        : state.events[event.id];
      if (!isEqual(originalEvent, event)) {
        logger.error(
          `getEventsWithDetectionsAndSegmentsByTime - received duplicate event that are different for id ${originalEvent.id}`,
          originalEvent,
          event
        );
      } else {
        logger.warn(
          `getEventsWithDetectionsAndSegmentsByTime - received duplicate event that are equal for id ${originalEvent.id}`
        );
      }
    }
  }
};

/** validate signal detection data received from the backend; check for duplicates */
const validateSignalDetectionData = (
  state: DataState,
  signalDetection: SignalDetectionTypes.SignalDetection
) => {
  // validate the received signal detections; check for any duplicates and differences
  if (IS_NODE_ENV_DEVELOPMENT) {
    if (state.signalDetections[signalDetection.id] !== undefined) {
      const originalSd = isDraft(state.signalDetections[signalDetection.id])
        ? original<SignalDetectionTypes.SignalDetection>(state.signalDetections[signalDetection.id])
        : state.signalDetections[signalDetection.id];
      if (!isEqual(originalSd, signalDetection)) {
        logger.error(
          `getEventsWithDetectionsAndSegmentsByTime - received duplicate sd that are different for id ${originalSd.id}`,
          originalSd,
          signalDetection
        );
      } else {
        logger.warn(
          `getEventsWithDetectionsAndSegmentsByTime - received duplicate sd that are equal for id ${originalSd.id}`
        );
      }
    }
  }
};

/**
 * Async thunk action that fetches (requests) signal detections by station.
 */
export const getEventsWithDetectionsAndSegmentsByTime = createAsyncThunk<
  EventsWithDetectionsAndSegmentsFetchResults,
  GetEventsWithDetectionsAndSegmentsByTimeQueryArgs
>(
  'events/getEventsWithDetectionsAndSegmentsByTime',
  async (
    arg: GetEventsWithDetectionsAndSegmentsByTimeQueryArgs,
    { getState, dispatch, rejectWithValue }
  ) => {
    const state = (getState as () => AppState)();
    const appDispatch = dispatch as AppDispatch;
    const { timeRange } = state.app.workflow;

    const requestConfig = {
      ...config.event.services.getEventsWithDetectionsAndSegmentsByTime.requestConfig,
      data: arg
    };

    return fetchEventsWithDetectionsAndSegmentsByTime(requestConfig, timeRange)
      .then(results => {
        appDispatch(updateStationsVisibilityForSignalDetections(results.signalDetections));
        return results;
      })
      .catch(error => {
        if (error.message !== 'canceled') {
          logger.error(`Failed getEventsWithDetectionsAndSegmentsByTime (rejected)`, error);
        }
        return rejectWithValue(error);
      });
  },
  {
    condition: (arg: GetEventsWithDetectionsAndSegmentsByTimeQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetEventsWithDetectionsAndSegmentsByTime(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests =
        state.data.queries.getEventsWithDetectionsAndSegmentsByTime
          .eventsWithDetectionsAndSegmentsByTime ?? {};
      return !hasAlreadyBeenRequested(requests, arg);
    }
  }
);

/**
 * Injects the getEventsWithDetectionsAndSegmentsByTime reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetEventsWithDetectionsAndSegmentsByTimeReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    /**
     * getEventsWithDetectionsAndSegmentsByTime PENDING action
     * Updates the events query state to indicate that the query status is pending.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(getEventsWithDetectionsAndSegmentsByTime.pending, (state, action) => {
      const history = state.queries.getEventsWithDetectionsAndSegmentsByTime;
      if (!history.eventsWithDetectionsAndSegmentsByTime) {
        history.eventsWithDetectionsAndSegmentsByTime = {};
      }
      history.eventsWithDetectionsAndSegmentsByTime[action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })

    /**
     * getEventsWithDetectionsAndSegmentsByTime FULFILLED action
     * Updates the events query state to indicate that the query status is fulfilled.
     * Stores the retrieved events in the events redux state.
     * Stores the retrieved signal detections in the signal detection redux state.
     * Stores the retrieved channel segments in the channel segment redux state.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(getEventsWithDetectionsAndSegmentsByTime.fulfilled, (state, action) => {
      const history = state.queries.getEventsWithDetectionsAndSegmentsByTime;
      const id = action.meta.requestId;

      if (!history.eventsWithDetectionsAndSegmentsByTime) {
        history.eventsWithDetectionsAndSegmentsByTime = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (!Object.hasOwnProperty.call(history.eventsWithDetectionsAndSegmentsByTime, id)) {
        return;
      }
      history.eventsWithDetectionsAndSegmentsByTime[id] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      action.payload.events.forEach(event => {
        validateEventData(state, event);
        state.events[event.id] = event;
      });

      const uiChannelSegments: Record<ChannelName, UiChannelSegment> = {};
      action.payload.uiChannelSegments.forEach(cs => {
        uiChannelSegments[cs.channelSegment.id.channel.name] = cs;
      });

      action.payload.signalDetections.forEach(sd => {
        validateSignalDetectionData(state, sd);
        state.signalDetections[sd.id] = sd;

        const arrivalTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
            .featureMeasurements
        );

        const uiChannelSegment = uiChannelSegments[arrivalTime.channel.name];

        if (uiChannelSegment) {
          mutateUiChannelSegmentsRecord(state.uiChannelSegments, sd.station.name, [
            uiChannelSegment
          ]);
        }
      });
    })

    /**
     * getEventsWithDetectionsAndSegmentsByTime REJECTED action
     * Updates the events query state to indicate that the query status is rejected,
     * and adds the error message.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(getEventsWithDetectionsAndSegmentsByTime.rejected, (state, action) => {
      const history = state.queries.getEventsWithDetectionsAndSegmentsByTime;
      // don't update if the history has been cleared before this promise rejected
      if (history.eventsWithDetectionsAndSegmentsByTime == null) {
        return;
      }
      history.eventsWithDetectionsAndSegmentsByTime[action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
