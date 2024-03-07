import { EventTypes } from '@gms/common-model';
import { determineActionTargetsFromRightClickAndSetActionTargets } from '@gms/common-util';
import type { AnalystWorkspaceTypes, Coordinates } from '@gms/ui-state';
import {
  analystActions,
  mapActions,
  selectActionTargetEventIds,
  selectActionType,
  selectIsSyncedWithWaveformZoom,
  selectMapLayerVisibility,
  selectOpenEventId,
  selectOpenGoldenLayoutDisplays,
  selectOpenIntervalName,
  selectSelectedEventIds,
  selectSelectedSdIds,
  selectSelectedStationsAndChannelIds,
  selectWorkflowTimeRange,
  setSelectedStationIds,
  useAppDispatch,
  useAppSelector,
  useAssociateSignalDetections,
  useDeleteEvents,
  useDuplicateEvents,
  useEventStatusQuery,
  useGetEvents,
  useGetQualifiedAndUnqualifiedEventActionTargetIdsFromSelected,
  useRejectEvents,
  useSetEventActionTargets,
  useSetSelectedEventIds,
  useSetSignalDetectionActionTargets,
  useStationsVisibility,
  useUnassociateSignalDetections
} from '@gms/ui-state';
import { selectEventAssociationConflictIds } from '@gms/ui-state/lib/app/state/events/selectors';
import type Cesium from 'cesium';
import React from 'react';
import type { CesiumMovementEvent } from 'resium';

import { useSetCloseEvent } from '../events/events-util';
import type { EventRow } from '../events/types';
import {
  applyEventMultiSelectionLogic,
  applySdMultiSelectionLogic,
  applyStationMultiSelectionLogic,
  buildMapEventSource,
  dispatchSetEventId,
  getEventOnDoubleClickHandlers,
  getMousePositionFromCesiumMovement,
  intervalIsSelected,
  updateMapEventSources,
  waveformDisplayIsOpen
} from './ian-map-utils';
import type { MapContextMenusCallbacks } from './map-context-menus';
import type { IANMapRightClickHandler, MapEventSource } from './types';
/**
 * The hide/show station context menu should not be available (currently) unless the following is true:
 * 1: An interval is selected
 * 2: The waveform display is open (this condition may change later)
 *
 * if both of these conditions are true, then canOpenContext menu is set to true, and this function also returns that
 */
export const useHideShowContextMenuState = (): boolean => {
  const [canOpenContextMenu, setCanOpenContextMenu] = React.useState(false);
  const openDisplays = useAppSelector(selectOpenGoldenLayoutDisplays);
  const currentInterval = useAppSelector(selectWorkflowTimeRange);
  React.useEffect(() => {
    if (waveformDisplayIsOpen(openDisplays) && intervalIsSelected(currentInterval)) {
      setCanOpenContextMenu(true);
    } else {
      setCanOpenContextMenu(false);
    }
  }, [currentInterval, openDisplays]);

  return canOpenContextMenu;
};

/**
 * Get the map synced value from redux and return it
 *
 * @returns boolean
 */
export const useIsMapSyncedToWaveformZoom = (): boolean => {
  return useAppSelector(selectIsSyncedWithWaveformZoom);
};

/**
 * Set the map synced value into redux
 *
 * @param isSynced boolean
 * @returns void
 */
export const useSetIsMapSyncedToWaveformZoom = (isSynced: boolean): void => {
  const dispatch = useAppDispatch();
  dispatch(mapActions.setIsMapSyncedWithWaveformZoom(isSynced));
};

/**
 * Uses an array of event sources to produce data for map panel props
 *
 */
