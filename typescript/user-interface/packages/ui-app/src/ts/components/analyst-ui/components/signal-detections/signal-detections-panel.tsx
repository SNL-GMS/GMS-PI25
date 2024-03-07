import { SignalDetectionTypes } from '@gms/common-model';
import {
  findPhaseFeatureMeasurement,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import type { SignalDetectionFetchResult } from '@gms/ui-state';
import {
  selectActionTargetSignalDetectionIds,
  selectDisplaySignalDetectionConfiguration,
  selectOpenEventId,
  selectOpenIntervalName,
  selectPreviousActionTargets,
  selectPreviousValidActionTargetSignalDetectionIds,
  selectSelectedSdIds,
  selectSignalDetectionToDisplay,
  selectValidActionTargetSignalDetectionIds,
  selectWorkflowTimeRange,
  SignalDetectionColumn,
  signalDetectionsActions,
  useAppDispatch,
  useAppSelector,
  useEventStatusQuery,
  useGetEvents,
  useSetSignalDetectionActionTargets,
  useUiTheme,
  useUpdateSignalDetectionPhase,
  useViewableInterval
} from '@gms/ui-state';
import { selectSignalDetectionAssociationConflictCount } from '@gms/ui-state/lib/app/state/signal-detections/selectors';
import Immutable from 'immutable';
import React from 'react';

import { CreateEventDialog } from '~analyst-ui/common/dialogs/create-event/create-event-dialog';
import { PhaseSelectorDialog } from '~analyst-ui/common/dialogs/phase-selector/phase-selector-dialog';
import { SignalDetectionsHotkeys } from '~analyst-ui/common/hotkey-configs/signal-detection-hotkey-configs';
import { getSignalDetectionStatus } from '~analyst-ui/common/utils/event-util';
import {
  nonIdealStateLoadingSignalDetections,
  nonIdealStateSelectAnInterval
} from '~analyst-ui/components/signal-detections/signal-detections-non-ideal-states';
import { buildSignalDetectionRow } from '~analyst-ui/components/signal-detections/table/signal-detections-table-utils';
import { SignalDetectionsToolbar } from '~analyst-ui/components/signal-detections/toolbar/signal-detections-toolbar';

import { convertMapToObject } from '../../../common-ui/common/table-utils';
import { useVisibleSignalDetections } from '../waveform/waveform-hooks';
import { SignalDetectionsTable } from './table/signal-detections-table';
import type {
  SignalDetectionCountEntry,
  SignalDetectionCountFilterOptions
} from './toolbar/signal-detection-count-toolbar-item';
import type { SignalDetectionRow } from './types';

export interface SignalDetectionsPanelProps {
  signalDetectionsQuery: SignalDetectionFetchResult;
}

/**
 * Takes the column definition records from redux and converts it to a {@link Immutable.Map}.
 */
const convertObjectToSDColumnMap = (
  columnArguments: Record<string, boolean>
): Immutable.Map<SignalDetectionColumn, boolean> => {
  const notableValues = [...Object.keys(columnArguments)];
  return Immutable.Map<SignalDetectionColumn, boolean>([
    ...Object.values(SignalDetectionColumn)
      .filter(v => notableValues.includes(v))
      .map<[SignalDetectionColumn, boolean]>(v => [v, columnArguments[v]])
  ]);
};

/**
 * Returns a memoized list of {@link SignalDetectionRow}s
 *
 * @param signalDetections Data is used as the basis for each row
 */
const useSignalDetectionRows = (signalDetections: SignalDetectionTypes.SignalDetection[]) => {
  const { data: events } = useGetEvents();
  const { data: eventStatuses } = useEventStatusQuery();
  const openEventId = useAppSelector(selectOpenEventId);
  const timeRange = useAppSelector(selectWorkflowTimeRange);
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const sdIdsInConflicts = useAppSelector(selectSignalDetectionAssociationConflictCount);
  const signalDetectionActionTargets = useAppSelector(selectActionTargetSignalDetectionIds);
  const validActionTargetSignalDetectionIds = useAppSelector(
    selectValidActionTargetSignalDetectionIds
  );
  return React.useMemo(() => {
    if (!signalDetections || signalDetections.length === 0) return [];
    return signalDetections.map(sd => {
      const associationStatus = getSignalDetectionStatus(
        sd,
        events,
        openEventId,
        eventStatuses,
        openIntervalName
      );
      const sdInConflict = sdIdsInConflicts.includes(sd.id);
      const sdIsActionTarget = signalDetectionActionTargets.includes(sd.id);
      return buildSignalDetectionRow(
        {
          sd,
          associationStatus,
          sdInConflict,
          sdIsActionTarget,
          validActionTargetSignalDetectionIds
        },
        timeRange
      );
    });
  }, [
    signalDetections,
    events,
    eventStatuses,
    openEventId,
    openIntervalName,
    timeRange,
    sdIdsInConflicts,
    signalDetectionActionTargets,
    validActionTargetSignalDetectionIds
  ]);
};

/**
 * IAN signal detections component.
 */
export function SignalDetectionsPanelComponent() {
  const [uiTheme] = useUiTheme();
  const dispatch = useAppDispatch();
  const isSynced = useAppSelector(selectDisplaySignalDetectionConfiguration).syncWaveform;
  const signalDetectionsQuery = useVisibleSignalDetections(isSynced);

  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  const previousActionTargets = useAppSelector(selectPreviousActionTargets);

  const currentIntervalWithBuffer = useViewableInterval()[0];
  const [phaseMenuVisibility, setPhaseMenuVisibility] = React.useState(false);
  const [createEventMenuVisibility, setCreateEventMenuVisibility] = React.useState(false);

  const selectedSDColumnsToDisplayObject = useAppSelector(selectSignalDetectionToDisplay);

  const selectedSDColumnsToDisplay = React.useMemo(
    () => convertObjectToSDColumnMap(selectedSDColumnsToDisplayObject),
    [selectedSDColumnsToDisplayObject]
  );
  const setSelectedSDColumnsToDisplay = React.useCallback(
    (cols: Immutable.Map<SignalDetectionColumn, boolean>) =>
      dispatch(signalDetectionsActions.updateSignalDetectionColumns(convertMapToObject(cols))),
    [dispatch]
  );

  const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();
  const rowData: SignalDetectionRow[] = useSignalDetectionRows(signalDetectionsQuery?.data);
  // getting previous because the action target ids are removed from state
  // when the context menu closes, but we need to pass them to the phase menu
  const previousValidSDActionTargetIds = useAppSelector(
    selectPreviousValidActionTargetSignalDetectionIds
  );

  const displayedSignalDetectionConfigurationObject = useAppSelector(
    selectDisplaySignalDetectionConfiguration
  );

  const countEntryRecord: Record<
    SignalDetectionCountFilterOptions,
    SignalDetectionCountEntry
  > = React.useMemo(
    () => ({
      Total: {
        count: rowData.length,
        color: uiTheme.colors.gmsMain,
        isShown: true,
        tooltip: 'Total number of events'
      },
      Open: {
        count: rowData.filter(
          s => s.assocStatus === SignalDetectionTypes.SignalDetectionStatus.OPEN_ASSOCIATED
        ).length,
        color: uiTheme.colors.openEventSDColor,
        isShown: displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToOpenEvent,
        tooltip: 'Number of signal detections associated to open event'
      },
      Completed: {
        count: rowData.filter(
          s => s.assocStatus === SignalDetectionTypes.SignalDetectionStatus.COMPLETE_ASSOCIATED
        ).length,
        color: uiTheme.colors.completeEventSDColor,
        isShown:
          displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToCompletedEvent,
        tooltip: 'Number of signal detections associated to completed event'
      },
      Other: {
        count: rowData.filter(
          s => s.assocStatus === SignalDetectionTypes.SignalDetectionStatus.OTHER_ASSOCIATED
        ).length,
        color: uiTheme.colors.otherEventSDColor,
        isShown: displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToOtherEvent,
        tooltip: 'Number of signal detections associated to other event'
      },
      Conflicts: {
        count: rowData.filter(s => s.conflict).length,
        color: uiTheme.colors.conflict,
        isShown: displayedSignalDetectionConfigurationObject.signalDetectionConflicts,
        tooltip: 'Number of signal detections with conflicts'
      },
      Deleted: {
        count: rowData.filter(s => s.deleted === 'True').length,
        color: uiTheme.colors.deletedEventColor,
        isShown: displayedSignalDetectionConfigurationObject.signalDetectionDeleted,
        tooltip: 'Number of deleted signal detections'
      },
      Unassociated: {
        count: rowData.filter(
          s => s.assocStatus === SignalDetectionTypes.SignalDetectionStatus.UNASSOCIATED
        ).length,
        color: uiTheme.colors.unassociatedSDColor,
        isShown: displayedSignalDetectionConfigurationObject.signalDetectionUnassociated,
        tooltip: 'Number of unassociated signal detections'
      }
    }),
    [
      displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToCompletedEvent,
      displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToOpenEvent,
      displayedSignalDetectionConfigurationObject.signalDetectionAssociatedToOtherEvent,
      displayedSignalDetectionConfigurationObject.signalDetectionConflicts,
      displayedSignalDetectionConfigurationObject.signalDetectionDeleted,
      displayedSignalDetectionConfigurationObject.signalDetectionUnassociated,
      rowData,
      uiTheme.colors.completeEventSDColor,
      uiTheme.colors.conflict,
      uiTheme.colors.deletedEventColor,
      uiTheme.colors.gmsMain,
      uiTheme.colors.openEventSDColor,
      uiTheme.colors.otherEventSDColor,
      uiTheme.colors.unassociatedSDColor
    ]
  );

  // non ideal state checks
  if (
    !currentIntervalWithBuffer ||
    currentIntervalWithBuffer?.startTimeSecs === null ||
    currentIntervalWithBuffer?.endTimeSecs === null
  ) {
    return nonIdealStateSelectAnInterval;
  }

  if (signalDetectionsQuery.isLoading) {
    return nonIdealStateLoadingSignalDetections;
  }

  const selectedPhases = [];

  previousValidSDActionTargetIds?.forEach(id => {
    const signalDetection = signalDetectionsQuery?.data?.find(sd => sd.id === id);
    if (signalDetection) {
      const currentHypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
      selectedPhases.push(
        findPhaseFeatureMeasurement(currentHypothesis.featureMeasurements).measurementValue.value
      );
    }
  });

  const phaseSelectorCallback = (phases: string[]) => {
    // ! The first context menu clears the action target on close so this nested action
    // ! Relies on the previous action targets set on click for set phase menu option
    setSignalDetectionActionTargets(previousActionTargets);
    signalDetectionPhaseUpdate(previousValidSDActionTargetIds ?? [], phases[0]);
  };

  return (
    <SignalDetectionsHotkeys
      selectedSignalDetectionsIds={selectedSdIds}
      setPhaseMenuVisibility={setPhaseMenuVisibility}
      setCreateEventMenuVisibility={setCreateEventMenuVisibility}
    >
      <div className="signal-detection-panel" data-cy="signal-detection-panel">
        <SignalDetectionsToolbar
          key="sdtoolbar"
          countEntryRecord={countEntryRecord}
          selectedSDColumnsToDisplay={selectedSDColumnsToDisplay}
          setSelectedSDColumnsToDisplay={setSelectedSDColumnsToDisplay}
          setCreateEventMenuVisibility={setCreateEventMenuVisibility}
        />
        <SignalDetectionsTable
          key="sdtable"
          isSynced={isSynced}
          signalDetectionsQuery={signalDetectionsQuery}
          data={rowData}
          columnsToDisplay={selectedSDColumnsToDisplay}
          setPhaseMenuVisibility={setPhaseMenuVisibility}
        />
        <PhaseSelectorDialog
          isOpen={phaseMenuVisibility}
          title="Set Phase"
          selectedPhases={selectedPhases}
          phaseSelectorCallback={phaseSelectorCallback}
          closeCallback={() => {
            setSignalDetectionActionTargets([]);
            setPhaseMenuVisibility(false);
          }}
        />
        <CreateEventDialog
          isOpen={createEventMenuVisibility}
          onClose={() => setCreateEventMenuVisibility(false)}
        />
      </div>
    </SignalDetectionsHotkeys>
  );
}

export const SignalDetectionsPanel = React.memo(SignalDetectionsPanelComponent);
