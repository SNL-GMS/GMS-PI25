import type { BeamformingTemplatesByStationByPhase } from '@gms/common-model/lib/beamforming-templates/types';
import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import produce from 'immer';

import { AsyncActionStatus } from '../../../query';
import { hasAlreadyBeenRequested } from '../../../query/async-fetch-util';
import type { AppState } from '../../../store';
import type { DataState } from '../types';
import { config } from './endpoint-configuration';
import { createRecipeToMutateBeamformingTemplates } from './mutate-beamforming-template';
import type { GetBeamformingTemplatesQueryArgs } from './types';

const logger = UILogger.create(
  'GMS_LOG_FETCH_BEAMFORMING_TEMPLATES',
  process.env.GMS_LOG_FETCH_BEAMFORMING_TEMPLATES
);

/**
 * Takes a GetBeamformingTemplatesQueryArgs and outputs a unique key associated with it
 *
 * @param GetBeamformingTemplatesQueryArgs args for the beamforming templates query
 * @returns string key
 */
export const getBeamformingTemplatesRequestLookupKey = (args: GetBeamformingTemplatesQueryArgs) => {
  let key = '';
  args.phases.forEach(phase => {
    key = key.concat(phase);
  });
  args.stations.forEach(station => {
    key = key.concat(`_${station.effectiveAt}_${station.name}`);
  });
  key = key.concat(`_${args.beamType}`);

  return key;
};

/**
 * Helper function used to determine if the GetBeamformingTemplates query should be skipped.
 *
 * @returns returns true if the arguments are valid; false otherwise.
 */
export const shouldSkipGetBeamformingTemplates = (
  args: GetBeamformingTemplatesQueryArgs
): boolean =>
  !args ||
  args?.phases == null ||
  args?.phases?.length < 1 ||
  args?.stations == null ||
  args?.stations?.length < 1 ||
  args?.beamType == null;

/**
 * Async thunk action that fetches (requests) beamforming templates
 */
export const getBeamformingTemplates = createAsyncThunk<
  BeamformingTemplatesByStationByPhase,
  GetBeamformingTemplatesQueryArgs
>(
  'endpoint-configuration/getBeamformingTemplates',
  async (arg: GetBeamformingTemplatesQueryArgs, { rejectWithValue, getState }) => {
    // Filter out stations that already exist
    // and have all the phase templates record entries
    const state: AppState = getState() as AppState;
    const templates = state.data.beamformingTemplates[arg.beamType];
    try {
      let filteredStations = arg.stations;
      // If no template records then query for all of it
      if (templates) {
        filteredStations = arg.stations.filter(station => {
          if (!templates[station?.name]) {
            return true;
          }
          // Now check all the phase records are there
          if (arg.phases.filter(phaseString => !templates[station.name][phaseString]).length > 0) {
            return true;
          }
          return false;
        });
      }

      // If no stations bail
      if (filteredStations.length === 0) {
        return rejectWithValue('no beam templates needed');
      }
      const requestConfig = {
        ...config.signalEnhancementConfiguration.services.getBeamformingTemplates.requestConfig,
        data: {
          phases: arg.phases,
          stations: filteredStations,
          beamType: arg.beamType
        }
      };
      const queryFn = axiosBaseQuery<BeamformingTemplatesByStationByPhase>({
        baseUrl: requestConfig.baseURL
      });
      const queryResult = await queryFn({ requestConfig }, undefined, undefined);
      return queryResult.data;
    } catch (error) {
      if (error.message !== 'canceled') {
        logger.error(`Failed getBeamformingTemplates (rejected)`, error);
      }

      return rejectWithValue(error);
    }
  },
  {
    condition: (arg: GetBeamformingTemplatesQueryArgs, { getState }) => {
      const state = (getState as () => AppState)();

      // determine if the query should be skipped based on the provided args; check if valid
      if (shouldSkipGetBeamformingTemplates(arg)) {
        return false;
      }

      const beamformingTemplatesLookupKey = getBeamformingTemplatesRequestLookupKey(arg);
      // check if the query has been executed already
      const requests =
        state.data.queries.getBeamformingTemplates[beamformingTemplatesLookupKey] ?? {};
      return !hasAlreadyBeenRequested<GetBeamformingTemplatesQueryArgs>(requests, arg);
    }
  }
);

/**
 * Injects the getBeamformingTemplates reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addBeamformingTemplatesReducers = (
  builder: ActionReducerMapBuilder<DataState>
): void => {
  builder
    .addCase(getBeamformingTemplates.pending, (state, action) => {
      const history = state.queries.getBeamformingTemplates;
      const { arg }: { arg: GetBeamformingTemplatesQueryArgs } = action.meta;
      const beamformingTemplatesLookupKey = getBeamformingTemplatesRequestLookupKey(arg);
      if (!history[beamformingTemplatesLookupKey]) {
        history[beamformingTemplatesLookupKey] = {};
      }
      history[beamformingTemplatesLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.pending,
        error: undefined
      };
    })
    .addCase(getBeamformingTemplates.fulfilled, (state, action) => {
      const history = state.queries.getBeamformingTemplates;
      const { arg }: { arg: GetBeamformingTemplatesQueryArgs } = action.meta;
      const beamformingTemplatesLookupKey = getBeamformingTemplatesRequestLookupKey(arg);

      if (!history[beamformingTemplatesLookupKey]) {
        history[beamformingTemplatesLookupKey] = {};
      }
      // If we don't have a request matching this ID, that means that it was cleared out
      // (for example, when an interval is closed), and so we don't need to process this.
      if (
        !Object.hasOwnProperty.call(history[beamformingTemplatesLookupKey], action.meta.requestId)
      ) {
        return;
      }

      // TODO: should we not add history if the results do not return
      // all requested templates?
      history[beamformingTemplatesLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.fulfilled,
        error: undefined
      };

      // Add warning for missing templates from query
      if (
        action.payload &&
        Object.keys(action.payload).length !== action.meta.arg.stations.length
      ) {
        const missingStationResults = action.meta.arg.stations.filter(
          station => !action.payload[station.name]
        );
        logger.warn(
          `Missing ${
            action.meta.arg.beamType
          } beam templates for stations: ${missingStationResults.map(station => station.name)}`
        );
      }

      state.beamformingTemplates = produce(
        state.beamformingTemplates,
        createRecipeToMutateBeamformingTemplates(action.payload, action.meta.arg.beamType)
      );
    })
    .addCase(getBeamformingTemplates.rejected, (state, action) => {
      const history = state.queries.getBeamformingTemplates;
      const { arg }: { arg: GetBeamformingTemplatesQueryArgs } = action.meta;
      const beamformingTemplatesLookupKey = getBeamformingTemplatesRequestLookupKey(arg);
      // don't update if the history has been cleared before this promise rejected
      if (!Object.hasOwnProperty.call(history, beamformingTemplatesLookupKey)) {
        return;
      }
      history[beamformingTemplatesLookupKey][action.meta.requestId] = {
        arg: action.meta.arg,
        status: AsyncActionStatus.rejected,
        error: action.error
      };
    });
};
