import type { FilterTypes } from '@gms/common-model';
import { EventTypes, SignalDetectionTypes } from '@gms/common-model';
import { findPhaseFeatureMeasurement } from '@gms/common-model/lib/signal-detection/util';
import { createSelector } from '@reduxjs/toolkit';
import includes from 'lodash/includes';

import { selectEvents, selectSignalDetections } from '../../api/data/selectors';
import { selectProcessingConfiguration } from '../../api/processing-configuration/selectors';
import { selectFilterLists } from '../../api/signal-enhancement-configuration/selectors';
import type { AppState } from '../../store';
import {
  determineAllAssociableSignalDetections,
  determineAllDeletableSignalDetections,
  determineAllNonAssociableSignalDetections,
  determineAllValidPhaseChangesForSignalDetections
} from '../../util/util';
import { selectPreferredEventHypothesisByStageForOpenEvent } from '../events/selectors';
import { selectOpenIntervalName } from '../workflow/selectors';
import type {
  ActionTypes,
  HotkeyCycleList,
  RequestStatus,
  SignalDetectionActionTypes
} from './types';

/**
 * @returns the selected filter list from the provided redux state
 */
export const selectSelectedFilterListName = (state: AppState): string =>
  state.app.analyst.selectedFilterList;

/**
 * @returns the effective now time from the provided redux state
 */
export const selectEffectiveNowTime = (state: AppState): number =>
  state.app.analyst.effectiveNowTime;

/**
 * A selector that derives the selected filter list from the signalEnhancementConfiguration query (filters)
 * and the currently selected filter list.
 *
 * @returns the selected filter list. Note that this is memoized by createSelector.
 * @see https://redux.js.org/usage/deriving-data-selectors
 */
export const selectSelectedFilterList: (
  state: AppState
) => FilterTypes.FilterList = createSelector(
  [selectSelectedFilterListName, selectFilterLists],
  (selectedFLName, filterLists) =>
    filterLists != null ? filterLists.find(fl => fl.name === selectedFLName) : undefined
);

/**
 * A selector to get the analyst-set selected filter index out of the redux state.
 *
 * @example
 * const selectedAnalystFilterIndex = useAppSelector(selectAnalystSelectedFilterIndex);
 *
 * @param state the AppState
 * @returns the index of the filter the analyst selected, or null if there is no selection
 */
export const selectAnalystSelectedFilterIndex: (state: AppState) => number | null = state => {
  return state.app.analyst.selectedFilterIndex;
};

/**
 * A selector to get the index of the selected filter within the filter list out of the redux state.
 * If no filter is selected by the analyst, then the default filter from the filter list will be returned.
 * If no filter list is found, returns undefined.
 *
 * @example
 * const selectedFilterIndex = useAppSelector(selectSelectedFilterIndex);
 *
 * @param state the AppState
 * @returns the index of the selected filter, or undefined if there is no selection
 */
export const selectSelectedFilterIndex: (state: AppState) => number | null = createSelector(
  [selectAnalystSelectedFilterIndex, selectSelectedFilterList],
  (index, selectedFilterList) => {
    return index ?? selectedFilterList?.defaultFilterIndex ?? undefined;
  }
);

/**
 * a selector to get the selected signal detection IDs out of the redux state.
 *
 * @example
 * const selectedSdIds = useAppSelector(selectedSelectedSdIds);
 *
 * @param state the AppState
 * @returns array signal detection IDs as strings
 */
export const selectSelectedSdIds: (state: AppState) => string[] = state =>
  state.app.analyst.selectedSdIds;

/**
 * a selector to get the signal detection IDs to show in FK display out of the redux state.
 *
 * @example
 * const sdIdsToShowFk = useAppSelector(selectSdIdsToShowFk);
 *
 * @param state the AppState
 * @returns array signal detection IDs as strings
 */
export const selectSdIdsToShowFk: (state: AppState) => string[] = state =>
  state.app.analyst.sdIdsToShowFk;

/**
 * a selector to get the selected filter out of the redux state.
 *
 * @example
 * const selectedFilter = useAppSelector(selectSelectedFilter);
 *
 * @param state the AppState
 * @returns the index of the selected filter, or null if there is no selection
 */
export const selectSelectedFilter: (state: AppState) => FilterTypes.Filter = createSelector(
  [selectSelectedFilterIndex, selectSelectedFilterList],
  (index: number, selectedFilterList: FilterTypes.FilterList) => {
    if (!selectedFilterList) return undefined;
    return selectedFilterList.filters[index ?? selectedFilterList.defaultFilterIndex];
  }
);

