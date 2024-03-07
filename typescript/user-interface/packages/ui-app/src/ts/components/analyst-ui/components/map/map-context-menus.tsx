import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import type { SignalDetectionDetailsProps } from '~analyst-ui/common/dialogs/signal-detection-details/types';
import { SignalDetectionDetailsContextMenu } from '~analyst-ui/common/menus/signal-detection-details-context-menu';

import type { EventContextMenuProps } from '../events/context-menus';
import { EventContextMenu } from '../events/context-menus';
import type { MapContextMenuProps } from './map-context-menu';
import { MapContextMenu } from './map-context-menu';
import type { IANEventDetailsProps } from './map-event-details';
import { MapEventDetailsContextMenu } from './map-event-details';
import type { MapSignalDetectionContextMenuProps } from './map-signal-detection-context-menu';
import { MapSignalDetectionContextMenu } from './map-signal-detection-context-menu';
import type { MapStationContextMenuProps } from './map-station-context-menu';
import { MapStationContextMenu } from './map-station-context-menu';
import type { IANStationDetailsProps } from './map-station-details';
import { MapStationDetailsContextMenu } from './map-station-details';

export interface MapContextMenusCallbacks {
  readonly mapContextMenuCb: ImperativeContextMenuOpenFunc<MapContextMenuProps>;
  readonly eventContextMenuCb: ImperativeContextMenuOpenFunc<EventContextMenuProps>;
  readonly eventDetailsCb: ImperativeContextMenuOpenFunc<IANEventDetailsProps>;
  readonly signalDetectionContextMenuCb: ImperativeContextMenuOpenFunc<
    MapSignalDetectionContextMenuProps
  >;
  readonly signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
  readonly stationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
  readonly stationContextMenuCb: ImperativeContextMenuOpenFunc<MapStationContextMenuProps>;
}

export type MapContextMenusGetOpenCallbackFunc = (callbacks: MapContextMenusCallbacks) => void;

/**
 * Handles the display of the Map Context Menus their callbacks.
 *
 * @params props @see {@link MapContextMenusGetOpenCallbackFunc}
 */
export const MapContextMenus = React.memo(function MapContextMenus(props: {
  getOpenCallback: MapContextMenusGetOpenCallbackFunc;
  setPhaseMenuVisibilityCb: (visibility: boolean) => void;
  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}): JSX.Element {
  const { getOpenCallback, setPhaseMenuVisibilityCb, setCreateEventMenuCb } = props;

  const [mapContextMenuCb, setMapContextMenuCb] = useImperativeContextMenuCallback<
    MapContextMenuProps
  >();

  const [eventContextMenuCb, setEventContextMenuCb] = useImperativeContextMenuCallback<
    EventContextMenuProps
  >();

  const [eventDetailsCb, setEventDetailsCb] = useImperativeContextMenuCallback<
    IANEventDetailsProps
  >();

  const [signalDetectionDetailsCb, setSignalDetectionDetailsCb] = useImperativeContextMenuCallback<
    SignalDetectionDetailsProps
  >();

  const [
    signalDetectionContextMenuCb,
    setSignalDetectionContextMenuCb
  ] = useImperativeContextMenuCallback<MapSignalDetectionContextMenuProps>();

  const [stationDetailsCb, setStationDetailsCb] = useImperativeContextMenuCallback<
    IANStationDetailsProps
  >();

  const [stationContextMenuCb, setStationContextMenuCb] = useImperativeContextMenuCallback<
    MapStationContextMenuProps
  >();
  React.useEffect(() => {
    if (
      mapContextMenuCb &&
      eventContextMenuCb &&
      eventDetailsCb &&
      signalDetectionDetailsCb &&
      signalDetectionContextMenuCb &&
      stationDetailsCb &&
      stationContextMenuCb
    ) {
      getOpenCallback({
        mapContextMenuCb,
        eventContextMenuCb,
        eventDetailsCb,
        signalDetectionContextMenuCb,
        signalDetectionDetailsCb,
        stationDetailsCb,
        stationContextMenuCb
      });
    }
  }, [
    getOpenCallback,
    eventContextMenuCb,
    eventDetailsCb,
    signalDetectionDetailsCb,
    signalDetectionContextMenuCb,
    stationDetailsCb,
    stationContextMenuCb,
    mapContextMenuCb
  ]);

  return (
    <>
      {/* Map only, with no entities clicked */}
      <MapContextMenu
        setCreateEventMenuCb={setCreateEventMenuCb}
        getOpenCallback={setMapContextMenuCb}
      />
      {/* Event */}
      <EventContextMenu
        getOpenCallback={setEventContextMenuCb}
        setCreateEventMenuCb={setCreateEventMenuCb}
      />
      <MapEventDetailsContextMenu getOpenCallback={setEventDetailsCb} />
      {/* Signal Detection */}
      <MapSignalDetectionContextMenu
        getOpenCallback={setSignalDetectionContextMenuCb}
        signalDetectionDetailsCb={signalDetectionDetailsCb}
        setCreateEventMenuCb={setCreateEventMenuCb}
        setPhaseMenuVisibilityCb={setPhaseMenuVisibilityCb}
      />
      <SignalDetectionDetailsContextMenu getOpenCallback={setSignalDetectionDetailsCb} />
      {/* Station */}
      <MapStationContextMenu
        getOpenCallback={setStationContextMenuCb}
        mapStationDetailsCb={stationDetailsCb}
        setCreateEventMenuCb={setCreateEventMenuCb}
      />
      <MapStationDetailsContextMenu getOpenCallback={setStationDetailsCb} />
    </>
  );
});
