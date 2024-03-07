import { selectSignalDetections, useAppSelector } from '@gms/ui-state';
import * as Cesium from 'cesium';
import * as React from 'react';
import { ScreenSpaceEvent, ScreenSpaceEventHandler } from 'resium';

import type { MapHandlerProps } from '~common-ui/components/map/types';

import {
  useIANMapEventRightClickHandler,
  useSdOnRightClickHandler,
  useStationOnRightClickHandler
} from './ian-map-hooks';
import {
  ianMapEventTooltipLabel,
  ianMapHandleRightClick,
  ianMapStationTooltipLabel,
  ianMapTooltipHandleAltClick,
  ianMapTooltipHandleMouseMove
} from './ian-map-interaction-utils';
import type { MapContextMenusCallbacks } from './map-context-menus';

/**
 * This component creates and ScreenSpaceEventHandler along with a ScreenSpaceEvent of type mousemove
 * so that when an entity on the map has been hovered over a tooltip will appear.
 */
export const useIanMapInteractionHandler = (
  mapContextMenusCb: MapContextMenusCallbacks,
  setEventId: (eventId: string) => void
) => {
  // Get entity right-click handlers
  const stationRightClickHandler = useStationOnRightClickHandler(mapContextMenusCb);
  const sdRightClickHandler = useSdOnRightClickHandler(mapContextMenusCb);
  const eventRightClickHandler = useIANMapEventRightClickHandler(setEventId, mapContextMenusCb);

  const signalDetections = useAppSelector(selectSignalDetections);

  return React.useCallback(
    function IanMapInteractionHandler({ viewer }: MapHandlerProps) {
      if (viewer) {
        // check to see if we have a station tooltip entity to work with if not we add it
        if (!viewer.entities.getById('hoverLabelEntity')) {
          viewer.entities.add(ianMapStationTooltipLabel);
        }
        // check to see if we have an event tooltip entity to work with if not we add it
        if (!viewer.entities.getById('eventLabelEntity')) {
          viewer.entities.add(ianMapEventTooltipLabel);
        }
        return (
          <ScreenSpaceEventHandler key="IMTHandlers">
            <ScreenSpaceEvent
              action={event =>
                ianMapHandleRightClick(
                  event,
                  viewer,
                  mapContextMenusCb,
                  sdRightClickHandler,
                  stationRightClickHandler,
                  eventRightClickHandler
                )
              }
              type={Cesium.ScreenSpaceEventType.RIGHT_CLICK}
            />
            <ScreenSpaceEvent
              action={event =>
                ianMapTooltipHandleAltClick(
                  event,
                  viewer,
                  mapContextMenusCb,
                  Object.values(signalDetections)
                )
              }
              type={Cesium.ScreenSpaceEventType.LEFT_DOWN}
              modifier={Cesium.KeyboardEventModifier.ALT}
            />
            <ScreenSpaceEvent
              action={async event => ianMapTooltipHandleMouseMove(event, viewer)}
              type={Cesium.ScreenSpaceEventType.MOUSE_MOVE}
            />
          </ScreenSpaceEventHandler>
        );
      }
      return null;
    },
    [
      eventRightClickHandler,
      mapContextMenusCb,
      sdRightClickHandler,
      signalDetections,
      stationRightClickHandler
    ]
  );
};
