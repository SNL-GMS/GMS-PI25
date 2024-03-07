import { determineActionTargetsFromRightClickAndSetActionTargets } from '@gms/common-util';
import { AgGridReact, useImperativeContextMenuCallback } from '@gms/ui-core-components';
import type { AppDispatch } from '@gms/ui-state';
import {
  analystActions,
  EventsColumn,
  selectSelectedEventIds,
  selectUsername,
  useAppDispatch,
  useAppSelector,
  useDeleteEvents,
  useDuplicateEvents,
  useRejectEvents,
  useSetEventActionTargets,
  useSetSelectedEventIds
} from '@gms/ui-state';
import type {
  CellContextMenuEvent,
  ColumnResizedEvent,
  GridReadyEvent,
  RowClickedEvent,
  RowDoubleClickedEvent
} from 'ag-grid-community';
import classNames from 'classnames';
import type Immutable from 'immutable';
import isEqual from 'lodash/isEqual';
import * as React from 'react';

import { defaultColumnDefinition } from '~common-ui/common/table-types';
import {
  getMultiLineHeaderHeight,
  getRowHeightWithBorder,
  onGridReady,
  updateColumns
} from '~common-ui/common/table-utils';

import type { EventContextMenuProps } from './context-menus';
import { EventContextMenu } from './context-menus';
import { updateRowSelection, useSetCloseEvent, useSetOpenEvent } from './events-util';
import { getEventsTableColumnDefs } from './table/column-definitions';
import type { EventRow } from './types';
import { EventFilterOptions } from './types';

export interface EventsTableProps {
  readonly columnsToDisplay: Immutable.Map<EventsColumn, boolean>;
  readonly data: EventRow[];
  readonly setEventId: (eventId: string) => void;
}

// parameter object to clean up onRowDoubleClicked code smell
export interface RowDblClickEventActions {
  openEvent: (id: string) => Promise<void>;
  closeEvent: (id: string) => Promise<void>;
  setEventId: (eventId: string) => void;
}

/**
 * Opens the selected event
 *
 * @param eventId The event id for the clicked event
 */
export const onOpenEvent = async (
  eventId: string,
  openEvent: (id: string) => Promise<void>
): Promise<void> => {
  await openEvent(eventId);
};

/**
 * Closes the selected event
 *
 * @param eventId The event id for the clicked event
 */
export const onCloseEvent = async (
  eventId: string,
  closeEvent: (id: string) => Promise<void>
): Promise<void> => {
  await closeEvent(eventId);
};

/**
 * Set open event triggered from events list and call the setEventId callback
 *
 * @param eventId event id
 * @param dispatch AppDispatch
 * @param setEventId set event id callback from parent component
 */
export const dispatchSetEventId = (
  eventId: string,
  dispatch: AppDispatch,
  setEventId: (eventId: string) => void
): void => {
  dispatch(analystActions.setEventListOpenTriggered(true));
  setEventId(eventId);
};

/**
 * Opens or closes the event associated with the selected row depending on open/closed event
 *
 * @param event The click event for the row
 */
export const onRowDoubleClicked = async (
  dispatch: AppDispatch,
  event: RowDoubleClickedEvent,
  eventActions: RowDblClickEventActions,
  userName: string
): Promise<void> => {
  const { openEvent, closeEvent, setEventId } = eventActions;
  if (event.data.isOpen) {
    // current user already has the event open so co close it
    await closeEvent(event.data.id);
    setEventId(undefined);
  } else if (
    // no other analysts currently have the event open
    event.data.activeAnalysts.length === 0 ||
    (event.data.activeAnalysts.length === 1 && event.data.activeAnalysts?.includes(userName))
  ) {
    await openEvent(event.data.id);
  } else {
    // at least one other analyst has the event open, so show the popup
    dispatch(analystActions.setEventListOpenTriggered(true));
    setEventId(event.data.id);
  }
};

/**
 * Determines the color of the event table row.  Exported for testing purposes
 *
 * @param params RowClassParams to determine row styling for open and edge events
 * @returns string class name
 */
export const rowClassRules: {
  'open-event-row': (params: { data: EventRow }) => boolean;
  'edge-event-row': (params: { data: EventRow }) => boolean;
  'deleted-event-row': (params: { data: EventRow }) => boolean;
  'rejected-event-row': (params: { data: EventRow }) => boolean;
  'action-target-row': (params: { data: EventRow }) => boolean;
  'unqualified-action-target-row': (params: { data: EventRow }) => boolean;
} = {
  'open-event-row': (params: { data: EventRow }) => params.data.isOpen,
  'edge-event-row': (params: { data: EventRow }) =>
    !params.data.eventFilterOptions.includes(EventFilterOptions.INTERVAL),
  'deleted-event-row': (params: { data: EventRow }) => params.data.deleted,
  'rejected-event-row': (params: { data: EventRow }) => params.data.rejected,
  'action-target-row': (params: { data: EventRow }) => params.data.isActionTarget,
  'unqualified-action-target-row': (params: { data: EventRow }) =>
    params.data.isUnqualifiedActionTarget
};

