import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import produce from 'immer';

import type { AppState, DataState } from '../../../../ui-state';
import { computeFkSpectraWorker } from '../../../../workers';
import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import { config } from './endpoint-configuration';
import {
  mutateFkChannelSegmentsRecord,
  mutateFkThumbnailRecord,
  mutateSignalDetectionRecord
} from './mutate-fk-channel-segment-record';
import { updateFk } from './update-fk';

const logger = UILogger.create(
  'GMS_LOG_COMPUTE_FK_SPECTRA',
  process.env.GMS_LOG_COMPUTE_FK_SPECTRA
);

const createRequestString = (args: FkTypes.FkInputWithConfiguration): string => {
  return `${args.signalDetectionId}.${JSON.stringify(args.fkComputeInput)}`;
};
/**
 * Helper function used to determine if the computeFkSpectra query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipComputeFkSpectra = (args: FkTypes.FkInputWithConfiguration): boolean =>
  !args ||
  args.configuration == null ||
  args.fkComputeInput == null ||
  args.signalDetectionId == null;

/**
 * Async thunk action that request a FK be computed.
 */
export const computeFkSpectra = createAsyncThunk<
  ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra>,
  FkTypes.FkInputWithConfiguration
>(
  'fk/computeFkSpectra',
  // eslint-disable-next-line @typescript-eslint/require-await
  async (arg: FkTypes.FkInputWithConfiguration, { rejectWithValue }) => {
    const requestConfig = {
      ...config.computeFkSpectra.services.computeFkSpectra.requestConfig,
      data: arg.fkComputeInput
    };
    return computeFkSpectraWorker(requestConfig).catch(error => {
      if (error.message !== 'canceled') {
        logger.error(`Failed computeFkSpectra (rejected)`, error);
      }
      return rejectWithValue(error);
    });
  },
  {
    condition: (arg: FkTypes.FkInputWithConfiguration, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipComputeFkSpectra(arg)) {
        return false;
      }

      // check if the query has been executed already
      const requests = state.data.queries.computeFkSpectra[createRequestString(arg)] ?? {};
      return !hasAlreadyBeenRequested<FkTypes.FkInputWithConfiguration>(requests, arg);
    }
  }
);

/**
 * Injects the computeFkSpectra reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addComputeFkSpectraReducers = (builder: ActionReducerMapBuilder<DataState>): void => {
  builder
    /**
     * computeFkSpectra PENDING action
     * Updates the signal detection query state to indicate that the query status is pending.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(computeFkSpectra.pending, (state, action) => {
      const history = state.queries.computeFkSpectra;
      if (!history[createRequestString(action.meta.arg)]) {
        history[createRequestString(action.meta.arg)] = {};
      }
      history[createRequestString(action.meta.arg)][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })

    /**
     * computeFkSpectra FULFILLED action
     * Updates the signal detection query state to indicate that the query status is fulfilled.
     * Stores the retrieved signal detections in the signal detection redux state.
     * Stores the retrieved channel segments in the channel segment redux state.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(computeFkSpectra.fulfilled, (state, action) => {
      const history = state.queries.computeFkSpectra;
      // make sure this is set in case a signal detection is returned from the worker after the
      // interval has changed
      if (!history[createRequestString(action.meta.arg)]) {
        history[createRequestString(action.meta.arg)] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (
        !Object.hasOwnProperty.call(
          history[createRequestString(action.meta.arg)],
          action.meta.requestId
        )
      ) {
        return;
      }
      history[createRequestString(action.meta.arg)][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      // Restore config and process waveforms
      const fkResult: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = action.payload;
      const fk = produce(fkResult, draft => {
        draft.timeseries = draft.timeseries.map(tsFk => {
          return updateFk(tsFk, action.meta.arg);
        });
      });
      if (!action.meta.arg.isThumbnailRequest) {
        mutateFkChannelSegmentsRecord(state.fkChannelSegments, fk);
        mutateSignalDetectionRecord(state.signalDetections, action.meta.arg.signalDetectionId, fk);
      } else {
        mutateFkThumbnailRecord(action.meta.arg, state.fkFrequencyThumbnails, fk);
      }
    })

    /**
     * computeFkSpectra REJECTED action
     * Updates the signal detection query state to indicate that the query status is rejected,
     * and adds the error message.
     * Note: Mutating the state maintains immutability because it uses immer under the hood.
     */
    .addCase(computeFkSpectra.rejected, (state, action) => {
      const history = state.queries.computeFkSpectra;
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, createRequestString(action.meta.arg))) {
        return;
      }
      history[createRequestString(action.meta.arg)][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
