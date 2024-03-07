import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers/lib/query';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { produce } from 'immer';

import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import type { AppState } from '../../../store';
import type { DataState } from '../types';
import { config } from './endpoint-configuration';
import { createRecipeToMutateQcSegmentsRecord } from './mutate-qc-segment-record';
import type { FindQCSegmentsByChannelAndTimeRangeQueryArgs } from './types';

const logger = UILogger.create('GMS_LOG_FETCH_QC_SEGMENTS', process.env.GMS_LOG_FETCH_QC_SEGMENTS);

/**
 * Helper function used to determine if the findQCSegmentsByChannelAndTimeRange query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery = (
  args: FindQCSegmentsByChannelAndTimeRangeQueryArgs
): boolean =>
  !args ||
  args.startTime == null ||
  args.endTime == null ||
  args.channels == null ||
  args.channels.length === 0;

/**
 * Async thunk action that fetches (requests) qc segments by channel.
 */
export const findQCSegmentsByChannelAndTimeRange = createAsyncThunk<
  QcSegment[],
  FindQCSegmentsByChannelAndTimeRangeQueryArgs
>(
  'qcSegment/findQCSegmentsByChannelAndTimeRange',
  async (arg: FindQCSegmentsByChannelAndTimeRangeQueryArgs, { rejectWithValue }) => {
    try {
      const requestConfig = {
        ...config.waveform.services.findQCSegmentsByChannelAndTimeRange.requestConfig,
        data: { ...arg }
      };
      const queryFn = axiosBaseQuery<QcSegment[]>({
        baseUrl: requestConfig.baseURL
      });

      const queryResult = await queryFn({ requestConfig }, undefined, undefined);

      return queryResult.data;
    } catch (error) {
      if (error.message !== 'canceled') {
        logger.error(`Failed findQCSegmentsByChannelAndTimeRange (rejected)`, error);
      }

      return rejectWithValue(error);
    }
  },
  {
    condition: (arg: FindQCSegmentsByChannelAndTimeRangeQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests = state.data.queries.findQCSegmentsByChannelAndTimeRange[arg.startTime] ?? {};
      return !hasAlreadyBeenRequested(requests, arg);
    }
  }
);

/**
 * Injects the findQCSegmentsByChannelAndTimeRange reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addFindQCSegmentsByChannelAndTimeRangeReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    /**
     * findQCSegmentsByChannelAndTimeRange PENDING action
     * Updates the qc segment query state to indicate that the query status is pending.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(findQCSegmentsByChannelAndTimeRange.pending, (state, action) => {
      const history = state.queries.findQCSegmentsByChannelAndTimeRange;
      const { startTime } = action.meta.arg;
      if (!history[startTime]) {
        history[startTime] = {};
      }
      history[startTime][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })

    /**
     * findQCSegmentsByChannelAndTimeRange FULFILLED action
     * Updates the qc segment query state to indicate that the query status is fulfilled.
     * Stores the retrieved qc segments in the qc segment redux state.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(findQCSegmentsByChannelAndTimeRange.fulfilled, (state, action) => {
      const history = state.queries.findQCSegmentsByChannelAndTimeRange;
      const { startTime } = action.meta.arg;
      // make sure this is set in case a qc segment is returned from the worker after the interval has changed
      if (!history[startTime]) {
        history[startTime] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (!Object.hasOwnProperty.call(history[startTime], action.meta.requestId)) {
        return;
      }
      history[startTime][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      action.payload.forEach(qs => {
        state.qcSegments = produce(
          state.qcSegments,
          createRecipeToMutateQcSegmentsRecord(qs.channel.name, [qs])
        );
      });
    })

    /**
     * findQCSegmentsByChannelAndTimeRange REJECTED action
     * Updates the qc segment query state to indicate that the query status is rejected,
     * and adds the error message.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(findQCSegmentsByChannelAndTimeRange.rejected, (state, action) => {
      const history = state.queries.findQCSegmentsByChannelAndTimeRange;
      const { startTime } = action.meta.arg;
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, startTime)) {
        return;
      }
      history[startTime][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