export function EventsTable({ columnsToDisplay, data, setEventId }: EventsTableProps) {
  const tableRef = React.useRef<AgGridReact>(null);

  React.useEffect(() => {
    if (tableRef && tableRef.current) {
      updateColumns<EventsColumn>(tableRef, columnsToDisplay);
    }
  }, [columnsToDisplay]);

  const openEvent = useSetOpenEvent();
  const closeEvent = useSetCloseEvent();
  const setEventActionTargets = useSetEventActionTargets();
  const dispatch = useAppDispatch();

  const selectedEventIds = useAppSelector(selectSelectedEventIds);

  const userName = useAppSelector(selectUsername);
  const defaultColDef = React.useMemo(() => defaultColumnDefinition<EventRow>(), []);

  const columnDefs = React.useMemo(() => getEventsTableColumnDefs(), []);

  const [contextMenuCb, setGetOpenCallback] = useImperativeContextMenuCallback<
    EventContextMenuProps
  >();

  const setSelectedEventIds = useSetSelectedEventIds();
  const duplicateEvents = useDuplicateEvents();
  const rejectEvents = useRejectEvents();
  const deleteEvents = useDeleteEvents();

  const onCellContextMenuCallback = React.useCallback(
    (event: CellContextMenuEvent) => {
      // if provided && not already selected, set the current selection to just the context-menu'd detection
      const actionTarget = determineActionTargetsFromRightClickAndSetActionTargets(
        selectedEventIds,
        event.data.id,
        setEventActionTargets
      );

      contextMenuCb(event.event, {
        selectedEventId: event.data.id,
        isOpen: event.data.isOpen,
        openCallback: eventId => {
          dispatchSetEventId(eventId, dispatch, setEventId);
        },
        closeCallback: async eventId => onCloseEvent(eventId, closeEvent),
        duplicateCallback: () => {
          duplicateEvents(actionTarget.actionTargets);
        },
        rejectCallback: () => {
          rejectEvents(actionTarget.actionTargets);
        },
        deleteCallback: () => {
          deleteEvents(actionTarget.actionTargets);
        },
        setEventIdCallback: setEventId,
        includeEventDetailsMenuItem: false,
        isMapContextMenu: false
      });
    },
    [
      selectedEventIds,
      setEventActionTargets,
      contextMenuCb,
      setEventId,
      dispatch,
      closeEvent,
      duplicateEvents,
      rejectEvents,
      deleteEvents
    ]
  );

  const onColumnResizedCallback = React.useCallback((event: ColumnResizedEvent) => {
    if (event.column?.getId() === EventsColumn.activeAnalysts) {
      // refresh the single column
      event.api.refreshCells({ columns: [EventsColumn.activeAnalysts], force: true });
    }
  }, []);

  const onRowDoubleClickedCallback = React.useCallback(
    async (event: RowDoubleClickedEvent) =>
      onRowDoubleClicked(
        dispatch,
        event,
        {
          openEvent,
          closeEvent,
          setEventId
        },
        userName
      ),
    [dispatch, openEvent, closeEvent, setEventId, userName]
  );

  const onRowClickedCallback = React.useCallback(
    (event: RowClickedEvent) => {
      // deselects row if already selected
      if (event.node.isSelected()) {
        setSelectedEventIds(selectedEventIds.filter(item => item !== event.data.id));
      }
    },
    [selectedEventIds, setSelectedEventIds]
  );

  const onSelectionChanged = React.useCallback(() => {
    const selectedRows = tableRef?.current?.api.getSelectedRows();
    const updatedSelectedEvents = selectedRows.map(event => event.id);
    if (!isEqual(updatedSelectedEvents, selectedEventIds)) {
      setSelectedEventIds(updatedSelectedEvents);
    }
  }, [selectedEventIds, setSelectedEventIds]);

  const stableOnGridReady = React.useCallback(
    (event: GridReadyEvent) => {
      onGridReady<EventsColumn>(event, columnsToDisplay);
    },
    [columnsToDisplay]
  );

  React.useEffect(() => {
    let timer;
    if (tableRef?.current) {
      timer = setTimeout(() => {
        updateRowSelection(tableRef, selectedEventIds);
      });
    }
    return () => {
      clearTimeout(timer);
    };
  }, [selectedEventIds]);

  return (
    <div className={classNames(['event-table', 'ag-theme-dark', 'with-separated-rows-color'])}>
      <EventContextMenu getOpenCallback={setGetOpenCallback} />
      <AgGridReact
        ref={tableRef}
        context={{}}
        onGridReady={stableOnGridReady}
        defaultColDef={defaultColDef}
        columnDefs={columnDefs}
        rowData={data}
        enableCellChangeFlash={false}
        getRowId={node => node.data.id}
        rowHeight={getRowHeightWithBorder()}
        headerHeight={getMultiLineHeaderHeight(2)}
        onRowClicked={onRowClickedCallback}
        onRowDoubleClicked={onRowDoubleClickedCallback}
        rowSelection="multiple"
        onSelectionChanged={onSelectionChanged}
        suppressCellFocus
        rowDeselection
        suppressDragLeaveHidesColumns
        overlayNoRowsTemplate="No Events to display"
        onCellContextMenu={onCellContextMenuCallback}
        rowClassRules={rowClassRules}
        preventDefaultOnContextMenu
        suppressContextMenu
        onColumnResized={onColumnResizedCallback}
        enableBrowserTooltips
      />
    </div>
  );
}
