import type { SignalDetectionTypes } from '@gms/common-model';
import {
  humanReadable,
  Logger,
  secondsToString,
  TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  toSentenceCase
} from '@gms/common-util';
import * as Cesium from 'cesium';
import type { CesiumMovementEvent } from 'resium';

import { TOOLTIP_HEIGHT } from '~common-ui/components/map/constants';
import {
  monoFontStyle,
  monoFontStyleNoSize
} from '~components/data-acquisition-ui/components/soh-map/constants';

import {
  getLatLonFromCesiumMovement,
  getMousePositionFromCesiumMovement,
  getObjectFromPoint,
  isSiteOrStation
} from './ian-map-utils';
import type { MapContextMenusCallbacks } from './map-context-menus';
import type { IANMapRightClickHandler } from './types';

const displayTooltipDelayMs = 200;
const labelXValue = 15;

const logger = Logger.create('GMS_LOG_MAP', process.env.GMS_LOG_MAP);

let viewerRef: Cesium.Viewer;

let buildSiteOrStationTooltipObjectCancel: () => void;
let buildEventTooltipObjectCancel: () => void;

export const IAN_MAP_TOOL_TIP_PADDING = 11;

export const ianMapStationTooltipLabelOptions: Cesium.Entity.ConstructorOptions = {
  id: 'hoverLabelEntity',
  label: {
    show: false,
    text: 'loading',
    showBackground: true,
    font: monoFontStyle,
    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
    verticalOrigin: Cesium.VerticalOrigin.TOP,
    pixelOffset: new Cesium.Cartesian2(labelXValue, 0),
    eyeOffset: new Cesium.Cartesian3(0.0, 0.0, TOOLTIP_HEIGHT)
  }
};

export const ianMapStationTooltipLabel = new Cesium.Entity(ianMapStationTooltipLabelOptions);

export const ianMapEventTooltipLabelOptions: Cesium.Entity.ConstructorOptions = {
  id: 'eventLabelEntity',
  label: {
    show: false,
    text: 'loading',
    showBackground: true,
    font: monoFontStyle,
    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
    verticalOrigin: Cesium.VerticalOrigin.TOP,
    pixelOffset: new Cesium.Cartesian2(labelXValue, 0),
    eyeOffset: new Cesium.Cartesian3(0.0, 0.0, TOOLTIP_HEIGHT)
  }
};

export const ianMapEventTooltipLabel = new Cesium.Entity(ianMapEventTooltipLabelOptions);

/**
 * Method to set the viewer
 *
 * @param viewer Cesium viewer for the utils to use
 */
export const setViewer = (viewer: Cesium.Viewer): void => {
  viewerRef = viewer;
};

/**
 * Converts workflow status string to human readable format for event tooltip
 *
 * @param workflowStatus workflow status string
 * @returns formatted string
 */
export function formatStatusForTooltipDisplay(workflowStatus: string): string {
  return toSentenceCase(humanReadable(workflowStatus));
}

/**
 * Hides the event tooltip and then removes itself from the global listener
 *
 * @param event JS event
 */
export const clearEventTooltip = (event: KeyboardEvent): void => {
  if (event?.key === 'Escape') {
    const tooltipDataSource = viewerRef?.dataSources?.getByName('Tooltip');
    const labelEntity = tooltipDataSource[0]?.entities.getById('eventLabelEntity');
    if (labelEntity) {
      labelEntity.label.show = new Cesium.ConstantProperty(false);
      document.removeEventListener('keydown', clearEventTooltip);
      viewerRef.scene.requestRender();
    }
  }
};

/**
 * Hides the event tooltip but does not remove itself from the global listener
 *
 * @param event JS event
 */
export const clearHoverTooltip = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && viewerRef) {
    const tooltipDataSource = viewerRef.dataSources?.getByName('Tooltip');
    const labelEntity = tooltipDataSource[0].entities.getById('hoverLabelEntity');
    if (labelEntity) {
      labelEntity.label.show = new Cesium.ConstantProperty(false);
      viewerRef.scene.requestRender();
    }
  }
};

