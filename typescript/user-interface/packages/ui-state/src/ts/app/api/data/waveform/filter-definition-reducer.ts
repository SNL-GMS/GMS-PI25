import type {
  FilterDefinition,
  FilterDefinitionByFilterDefinitionUsage
} from '@gms/common-model/lib/filter/types';
import { UILogger } from '@gms/ui-util';
import { isDesigned } from '@gms/ui-wasm';
import type { ActionReducerMapBuilder, CaseReducer } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { ChannelSegmentDescriptorId, SignalDetectionHypothesisId } from '../../../../types';
import { addGetFilterDefinitionsForSignalDetectionHypothesesReducers } from '../signal-detection/get-filter-definitions-for-signal-detection-hypotheses';
import { addGetFilterDefinitionsForSignalDetectionsReducers } from '../signal-detection/get-filter-definitions-for-signal-detections';
import { addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers } from '../signal-enhancement/get-filter-definitions-for-channel-segments';
import { addGetProcessingMaskDefinitionsReducers } from '../signal-enhancement/get-processing-mask-definitions';
import type { DataState } from '../types';

const logger = UILogger.create('DATA_SLICE', process.env.DATA_SLICE);

/**
 * The add (designed) filter definitions action.
 */
export const addDesignedFilterDefinitions = createAction<
  FilterDefinition[],
  'data/addDesignedFilterDefinitions'
>('data/addDesignedFilterDefinitions');

/**
 * The add (designed) default filter definitions by usage for channel segments action.
 */
export const addDefaultFilterDefinitionsByUsageForChannelSegments = createAction<
  {
    channelSegmentDescriptorId: ChannelSegmentDescriptorId;
    filterDefinitionByFilterDefinitionUsage: FilterDefinitionByFilterDefinitionUsage;
  }[],
  'data/addDefaultFilterDefinitionsByUsageForChannelSegments'
>('data/addDefaultFilterDefinitionsByUsageForChannelSegments');

/**
 * The add (designed) filter definitions by usage for signal detections action.
 */
export const addFilterDefinitionsForSignalDetections = createAction<
  {
    signalDetectionHypothesisId: SignalDetectionHypothesisId;
    filterDefinitionByFilterDefinitionUsage: FilterDefinitionByFilterDefinitionUsage;
  }[],
  'data/addFilterDefinitionsForSignalDetections'
>('data/addFilterDefinitionsForSignalDetections');

/**
 * Adds (designed) filter definitions to the Redux state store
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addDesignedFilterDefinitionsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addDesignedFilterDefinitions>
> = (state, action) => {
  action.payload.forEach(fd => {
    const { name } = fd;
    if (name != null) {
      const { sampleRateHz } = fd.filterDescription.parameters || { sampleRateHz: null };
      if (sampleRateHz != null) {
        if (isDesigned(fd, sampleRateHz)) {
          if (state.filterDefinitions[name] == null) {
            state.filterDefinitions[name] = {};
          }
          // save as `[name][sample-rate]`
          state.filterDefinitions[name][sampleRateHz] = fd;
        } else {
          logger.error('Failed to add filter definition to state store; must be designed', fd);
        }
      } else {
        logger.error(
          'Failed to add filter definition to state store; sample rate must be defined',
          fd
        );
      }
    } else {
      logger.error(
        'Failed to add filter definition to state store; unique name must be defined',
        fd
      );
    }
  });
};

/**
 * Adds default filter definitions by usage for channel segments to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addDefaultFilterDefinitionsByUsageForChannelSegmentsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addDefaultFilterDefinitionsByUsageForChannelSegments>
> = (state, action) => {
  action.payload.forEach(
    ({ channelSegmentDescriptorId, filterDefinitionByFilterDefinitionUsage }) => {
      state.defaultFilterDefinitionByUsageForChannelSegments[
        channelSegmentDescriptorId
      ] = filterDefinitionByFilterDefinitionUsage;
    }
  );
};

/**
 * Adds filter definitions for signal detections to the Redux state store
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addFilterDefinitionsForSignalDetectionsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addFilterDefinitionsForSignalDetections>
> = (state, action) => {
  action.payload.forEach(
    ({ signalDetectionHypothesisId, filterDefinitionByFilterDefinitionUsage }) => {
      state.filterDefinitionsForSignalDetections[
        signalDetectionHypothesisId
      ] = filterDefinitionByFilterDefinitionUsage;
    }
  );
};

/**
 * Injects the filter definition reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addFilterDefinitionReducers = (builder: ActionReducerMapBuilder<DataState>): void => {
  addGetFilterDefinitionsForSignalDetectionsReducers(builder);
  addGetFilterDefinitionsForSignalDetectionHypothesesReducers(builder);
  addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers(builder);
  addGetProcessingMaskDefinitionsReducers(builder);

  builder
    .addCase(addDesignedFilterDefinitions, addDesignedFilterDefinitionsReducer)
    .addCase(
      addDefaultFilterDefinitionsByUsageForChannelSegments,
      addDefaultFilterDefinitionsByUsageForChannelSegmentsReducer
    )
    .addCase(
      addFilterDefinitionsForSignalDetections,
      addFilterDefinitionsForSignalDetectionsReducer
    );
};
