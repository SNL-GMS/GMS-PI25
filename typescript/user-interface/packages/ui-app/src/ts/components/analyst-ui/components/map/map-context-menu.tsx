import { Menu } from '@blueprintjs/core';
import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import { CreateEventMenuItem } from './context-menus/create-event-menu-item';

/**
 * Props which are passed to the {@link MapContextMenuContent} externally
 * (via an imperative callback function)
 */
export interface MapContextMenuProps {
  /** In degrees */
  readonly latitude: number;
  /** In degrees */
  readonly longitude: number;
}

/**
 * Additional props for {@link MapContextMenuContent} which are provided interally
 * by the {@link MapContextMenu}
 */
interface InternalMapContextMenuProps extends MapContextMenuProps {
  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}

/**
 * Content displayed by the {@link MapContextMenu}
 */
function MapContextMenuContent(props: InternalMapContextMenuProps) {
  const { latitude, longitude, setCreateEventMenuCb } = props;
  return (
    <Menu>
      <CreateEventMenuItem
        latitude={latitude}
        longitude={longitude}
        setCreateEventMenuCb={setCreateEventMenuCb}
      />
    </Menu>
  );
}

/**
 * Displays a context menu with operations performable on "blank" parts of the map
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapContextMenu = React.memo(function MapContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<MapContextMenuProps>;
  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}): JSX.Element {
  const { getOpenCallback, setCreateEventMenuCb } = props;
  const content = React.useCallback(
    (p: MapContextMenuProps) => (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <MapContextMenuContent {...p} setCreateEventMenuCb={setCreateEventMenuCb} />
    ),
    [setCreateEventMenuCb]
  );
  return (
    <ImperativeContextMenu<MapContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
