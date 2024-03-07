import type { CombinedState } from '@reduxjs/toolkit';
import { combineReducers, createReducer } from '@reduxjs/toolkit';
import type { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';

import { createReplaceEntityReducer } from '../api/create-replace-entity-reducer';
import { undoRedoAppState } from '../history';
import {
  analystInitialState,
  analystSlice,
  commonInitialState,
  commonSlice,
  dataAcquisitionInitialState,
  dataAcquisitionSlice,
  waveformInitialState,
  waveformSlice,
  workflowInitialState,
  workflowSlice
} from '.';
import { resetAppState } from './actions';
import type { AnalystState } from './analyst/types';
import type { CommonState } from './common/types';
import type { DataAcquisitionState } from './data-acquisition/types';
import type { EventsState } from './events';
import { eventsInitialState, eventsSlice } from './events';
import type { MapState } from './map';
import { mapInitialState, mapSlice } from './map';
import type { SignalDetectionsState } from './signal-detections';
import { signalDetectionsInitialState, signalDetectionsSlice } from './signal-detections';
import {
  stationPropertiesConfigurationInitialState,
  stationPropertiesConfigurationSlice
} from './station-properties-configuration';
import type { StationPropertiesConfigurationState } from './station-properties-configuration/types';
import {
  systemMessageInitialState,
  systemMessageSlice
} from './system-message/system-message-slice';
import type { SystemMessageState } from './system-message/types';
import type { UserSessionState } from './user-session/types';
import { userSessionInitialState, userSessionSlice } from './user-session/user-session-slice';
import type { WaveformState } from './waveform/types';
import type { WorkflowState } from './workflow/types';

// combine all reducers
const reducers = combineReducers<{
  analyst: AnalystState;
  stationPropertiesConfiguration: StationPropertiesConfigurationState;
  common: CommonState;
  dataAcquisition: DataAcquisitionState;
  events: EventsState;
  map: MapState;
  signalDetections: SignalDetectionsState;
  systemMessage: SystemMessageState;
  userSession: UserSessionState;
  waveform: WaveformState;
  workflow: WorkflowState;
}>({
  [analystSlice.name]: analystSlice.reducer,
  [stationPropertiesConfigurationSlice.name]: stationPropertiesConfigurationSlice.reducer,
  [commonSlice.name]: commonSlice.reducer,
  [dataAcquisitionSlice.name]: dataAcquisitionSlice.reducer,
  [eventsSlice.name]: eventsSlice.reducer,
  [mapSlice.name]: mapSlice.reducer,
  [signalDetectionsSlice.name]: signalDetectionsSlice.reducer,
  [systemMessageSlice.name]: systemMessageSlice.reducer,
  [userSessionSlice.name]: userSessionSlice.reducer,
  [waveformSlice.name]: waveformSlice.reducer,
  [workflowSlice.name]: workflowSlice.reducer
});

// Infer the `State` type from the reducer itself
export type State = ReturnType<typeof reducers>;

/**
 * The app initial state
 */
export const initialState: State = {
  [analystSlice.name]: analystInitialState,
  [stationPropertiesConfigurationSlice.name]: stationPropertiesConfigurationInitialState,
  [commonSlice.name]: commonInitialState,
  [dataAcquisitionSlice.name]: dataAcquisitionInitialState,
  [eventsSlice.name]: eventsInitialState,
  [mapSlice.name]: mapInitialState,
  [signalDetectionsSlice.name]: signalDetectionsInitialState,
  [systemMessageSlice.name]: systemMessageInitialState,
  [userSessionSlice.name]: userSessionInitialState,
  [waveformSlice.name]: waveformInitialState,
  [workflowSlice.name]: workflowInitialState
};

/**
 * The application state reducer
 *
 * Type inference here was causing errors (it was attempting to export types from third party packages).
 * This caused build errors, which is likely an issue with RTK, immer, or typescript itself. Explicitly
 * typing it here seems to make typescript happy.
 */
export const reducer: ReducerWithInitialState<CombinedState<State>> = createReducer(
  initialState,
  builder => {
    builder
      .addCase(resetAppState, createReplaceEntityReducer(initialState))
      .addCase(undoRedoAppState, createReplaceEntityReducer())
      .addDefaultCase(reducers);
  }
);
