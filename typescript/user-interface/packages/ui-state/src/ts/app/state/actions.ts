import { createAction } from '@reduxjs/toolkit';

/**
 * Action used to reset the application state.
 */
export const resetAppState = createAction<undefined, 'reset/appState'>('reset/appState');
