import type { CommonTypes, FilterTypes } from '@gms/common-model';
import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

import type {
  AppState,
  DataState,
  FilterDefinitionsForSignalDetectionsRecord
} from '../../../../ui-state';
import { fetchDefaultFilterDefinitionByUsageForChannelSegments } from '../../../../workers';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import { config } from './endpoint-configuration';
import type { GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_FILTERS_FOR_CHANNEL_SEGMENTS',
  process.env.GMS_LOG_FETCH_FILTERS_FOR_CHANNEL_SEGMENTS
);

/**
 * Takes ChannelSegmentFaceted list and outputs a unique key associated with it
 *
 * @param channelSegments list of ChannelSegmentFaceted IE [{id : uiChannelSegmentDescriptors}]
 * @returns string key
 */
export const getStartTimeConcatEndTimeLookupKey = (interval: CommonTypes.TimeRange) => {
  return `${interval.startTimeSecs}${interval.endTimeSecs}`;
};
/**
 * Helper function used to determine if the getDefaultFilterDefinitionByUsageForChannelSegments query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments = (
  args: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs
): boolean =>
  !args || !args?.interval || args?.channelSegments == null || args?.channelSegments?.length < 1;

/**
 * Record<SignalDetectionHypothesisId, Record<FilterName, FilterDefinition>>
 */
export type DefaultFilterDefinitionByUsageForChannelSegmentsRecord = Record<
  string,
  FilterTypes.FilterDefinitionByFilterDefinitionUsage
>;

/**
 * Async thunk action that fetches (requests) filter definitions for channel segments
 */
export const getDefaultFilterDefinitionByUsageForChannelSegments = createAsyncThunk<
  FilterDefinitionsForSignalDetectionsRecord,
  GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs
>(
  'endpoint-configuration/fetchDefaultFilterDefinitionByUsageForChannelSegments',
  async (
    arg: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs,
    { rejectWithValue }
  ) => {
    const requestConfig = {
      ...config.signalEnhancementConfiguration.services
        .getDefaultFilterDefinitionByUsageForChannelSegments.requestConfig,
      data: {
        // only RAW channel segments
        interval: arg.interval,
        channelSegments: arg.channelSegments,
        eventHypothesis: arg.eventHypothesis
      }
    };
    if (!arg.eventHypothesis) {
      delete requestConfig.data.eventHypothesis;
    }
    return fetchDefaultFilterDefinitionByUsageForChannelSegments(requestConfig).catch(error => {
      if (error.message !== 'canceled') {
        logger.error(
          `Failed GetDefaultFilterDefinitionByUsageForChannelSegments (rejected)`,
          error
        );
      }
      return rejectWithValue(error);
    });
  },
  {
    condition: (
      arg: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs,
      { getState }
    ) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments(arg)) {
        return false;
      }

      const startimeConcatEndtimeLookupKey = getStartTimeConcatEndTimeLookupKey(arg.interval);
      // check if the query has been executed already
      const requests =
        state.data.queries.getDefaultFilterDefinitionByUsageForChannelSegments[
          startimeConcatEndtimeLookupKey
        ] ?? {};
      return !hasAlreadyBeenRequested<GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs>(
        requests,
        arg
      );
    }
  }
);

/**
 * Injects the getDefaultFilterDefinitionByUsageForChannelSegments reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getDefaultFilterDefinitionByUsageForChannelSegments.pending, (state, action) => {
      const history = state.queries.getDefaultFilterDefinitionByUsageForChannelSegments;
      const {
        arg
      }: { arg: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } = action.meta;
      const startimeConcatEndtimeLookupKey = getStartTimeConcatEndTimeLookupKey(arg.interval);
      if (!history[startimeConcatEndtimeLookupKey]) {
        history[startimeConcatEndtimeLookupKey] = {};
      }
      history[startimeConcatEndtimeLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })
    .addCase(getDefaultFilterDefinitionByUsageForChannelSegments.fulfilled, (state, action) => {
      const history = state.queries.getDefaultFilterDefinitionByUsageForChannelSegments;
      const {
        arg
      }: { arg: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } = action.meta;
      const startimeConcatEndtimeLookupKey = getStartTimeConcatEndTimeLookupKey(arg.interval);
      // make sure this is set in case a channelSegment is returned from the worker after the interval has changed
      if (!history[startimeConcatEndtimeLookupKey]) {
        history[startimeConcatEndtimeLookupKey] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (
        !Object.hasOwnProperty.call(history[startimeConcatEndtimeLookupKey], action.meta.requestId)
      ) {
        return;
      }

      history[startimeConcatEndtimeLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };
      if (action.meta.arg.eventHypothesis) {
        state.defaultFilterDefinitionByUsageForChannelSegmentsEventOpen = {
          ...state.defaultFilterDefinitionByUsageForChannelSegmentsEventOpen,
          ...action.payload
        };
      } else {
        state.defaultFilterDefinitionByUsageForChannelSegments = {
          ...state.defaultFilterDefinitionByUsageForChannelSegments,
          ...action.payload
        };
      }
    })
    .addCase(getDefaultFilterDefinitionByUsageForChannelSegments.rejected, (state, action) => {
      const history = state.queries.getDefaultFilterDefinitionByUsageForChannelSegments;
      const {
        arg
      }: { arg: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } = action.meta;
      const startTimeConcatEndtimeLookupKey = getStartTimeConcatEndTimeLookupKey(arg.interval);
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, startTimeConcatEndtimeLookupKey)) {
        return;
      }
      history[startTimeConcatEndtimeLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
