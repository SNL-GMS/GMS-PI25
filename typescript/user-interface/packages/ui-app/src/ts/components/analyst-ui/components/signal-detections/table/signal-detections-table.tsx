import type { EventTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { dateStringIsValid, setDecimalPrecisionAsNumber, toEpochSeconds } from '@gms/common-util';
import type { RowNode } from '@gms/ui-core-components';
import { AgGridReact, useImperativeContextMenuCallback } from '@gms/ui-core-components';
import type {
  EventStatus,
  SignalDetectionFetchResult,
  UpdateSignalDetectionArgs
} from '@gms/ui-state';
import {
  selectDisplaySignalDetectionConfiguration,
  selectOpenEvent,
  selectOpenEventId,
  selectOpenIntervalName,
  SignalDetectionColumn,
  useAppSelector,
  useAssociateSignalDetections,
  useEventStatusQuery,
  useGetSelectedSdIds,
  useSetSelectedSdIds,
  useSetSignalDetectionActionTargets,
  useUnassociateSignalDetections,
  useUpdateSignalDetection,
  useViewableInterval
} from '@gms/ui-state';
import type { WeavessTypes } from '@gms/weavess-core';
import type {
  CellClickedEvent,
  CellContextMenuEvent,
  CellEditRequestEvent,
  GridReadyEvent
} from 'ag-grid-community';
import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import React from 'react';
import { toast } from 'react-toastify';

import type { SignalDetectionContextMenusCallbacks } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { SignalDetectionContextMenus } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { EventUtils } from '~analyst-ui/common/utils';
import {
  agGridDoesExternalFilterPass,
  agGridIsExternalFilterPresent,
  handleNonIdealState,
  isValidSdListStdDev,
  sdRowClassRules,
  updateRowSelection
} from '~analyst-ui/components/signal-detections/table/signal-detections-table-utils';
import { defaultColumnDefinition } from '~common-ui/common/table-types';
import {
  getHeaderHeight,
  getRowHeightWithBorder,
  onGridReady,
  updateColumns
} from '~common-ui/common/table-utils';

import { systemConfig } from '../../../config/system-config';
import type { SignalDetectionRow, SignalDetectionsTableProps } from '../types';
import { getSignalDetectionTableColumnDefs } from './column-definitions';

/**
 * Update the signal detection selection. If the table API is not defined due to a race condition on startup,
 * set a timeout and try again. And again. And again, up to ten times, or the provided max number of tries to attempt.
 */
export const useUpdatedSignalDetectionSelection = (
  tableRef: React.MutableRefObject<AgGridReact>,
  selectedSdIds: string[],
  maxTries = 10,
  backOffIncrement = 16
): void => {
  const timeoutRef = React.useRef<NodeJS.Timeout | number>();
  const numTriesRef = React.useRef<number>(0);
  const maybeUpdateRowSelection = React.useCallback(() => {
    numTriesRef.current += 1;
    if (tableRef.current.api != null) {
      updateRowSelection(tableRef, selectedSdIds);
    } else if (numTriesRef.current < maxTries) {
      timeoutRef.current = setTimeout(
        maybeUpdateRowSelection,
        backOffIncrement * numTriesRef.current
      );
    }
  }, [backOffIncrement, maxTries, selectedSdIds, tableRef]);

  React.useEffect(() => {
    if (tableRef.current != null) {
      maybeUpdateRowSelection();
    }
    return () => {
      clearTimeout(timeoutRef.current as any);
    };
  }, [maybeUpdateRowSelection, selectedSdIds, tableRef]);
};

interface CellDoubleClickParams {
  event: CellClickedEvent;
  signalDetectionsQuery: SignalDetectionFetchResult;
  currentOpenEventId: string;
  currentOpenEvent: EventTypes.Event;
  currentOpenInterval: string;
  eventStatusQuery: Record<string, EventStatus>;
  associateSignalDetectionFn: (signalDetectionIds: string[]) => void;
  unassociateSignalDetectionFn: (
    signalDetectionIds: string[],
    rejectAssociations?: boolean
  ) => void;
}

/**
 * Cell Event and other parameters used in cell editor callback
 */
interface CellEditParams {
  event: CellEditRequestEvent;
  viewableInterval: WeavessTypes.TimeRange;
  signalDetectionsQuery: SignalDetectionFetchResult;
  updateSignalDetection: (args: UpdateSignalDetectionArgs) => void;
}

/**
 * Associates or Unassociates the double-clicked row's SD to the currently open event
 *
 * @param params: CellDoubleClickParams
 * @param params.event: CellClickedEvent
 * @param params.signalDetectionsQuery: SignalDetectionFetchResult
 * @param params.currentOpenEventId: string
 * @param params.currentOpenEvent: EventTypes.Event
 * @param params.currentOpenInterval: string
 * @param params.eventStatusQuery: Record<string, EventStatus>
 * @param params.associateSignalDetectionFn: (signalDetectionIds: string[]) => void
 * @param params.unassociateSignalDetectionFn: (signalDetectionIds: string[], rejectAssociations?: boolean) => void
 */
export const onCellDoubleClicked = (params: CellDoubleClickParams) => {
  // If double click occurred on a editable or rejected cell then ignore associate/unassociate call
  if (params.event.colDef.editable || params.event.data.rejected === 'True') return;
  if (params.currentOpenEventId === undefined || params.currentOpenEventId === null) return;

  const signalDetection = params.signalDetectionsQuery.data.find(
    sd => sd.id === params.event.data.id
  );
  const assocStatus = EventUtils.getSignalDetectionStatus(
    signalDetection,
    [params.currentOpenEvent],
    params.currentOpenEventId ?? undefined,
    params.eventStatusQuery,
    params.currentOpenInterval
  );

  // Should associate to the open event
  if (
    assocStatus === SignalDetectionTypes.SignalDetectionStatus.UNASSOCIATED ||
    assocStatus === SignalDetectionTypes.SignalDetectionStatus.OTHER_ASSOCIATED
  ) {
    params.associateSignalDetectionFn([signalDetection.id]);
  }
  // Should unassociate from the open event
  else if (assocStatus === SignalDetectionTypes.SignalDetectionStatus.OPEN_ASSOCIATED) {
    params.unassociateSignalDetectionFn([signalDetection.id]);
  }
};

/**
 * Parse and validate the arrival time string
 *
 * @param stringToProcess date/time string
 * @returns epoch seconds or null
 */
function parseArrivalTime(stringToProcess: string): number | null {
  let timeString = stringToProcess;
  if (!timeString.toLowerCase().endsWith('z')) {
    timeString = `${timeString}Z`;
  }

  if (dateStringIsValid(timeString)) {
    return toEpochSeconds(timeString);
  }
  return null;
}

/**
 * Update values in UI state if uncertainty or arrival time have updated
 *
 * @param arrivalTime
 * @param uncertaintySecs
 * @param params
 * @param sd
 * @param arrivalTimeFmValue
 */
function maybeUpdateEditedCells(
  arrivalTime: number,
  uncertaintySecs: number,
  params: CellEditParams,
  sd: SignalDetectionTypes.SignalDetection,
  arrivalTimeFmValue: SignalDetectionTypes.ArrivalTimeFeatureMeasurement
): void {
  if (
    arrivalTime !== arrivalTimeFmValue.measurementValue.arrivalTime.value ||
    uncertaintySecs !== arrivalTimeFmValue.measurementValue.arrivalTime.standardDeviation
  ) {
    const args: UpdateSignalDetectionArgs = {
      isDeleted: SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
        .deleted,
      signalDetectionIds: [params.event.data.id],
      arrivalTime: {
        value: arrivalTime,
        uncertainty: setDecimalPrecisionAsNumber(
          uncertaintySecs,
          systemConfig.sdUncertainty.fractionDigits
        )
      },
      phase: undefined
    };
    params.updateSignalDetection(args);
  }
}

/**
 * Arrival time and uncertainty cell edit calls update SD if value is valid
 *
 * @param params CellEditParams
 */
export function onCellEditCallback(params: CellEditParams): void {
  const sd = params.signalDetectionsQuery.data.find(s => s.id === params.event.data.id);
  const arrivalTimeFmValue = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementUsingSignalDetection(
    sd
  );

  // Get the arrival time
  let arrivalTime = arrivalTimeFmValue.measurementValue.arrivalTime.value;
  if (params.event.colDef.field === SignalDetectionColumn.time) {
    arrivalTime = parseArrivalTime(params.event.newValue);
    // Check parsed time string
    if (!arrivalTime) {
      toast.warn(`Arrival time ${params.event.newValue} is not a valid date`);
      return;
    }
  }

  // Get the arrival time standard deviation
  let uncertaintySecs = arrivalTimeFmValue.measurementValue.arrivalTime.standardDeviation;
  if (params.event.colDef.field === SignalDetectionColumn.timeStandardDeviation) {
    const uncertaintyStr = String(params.event.newValue).replace(/,/g, '');
    const uncertainty: number = parseFloat(uncertaintyStr);
    if (isValidSdListStdDev(uncertaintyStr)) {
      uncertaintySecs = uncertainty;
      if (uncertaintySecs < systemConfig.sdUncertainty.minUncertainty) {
        toast.warn(
          `Adjusting value entered ${uncertainty || ''} to minimum standard deviation of ${
            systemConfig.sdUncertainty.minUncertainty
          }.`
        );
        uncertaintySecs = systemConfig.sdUncertainty.minUncertainty;
      }
    } else {
      toast.warn(`Standard deviation value entered ${uncertainty || ''} is invalid.`);
      return;
    }
  }

  // Check the arrival time ± uncertainty is within the viewable interval
  if (
    arrivalTime - uncertaintySecs < params.viewableInterval.startTimeSecs ||
    arrivalTime + uncertaintySecs > params.viewableInterval.endTimeSecs
  ) {
    toast.warn(`Arrival time ± standard deviation is not within open interval.`);
    return;
  }

  // If either value changed update SD in UI state
  maybeUpdateEditedCells(arrivalTime, uncertaintySecs, params, sd, arrivalTimeFmValue);
}

export function SignalDetectionsTableComponent({
  isSynced,
  signalDetectionsQuery,
  data,
  columnsToDisplay,
  setPhaseMenuVisibility
}: SignalDetectionsTableProps) {
  const tableRef = React.useRef<AgGridReact>(null);
  const selectedSdIds = useGetSelectedSdIds();
  const currentOpenEventId = useAppSelector(selectOpenEventId);
  const currentOpenEvent = useAppSelector(selectOpenEvent);
  const openInterval = useAppSelector(selectOpenIntervalName);
  const eventStatusQuery = useEventStatusQuery();
  const associateSignalDetection = useAssociateSignalDetections();
  const unassociateSignalDetection = useUnassociateSignalDetections();
  const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();
  const setSelectedSdIds = useSetSelectedSdIds();
  const [sdContextMenusCb, setSdContextMenusCb] = useImperativeContextMenuCallback<
    SignalDetectionContextMenusCallbacks,
    SignalDetectionContextMenusCallbacks
  >();

  const displayedSignalDetectionConfigurationObject = useAppSelector(
    selectDisplaySignalDetectionConfiguration
  );

  /**
   * Required by {@link isExternalFilterPresent} and {@link doesExternalFilterPass} due to
   * the way ag-grid creates closures for those respective functions.
   */
  const filterStateRef = React.useRef(displayedSignalDetectionConfigurationObject);

  React.useEffect(() => {
    updateColumns<SignalDetectionColumn>(tableRef, columnsToDisplay);
  }, [columnsToDisplay]);

  React.useEffect(() => {
    filterStateRef.current = displayedSignalDetectionConfigurationObject;
    // Notifies the grid that the filter conditions have changed.
    tableRef.current?.api?.onFilterChanged();
  }, [displayedSignalDetectionConfigurationObject]);

  const onCellContextMenuCallback = React.useCallback(
    (event: CellContextMenuEvent) => {
      const actionTargetIds =
        event && selectedSdIds.indexOf(event.data.id) === -1 ? [event.data.id] : selectedSdIds;
      setSignalDetectionActionTargets(actionTargetIds);
      sdContextMenusCb.signalDetectionContextMenuCb(event.event, {
        keyPrefix: 'sd-display-sd',
        signalDetectionDetailsCb: sdContextMenusCb.signalDetectionDetailsCb,
        setPhaseMenuVisibilityCb: setPhaseMenuVisibility
      });
    },
    [sdContextMenusCb, selectedSdIds, setPhaseMenuVisibility, setSignalDetectionActionTargets]
  );

  /**
   * Called by ag-grid to determine if an external filter is present/active.
   */
  const isExternalFilterPresent = React.useCallback(
    () => agGridIsExternalFilterPresent(filterStateRef.current),
    []
  );

  /**
   * Called by ag-grid once for each {@link RowNode}. Should return true if external filter
   * passes, otherwise false.
   */
  const doesExternalFilterPass = React.useCallback(
    (node: RowNode): boolean => agGridDoesExternalFilterPass(node, filterStateRef.current),
    []
  );

  const onCellDoubleClickedCallback = React.useCallback(
    (signalDetectionRow: CellClickedEvent) => {
      const dblClickParams: CellDoubleClickParams = {
        event: undefined,
        signalDetectionsQuery,
        currentOpenEventId,
        currentOpenEvent,
        currentOpenInterval: openInterval,
        eventStatusQuery: eventStatusQuery.data,
        associateSignalDetectionFn: associateSignalDetection,
        unassociateSignalDetectionFn: unassociateSignalDetection
      };
      onCellDoubleClicked({ ...dblClickParams, event: signalDetectionRow });
    },
    [
      signalDetectionsQuery,
      currentOpenEventId,
      currentOpenEvent,
      eventStatusQuery.data,
      openInterval,
      associateSignalDetection,
      unassociateSignalDetection
    ]
  );

  const updateSignalDetection = useUpdateSignalDetection();
  const [viewableInterval] = useViewableInterval();

  const onCellEdit = React.useCallback(
    (event: CellEditRequestEvent) => {
      const cellEditParams: CellEditParams = {
        event: undefined,
        viewableInterval,
        signalDetectionsQuery,
        updateSignalDetection
      };

      onCellEditCallback({ ...cellEditParams, event });
    },
    [signalDetectionsQuery, updateSignalDetection, viewableInterval]
  );

  const onCellClickedCallback = React.useCallback(
    (event: CellClickedEvent) => {
      const editingCells = tableRef?.current?.api.getEditingCells();
      const isEditing =
        editingCells.find(cell => cell.rowIndex === event.node.rowIndex) !== undefined;
      if (isEditing) {
        event.node.setSelected(true);
      } else if (event.node.isSelected()) {
        const selectedSd = selectedSdIds.filter(sd => sd !== event.data.id);
        setSelectedSdIds(selectedSd);
      }
    },
    [selectedSdIds, setSelectedSdIds]
  );

  const onSelectionChanged = React.useCallback(() => {
    const selectedRows = tableRef?.current?.api.getSelectedRows();
    const updatedSelectedSdIds = selectedRows.map(sd => sd.id);
    setSelectedSdIds(updatedSelectedSdIds);
  }, [setSelectedSdIds]);

  const stableOnGridReady = React.useCallback(
    (event: GridReadyEvent) => {
      onGridReady<SignalDetectionColumn>(event, columnsToDisplay);
    },
    [columnsToDisplay]
  );

  const columnDefs = React.useMemo(getSignalDetectionTableColumnDefs, []);

  useUpdatedSignalDetectionSelection(tableRef, selectedSdIds);
  return (
    handleNonIdealState(signalDetectionsQuery, isSynced) ?? (
      <div
        className={classNames([
          'signal-detection-table-wrapper',
          'ag-theme-dark',
          'with-separated-rows-color'
        ])}
      >
        <SignalDetectionContextMenus getOpenCallback={setSdContextMenusCb} />
        <AgGridReact
          ref={tableRef}
          context={{}}
          onGridReady={stableOnGridReady}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          defaultColDef={defaultColumnDefinition<SignalDetectionRow>()}
          columnDefs={columnDefs}
          rowData={data}
          rowHeight={getRowHeightWithBorder()}
          rowClassRules={sdRowClassRules}
          headerHeight={getHeaderHeight()}
          getRowId={node => node.data.id}
          onSelectionChanged={onSelectionChanged}
          rowDeselection
          rowSelection="multiple"
          suppressCellFocus
          suppressContextMenu
          preventDefaultOnContextMenu
          suppressDragLeaveHidesColumns
          overlayNoRowsTemplate="No Signal Detections to display"
          enableBrowserTooltips
          enableCellChangeFlash={false}
          onCellContextMenu={onCellContextMenuCallback}
          onCellEditRequest={onCellEdit}
          onCellDoubleClicked={onCellDoubleClickedCallback}
          onCellClicked={onCellClickedCallback}
          readOnlyEdit
          stopEditingWhenCellsLoseFocus
        />
      </div>
    )
  );
}

export const sdPanelMemoCheck = (
  prev: SignalDetectionsTableProps,
  next: SignalDetectionsTableProps
): boolean => {
  // if false, reload
  // If anything in the query changes except for pending/isLoading/isError/data.length
  if (prev.signalDetectionsQuery.isError !== next.signalDetectionsQuery.isError) return false;
  if (prev.signalDetectionsQuery.isLoading !== next.signalDetectionsQuery.isLoading) return false;
  if (prev.signalDetectionsQuery.pending !== next.signalDetectionsQuery.pending) return false;
  if (
    (prev.signalDetectionsQuery.data?.length === 0) !==
    (next.signalDetectionsQuery.data?.length === 0)
  )
    return false;

  if (!isEqual(prev.data, next.data)) return false;

  if (prev.isSynced !== next.isSynced) return false;

  if (!isEqual(prev.columnsToDisplay, next.columnsToDisplay)) return false;

  // Default, do not reload
  return true;
};

export const SignalDetectionsTable = React.memo(SignalDetectionsTableComponent, sdPanelMemoCheck);
