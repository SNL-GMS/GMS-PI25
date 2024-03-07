import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import type { DataState } from '../types';
import { markFkReviewed, markFkReviewedReducer } from './mark-fk-reviewed';

/**
 * Injects the FK reducers to the provided builder.
 *
 * @param builder the action reducer map builder
 */
export const addFkReducers = (builder: ActionReducerMapBuilder<DataState>): void => {
  builder.addCase(markFkReviewed, markFkReviewedReducer);
};
