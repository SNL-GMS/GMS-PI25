import { createAction } from '@reduxjs/toolkit';

import type { DataState } from '../api';
import type { State } from '../state/reducer';

/**
 * Action used to undo/redo part of the application state.
 */
export const undoRedoAppState = createAction<State, 'undoRedo/appState'>('undoRedo/appState');

/**
 * Action used to undo/redo part of the data state.
 */
export const undoRedoDataState = createAction<DataState, 'undoRedo/dataState'>(
  'undoRedo/dataState'
);
