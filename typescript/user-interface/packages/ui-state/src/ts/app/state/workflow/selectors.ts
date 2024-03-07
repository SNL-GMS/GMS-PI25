import type { TimeRange } from '@gms/common-model/lib/common/types';
import type { AnalysisMode } from '@gms/common-model/lib/workflow/types';
import { createSelector } from '@reduxjs/toolkit';

import type { AppState } from '../../store';

/**
 * A redux selector for returning the open interval name.
 *
 * @example const name = useAppState(selectOpenIntervalName);
 *
 * @param state the redux app state
 * @returns the open interval name
 */
export const selectOpenIntervalName = (state: AppState): string =>
  state.app.workflow.openIntervalName;

/**
 * A redux selector for returning the open activity names.
 *
 * @example const names = useAppState(selectOpenActivityNames);
 *
 * @param state the redux app state
 * @returns the list of open activity names
 */
export const selectOpenActivityNames = (state: AppState): string[] =>
  state.app.workflow.openActivityNames;

/**
 * A redux selector for returning the open time range.
 *
 * @example const timerange = useAppState(selectWorkflowTimerange);
 *
 * @param state the redux app state
 * @returns the open time range
 */
export const selectWorkflowTimeRange = (state: AppState): TimeRange => state.app.workflow.timeRange;

/**
 * A redux selector for returning the analysis mode
 *
 * @example const analysisMode = useAppState(selectWorkflowAnalysisMode);
 *
 * @param state the redux app state
 * @returns the analysis mode
 */
export const selectWorkflowAnalysisMode = (state: AppState): AnalysisMode =>
  state.app.workflow.analysisMode;

/**
 * Create a unique key based on the selected Workflow Interval
 *
 * @returns string to be used as a unique ID
 */
export const selectWorkflowIntervalUniqueId: (state: AppState) => string = createSelector(
  [selectWorkflowTimeRange, selectWorkflowAnalysisMode, selectOpenIntervalName],
  (currentInterval, analysisMode, openIntervalName) => {
    return `currentIntervalStartTime ${currentInterval.startTimeSecs} analysisMode ${analysisMode} openIntervalName ${openIntervalName}`;
  }
);
