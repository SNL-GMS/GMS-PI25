import { UILogger } from '@gms/ui-util';
import type { ActionReducerMapBuilder, CaseReducer } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { UiChannelSegment } from '../../../../types';
import { clearWaveforms } from '../../../../workers/api/clear-waveforms';
import type { DataState } from '../types';
import { addGetChannelSegmentsByChannelReducers } from './get-channel-segments-by-channel';
import { mutateUiChannelSegmentsRecord } from './mutate-channel-segment-record';

const logger = UILogger.create('DATA_SLICE', process.env.DATA_SLICE);

/**
 * The action to add {@link UiChannelSegment}s.
 */
export const addChannelSegments = createAction<
  {
    name: string;
    channelSegments: UiChannelSegment[];
  }[],
  'data/addChannelSegments'
>('data/addChannelSegments');

/**
 * The action to add filtered {@link UiChannelSegment}s.
 */
export const addFilteredChannelSegments = createAction<
  {
    name: string;
    filterName: string;
    channelSegments: UiChannelSegment[];
  }[],
  'data/addFilteredChannelSegments'
>('data/addFilteredChannelSegments');

/**
 * The action to clear the channel segments and channel segment request history from the state
 */
export const clearChannelSegmentsAndHistory = createAction<
  undefined,
  'data/clearChannelSegmentsAndHistory'
>('data/clearChannelSegmentsAndHistory');

/**
 * Add {@link UiChannelSegment}s to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addChannelSegmentsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addChannelSegments>
> = (state, action) => {
  action.payload.forEach(entry => {
    mutateUiChannelSegmentsRecord(state.uiChannelSegments, entry.name, entry.channelSegments);
  });
};

/**
 * Add filtered {@link UiChannelSegment}s to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addFilteredChannelSegmentsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addFilteredChannelSegments>
> = (state, action) => {
  action.payload.forEach(entry => {
    mutateUiChannelSegmentsRecord(
      state.uiChannelSegments,
      entry.name,
      entry.channelSegments,
      entry.filterName
    );
  });
};

/**
 * Clears the channel segments and channel segment request history from the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const clearChannelSegmentsAndHistoryReducer: CaseReducer<
  DataState,
  ReturnType<typeof clearChannelSegmentsAndHistory>
> = state => {
  state.queries.getChannelSegmentsByChannel = {};
  state.uiChannelSegments = {};
  clearWaveforms().catch(e => {
    logger.error(`Failed to clear out waveform cache`, e);
  });
};

/**
 * Injects the channel segment reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addChannelSegmentReducers = (builder: ActionReducerMapBuilder<DataState>): void => {
  addGetChannelSegmentsByChannelReducers(builder);

  builder
    .addCase(addChannelSegments, addChannelSegmentsReducer)
    .addCase(addFilteredChannelSegments, addFilteredChannelSegmentsReducer)
    .addCase(clearChannelSegmentsAndHistory, clearChannelSegmentsAndHistoryReducer);
};