/**
 * Applies style and text to a {@link Cesium.Entity} as a tooltip.
 * Tooltip is formatted with black text and a white background.
 *
 * @param labelEntity cesium label to update
 * @param labelText text to be applied to the label
 */
export const formatEntityAsTooltip = (labelEntity: Cesium.Entity, labelText: string): void => {
  const scaleFactor = 1.4;
  const horizontalPadding = 7.15;
  const verticalPadding = 4;
  const computedStyle = getComputedStyle(document.body);
  const gmsMain = computedStyle.getPropertyValue('--gms-main');
  const gmsMainInverted = computedStyle.getPropertyValue('--gms-main-inverted');
  labelEntity.label.text = new Cesium.ConstantProperty(labelText);
  labelEntity.label.backgroundColor = new Cesium.ConstantProperty(
    Cesium.Color.fromCssColorString(gmsMain)
  );
  labelEntity.label.fillColor = new Cesium.ConstantProperty(
    Cesium.Color.fromCssColorString(gmsMainInverted)
  );
  labelEntity.label.scale = new Cesium.ConstantProperty(scaleFactor);
  labelEntity.label.font = new Cesium.ConstantProperty(`10px ${monoFontStyleNoSize}`);
  labelEntity.label.backgroundPadding = new Cesium.ConstantProperty(
    new Cesium.Cartesian2(horizontalPadding, verticalPadding)
  );
};

/**
 * Builds a site or station tooltip
 *
 * @param labelEntity cesium label to update
 * @param selectedEntity selected site or station
 * @returns a Promise that wraps the site/station
 * tooltip build and display operation and a
 * callback to cancel that operation
 */
const buildSiteOrStationTooltip = (
  labelEntity: Cesium.Entity,
  viewer: Cesium.Viewer,
  movement: CesiumMovementEvent,
  selectedEntity: Cesium.Entity
): { promise: Promise<unknown>; cancel: () => void } => {
  let timer;
  const promise = new Promise<void>(resolve => {
    timer = setTimeout(() => {
      let position = null;
      let showToolTip = false;
      try {
        const point = new Cesium.Cartesian2(movement.endPosition.x, movement.endPosition.y);
        // force a pick with the globe ellipsoid to work around cesium issue
        // https://community.cesium.com/t/scene-pickposition-returns-undefined/15308/2
        position = viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
      } catch (err) {
        logger.error(err);
      }
      if (position) {
        labelEntity.position = new Cesium.ConstantPositionProperty(position);
        formatEntityAsTooltip(labelEntity, selectedEntity.name);
        showToolTip = true;
      }
      labelEntity.label.show = new Cesium.ConstantProperty(showToolTip);
      resolve();
    }, displayTooltipDelayMs);
  });

  return {
    promise,
    cancel: () => {
      clearTimeout(timer);
    }
  };
};

/**
 * Build the hover tool tip for a signal detection
 *
 * @param labelEntity cesium label to update
 * @param viewer cesium viewer required to calculate the tooltip position
 * @param movement movement event that triggered the tooltip
 * @param properties signal detection properties
 */
const buildSignalDetectionTooltip = (
  labelEntity: Cesium.Entity,
  viewer: Cesium.Viewer,
  movement: CesiumMovementEvent,
  properties: Cesium.PropertyBag
): void => {
  let position = null;
  let showToolTip = false;
  if (!properties.phaseValue.getValue()) {
    logger.error('No phase value for signal detection!');
    labelEntity.label.show = new Cesium.ConstantProperty(false);
    return;
  }

  if (!properties.stationName.getValue()) {
    logger.error('No station name for signal detection!');
    labelEntity.label.show = new Cesium.ConstantProperty(false);
    return;
  }
  try {
    const point = new Cesium.Cartesian2(movement.endPosition.x, movement.endPosition.y);
    // force a pick with the globe ellipsoid to work around cesium issue
    // https://community.cesium.com/t/scene-pickposition-returns-undefined/15308/2
    position = viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
  } catch (err) {
    logger.error(err);
  }
  if (position) {
    labelEntity.position = new Cesium.ConstantPositionProperty(position);
    const labelText = `${
      properties.phaseValue.getValue().value
    }-${properties.stationName.getValue()}`;
    labelEntity.label.text = new Cesium.ConstantProperty(labelText);
    showToolTip = true;
  }
  labelEntity.label.show = new Cesium.ConstantProperty(showToolTip);
};

