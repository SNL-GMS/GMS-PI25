import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import { closeContextMenu, Form, FormTypes, ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import { getTableCellStringValue } from '~common-ui/common/table-utils';

/**
 * Props which are passed to the {@link MapStationDetails} externally
 * (via an imperative callback function)
 */
export interface IANStationDetailsProps {
  readonly stationName: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly elevation: string;
  readonly detailedType: string;
  readonly entityType: string;
}

/**
 * MapStationDetails Component
 */
export function MapStationDetails(props: IANStationDetailsProps) {
  const { stationName, latitude, longitude, elevation, detailedType, entityType } = props;

  const formItems: FormTypes.FormItem[] = [];
  formItems.push({
    itemKey: 'Name',
    labelText: 'Name',
    itemType: FormTypes.ItemType.Display,
    displayText: `${getTableCellStringValue(stationName)}`,
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push({
    itemKey: 'Lat (°)',
    labelText: 'Lat (°)',
    itemType: FormTypes.ItemType.Display,
    displayText: `${getTableCellStringValue(latitude)}`,
    // Apply text format below to get monospace typeface per UX
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push({
    itemKey: 'Lon (°)',
    labelText: 'Lon (°)',
    itemType: FormTypes.ItemType.Display,
    displayText: `${getTableCellStringValue(longitude)}`,
    // Apply text format below to get monospace typeface per UX
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push({
    itemKey: 'Elevation (km)',
    labelText: 'Elevation (km)',
    itemType: FormTypes.ItemType.Display,
    displayText: `${getTableCellStringValue(elevation)}`,
    // Apply text format below to get monospace typeface per UX
    displayTextFormat: FormTypes.TextFormats.Time
  });
  if (entityType === 'Station') {
    formItems.push({
      itemKey: 'Type',
      labelText: 'Type',
      itemType: FormTypes.ItemType.Display,
      displayText: `${getTableCellStringValue(detailedType)}`
    });
  }

  const defaultPanel: FormTypes.FormPanel = {
    formItems,
    name: 'Additional Details'
  };

  const headerText = entityType === 'Station' ? 'Station Details' : 'Site Details';

  return (
    <div className="map-station-details__container">
      <Form
        header={headerText}
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
 * Displays the Map Station Details Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapStationDetailsContextMenu = React.memo(
  function MapStationDetailsContextMenu(props: {
    getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<IANStationDetailsProps>;
  }): JSX.Element {
    const { getOpenCallback } = props;

    const content = React.useCallback((p: IANStationDetailsProps) => {
      // eslint-disable-next-line react/jsx-props-no-spreading
      return <MapStationDetails {...p} />;
    }, []);

    return (
      <ImperativeContextMenu<IANStationDetailsProps>
        content={content}
        getOpenCallback={getOpenCallback}
      />
    );
  }
);
