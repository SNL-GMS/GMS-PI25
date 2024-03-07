import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import {
  selectSelectedStationsAndChannelIds,
  useAppSelector,
  useKeyboardShortcutConfigurations
} from '@gms/ui-state';
import type * as Cesium from 'cesium';
import React from 'react';

import { HideStationMenuItem } from '~analyst-ui/common/menus';
import {
  formatHotkeyString,
  getKeyboardShortcutCombos
} from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import { CreateEventMenuItem } from './context-menus/create-event-menu-item';
import { isSiteOrStation } from './ian-map-utils';
import type { IANStationDetailsProps } from './map-station-details';

const hideSingleStationMenuItemKey = 'Hide single station menu item';
const hideMultipleStationsMenuItemKey = 'Hide multiple stations menu item';

/**
 * Props which are passed to the {@link MapStationContextMenuContent} externally
 * (via an imperative callback function)
 */
export interface MapStationContextMenuProps {
  readonly target: Cesium.Entity;
  readonly canShowContextMenu: boolean;
  /** In degrees */
  readonly latitude: number;
  /** In degrees */
  readonly longitude: number;
  readonly setStationVisibility: (stationName: string, visible: boolean) => void;
  readonly isStationVisible: (stationName: string) => boolean;
  readonly mapStationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
}

/**
 * Additional props for {@link MapStationContextMenuContent} which are provided interally
 * by the {@link MapStationContextMenu}
 */
export interface InternalMapStationContextMenuContentProps extends MapStationContextMenuProps {
  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}

/**
 * Component that renders the map station context menu
 */
export const MapStationContextMenuContent = React.memo(function MapStationContextMenuContent(
  props: InternalMapStationContextMenuContentProps
): JSX.Element {
  const {
    target,
    canShowContextMenu,
    latitude,
    longitude,
    isStationVisible,
    setStationVisibility,
    mapStationDetailsCb,
    setCreateEventMenuCb
  } = props;

  const entityType = target?.properties?.type?.getValue();
  const keyboardShortcutConfigs = useKeyboardShortcutConfigurations();
  const selectedStationIds = useAppSelector(selectSelectedStationsAndChannelIds);
  if (isSiteOrStation(entityType)) {
    const stationName = target.id;
    const channelShouldBeVisible = !isStationVisible(stationName);
    const dynamicMenuItemText = entityType === 'Station' ? 'station' : 'site';
    const menuItemText = `Open ${dynamicMenuItemText} details`;
    const showText = `Show ${stationName} on Waveform Display`;
    const hideText = `Hide ${stationName} on Waveform Display`;
    const menuString = channelShouldBeVisible ? showText : hideText;
    const hideMenuItem = (
      <HideStationMenuItem
        key={hideSingleStationMenuItemKey}
        disabled={!canShowContextMenu}
        stationName={stationName}
        hideStationCallback={() => {
          setStationVisibility(stationName, channelShouldBeVisible);
        }}
        showHideText={menuString}
      />
    );
    const targetChannels = selectedStationIds.includes(stationName)
      ? selectedStationIds
      : [stationName];
    const showHideMenuItem = (
      <HideStationMenuItem
        key={hideMultipleStationsMenuItemKey}
        stationName={stationName}
        showHideText={
          channelShouldBeVisible
            ? 'Show selected stations on Waveform Display'
            : 'Hide selected stations on Waveform Display'
        }
        hideStationCallback={() => {
          targetChannels.forEach(channel => {
            setStationVisibility(channel, channelShouldBeVisible);
          });
        }}
      />
    );

    return (
      <Menu>
        <CreateEventMenuItem
          latitude={latitude}
          longitude={longitude}
          setCreateEventMenuCb={setCreateEventMenuCb}
        />
        <MenuItem2
          className="menu-item-station-details"
          text={menuItemText}
          label={
            keyboardShortcutConfigs?.clickEvents?.showStationDetails
              ? formatHotkeyString(
                  getKeyboardShortcutCombos(
                    keyboardShortcutConfigs?.clickEvents?.showStationDetails,
                    keyboardShortcutConfigs
                  )[0]
                )
              : ''
          }
          onClick={event =>
            mapStationDetailsCb(event, {
              stationName: target.properties.name.getValue(),
              latitude: target.properties.coordinates.getValue().latitude,
              longitude: target.properties.coordinates.getValue().longitude,
              elevation: target.properties.coordinates.getValue().elevation,
              entityType: target.properties.type.getValue(),
              detailedType: target?.properties?.statype?.getValue() // Used for station details but not site details thus the null checks
            })
          }
        />
        {entityType === 'Station' ? [hideMenuItem, showHideMenuItem] : null}
      </Menu>
    );
  }
  return undefined;
});

/**
 * Displays the Map Station Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapStationContextMenu = React.memo(function MapStationContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<MapStationContextMenuProps>;
  mapStationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}): JSX.Element {
  const { getOpenCallback, mapStationDetailsCb, setCreateEventMenuCb } = props;

  const content = React.useCallback(
    (p: MapStationContextMenuProps) => (
      <MapStationContextMenuContent
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...p}
        mapStationDetailsCb={mapStationDetailsCb}
        setCreateEventMenuCb={setCreateEventMenuCb}
      />
    ),
    [mapStationDetailsCb, setCreateEventMenuCb]
  );

  return (
    <ImperativeContextMenu<MapStationContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
