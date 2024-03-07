import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { produce } from 'immer';

import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import type { AppState } from '../../../store';
import type { DataState } from '../types';
import { config } from './endpoint-configuration';
import { createRecipeToMutateProcessingMaskDefinition } from './mutate-processing-mask-definition';
import type {
  GetProcessingMaskDefinitionsQueryArgs,
  GetProcessingMaskDefinitionsQueryResult
} from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_PROCESSING_MASK_DEFINITIONS',
  process.env.GMS_LOG_FETCH_PROCESSING_MASK_DEFINITIONS
);

/**
 * Takes a GetProcessingMaskDefinitionsQueryArgs and outputs a unique key associated with it
 *
 * @param GetProcessingMaskDefinitionsQueryArgs args for the processing mask query
 * @returns string key
 */
export const getProcessingMaskDefinitionRequestLookupKey = (
  args: GetProcessingMaskDefinitionsQueryArgs
) => {
  let key = args.stationGroup.name;
  args.phaseTypes.forEach(phaseType => {
    key = key.concat(phaseType);
  });
  args.channels.forEach(channel => {
    key = key.concat(channel.name);
  });

  return key;
};

/**
 * Helper function used to determine if the GetProcessingMaskDefinitions query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetProcessingMaskDefinitions = (
  args: GetProcessingMaskDefinitionsQueryArgs
): boolean =>
  !args ||
  !args?.stationGroup ||
  args?.channels == null ||
  args?.channels?.length < 1 ||
  args?.processingOperations == null ||
  args?.processingOperations?.length < 1 ||
  args?.phaseTypes == null ||
  args?.phaseTypes?.length < 1;

/**
 * Async thunk action that fetches (requests) filter definitions for channel segments
 */
export const getProcessingMaskDefinitions = createAsyncThunk<
  GetProcessingMaskDefinitionsQueryResult,
  GetProcessingMaskDefinitionsQueryArgs
>(
  'endpoint-configuration/getProcessingMaskDefinitions',
  async (arg: GetProcessingMaskDefinitionsQueryArgs, { rejectWithValue }) => {
    try {
      const requestConfig = {
        ...config.signalEnhancementConfiguration.services.getProcessingMaskDefinitions
          .requestConfig,
        data: {
          // only RAW channel segments
          stationGroup: arg.stationGroup,
          channels: arg.channels,
          processingOperations: arg.processingOperations,
          phaseTypes: arg.phaseTypes
        }
      };
      const queryFn = axiosBaseQuery<GetProcessingMaskDefinitionsQueryResult>({
        baseUrl: requestConfig.baseURL
      });
      const queryResult = await queryFn({ requestConfig }, undefined, undefined);

      return queryResult.data;
    } catch (error) {
      if (error.message !== 'canceled') {
        logger.error(`Failed getProcessingMaskDefinitions (rejected)`, error);
      }

      return rejectWithValue(error);
    }
  },
  {
    condition: (arg: GetProcessingMaskDefinitionsQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetProcessingMaskDefinitions(arg)) {
        return false;
      }

      const processingMaskDefinitionLookupKey = getProcessingMaskDefinitionRequestLookupKey(arg);
      // check if the query has been executed already
      const requests =
        state.data.queries.getProcessingMaskDefinitions[processingMaskDefinitionLookupKey] ?? {};
      return !hasAlreadyBeenRequested<GetProcessingMaskDefinitionsQueryArgs>(requests, arg);
    }
  }
);

/**
 * Injects the getProcessingMaskDefinitions reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetProcessingMaskDefinitionsReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getProcessingMaskDefinitions.pending, (state, action) => {
      const history = state.queries.getProcessingMaskDefinitions;
      const { arg }: { arg: GetProcessingMaskDefinitionsQueryArgs } = action.meta;
      const processingMaskDefinitionLookupKey = getProcessingMaskDefinitionRequestLookupKey(arg);
      if (!history[processingMaskDefinitionLookupKey]) {
        history[processingMaskDefinitionLookupKey] = {};
      }
      history[processingMaskDefinitionLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })
    .addCase(getProcessingMaskDefinitions.fulfilled, (state, action) => {
      const history = state.queries.getProcessingMaskDefinitions;
      const { arg }: { arg: GetProcessingMaskDefinitionsQueryArgs } = action.meta;
      const processingMaskDefinitionLookupKey = getProcessingMaskDefinitionRequestLookupKey(arg);
      // make sure this is set in case a channelSegment is returned from the worker after the interval has changed
      if (!history[processingMaskDefinitionLookupKey]) {
        history[processingMaskDefinitionLookupKey] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (
        !Object.hasOwnProperty.call(
          history[processingMaskDefinitionLookupKey],
          action.meta.requestId
        )
      ) {
        return;
      }

      history[processingMaskDefinitionLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      state.processingMaskDefinitions = produce(
        state.processingMaskDefinitions,
        createRecipeToMutateProcessingMaskDefinition(
          action.payload.processingMaskDefinitionByPhaseByChannel
        )
      );
    })
    .addCase(getProcessingMaskDefinitions.rejected, (state, action) => {
      const history = state.queries.getProcessingMaskDefinitions;
      const { arg }: { arg: GetProcessingMaskDefinitionsQueryArgs } = action.meta;
      const processingMaskDefinitionLookupKey = getProcessingMaskDefinitionRequestLookupKey(arg);
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, processingMaskDefinitionLookupKey)) {
        return;
      }
      history[processingMaskDefinitionLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
