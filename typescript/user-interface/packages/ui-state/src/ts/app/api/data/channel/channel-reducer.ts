import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { ActionReducerMapBuilder, CaseReducer } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { DataState } from '../types';
import { addGetChannelsByNamesReducers } from './get-channels-by-names-timerange';

/**
 * The add raw channels action.
 */
export const addRawChannels = createAction<Channel[], 'data/addRawChannels'>('data/addRawChannels');

/**
 * The add derived channels action.
 */
export const addBeamedChannels = createAction<Channel[], 'data/addBeamedChannels'>(
  'data/addBeamedChannels'
);

/**
 * The add filtered channels action.
 */
export const addFilteredChannels = createAction<Channel[], 'data/addFilteredChannels'>(
  'data/addFilteredChannels'
);

/**
 * Adds raw channels to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addRawChannelsReducer: CaseReducer<DataState, ReturnType<typeof addRawChannels>> = (
  state,
  action
) => {
  action.payload.forEach(channel => {
    state.channels.raw[channel.name] = channel;
  });
};

/**
 * Adds derived channels to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addDerivedChannelsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addBeamedChannels>
> = (state, action) => {
  action.payload.forEach(channel => {
    state.channels.beamed[channel.name] = channel;
  });
};

/**
 * Adds filtered channels to the state.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const addFilteredChannelsReducer: CaseReducer<
  DataState,
  ReturnType<typeof addFilteredChannels>
> = (state, action) => {
  action.payload.forEach(channel => {
    state.channels.filtered[channel.name] = channel;
  });
};

/**
 * Injects the channel reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addChannelReducers = (builder: ActionReducerMapBuilder<DataState>): void => {
  addGetChannelsByNamesReducers(builder);

  builder
    .addCase(addRawChannels, addRawChannelsReducer)
    .addCase(addBeamedChannels, addDerivedChannelsReducer)
    .addCase(addFilteredChannels, addFilteredChannelsReducer);
};
