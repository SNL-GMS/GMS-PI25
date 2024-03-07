import { EventTypes } from '@gms/common-model';
import type { AnalystWorkspaceTypes, EventsFetchResult } from '@gms/ui-state';
import {
  selectActionTargetEventIds,
  selectActionType,
  selectEventsColumnsToDisplay,
  selectOpenEventId,
  selectOpenIntervalName,
  selectWorkflowTimeRange,
  useAppSelector,
  useEventStatusQuery,
  useUiTheme
} from '@gms/ui-state';
import { DisplayedEventsConfigurationEnum } from '@gms/ui-state/lib/app/state/events';
import {
  selectDisplayedEventsConfiguration,
  selectEventAssociationConflictIds
} from '@gms/ui-state/lib/app/state/events/selectors';
import React from 'react';

import { CreateEventDialog } from '~analyst-ui/common/dialogs/create-event/create-event-dialog';
import { convertObjectToEventsColumnMap } from '~common-ui/common/table-utils';
import { semanticColors } from '~scss-config/color-preferences';

import type { MapEventSource } from '../map/types';
import { IANConfirmOpenEventPopup } from './confirm-open-event-popup';
import { EventsTable } from './events-table';
import { buildEventRow } from './events-util';
import type { CountFilterOptions, EventCountEntry } from './toolbar/event-count-toolbar-item';
import { EventsToolbar } from './toolbar/events-toolbar';
import type { EventRow } from './types';
import { EventFilterOptions } from './types';

export interface EventsTablePanelProps {
  readonly eventResults: EventsFetchResult;
  createEventMenuVisibility: boolean;
  setCreateEventMenuVisibility: (value: boolean) => void;
}

/**
 * Use event rows in events toolbar props to populate the events list display
 *
 * @param eventQuery The query containing events to be filtered for display in the events toolbar
 * @param eventInConflictIds
 * @returns
 */
export const useEventRows = (
  eventQuery: EventsFetchResult,
  eventInConflictIds: string[]
): EventRow[] | MapEventSource[] => {
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const timeRange = useAppSelector(selectWorkflowTimeRange);

  const openEventId = useAppSelector(selectOpenEventId);
  const eventStatusQuery = useEventStatusQuery();

  const eventActionType: Omit<
    AnalystWorkspaceTypes.ActionTypes,
    AnalystWorkspaceTypes.SignalDetectionActionTypes
  > = useAppSelector(selectActionType);
  const eventActionTargets = useAppSelector(selectActionTargetEventIds);
  // Build rows for each each event
  return React.useMemo<EventRow[]>(() => {
    const { data: events } = eventQuery;
    if (events?.length === 0) return [];
    return events.map<EventRow>(event => {
      const eventStatus = eventStatusQuery.data?.[event.id];

      const eventIsOpen = openEventId === event.id;
      const eventInConflict = eventInConflictIds.includes(event.id);

      const eventIsActionTarget = eventActionTargets?.includes(event.id);

      return buildEventRow(
        {
          event,
          eventStatus,
          eventIsOpen,
          eventInConflict,
          eventIsActionTarget
        },
        openIntervalName,
        timeRange,
        eventActionType as AnalystWorkspaceTypes.EventActionTypes
      );
    });
  }, [
    eventActionTargets,
    eventActionType,
    eventInConflictIds,
    eventQuery,
    eventStatusQuery.data,
    openEventId,
    openIntervalName,
    timeRange
  ]);
};