export const useMapPreferredEventData = (): MapEventSource[] => {
  const timeRange = useAppSelector(selectWorkflowTimeRange);
  const eventQuery = useGetEvents();
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const eventStatusQuery = useEventStatusQuery();
  const openEventId = useAppSelector(selectOpenEventId);
  const emptyArrayRef = React.useRef<MapEventSource[]>([]);
  const eventInConflictIds = useAppSelector(selectEventAssociationConflictIds);
  const layerVisibility = useAppSelector(selectMapLayerVisibility);
  const eventActionTargets = useAppSelector(selectActionTargetEventIds);
  const eventActionType = useAppSelector(selectActionType);

  return React.useMemo(() => {
    const eventsData =
      eventQuery.data.map(event => {
        let preferredEventHypothesis = EventTypes.findPreferredEventHypothesisByStage(
          event,
          openIntervalName
        );
        if (
          preferredEventHypothesis === undefined ||
          preferredEventHypothesis.preferredLocationSolution === undefined
        ) {
          // Fall back to the parent hypothesis of the preferred
          preferredEventHypothesis = EventTypes.findEventHypothesisParent(
            event,
            preferredEventHypothesis
          );
        }
        if (preferredEventHypothesis === undefined) {
          return undefined;
        }
        const locationSolution = EventTypes.findPreferredLocationSolution(
          preferredEventHypothesis.id.hypothesisId,
          event.eventHypotheses
        );

        const eventStatus = eventStatusQuery.data?.[event.id];
        const eventInConflict = eventInConflictIds.includes(event.id);
        const eventIsActionTarget = eventActionTargets?.includes(event.id);
        const mapEventSource = buildMapEventSource(
          {
            event,
            eventStatus,
            eventIsOpen: openEventId === event.id,
            eventInConflict,
            eventIsActionTarget
          },
          locationSolution,
          openIntervalName,
          timeRange,
          eventActionType as AnalystWorkspaceTypes.EventActionTypes
        );

        return mapEventSource;
      }) || emptyArrayRef.current;
    // update the geoOverlappingEvents attribute now that we can compare the whole list of events
    const updatedEventsData: MapEventSource[] = updateMapEventSources(eventsData, layerVisibility);

    return updatedEventsData;
  }, [
    eventQuery.data,
    openIntervalName,
    timeRange,
    eventStatusQuery.data,
    openEventId,
    eventInConflictIds,
    layerVisibility,
    eventActionTargets,
    eventActionType
  ]);
};

/**
 * Uses an array of event sources to produce data for map panel props
 *
 */
export const useMapNonPreferredEventData = (): MapEventSource[] => {
  const timeRange = useAppSelector(selectWorkflowTimeRange);
  const eventQuery = useGetEvents();
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const eventStatusQuery = useEventStatusQuery();
  const openEventId = useAppSelector(selectOpenEventId);
  const emptyArrayRef = React.useRef<MapEventSource[]>([]);
  const eventInConflictIds = useAppSelector(selectEventAssociationConflictIds);
  const layerVisibility = useAppSelector(selectMapLayerVisibility);
  const eventActionTargets = useAppSelector(selectActionTargetEventIds);
  const eventActionType = useAppSelector(selectActionType);

  return React.useMemo(() => {
    const mapEventSources: MapEventSource[] = [];

    eventQuery.data.forEach(event => {
      const preferredEventHypothesis = EventTypes.findPreferredEventHypothesisByStage(
        event,
        openIntervalName
      );
      const eventStatus = eventStatusQuery.data?.[event.id];
      const eventInConflict = eventInConflictIds?.includes(event.id) ?? false;
      const eventIsActionTarget = eventActionTargets?.includes(event.id);
      preferredEventHypothesis.locationSolutions.forEach(locationSolution => {
        if (locationSolution.id !== preferredEventHypothesis.preferredLocationSolution.id) {
          mapEventSources.push(
            buildMapEventSource(
              {
                event,
                eventStatus,
                eventIsOpen: openEventId === event.id,
                eventInConflict,
                eventIsActionTarget
              },
              locationSolution,
              openIntervalName,
              timeRange,
              eventActionType as AnalystWorkspaceTypes.EventActionTypes
            )
          );
        }
      });
    });
    // update the geoOverlappingEvents attribute now that we can compare the whole list of events
    const updatedMapEventSources: MapEventSource[] = updateMapEventSources(
      mapEventSources,
      layerVisibility
    );
    return updatedMapEventSources.length === 0 ? emptyArrayRef.current : updatedMapEventSources;
  }, [
    eventQuery.data,
    layerVisibility,
    openIntervalName,
    eventStatusQuery.data,
    eventInConflictIds,
    eventActionTargets,
    openEventId,
    timeRange,
    eventActionType
  ]);
};

/**
 * The on-left-click handler for Ian station entities displayed on the map, defined as a custom hook.
 */
export const useStationOnClickHandler = (): ((targetEntity: Cesium.Entity) => () => void) => {
  const dispatch = useAppDispatch();
  const selectedStations = useAppSelector(selectSelectedStationsAndChannelIds);
  return React.useCallback(
    (targetEntity: Cesium.Entity) => () => {
      if (targetEntity?.properties?.type?.getValue() === 'Station') {
        if (selectedStations.includes(targetEntity.id)) {
          applyStationMultiSelectionLogic(dispatch, selectedStations, targetEntity.id);
        } else {
          dispatch(setSelectedStationIds([targetEntity.id]));
        }
      }
    },
    [selectedStations, dispatch]
  );
};

