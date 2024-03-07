import type { Depth } from '@gms/common-model/lib/event';
import {
  appendUncertainty,
  appendUncertaintyForTime,
  humanReadable,
  secondsToString,
  toSentenceCase
} from '@gms/common-util';
import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import { closeContextMenu, Form, FormTypes, ImperativeContextMenu } from '@gms/ui-core-components';
import type { ArrivalTime } from '@gms/ui-state';
import {
  selectEventAssociationConflictIds,
  useAppSelector,
  useEventStatusQuery
} from '@gms/ui-state';
import includes from 'lodash/includes';
import React from 'react';

import { formatNumberForDisplayFixedThreeDecimalPlaces } from '~common-ui/common/table-utils';

import { MapEventDetailsConflictIcon } from './map-event-details-conflict-icon';

// !These are tied to event row table types and will not be caught by compiler
// !Since we are returning these as an any from cesium
export interface IANEventDetailsProps {
  readonly eventId: string;
  readonly time: ArrivalTime;
  readonly latitudeDegrees: number;
  readonly longitudeDegrees: number;
  readonly depthKm: Depth;
}

/**
 * Returns a form item object given location data
 *
 * @param key item and label text
 * @param value data to be displayed
 * @returns a {@link FormTypes.FormItem} object
 */
function getLocationFormItem(key: string, value: number) {
  return {
    itemKey: key,
    labelText: key,
    itemType: FormTypes.ItemType.Display,
    displayText: `${formatNumberForDisplayFixedThreeDecimalPlaces(value)}`,
    displayTextFormat: FormTypes.TextFormats.Time
  };
}

/**
 * MapEventDetails Component
 */
export function MapEventDetails({
  eventId,
  time,
  latitudeDegrees,
  longitudeDegrees,
  depthKm
}: IANEventDetailsProps) {
  const eventIdsInConflict = useAppSelector(selectEventAssociationConflictIds);
  const isConflicted = includes(eventIdsInConflict, eventId);
  const eventStatuses = useEventStatusQuery();
  let eventStatus = 'Not started';
  if (eventStatuses.data && eventStatuses.data[eventId]) {
    eventStatus = eventStatuses.data[eventId].eventStatusInfo.eventStatus;
  }
  // FormTypes.TextFormats.Time allows us to apply monospace typeface per UX
  const formItems: FormTypes.FormItem[] = [];
  formItems.push({
    itemKey: 'Event Time',
    labelText: 'Event Time',
    itemType: FormTypes.ItemType.Display,
    displayText: appendUncertaintyForTime(secondsToString(time.value), time.uncertainty),
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push(getLocationFormItem('Lat (°)', latitudeDegrees));
  formItems.push(getLocationFormItem('Lon (°)', longitudeDegrees));
  formItems.push({
    itemKey: 'Depth (km)',
    labelText: 'Depth (km)',
    itemType: FormTypes.ItemType.Display,
    displayText: appendUncertainty(
      formatNumberForDisplayFixedThreeDecimalPlaces(depthKm.value).toString(),
      depthKm.uncertainty
    ),
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push({
    itemKey: 'Workflow Status',
    labelText: 'Workflow Status',
    itemType: FormTypes.ItemType.Display,
    displayText: `${toSentenceCase(humanReadable(eventStatus))}`
  });

  const defaultPanel: FormTypes.FormPanel = {
    formItems,
    name: 'Additional Details'
  };

  return (
    <div className="map-event-details__container">
      <Form
        header="Event Details"
        headerDecoration={isConflicted && <MapEventDetailsConflictIcon eventId={eventId} />}
        defaultPanel={defaultPanel}
        disableSubmit
        onCancel={() => {
          closeContextMenu();
        }}
      />
    </div>
  );
}

/**
 * Displays the Map Event Details Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapEventDetailsContextMenu = React.memo(function MapEventDetailsContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<IANEventDetailsProps>;
}): JSX.Element {
  const { getOpenCallback } = props;

  // eslint-disable-next-line react/jsx-props-no-spreading
  const content = React.useCallback((p: IANEventDetailsProps) => <MapEventDetails {...p} />, []);
  return (
    <ImperativeContextMenu<IANEventDetailsProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
