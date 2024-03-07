import { ButtonToolbarItem, CheckboxDropdownToolbarItem, Toolbar } from '@gms/ui-core-components';
import {
  DisplayedEventsConfigurationEnum,
  eventsActions,
  EventsColumn,
  selectDisplayedEventsConfiguration,
  selectEventsColumnsToDisplay,
  useAppDispatch,
  useAppSelector
} from '@gms/ui-state';
import Immutable from 'immutable';
import React from 'react';

import { useCreateEventControl } from '~analyst-ui/common/toolbar-items/create-event-control';
import { systemConfig } from '~analyst-ui/config/system-config';
import { convertMapToObject, convertObjectToEventsColumnMap } from '~common-ui/common/table-utils';
import { useBaseDisplaySize } from '~common-ui/components/base-display/base-display-hooks';

import {
  displayedEventsDropdownDisplayStrings,
  displayedEventsLabelStrings,
  displayedEventsRenderDividers,
  eventColumnDisplayStrings
} from '../types';
import type { CountFilterOptions, EventCountEntry } from './event-count-toolbar-item';
import { useEventsCountToolbarItem } from './event-count-toolbar-item';

export interface EventsToolbarProps {
  readonly countEntryRecord: Record<CountFilterOptions, EventCountEntry>;
  readonly disableMarkSelectedComplete: boolean;
  handleMarkSelectedComplete(): void;
  setCreateEventMenuVisibility: (isVisible: boolean) => void;
}

export function EventsToolbar({
  countEntryRecord,
  disableMarkSelectedComplete,
  handleMarkSelectedComplete,
  setCreateEventMenuVisibility
}: EventsToolbarProps) {
  const [widthPx] = useBaseDisplaySize();

  const dispatch = useAppDispatch();
  const eventsColumnsToDisplayObject = useAppSelector(selectEventsColumnsToDisplay);
  const columnsToDisplay = React.useMemo(
    () => convertObjectToEventsColumnMap(eventsColumnsToDisplayObject),
    [eventsColumnsToDisplayObject]
  );

  const displayedEventsConfiguration = useAppSelector(selectDisplayedEventsConfiguration);

  const createEventControl = useCreateEventControl(setCreateEventMenuVisibility, 'evntcreateevent');
  const eventsCountToolbarItem = useEventsCountToolbarItem('events count', countEntryRecord);

  const toolbarItemsLeft: JSX.Element[] = React.useMemo(() => [eventsCountToolbarItem], [
    eventsCountToolbarItem
  ]);

  // Map of values to pass to the checkbox dropdown toolbar item
  const displayedEventsConfigurationMap: Immutable.Map<
    DisplayedEventsConfigurationEnum,
    boolean
  > = React.useMemo(() => Immutable.fromJS(displayedEventsConfiguration), [
    displayedEventsConfiguration
  ]);

  const toolbarItemsRight: JSX.Element[] = React.useMemo(() => {
    const setColumnsToDisplay = (cols: Immutable.Map<EventsColumn, boolean>) =>
      dispatch(eventsActions.updateEventsColumns(convertMapToObject(cols)));

    const setEventsToDisplay = (
      events: Immutable.Map<DisplayedEventsConfigurationEnum, boolean>
    ) => {
      dispatch(eventsActions.updateDisplayedEventsConfiguration(convertMapToObject(events)));
    };
    return [
      <CheckboxDropdownToolbarItem
        key="shownevents"
        enumOfKeys={DisplayedEventsConfigurationEnum}
        label="Show Events"
        widthPx={150}
        tooltip="Set which edge events are visible"
        values={displayedEventsConfigurationMap}
        enumKeysToDisplayStrings={displayedEventsDropdownDisplayStrings}
        enumKeysToRenderDividers={displayedEventsRenderDividers}
        enumKeysToLabelStrings={displayedEventsLabelStrings}
        onChange={setEventsToDisplay}
        cyData="filter-column"
      />,
      <CheckboxDropdownToolbarItem
        key="showncolumns"
        enumOfKeys={EventsColumn}
        enumKeysToDisplayStrings={eventColumnDisplayStrings}
        label="Show Columns"
        widthPx={150}
        tooltip="Set which columns are visible"
        values={columnsToDisplay}
        onChange={setColumnsToDisplay}
        cyData="filter-column"
      />,
      createEventControl,
      <ButtonToolbarItem
        key="markcomplete"
        cyData="mark-open-complete"
        tooltip="Mark selected events complete"
        label="Mark Selected Complete"
        onButtonClick={handleMarkSelectedComplete}
        disabled={disableMarkSelectedComplete}
      />
    ];
  }, [
    columnsToDisplay,
    disableMarkSelectedComplete,
    displayedEventsConfigurationMap,
    createEventControl,
    handleMarkSelectedComplete,
    dispatch
  ]);

  return (
    <Toolbar
      toolbarWidthPx={widthPx}
      parentContainerPaddingPx={systemConfig.marginForToolbarPx}
      itemsLeft={toolbarItemsLeft}
      itemsRight={toolbarItemsRight}
    />
  );
}