/**
 * The on-left-click handler for Ian event entities displayed on the map, defined as a custom hook.
 */
export const useEventOnClickHandler = (): ((targetEntity: Cesium.Entity) => () => void) => {
  const dispatch = useAppDispatch();
  const selectedEvents = useAppSelector(selectSelectedEventIds);
  return React.useCallback(
    (targetEntity: Cesium.Entity) => () => {
      if (targetEntity?.properties?.type?.getValue() === 'Event location') {
        if (selectedEvents.includes(targetEntity.id)) {
          applyEventMultiSelectionLogic(dispatch, selectedEvents, targetEntity.id);
        } else {
          dispatch(analystActions.setSelectedEventIds([targetEntity.id]));
        }
      }
    },
    [selectedEvents, dispatch]
  );
};

/**
 * Returns the left-click handler for signal detections on the map display
 *
 * @param
 * @param target
 */
export const useSdOnClickHandler = (): ((target: Cesium.Entity) => () => void) => {
  const dispatch = useAppDispatch();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  return React.useCallback(
    (targetEntity: Cesium.Entity) => () => {
      if (targetEntity?.properties?.type?.getValue() === 'Signal detection') {
        if (selectedSdIds.includes(targetEntity.id)) {
          applySdMultiSelectionLogic(dispatch, selectedSdIds, targetEntity.id);
        } else {
          dispatch(analystActions.setSelectedSdIds([targetEntity.id]));
        }
      }
    },
    [selectedSdIds, dispatch]
  );
};

/**
 * @return the signal detection double-click handler, which will associate
 * the SD that has been double-clicked.
 */
export const useSdOnDoubleClickHandler = () => {
  const unassociateSignalDetections = useUnassociateSignalDetections();
  const associateSignalDetections = useAssociateSignalDetections();
  return React.useCallback(
    (movement: CesiumMovementEvent, targetEntity: Cesium.Entity) => {
      return targetEntity?.properties?.associated?.getValue()
        ? unassociateSignalDetections([targetEntity.id])
        : associateSignalDetections([targetEntity.id]);
    },
    [associateSignalDetections, unassociateSignalDetections]
  );
};

/**
 * Returns all click handlers related to signal detections
 */
export const useIANMapSDClickHandlers = () => {
  const sdOnClickHandler = useSdOnClickHandler();
  const sdOnDoubleClickHandler = useSdOnDoubleClickHandler();

  return {
    sdOnClickHandler,
    sdOnDoubleClickHandler
  };
};

/**
 * Hook to wrap redux setCoordinates
 *
 * @returns a function to update the coordinates
 */
export const useSetCoordinates = () => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    (coordinates: Coordinates) => {
      dispatch(mapActions.setCoordinates(coordinates));
    },
    [dispatch]
  );
};

/**
 * Returns the right-click handler for signal detections on the map display
 *
 * @param mapContextMenusCb the map callbacks for context menus
 */
export const useSdOnRightClickHandler = (mapContextMenusCb: MapContextMenusCallbacks) => {
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();
  return React.useCallback(
    (
      movement: CesiumMovementEvent,
      target: Cesium.Entity,
      latitude: number,
      longitude: number
    ): void => {
      const menuPosition = getMousePositionFromCesiumMovement(movement);

      // set action target(s)
      determineActionTargetsFromRightClickAndSetActionTargets(
        selectedSdIds,
        target.id,
        setSignalDetectionActionTargets
      );

      mapContextMenusCb.signalDetectionContextMenuCb(
        new MouseEvent('contextmenu', {
          clientX: menuPosition.x,
          clientY: menuPosition.y
        }),
        {
          sdId: target.id,
          latitude,
          longitude,
          signalDetectionDetailsCb: mapContextMenusCb.signalDetectionDetailsCb
        }
      );
    },
    [mapContextMenusCb, selectedSdIds, setSignalDetectionActionTargets]
  );
};

/**
 * returns the onRightClickHandler function used for bringing up a context menu on the map
 *
 * @param mapContextMenusCb the map callbacks for context menus
 */