/**
 * @returns the record of records of user supplied overrides to the hotkey cycle, such that each key
 * is the index of a record of hotkeyCycle overrides
 * @see selectHotkeyCycle for an array of boolean values indicating which filters are in the cycle
 * @see selectHotkeyCycleOverrides for this FilterList's record of overrides
 */
export const selectAllHotkeyCycleOverrides: (
  state: AppState
) => Record<string, Record<number, boolean>> = state => state.app.analyst.hotkeyCycleOverrides;

/**
 * @returns the record of user supplied overrides to the hotkey cycle, such that each key
 * is the index of a filter, and it's boolean value represents the user-set overridden state.
 * This is intended primarily for internal use, and components that care about whether a filter
 * is within the hotkey cycle should use the @function selectHotkeyCycle.
 * @see selectHotkeyCycle for an array of boolean values indicating which filters are in the cycle
 * @see selectAllHotkeyCycleOverrides for a record of all overrides
 */
export const selectHotkeyCycleOverrides: (
  state: AppState
) => Record<number, boolean> = createSelector(
  selectSelectedFilterListName,
  selectAllHotkeyCycleOverrides,
  (filterListName, allHotkeyCycles) => allHotkeyCycles[filterListName]
);

/**
 * @returns a HotkeyCycleList that contains a boolean at the corresponding index of each filter within
 * the FilterList.filter ordered list.
 */
export const selectHotkeyCycle: (state: AppState) => HotkeyCycleList = createSelector(
  [selectSelectedFilterList, selectHotkeyCycleOverrides],
  (filterList: FilterTypes.FilterList, hotkeyCycleOverrides: Record<number, boolean>) => {
    if (!filterList?.filters) {
      return [];
    }
    return filterList.filters.map((fl, index) =>
      hotkeyCycleOverrides != null && hotkeyCycleOverrides[index] != null
        ? hotkeyCycleOverrides[index]
        : fl.withinHotKeyCycle
    );
  }
);

export const selectRequestTracker = (state: AppState) => {
  return state.app.analyst.requestTracker;
};

/**
 * Select the url last added to the initiated requests
 */
export const selectLastRequestedUrl = (state: AppState): string | undefined => {
  return state.app.analyst.requestTracker.requests[state.app.analyst.requestTracker.lastRequestId]
    ?.url;
};

/**
 * Select whether the app is still loading
 */
export const selectIsLoading = (state: AppState): boolean => {
  return (
    state.app.analyst.requestTracker.completedRequests <
    state.app.analyst.requestTracker.initiatedRequests
  );
};

/**
 * Select all request statuses
 */
export const selectRequestStatuses = (state: AppState): Record<string, RequestStatus> => {
  return state.app.analyst.requestTracker.requests;
};

/**
 * Selects the pending requests. Memoized.
 *
 * @param state
 * @returns
 */
export const selectPendingRequests: (
  state: AppState
) => Record<string, RequestStatus> = createSelector([selectRequestStatuses], requestStatuses => {
  return Object.entries(requestStatuses).reduce((accum, [id, requestStatus]) => {
    if (!requestStatus.isComplete) {
      accum[id] = requestStatus;
    }
    return accum;
  }, {});
});

/**
 * Select numerical stats about the number of requests
 */
export const selectRequestStats: (
  state: AppState
) => {
  initiated: number;
  completed: number;
} = createSelector([selectRequestTracker], requestTracker => {
  return {
    initiated: requestTracker.initiatedRequests,
    completed: requestTracker.completedRequests
  };
});

/**
 * Select whether the a request encountered an error when loading a request
 */
export const selectHasRequestErrorOccurred = (state: AppState): boolean => {
  return Object.values(state.app.analyst.requestTracker.requests).some(
    requestStatus => !!requestStatus.error
  );
};

/**
 * Selects the ids of the events that are the target
 * of the user's action
 */
export const selectActionTargetEventIds = (state: AppState): string[] => {
  return state.app.analyst.actionTargets.eventIds;
};

/**
 * Selects action target type
 */
export const selectActionTargetType = (state: AppState): string => {
  return state.app.analyst.actionTargets.actionType;
};

/**
 * Selects the ids of the signal detections that are the target
 * of the user's action
 */
export const selectActionTargetSignalDetectionIds = (state: AppState): string[] => {
  return state.app.analyst.actionTargets.signalDetectionIds;
};