/**
 * Build the hover tooltip for an event
 *
 * @param labelEntity cesium label to update
 * @param viewer cesium viewer required to calculate the tooltip position
 * @param movement movement event that triggered the tooltip
 * @param properties signal detection properties
 * @returns a Promise that wraps the event tooltip build/display
 * operation and a callback to cancel that operation.
 */
const buildEventTooltip = (
  labelEntity: Cesium.Entity,
  viewer: Cesium.Viewer,
  movement: CesiumMovementEvent,
  properties: Cesium.PropertyBag
) => {
  let timer;
  const promise = new Promise<void>(resolve => {
    timer = setTimeout(() => {
      let position = null;
      let showToolTip = false;
      if (!properties) {
        logger.error('No event');
        labelEntity.label.show = new Cesium.ConstantProperty(false);
        return;
      }
      try {
        const point = new Cesium.Cartesian2(movement.endPosition.x, movement.endPosition.y);
        position = viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
      } catch (err) {
        logger.error(err);
      }
      if (position) {
        labelEntity.position = new Cesium.ConstantPositionProperty(position);
        const labelText = secondsToString(
          properties.event.getValue().time.value,
          TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION
        );
        formatEntityAsTooltip(labelEntity, labelText);
        showToolTip = true;
      }
      labelEntity.label.show = new Cesium.ConstantProperty(showToolTip);
      resolve();
    }, displayTooltipDelayMs);
  });

  return {
    promise,
    cancel: () => {
      clearTimeout(timer);
    }
  };
};

/**
 * Takes the map's label entity and adds information to it from whatever entity is found
 * at provided movement.endPosition for display as a tooltip
 * Hides the tooltip if no valid entity is found at movement.endPosition
 *
 * @param movement cesium movement
 * @param viewer The cesium map
 */
export const ianMapTooltipHandleMouseMove = async (
  movement: CesiumMovementEvent,
  viewer: Cesium.Viewer
): Promise<Cesium.Entity> => {
  const selectedEntity = getObjectFromPoint(viewer, movement.endPosition);
  const tooltipDatasource = viewer.dataSources?.getByName('Tooltip');

  viewerRef = viewer;

  if (!tooltipDatasource) {
    logger.warn('No tooltip datasource');
    return undefined;
  }
  const labelEntity = tooltipDatasource[0].entities.getById('hoverLabelEntity');

  if (!labelEntity) {
    logger.warn('No Label Entity!');
    return labelEntity;
  }

  // default to hide the tooltip.  This is set to true if a tooltip is generated
  labelEntity.label.show = new Cesium.ConstantProperty(false);

  if (buildSiteOrStationTooltipObjectCancel !== undefined) {
    buildSiteOrStationTooltipObjectCancel();
    buildSiteOrStationTooltipObjectCancel = undefined;
  }

  if (buildEventTooltipObjectCancel !== undefined) {
    buildEventTooltipObjectCancel();
    buildEventTooltipObjectCancel = undefined;
  }

  // if we are hovering over an entity
  if (selectedEntity?.properties) {
    const entityProperties = selectedEntity.properties;
    // and if this entity is a Channel Group or a Station
    if (isSiteOrStation(selectedEntity?.properties?.type?.getValue())) {
      const buildSiteOrStationToolTipObject = buildSiteOrStationTooltip(
        labelEntity,
        viewer,
        movement,
        selectedEntity
      );
      buildSiteOrStationTooltipObjectCancel = buildSiteOrStationToolTipObject.cancel;
      await buildSiteOrStationToolTipObject.promise;
    } else if (selectedEntity?.properties?.type?.getValue() === 'Signal detection') {
      buildSignalDetectionTooltip(labelEntity, viewer, movement, entityProperties);
    } else if (selectedEntity?.properties?.type?.getValue() === 'Event location') {
      const buildEventTooltipObject = buildEventTooltip(
        labelEntity,
        viewer,
        movement,
        entityProperties
      );
      buildEventTooltipObjectCancel = buildEventTooltipObject.cancel;
      await buildEventTooltipObject.promise;
    }
  }
  viewer.scene.requestRender();
  return labelEntity;
};