export const useStationOnRightClickHandler = (mapContextMenusCb: MapContextMenusCallbacks) => {
  const canShowContextMenu = useHideShowContextMenuState();
  const { setStationVisibility, isStationVisible } = useStationsVisibility();

  return React.useCallback(
    (
      movement: CesiumMovementEvent,
      target: Cesium.Entity,
      latitude: number,
      longitude: number
    ): void => {
      const menuPosition = getMousePositionFromCesiumMovement(movement);
      mapContextMenusCb.stationContextMenuCb(
        new MouseEvent('contextmenu', {
          clientX: menuPosition.x,
          clientY: menuPosition.y
        }),
        {
          target,
          canShowContextMenu,
          latitude,
          longitude,
          setStationVisibility,
          isStationVisible,
          mapStationDetailsCb: mapContextMenusCb.stationDetailsCb
        }
      );
    },
    [canShowContextMenu, isStationVisible, mapContextMenusCb, setStationVisibility]
  );
};

/**
 * Return the right-click handler for an event on the IAN map.
 */
export const useIANMapEventRightClickHandler = (
  setEventId: (eventId: string) => void,
  mapContextMenusCb: MapContextMenusCallbacks
): IANMapRightClickHandler => {
  const closeEvent = useSetCloseEvent();
  const openEventId = useAppSelector(selectOpenEventId);
  const dispatch = useAppDispatch();

  const selectedEventIds = useAppSelector(selectSelectedEventIds);

  const setSelectedEventIds = useSetSelectedEventIds();
  const duplicateEvents = useDuplicateEvents();
  const rejectEvents = useRejectEvents();
  const deleteEvents = useDeleteEvents();
  const getQualifiedAndUnqualifiedEventActionTargetIdsFromSelected = useGetQualifiedAndUnqualifiedEventActionTargetIdsFromSelected();
  const setEventActionTargets = useSetEventActionTargets();

  return React.useCallback(
    (movement: CesiumMovementEvent, target: Cesium.Entity, latitude: number, longitude: number) => {
      const menuPosition = getMousePositionFromCesiumMovement(movement);
      const entityProperties = target?.properties?.event?.getValue() as EventRow;

      const {
        actionTargets: eventIdsForAction
      } = determineActionTargetsFromRightClickAndSetActionTargets(
        selectedEventIds,
        entityProperties.id,
        setEventActionTargets
      );

      // TODO: reselect events that were action-ed, not necessarily action targets anymore
      const eventActionTargetIdsFromSelected = getQualifiedAndUnqualifiedEventActionTargetIdsFromSelected();

      mapContextMenusCb.eventContextMenuCb(
        new MouseEvent('contextmenu', {
          clientX: menuPosition.x,
          clientY: menuPosition.y
        }),
        {
          latitude,
          longitude,
          selectedEventId: target.properties.id.getValue(),
          isOpen: target.properties.id.getValue() === openEventId,
          entityProperties,
          includeEventDetailsMenuItem: true,
          isMapContextMenu: true,
          openCallback: eventId => {
            dispatchSetEventId(eventId, dispatch, setEventId);
          },
          closeCallback: closeEvent,
          duplicateCallback: () => {
            duplicateEvents(eventIdsForAction);
          },
          rejectCallback: () => {
            rejectEvents(eventIdsForAction);
            // unqualified action targets remain selected after reject
            setSelectedEventIds(eventActionTargetIdsFromSelected.unqualified);
          },
          deleteCallback: () => {
            // filter out the event id's which are qualified action targets
            deleteEvents(eventIdsForAction);
            // unqualified action targets remain selected after delete
            setSelectedEventIds(eventActionTargetIdsFromSelected.unqualified);
          },
          setEventIdCallback: setEventId,
          eventDetailsCb: mapContextMenusCb.eventDetailsCb
        }
      );
    },
    [
      closeEvent,
      deleteEvents,
      dispatch,
      duplicateEvents,
      getQualifiedAndUnqualifiedEventActionTargetIdsFromSelected,
      mapContextMenusCb,
      openEventId,
      rejectEvents,
      selectedEventIds,
      setEventActionTargets,
      setEventId,
      setSelectedEventIds
    ]
  );
};

/**
 * Return the double-click handler for an event on the IAN map.
 */
export const useIANMapEventDoubleClickHandler = (setEventId: (eventId: string) => void) => {
  const dispatch = useAppDispatch();
  const closeEvent = useSetCloseEvent();
  const openEventId = useAppSelector(selectOpenEventId);

  return React.useMemo(
    () => getEventOnDoubleClickHandlers(dispatch, openEventId, closeEvent, setEventId),
    [dispatch, openEventId, closeEvent, setEventId]
  );
};