/**
 * Selects the ids of the previous action targets
 */
export const selectPreviousActionTargets = (state: AppState): string[] => {
  return state.app.analyst.actionTargets.previousActionTargets;
};

/**
 * Selects the type of action
 * the user will make on an event or SD
 */
export const selectActionType = (state: AppState): ActionTypes => {
  return state.app.analyst.actionTargets.actionType;
};

/**
 * Select the current phase
 */
export const selectCurrentPhase = (state: AppState): string => {
  return state.app.analyst.currentPhase;
};

/**
 * Select the default phase
 */
export const selectDefaultPhase = (state: AppState): string => {
  return state.app.analyst.defaultSignalDetectionPhase;
};

/**
 * Select the selected signal detections
 */
export const selectSelectedSignalDetections: (
  state: AppState
) => SignalDetectionTypes.SignalDetection[] = createSelector(
  [selectSignalDetections, selectSelectedSdIds],
  (signalDetections, selectedSdIds) => {
    const selectedSds: SignalDetectionTypes.SignalDetection[] = [];
    Object.values(signalDetections).forEach(signalDetection => {
      if (includes(selectedSdIds, signalDetection.id)) {
        selectedSds.push(signalDetection);
      }
    });
    return selectedSds;
  }
);

/**
 * Select the selected action target signal detection current signal detection hypotheses
 */
export const selectSelectedActionSignalDetectionsCurrentHypotheses: (
  state: AppState
) => SignalDetectionTypes.SignalDetectionHypothesis[] = createSelector(
  [selectActionTargetSignalDetectionIds, selectSignalDetections],
  (actionTargetSignalDetectionIds, signalDetections) => {
    return Object.values(signalDetections).reduce((accumulator, sd) => {
      if (includes(actionTargetSignalDetectionIds, sd.id)) {
        accumulator.push(
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
        );
      }
      return accumulator;
    }, []);
  }
);

/**
 * Select the selected signal detection current signal detection hypotheses
 */
export const selectSelectedSignalDetectionsCurrentHypotheses: (
  state: AppState
) => SignalDetectionTypes.SignalDetectionHypothesis[] = createSelector(
  [selectSignalDetections, selectSelectedSdIds],
  (signalDetections, selectedSdIds) => {
    return Object.values(signalDetections)
      .filter(sd => selectedSdIds.includes(sd.id))
      .map(sd => SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses));
  }
);

/**
 * Select the selected phases for selected signal detections using current signal detection hypotheses
 */
export const selectSelectedPhasesForSignalDetectionsCurrentHypotheses: (
  state: AppState
) => string[] = createSelector(
  [selectSelectedActionSignalDetectionsCurrentHypotheses],
  selectedSignalDetectionsCurrentHypotheses => {
    return selectedSignalDetectionsCurrentHypotheses.map(
      currentHypothesis =>
        findPhaseFeatureMeasurement(currentHypothesis.featureMeasurements).measurementValue.value
    );
  }
);

/**
 * Returns a boolean stating if all the selected signal detections are deleted
 */
export const selectAreSelectedSdsAllDeleted: (state: AppState) => boolean = createSelector(
  [selectSelectedActionSignalDetectionsCurrentHypotheses],
  selectedSignalDetectionsCurrentHypotheses => {
    return (
      determineAllDeletableSignalDetections(selectedSignalDetectionsCurrentHypotheses).length === 0
    );
  }
);

/**
 * Select the selected signal detections that are not deleted
 */
export const selectSelectedSignalDetectionIdsNotDeleted: (
  state: AppState
) => string[] = createSelector(
  [selectSelectedActionSignalDetectionsCurrentHypotheses],
  selectedSignalDetectionsCurrentHypotheses => {
    return determineAllDeletableSignalDetections(selectedSignalDetectionsCurrentHypotheses);
  }
);

/**
 * Select the valid action targets for event Ids
 */
export const selectValidActionTargetEventIds: (state: AppState) => string[] = createSelector(
  [selectEvents, selectActionTargetEventIds, selectOpenIntervalName],
  (events, actionTargetEventIds, openIntervalName) => {
    const validActionTargets: string[] = [];
    const selectedEventsPreferredEventHypothesisByStage = Object.values(events)
      .filter(event => includes(actionTargetEventIds, event.id))
      .map(event => EventTypes.findPreferredEventHypothesisByStage(event, openIntervalName));

    selectedEventsPreferredEventHypothesisByStage.forEach(hypothesis => {
      if (!hypothesis.rejected && !hypothesis.deleted) {
        validActionTargets.push(hypothesis.id.eventId);
      }
    });

    return validActionTargets;
  }
);