/**
 * Takes the map's event label entity and adds information to it
 * At provided movement.position when entity is alt-clicked
 * Adds an event listener to listen for closing tooltip with Esc
 *
 * @param movement cesium movement
 * @param viewer  cesium map
 */
export const ianMapTooltipHandleAltClick = (
  movement: Omit<CesiumMovementEvent, 'startPosition' | 'endPosition'>,
  viewer: Cesium.Viewer,
  mapContextMenusCb: MapContextMenusCallbacks,
  signalDetections: SignalDetectionTypes.SignalDetection[]
) => {
  const selectedEntity = getObjectFromPoint(viewer, movement.position);
  if (selectedEntity?.properties) {
    const tooltipPosition = getMousePositionFromCesiumMovement(movement);

    const event = new MouseEvent('contextmenu', {
      clientX: tooltipPosition.x,
      clientY: tooltipPosition.y
    });

    if (selectedEntity?.properties?.type?.getValue() === 'Event location') {
      const entityProperties = selectedEntity.properties.event.getValue();
      const { time, latitudeDegrees, longitudeDegrees, depthKm, id: eventId } = entityProperties;
      mapContextMenusCb.eventDetailsCb(event, {
        time,
        latitudeDegrees,
        longitudeDegrees,
        depthKm,
        eventId
      });
    }

    if (selectedEntity?.properties?.type?.getValue() === 'Signal detection') {
      // Used for the details and details is only enabled when one sd is selected thus safe to get the first
      const signalDetection = signalDetections.find(sd => sd.id === selectedEntity.id);

      mapContextMenusCb.signalDetectionDetailsCb(event, {
        signalDetection
      });
    }

    if (isSiteOrStation(selectedEntity?.properties?.type?.getValue())) {
      mapContextMenusCb.stationDetailsCb(event, {
        stationName: selectedEntity.properties.name.getValue(),
        latitude: selectedEntity.properties.coordinates.getValue().latitude,
        longitude: selectedEntity.properties.coordinates.getValue().longitude,
        elevation: selectedEntity.properties.coordinates.getValue().elevation,
        detailedType: selectedEntity?.properties?.statype?.getValue(), // Used for station details but not site details thus the null checks
        entityType: selectedEntity.properties.type.getValue()
      });
    }
  }
  return undefined;
};

/**
 * Determines what (if any) Cesium entity has been right-clicked and executes the
 * corresponding function.
 */
export const ianMapHandleRightClick = (
  movement: Omit<CesiumMovementEvent, 'startPosition' | 'endPosition'>,
  viewer: Cesium.Viewer,
  mapContextMenusCb: MapContextMenusCallbacks,
  sdRightClickHandler: IANMapRightClickHandler,
  stationRightClickHandler: IANMapRightClickHandler,
  eventRightClickHandler: IANMapRightClickHandler
) => {
  // Convert movement position to lat/lon
  const { latitude, longitude } = getLatLonFromCesiumMovement(movement, viewer);

  // Prepare context menu position
  const contextMenuPosition = getMousePositionFromCesiumMovement(movement);
  const event = new MouseEvent('contextmenu', {
    clientX: contextMenuPosition.x,
    clientY: contextMenuPosition.y
  });

  // Check if/type of entity selected
  const selectedEntity = getObjectFromPoint(viewer, movement.position);
  if (selectedEntity?.properties) {
    // Do not display context menu when over entities
    if (selectedEntity?.properties?.type?.getValue() === 'Event location') {
      eventRightClickHandler(movement, selectedEntity, latitude, longitude);
      return;
    }
    if (selectedEntity?.properties?.type?.getValue() === 'Signal detection') {
      sdRightClickHandler(movement, selectedEntity, latitude, longitude);
      return;
    }
    if (isSiteOrStation(selectedEntity?.properties?.type?.getValue())) {
      stationRightClickHandler(movement, selectedEntity, latitude, longitude);
      return;
    }
  }

  mapContextMenusCb.mapContextMenuCb(event, {
    latitude,
    longitude
  });
};
