import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type { Depth, EventHypothesis } from '@gms/common-model/lib/event';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import type { ArrivalTime } from '@gms/ui-state';
import {
  selectActionTargetEventIds,
  selectSelectedEventIds,
  selectValidActionTargetEventIds,
  useAppSelector,
  useGetPreferredEventHypothesesByEventIds,
  useKeyboardShortcutConfigurations,
  useSetActionType,
  useSetEventActionTargets,
  useSetSelectedEventIds
} from '@gms/ui-state';
import type { ActionTypes } from '@gms/ui-state/lib/app/state/analyst/types';
import React from 'react';

import {
  formatHotkeyString,
  getKeyboardShortcutCombos
} from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import { CreateEventMenuItem } from '../map/context-menus/create-event-menu-item';
import type { IANEventDetailsProps } from '../map/map-event-details';

export interface EventContextMenuProps {
  readonly selectedEventId: string;
  readonly isOpen: boolean;
  readonly includeEventDetailsMenuItem: boolean;
  readonly isMapContextMenu: boolean;
  readonly entityProperties?: {
    readonly time: ArrivalTime;
    readonly latitudeDegrees: number;
    readonly longitudeDegrees: number;
    readonly depthKm: Depth;
  };
  /** In degrees, used for map display */
  readonly latitude?: number;
  /** In degrees, used for map display */
  readonly longitude?: number;
  /** Used for the map display. Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb?: (visibility: boolean, lat: number, lon: number) => void;
  readonly openCallback: (eventId: string) => void;
  readonly closeCallback: (eventId: string) => void;
  readonly duplicateCallback: () => void;
  readonly deleteCallback: () => void;
  readonly rejectCallback: () => void;
  readonly setEventIdCallback?: (eventId: string) => void;
  // TODO: correct and remove dependency on map component
  readonly eventDetailsCb?: ImperativeContextMenuOpenFunc<IANEventDetailsProps>;
}
/**
 * Event context menu Duplicate Option props
 */
interface DuplicateMenuItemProps {
  readonly numberOfEventsAffectedByAction: number;
  readonly handleDuplicate: () => void;
  readonly setActionType: (actionType: ActionTypes) => void;
}

/**
 * Component that renders the duplicate option on the Event context menu.
 */
function DuplicateMenuItem(props: DuplicateMenuItemProps) {
  const { numberOfEventsAffectedByAction, handleDuplicate, setActionType } = props;

  return (
    <MenuItem2
      className="menu-item-duplicate-event"
      data-cy="menu-item-duplicate-event"
      text={`Duplicate ${numberOfEventsAffectedByAction} selected event${
        numberOfEventsAffectedByAction === 1 ? '' : 's'
      }`}
      disabled={numberOfEventsAffectedByAction === 0}
      onClick={handleDuplicate}
      onMouseEnter={() => setActionType('duplicate')}
      onMouseLeave={() => setActionType(null)}
    />
  );
}

/**
 * Component that renders the interval context menu.
 */
export function EventContextMenuContent(props: EventContextMenuProps) {
  const {
    selectedEventId,
    isOpen,
    includeEventDetailsMenuItem,
    isMapContextMenu,
    entityProperties,
    openCallback,
    closeCallback,
    duplicateCallback,
    setEventIdCallback,
    eventDetailsCb,
    rejectCallback,
    deleteCallback,
    latitude,
    longitude,
    setCreateEventMenuCb
  } = props;

  const eventActionTargets = useAppSelector(selectActionTargetEventIds);
  const preferredEventHypotheses: EventHypothesis[] = useGetPreferredEventHypothesesByEventIds(
    eventActionTargets
  ); // !The way this is being used is not reference stable but deemed ok due to context menu
  // !performance not taking a hit

  const setActionType = useSetActionType();

  const selectedEventIds = useAppSelector(selectSelectedEventIds);
  const setSelectedEventIds = useSetSelectedEventIds();
  const validActionTargetEventIds = useAppSelector(selectValidActionTargetEventIds);

  const keyboardShortcutConfigs = useKeyboardShortcutConfigurations();

  /** Click handler for duplicating events */
  const handleDuplicate = React.useCallback(() => {
    const eventIdsToReselect = selectedEventIds.filter(
      id => !validActionTargetEventIds.includes(id)
    );
    duplicateCallback();
    setSelectedEventIds(eventIdsToReselect);
  }, [duplicateCallback, selectedEventIds, setSelectedEventIds, validActionTargetEventIds]);

  /** Click handler for rejecting events */
  const handleReject = React.useCallback(() => {
    const eventIdsToReselect = selectedEventIds.filter(
      id => !validActionTargetEventIds.includes(id)
    );
    rejectCallback();
    // unqualified action targets remain selected after reject
    setSelectedEventIds(eventIdsToReselect);
  }, [rejectCallback, selectedEventIds, setSelectedEventIds, validActionTargetEventIds]);

  /** Click handler for deleting events */
  const handleDelete = React.useCallback(() => {
    const eventIdsToReselect = selectedEventIds.filter(
      id => !validActionTargetEventIds.includes(id)
    );
    deleteCallback();
    // unqualified action targets remain selected after reject
    setSelectedEventIds(eventIdsToReselect);
  }, [deleteCallback, selectedEventIds, setSelectedEventIds, validActionTargetEventIds]);

  // get the number of events which can be affected the the action
  const numberOfEventsAffectedByAction: number = React.useMemo(() => {
    const affectedEventHypos = preferredEventHypotheses?.filter(eventHypo => {
      return !eventHypo?.deleted && !eventHypo?.rejected;
    });
    return affectedEventHypos?.length;
  }, [preferredEventHypotheses]);

  return (
    <Menu>
      {isMapContextMenu && (
        <CreateEventMenuItem
          latitude={latitude}
          longitude={longitude}
          setCreateEventMenuCb={setCreateEventMenuCb}
        />
      )}

      <MenuItem2
        className="menu-item-open-event"
        data-cy="menu-item-open-event"
        text="Open event"
        disabled={eventActionTargets?.length > 1 || isOpen}
        onClick={() => openCallback(selectedEventId)}
        onMouseEnter={() => setActionType('open')}
        onMouseLeave={() => setActionType(null)}
      />
      <MenuItem2
        className="menu-item-close-event"
        data-cy="menu-item-close-event"
        text="Close event"
        disabled={!isOpen}
        onClick={() => {
          if (setEventIdCallback) setEventIdCallback(undefined);
          closeCallback(selectedEventId);
        }}
        onMouseEnter={() => setActionType('close')}
        onMouseLeave={() => setActionType(null)}
      />
      {/* position of Duplicate option is different in Events list from the Map */}
      {!isMapContextMenu ? (
        <DuplicateMenuItem
          numberOfEventsAffectedByAction={numberOfEventsAffectedByAction}
          handleDuplicate={handleDuplicate}
          setActionType={setActionType}
        />
      ) : undefined}
      {includeEventDetailsMenuItem ? (
        <MenuItem2
          className="menu-item-event-details"
          text="Open event details"
          disabled={validActionTargetEventIds.length !== 1}
          label={
            keyboardShortcutConfigs?.clickEvents?.showEventDetails
              ? formatHotkeyString(
                  getKeyboardShortcutCombos(
                    keyboardShortcutConfigs?.clickEvents?.showEventDetails,
                    keyboardShortcutConfigs
                  )[0]
                )
              : ''
          }
          onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
            eventDetailsCb(event, {
              ...entityProperties,
              eventId: selectedEventId
            });
          }}
          onMouseEnter={() => setActionType('details')}
          onMouseLeave={() => setActionType(null)}
        />
      ) : undefined}
      {/* position of Duplicate option is different in Map from the Events list */}
      {isMapContextMenu ? (
        <DuplicateMenuItem
          numberOfEventsAffectedByAction={numberOfEventsAffectedByAction}
          handleDuplicate={handleDuplicate}
          setActionType={setActionType}
        />
      ) : undefined}
      <MenuItem2
        className="menu-item-delete-event"
        data-cy="menu-item-delete-event"
        text={`Delete ${numberOfEventsAffectedByAction} selected event${
          numberOfEventsAffectedByAction === 1 ? '' : 's'
        }`}
        disabled={numberOfEventsAffectedByAction === 0}
        onClick={handleDelete}
        onMouseEnter={() => setActionType('delete')}
        onMouseLeave={() => setActionType(null)}
      />
      <MenuItem2
        className="menu-item-reject-event"
        data-cy="menu-item-reject-event"
        text={`Reject ${numberOfEventsAffectedByAction} selected event${
          numberOfEventsAffectedByAction === 1 ? '' : 's'
        }`}
        disabled={numberOfEventsAffectedByAction === 0}
        onClick={handleReject}
        onMouseEnter={() => setActionType('reject')}
        onMouseLeave={() => setActionType(null)}
      />
    </Menu>
  );
}

/**
 * Displays the Event Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const EventContextMenu = React.memo(function EventContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<EventContextMenuProps>;
  setCreateEventMenuCb?: (visibility: boolean, lat: number, lon: number) => void;
}): JSX.Element {
  const { getOpenCallback, setCreateEventMenuCb } = props;
  const setEventActionTargets = useSetEventActionTargets();
  const content = React.useCallback(
    (p: EventContextMenuProps) => (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <EventContextMenuContent {...p} setCreateEventMenuCb={setCreateEventMenuCb} />
    ),
    [setCreateEventMenuCb]
  );
  return (
    <ImperativeContextMenu<EventContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
      onClose={() => setEventActionTargets([])}
    />
  );
});