/**
 * ! Updates to the switch statement MUST be mirrored in useDetermineActionTargetsByType hook
 * Uses action target signal detection ids, signal detections, action type, and
 * preferred event hypothesis by stage for current open event to return
 * the valid action targets signal detection ids
 */
export const selectValidActionTargetSignalDetectionIds: (
  state: AppState
) => string[] = createSelector(
  [
    selectDefaultPhase,
    selectCurrentPhase,
    selectActionTargetSignalDetectionIds,
    selectSignalDetections,
    selectActionTargetType,
    selectPreferredEventHypothesisByStageForOpenEvent
  ],
  (
    defaultPhase,
    currentPhase,
    actionTargetSignalDetectionIds,
    signalDetections,
    actionType,
    preferredEventHypothesisByStageForOpenEvent
  ) => {
    const selectedSignalDetectionsCurrentHypotheses = Object.values(signalDetections)
      .filter(sd => includes(actionTargetSignalDetectionIds, sd.id))
      .map(sd => SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses));

    const determineActionTargetsByType = (type: SignalDetectionActionTypes): string[] => {
      switch (type) {
        case 'associate':
          return determineAllAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'unassociate':
        case 'reject associate':
          return determineAllNonAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'delete':
        case 'phase':
          return determineAllDeletableSignalDetections(selectedSignalDetectionsCurrentHypotheses);
        case 'default phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            defaultPhase
          );
        case 'current phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            currentPhase
          );
        default:
          return actionTargetSignalDetectionIds;
      }
    };

    return determineActionTargetsByType(actionType as SignalDetectionActionTypes);
  }
);

/**
 * ! Updates to the switch statement MUST be mirrored in useDetermineActionTargetsByType hook
 * Uses previous action target ids, signal detections, action type, and
 * preferred event hypothesis by stage for current open event to return
 * the previous valid action targets signal detection ids
 */
export const selectPreviousValidActionTargetSignalDetectionIds: (
  state: AppState
) => string[] = createSelector(
  [
    selectDefaultPhase,
    selectCurrentPhase,
    selectPreviousActionTargets,
    selectSignalDetections,
    selectActionTargetType,
    selectPreferredEventHypothesisByStageForOpenEvent
  ],
  (
    defaultPhase,
    currentPhase,
    previousActionTargetSignalDetectionIds,
    signalDetections,
    actionType,
    preferredEventHypothesisByStageForOpenEvent
  ) => {
    const selectedSignalDetectionsCurrentHypotheses = Object.values(signalDetections)
      .filter(sd => includes(previousActionTargetSignalDetectionIds, sd.id))
      .map(sd => SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses));

    const determineActionTargetsByType = (type: SignalDetectionActionTypes): string[] => {
      switch (type) {
        case 'associate':
          return determineAllAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'unassociate':
        case 'reject associate':
          return determineAllNonAssociableSignalDetections(
            preferredEventHypothesisByStageForOpenEvent,
            selectedSignalDetectionsCurrentHypotheses
          );
        case 'delete':
        case 'phase':
          return determineAllDeletableSignalDetections(selectedSignalDetectionsCurrentHypotheses);
        case 'default phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            defaultPhase
          );
        case 'current phase':
          return determineAllValidPhaseChangesForSignalDetections(
            selectedSignalDetectionsCurrentHypotheses,
            currentPhase
          );
        default:
          return previousActionTargetSignalDetectionIds;
      }
    };

    return determineActionTargetsByType(actionType as SignalDetectionActionTypes);
  }
);

const selectUserSelectedPhaseList = (state: AppState) => {
  return state.app.analyst.phaseSelectorPhaseList;
};

/**
 * Select the current phase selector phase list. Falls back to the first list option if the user has
 * not selected anything.
 */
export const selectPhaseSelectorPhaseList: (state: AppState) => string = createSelector(
  [selectProcessingConfiguration, selectUserSelectedPhaseList],
  (processingConfig, userSelectedPhaseList) => {
    return userSelectedPhaseList ?? processingConfig?.phaseLists?.[0]?.listTitle;
  }
);

/**
 * Select the current phase selector favorites list
 */
export const selectPhaseSelectorFavorites = (state: AppState): Record<string, string[]> => {
  return state.app.analyst.phaseSelectorFavorites;
};
