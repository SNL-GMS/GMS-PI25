import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

import type {
  AppState,
  DataState,
  FilterDefinitionsForSignalDetectionsRecord
} from '../../../../ui-state';
import { fetchDefaultFilterDefinitionsForSignalDetectionHypotheses } from '../../../../workers';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import * as signalEnhancementConfiguration from '../../signal-enhancement-configuration/endpoint-configuration';
import type { GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs } from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_CHANNELS_BY_NAMES',
  process.env.GMS_LOG_FETCH_CHANNELS_BY_NAMES
);

/**
 * Helper function used to determine if the getFilterDefinitionsForSignalDetectionHypotheses query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses = (
  args: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs
): boolean =>
  !args ||
  args.stageId == null ||
  args.stageId?.name == null ||
  args.signalDetectionsHypotheses == null ||
  args.signalDetectionsHypotheses?.length < 1;

/**
 * Async thunk action that fetches (requests) filter definition for signal detection hypotheses
 */
export const getFilterDefinitionsForSignalDetectionHypotheses = createAsyncThunk<
  FilterDefinitionsForSignalDetectionsRecord,
  GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs
>(
  'signalDetection/fetchFilterDefinitionsForSignalDetectionHypotheses',
  async (arg: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs, { rejectWithValue }) => {
    const data = {
      signalDetectionsHypotheses: arg.signalDetectionsHypotheses,
      eventHypothesis: arg.eventHypothesis
    };
    if (!arg.eventHypothesis) {
      delete data.eventHypothesis;
    }
    const requestConfig = {
      ...signalEnhancementConfiguration.config.signalEnhancementConfiguration.services
        .getDefaultFilterDefinitionsForSignalDetectionHypotheses.requestConfig,
      data
    };
    return fetchDefaultFilterDefinitionsForSignalDetectionHypotheses(requestConfig).catch(error => {
      if (error.message !== 'canceled') {
        logger.error(
          `Failed getFilterDefinitionsForSignalDetectionHypotheses fetchFilterDefinitionsForSignalDetectionHypotheses(rejected)`,
          error
        );
      }
      return rejectWithValue(error);
    });
  },
  {
    condition: (arg: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests =
        state.data.queries.getFilterDefinitionsForSignalDetectionHypotheses[arg.stageId.name] ?? {};
      return !hasAlreadyBeenRequested<GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs>(
        requests,
        arg
      );
    }
  }
);

/**
 * Injects the getFilterDefinitionsForSignalDetectionHypotheses reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addGetFilterDefinitionsForSignalDetectionHypothesesReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getFilterDefinitionsForSignalDetectionHypotheses.pending, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetectionHypotheses;
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
    .addCase(getFilterDefinitionsForSignalDetectionHypotheses.fulfilled, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetectionHypotheses;
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
      if (action.meta.arg.eventHypothesis) {
        state.filterDefinitionsForSignalDetectionHypothesesEventOpen = {
          ...state.filterDefinitionsForSignalDetectionHypothesesEventOpen,
          ...action.payload
        };
      } else {
        state.filterDefinitionsForSignalDetectionHypotheses = {
          ...state.filterDefinitionsForSignalDetectionHypotheses,
          ...action.payload
        };
      }
    })
    .addCase(getFilterDefinitionsForSignalDetectionHypotheses.rejected, (state, action) => {
      const history = state.queries.getFilterDefinitionsForSignalDetectionHypotheses;
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
