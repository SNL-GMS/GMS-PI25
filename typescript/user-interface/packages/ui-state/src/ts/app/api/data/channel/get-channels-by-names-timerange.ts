import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import difference from 'lodash/difference';

import type { AppState, DataState } from '../../../../ui-state';
import { fetchChannelsByNamesTimeRange } from '../../../../workers/api/fetch-channels-by-names-timerange';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import { isDerivedChannel } from '../../../util/channel-factory-util';
import { config } from './endpoint-configuration';
import type { GetChannelsByNamesTimeRangeQueryArgs } from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_CHANNELS_BY_NAMES',
  process.env.GMS_LOG_FETCH_CHANNELS_BY_NAMES
);

/**
 * Helper function used to determine if the getChannelsByNamesTimeRange query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetChannelByNames = (args: GetChannelsByNamesTimeRangeQueryArgs): boolean =>
  !args ||
  args.channelNames?.length <= 0 ||
  args.channelNames == null ||
  args.startTime == null ||
  args.endTime == null;

/**
 * Async thunk action that fetches (requests) channels by names for a given time range.
 */
export const getChannelsByNamesTimeRange = createAsyncThunk<
  Channel[],
  GetChannelsByNamesTimeRangeQueryArgs
>(
  'channel/getChannelsByNamesTimeRange',
  async (arg: GetChannelsByNamesTimeRangeQueryArgs, { rejectWithValue }) => {
    const requestConfig = {
      ...config.stationDefinition.services.getChannelsByNamesTimeRange.requestConfig,
      data: {
        channelNames: arg.channelNames,
        startTime: arg.startTime,
        endTime: arg.endTime
      }
    };

    return fetchChannelsByNamesTimeRange(requestConfig).catch(error => {
      if (error.message !== 'canceled') {
        logger.error(`Failed getChannelsByNamesTimeRange (rejected)`, error);
      }
      return rejectWithValue(error);
    });
  },
  {
    condition: (arg: GetChannelsByNamesTimeRangeQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetChannelByNames(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests = state.data.queries.getChannelsByNamesTimeRange[arg.startTime] ?? {};
      return !hasAlreadyBeenRequested<GetChannelsByNamesTimeRangeQueryArgs>(requests, arg);
    }
  }
);

/**
 * Injects the getChannelsByNamesTimeRange reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetChannelsByNamesReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getChannelsByNamesTimeRange.pending, (state, action) => {
      const history = state.queries.getChannelsByNamesTimeRange;
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
    .addCase(getChannelsByNamesTimeRange.fulfilled, (state, action) => {
      const history = state.queries.getChannelsByNamesTimeRange;
      const { startTime } = action.meta.arg;
      // make sure this is set in case a channelSegment is returned from the worker after the interval has changed
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

      action.payload.forEach(channel => {
        if (isDerivedChannel(channel)) {
          state.channels.beamed[channel.name] = channel;
        } else {
          state.channels.raw[channel.name] = channel;
        }
      });
      if (action.meta.arg.channelNames.length !== action.payload.length) {
        const diff = difference(
          action.meta.arg.channelNames,
          action.payload.map(val => val.name)
        );
        if (diff.length > 0) {
          logger.error(`Failed to return requested fully-populated channels`, diff);
        }
      }
    })
    .addCase(getChannelsByNamesTimeRange.rejected, (state, action) => {
      const history = state.queries.getChannelsByNamesTimeRange;
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
