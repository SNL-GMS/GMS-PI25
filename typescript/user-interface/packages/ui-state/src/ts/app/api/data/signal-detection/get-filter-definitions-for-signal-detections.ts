import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

import type { AppState, DataState } from '../../../../ui-state';
import { fetchFilterDefinitionsForSignalDetections } from '../../../../workers';
import type { FetchFilterDefinitionsForSignalDetectionsResult } from '../../../../workers/waveform-worker/operations/fetch-filter-definitions-for-signal-detections';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import { config } from './endpoint-configuration';
import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_CHANNELS_BY_NAMES',
  process.env.GMS_LOG_FETCH_CHANNELS_BY_NAMES
);

/**
 * Helper function used to determine if the getFilterDefinitionsForSignalDetections query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetFilterDefinitionsForSignalDetections = (
  args: GetFilterDefinitionsForSignalDetectionsQueryArgs
): boolean =>
  !args ||
  args?.stageId?.name == null ||
  args.signalDetectionsHypotheses == null ||
  args.signalDetectionsHypotheses?.length < 1;

/**
 * Async thunk action that fetches (requests) filter definitions for signal detection hypotheses
 */
export const getFilterDefinitionsForSignalDetections = createAsyncThunk<
  FetchFilterDefinitionsForSignalDetectionsResult,
  GetFilterDefinitionsForSignalDetectionsQueryArgs
>(
  'signalDetection/fetchFilterDefinitionsForSignalDetections',
  async (arg: GetFilterDefinitionsForSignalDetectionsQueryArgs, { rejectWithValue }) => {
    const requestConfig = {
      ...config.signalDetection.services.getFilterDefinitionsForSignalDetections.requestConfig,
      data: {
        stageId: arg.stageId,
        signalDetectionsHypotheses: arg.signalDetectionsHypotheses
      }
    };
    return fetchFilterDefinitionsForSignalDetections(requestConfig).catch(error => {
      if (error.message !== 'canceled') {
        logger.error(
          `Failed getFilterDefinitionsForSignalDetections fetchFilterDefinitionsForSignalDetections(rejected)`,
          error
        );
      }
      return rejectWithValue(error);
    });
  },
  {
    condition: (arg: GetFilterDefinitionsForSignalDetectionsQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetFilterDefinitionsForSignalDetections(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests =
        state.data.queries.getFilterDefinitionsForSignalDetections[arg.stageId.name] ?? {};
      return !hasAlreadyBeenRequested<GetFilterDefinitionsForSignalDetectionsQueryArgs>(
        requests,
        arg
      );
    }
  }
);

/**
 * Injects the getFilterDefinitionsForSignalDetections reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetFilterDefinitionsForSignalDetectionsReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getFilterDefinitionsForSignalDetections.pending, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetections;
      const {
        stageId: { name }
      } = action.meta.arg;

      if (!history[name]) {
        history[name] = {};
      }
      history[name][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })
    .addCase(getFilterDefinitionsForSignalDetections.fulfilled, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetections;
      const {
        stageId: { name }
      } = action.meta.arg;

      // make sure this is set in case data returned from the worker after the interval has changed
      if (!history[name]) {
        history[name] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (!Object.hasOwnProperty.call(history[name], action.meta.requestId)) {
        return;
      }

      history[name][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };
      state.missingSignalDetectionsHypothesesForFilterDefinitions = [
        ...state.missingSignalDetectionsHypothesesForFilterDefinitions,
        ...action.payload.missingSignalDetectionsHypothesesForFilterDefinitions
      ];
      state.filterDefinitionsForSignalDetections = {
        ...state.filterDefinitionsForSignalDetections,
        ...action.payload.filterDefinitionsForSignalDetectionRecords
      };
    })
    .addCase(getFilterDefinitionsForSignalDetections.rejected, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetections;
      const {
        stageId: { name }
      } = action.meta.arg;
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, name)) {
        return;
      }
      history[name][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