export function EventsTablePanel({
  eventResults,
  createEventMenuVisibility,
  setCreateEventMenuVisibility
}: EventsTablePanelProps) {
  const [uiTheme] = useUiTheme();
  const eventInConflictIds = useAppSelector(selectEventAssociationConflictIds);
  const eventsColumnsToDisplayObject = useAppSelector(selectEventsColumnsToDisplay);
  const columnsToDisplay = React.useMemo(
    () => convertObjectToEventsColumnMap(eventsColumnsToDisplayObject),
    [eventsColumnsToDisplayObject]
  );
  const displayedEventsConfiguration = useAppSelector(selectDisplayedEventsConfiguration);
  const [eventId, setEventId] = React.useState(undefined);
  const [isCurrentlyOpen, setIsCurrentlyOpen] = React.useState(false);
  const allEventRows: EventRow[] = useEventRows(eventResults, eventInConflictIds);
  // if before is toggled off and the event is in the before buffer
  // or after is toggled off and the event is in the after buffer
  // don't display the event
  const eventRows = React.useMemo(() => {
    let rows: EventRow[] = allEventRows;
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.edgeEventsBeforeInterval]) {
      rows = rows.filter(
        eventRow => !eventRow.eventFilterOptions.includes(EventFilterOptions.BEFORE)
      );
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.edgeEventsAfterInterval]) {
      rows = rows.filter(
        eventRow => !eventRow.eventFilterOptions.includes(EventFilterOptions.AFTER)
      );
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsDeleted]) {
      rows = rows.filter(
        eventRow => !eventRow.eventFilterOptions.includes(EventFilterOptions.DELETED)
      );
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsRejected]) {
      rows = rows.filter(
        eventRow => !eventRow.eventFilterOptions.includes(EventFilterOptions.REJECTED)
      );
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsCompleted]) {
      rows = rows.filter(s => s.status !== EventTypes.EventStatus.COMPLETE);
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsRemaining]) {
      rows = rows.filter(s => s.status === EventTypes.EventStatus.COMPLETE);
    }
    if (!displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsConflict]) {
      rows = rows.filter(s => !s.conflict);
    }
    return rows;
  }, [allEventRows, displayedEventsConfiguration]);

  const countEntryRecord: Record<CountFilterOptions, EventCountEntry> = React.useMemo(
    () => ({
      Total: {
        count: allEventRows.length,
        color: uiTheme.colors.gmsMain,
        isShown: true,
        tooltip: 'Total number of events'
      },
      Complete: {
        count: allEventRows.filter(s => s.status === EventTypes.EventStatus.COMPLETE).length,
        color: semanticColors.analystComplete,
        isShown: displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsCompleted],
        tooltip: 'Number of completed events'
      },
      Remaining: {
        count: allEventRows.filter(s => s.status !== EventTypes.EventStatus.COMPLETE).length,
        color: semanticColors.analystToWork,
        isShown: displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsRemaining],
        tooltip: 'Number of remaining events'
      },
      Conflicts: {
        count: eventInConflictIds.length,
        color: uiTheme.colors.conflict,
        isShown: displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsConflict],
        tooltip: 'Number of events with conflicts'
      },
      Deleted: {
        count: allEventRows.filter(s => s.deleted).length,
        color: uiTheme.colors.deletedEventColor,
        isShown: displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsDeleted],
        tooltip: 'Number of deleted events'
      },
      Rejected: {
        count: allEventRows.filter(s => s.rejected).length,
        color: uiTheme.colors.rejectedEventColor,
        isShown: displayedEventsConfiguration[DisplayedEventsConfigurationEnum.eventsRejected],
        tooltip: 'Number of rejected events'
      }
    }),
    [
      allEventRows,
      eventInConflictIds.length,
      displayedEventsConfiguration,
      uiTheme.colors.conflict,
      uiTheme.colors.deletedEventColor,
      uiTheme.colors.gmsMain,
      uiTheme.colors.rejectedEventColor
    ]
  );

  return (
    <div className="event-panel" data-cy="event-panel">
      <IANConfirmOpenEventPopup
        isCurrentlyOpen={isCurrentlyOpen}
        setIsCurrentlyOpen={setIsCurrentlyOpen}
        eventId={eventId}
        setEventId={setEventId}
        parentComponentId="event-list"
      />
      <EventsToolbar
        countEntryRecord={countEntryRecord}
        disableMarkSelectedComplete
        handleMarkSelectedComplete={() => window.alert("Mark complete hasn't been implemented")}
        setCreateEventMenuVisibility={setCreateEventMenuVisibility}
      />
      <EventsTable setEventId={setEventId} columnsToDisplay={columnsToDisplay} data={eventRows} />
      <CreateEventDialog
        isOpen={createEventMenuVisibility}
        onClose={() => setCreateEventMenuVisibility(false)}
      />
    </div>
  );
}
