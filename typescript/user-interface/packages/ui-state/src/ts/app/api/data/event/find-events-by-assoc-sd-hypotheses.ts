import type { EventTypes } from '@gms/common-model';
import { chunkRange, IS_NODE_ENV_DEVELOPMENT } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import type { AxiosBaseQueryFn } from '@gms/ui-workers';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { isDraft, original } from 'immer';
import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';

import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import type { AppState } from '../../../store';
import type { DataState } from '../types';
import { config } from './endpoint-configuration';
import type { FindEventsByAssociatedSignalDetectionHypothesesQueryArgs } from './types';

const logger = UILogger.create('GMS_LOG_FETCH_EVENTS', process.env.GMS_LOG_FETCH_EVENTS);

export interface EventsByAssociatedSignalDetectionHypothesesFetchResults {
  events: EventTypes.Event[];
}

/**
 * Helper function to determine if findEventsByAssociatedSignalDetectionHypotheses should be skipped
 *
 */
export const shouldSkipFindEventsByAssociatedSignalDetectionHypotheses = (
  args: FindEventsByAssociatedSignalDetectionHypothesesQueryArgs
): boolean => !args || args.signalDetectionHypotheses.length === 0 || args.stageId == null;

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
          `findEventsByAssociatedSignalDetectionHypotheses - received duplicate event that are different for id ${originalEvent.id}`,
          originalEvent,
          event
        );
      } else {
        logger.warn(
          `findEventsByAssociatedSignalDetectionHypotheses - received duplicate event that are equal for id ${originalEvent.id}`
        );
      }
    }
  }
};

/**
 * Async thunk action that requests events by associated associated SD hypotheses
 */
export const findEventsByAssociatedSignalDetectionHypotheses = createAsyncThunk<
  EventsByAssociatedSignalDetectionHypothesesFetchResults,
  FindEventsByAssociatedSignalDetectionHypothesesQueryArgs
>(
  'eventManagerApi/findEventsByAssociatedSignalDetectionHypotheses',
  async (arg: FindEventsByAssociatedSignalDetectionHypothesesQueryArgs, { rejectWithValue }) => {
    const requestConfig = {
      ...config.event.services.findEventsByAssociatedSignalDetectionHypotheses.requestConfig,
      data: arg
    };

    const MAX_SDS_PER_INTERVAL = 25;

    const baseQuery: AxiosBaseQueryFn<EventTypes.Event[]> = axiosBaseQuery({
      baseUrl: config.event.baseUrl
    });

    try {
      const chunkedRanges = chunkRange(
        { start: 0, end: arg.signalDetectionHypotheses.length },
        MAX_SDS_PER_INTERVAL
      );
      const events = flatMap(
        await Promise.all<EventTypes.Event[]>(
          chunkedRanges.map(async range => {
            const { data } = await baseQuery(
              {
                requestConfig: {
                  ...requestConfig,
                  data: {
                    signalDetectionHypotheses: arg.signalDetectionHypotheses.slice(
                      range.start,
                      range.end
                    ),
                    stageId: arg.stageId
                  }
                }
              },
              undefined,
              undefined
            );

            if (data) {
              return Promise.resolve(data);
            }
            return Promise.resolve([] as EventTypes.Event[]);
          })
        )
      );
      return Promise.resolve({ events });
    } catch (error) {
      logger.error(`Failed findEventsByAssociatedSignalDetectionHypotheses (rejected)`, error);
      return rejectWithValue(error);
    }
  },
  {
    condition: (arg: FindEventsByAssociatedSignalDetectionHypothesesQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      if (shouldSkipFindEventsByAssociatedSignalDetectionHypotheses(arg)) {
        return false;
      }

      const requests =
        state.data.queries.findEventsByAssociatedSignalDetectionHypotheses
          .eventsByAssociatedSignalDetectionHypotheses ?? {};
      return !hasAlreadyBeenRequested(requests, arg);
    }
  }
);

/**
 * Injects the findEventsByAssociatedSignalDetectionHypotheses reducers to the provided builder
 *
 * @param build the action reducer map builder
 */
export const addFindEventsByAssociatedSignalDetectionHypothesesReducers = (
  build: ActionReducerMapBuilder<DataState>
): void => {
  build
    .addCase(findEventsByAssociatedSignalDetectionHypotheses.pending, (state, action) => {
      const history = state.queries.findEventsByAssociatedSignalDetectionHypotheses;
      if (!history.eventsByAssociatedSignalDetectionHypotheses) {
        history.eventsByAssociatedSignalDetectionHypotheses = {};
      }
      history.eventsByAssociatedSignalDetectionHypotheses[action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })
    .addCase(findEventsByAssociatedSignalDetectionHypotheses.fulfilled, (state, action) => {
      const history = state.queries.findEventsByAssociatedSignalDetectionHypotheses;
      if (!history.eventsByAssociatedSignalDetectionHypotheses) {
        history.eventsByAssociatedSignalDetectionHypotheses = {};
      }
      history.eventsByAssociatedSignalDetectionHypotheses[action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      action.payload.events.forEach(event => {
        validateEventData(state, event);
        state.events[event.id] = event;
      });
    })
    .addCase(findEventsByAssociatedSignalDetectionHypotheses.rejected, (state, action) => {
      const history = state.queries.findEventsByAssociatedSignalDetectionHypotheses;
      if (!history.eventsByAssociatedSignalDetectionHypotheses) {
        history.eventsByAssociatedSignalDetectionHypotheses = {};
      }
      history.eventsByAssociatedSignalDetectionHypotheses[action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
