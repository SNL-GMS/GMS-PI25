import { Button, Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { SignalDetectionTypes, StationTypes } from '@gms/common-model';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import {
  mapActions,
  selectIsSyncedWithWaveformZoom,
  selectMapLayerVisibility,
  selectSelectedEventIds,
  selectSelectedStationsAndChannelIds,
  useAppDispatch,
  useAppSelector,
  useGetSelectedSdIds,
  useStationsVisibility,
  useUiTheme
} from '@gms/ui-state';
import React from 'react';

import { IanMapDataSource } from '~analyst-ui/components/map/ian-map-data-source';
import {
  layerDisplayStrings,
  layerSettings
} from '~analyst-ui/components/map/layer-selector-drawer/layer-selector-static-content';
import { messageConfig } from '~analyst-ui/config/message-config';
import { MapLayerPanelDrawer } from '~common-ui/components/map/map-layer-panel-drawer';
import { Map } from '~components/common-ui/components/map';
import { FEATURE_TOGGLES } from '~config/feature-toggles';
import { MAP_MIN_HEIGHT_PX } from '~data-acquisition-ui/components/soh-map/constants';

import { IANConfirmOpenEventPopup } from '../events/confirm-open-event-popup';
import { EventFilterOptions } from '../events/types';
import {
  useMapEventLocationSource,
  useMapEventUncertaintyEllipseSource,
  useMapSignalDetectionSources,
  useMapSiteSource,
  useMapStationSource
} from './create-ian-map-data-sources';
import { useStationOnClickHandler } from './ian-map-hooks';
import { useIanMapInteractionHandler } from './ian-map-interaction-handler';
import {
  clearEventTooltip,
  clearHoverTooltip,
  ianMapEventTooltipLabel,
  ianMapStationTooltipLabel,
  setViewer
} from './ian-map-interaction-utils';
import type { MapContextMenusCallbacks } from './map-context-menus';
import { MapContextMenus } from './map-context-menus';
import type { MapEventSource } from './types';
import { UncertaintyEllipse } from './types';

export interface IANMapPanelProps {
  stationsResult: StationTypes.Station[];
  signalDetections: SignalDetectionTypes.SignalDetection[];
  preferredEventsResult: MapEventSource[];
  nonPreferredEventsResult: MapEventSource[];
  setPhaseMenuVisibilityCb: (visibility: boolean) => void;
  setCreateEventCb: (visibility: boolean, lat: number, lon: number) => void;
}
/**
 * IAN Map component. Renders a Cesium map and queries for Station Groups
 */
export function IANMapPanelComponent(props: IANMapPanelProps) {
  const {
    stationsResult,
    signalDetections,
    preferredEventsResult,
    nonPreferredEventsResult,
    setPhaseMenuVisibilityCb,
    setCreateEventCb
  } = props;

  const allowMultiSelect = FEATURE_TOGGLES.IAN_MAP_MULTI_SELECT;
  const selectedStations = useAppSelector(selectSelectedStationsAndChannelIds);
  const selectedEvents = useAppSelector(selectSelectedEventIds);
  const selectedSdIds = useGetSelectedSdIds();
  const isSyncedWithWaveformZoom = useAppSelector(selectIsSyncedWithWaveformZoom);
  const dispatch = useAppDispatch();
  const [uiTheme] = useUiTheme();

  const [mapContextMenusCb, setMapContextMenusCb] = useImperativeContextMenuCallback<
    unknown,
    MapContextMenusCallbacks
  >({
    mapContextMenuCb: undefined,
    eventContextMenuCb: undefined,
    eventDetailsCb: undefined,
    signalDetectionContextMenuCb: undefined,
    signalDetectionDetailsCb: undefined,
    stationContextMenuCb: undefined,
    stationDetailsCb: undefined
  });

  // Use custom hook for the on-left-click handler for IAN entities displayed on the map.
  const onStationClickHandler = useStationOnClickHandler();

  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState(undefined);
  const [isCurrentlyOpen, setIsCurrentlyOpen] = React.useState(false);

  const layerVisibility = useAppSelector(selectMapLayerVisibility);

  const onCheckedCallback = React.useCallback(
    (checkedItem: string) => {
      if (checkedItem === messageConfig.labels.syncToWaveformDisplayVisibleTimeRange) {
        dispatch(mapActions.setIsMapSyncedWithWaveformZoom(!isSyncedWithWaveformZoom));
      } else {
        const newLayerVisibility = { ...layerVisibility };
        newLayerVisibility[layerDisplayStrings.keyOf(checkedItem)] = !layerVisibility[
          layerDisplayStrings.keyOf(checkedItem)
        ];
        dispatch(mapActions.updateLayerVisibility(newLayerVisibility));
      }
    },
    [dispatch, isSyncedWithWaveformZoom, layerVisibility]
  );

  const ianMapTooltipHandler = useIanMapInteractionHandler(mapContextMenusCb, setEventId);

  // on mount use effect
  React.useEffect(
    () => {
      document.addEventListener('keydown', clearEventTooltip);
      document.addEventListener('keydown', clearHoverTooltip);

      return () => {
        document.removeEventListener('keydown', clearEventTooltip);
        document.removeEventListener('keydown', clearHoverTooltip);
        // clear out the viewer ref to prevent memory leak
        setViewer(null);
      };
    },
    // We only want this to run onMount so we need no dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { stationsVisibility } = useStationsVisibility();

  const canvas = document.getElementsByClassName('cesium-widget');
  // if the canvas exists set it to focusable
  if (canvas.length > 0) {
    canvas[0].setAttribute('tabindex', '0');
  }

  // Build data sources using custom hooks to split them into separate toggle data sources

  // Signal Detections
  const intervalSignalDetectionDataSource = useMapSignalDetectionSources(
    signalDetections,
    layerVisibility,
    stationsResult,
    EventFilterOptions.INTERVAL
  );

  const beforeSignalDetectionDataSource = useMapSignalDetectionSources(
    signalDetections,
    layerVisibility,
    stationsResult,
    EventFilterOptions.BEFORE
  );

  const afterSignalDetectionDataSource = useMapSignalDetectionSources(
    signalDetections,
    layerVisibility,
    stationsResult,
    EventFilterOptions.AFTER
  );

  // Event Locations
  const mapEventLocationSource = useMapEventLocationSource(
    layerVisibility,
    preferredEventsResult,
    nonPreferredEventsResult,
    setEventId
  );

  // Coverage Ellipses
  const mapEventCoverageEllipseSource = useMapEventUncertaintyEllipseSource(
    layerVisibility,
    preferredEventsResult,
    nonPreferredEventsResult,
    setEventId,
    UncertaintyEllipse.COVERAGE
  );

  // Confidence Ellipses
  const mapEventConfidenceEllipseSource = useMapEventUncertaintyEllipseSource(
    layerVisibility,
    preferredEventsResult,
    nonPreferredEventsResult,
    setEventId,
    UncertaintyEllipse.CONFIDENCE
  );

  // Stations and sites

  // Put stations in their own data source to prevent z-index bugs occurring between stations and sites
  // create entities from stations array

  const stationDataSource = useMapStationSource(
    layerVisibility,
    stationsResult,
    stationsVisibility,
    onStationClickHandler
  );

  // Put sites in their own data source to prevent z-index bugs occurring between stations and sites
  const siteDataSource = useMapSiteSource(layerVisibility, stationsResult, onStationClickHandler);

  const tooltipDataSource = (
    <IanMapDataSource
      key="Tooltip"
      entities={[ianMapStationTooltipLabel, ianMapEventTooltipLabel]}
      name="Tooltip"
      show
    />
  );

  const layerSelectionEntries = layerSettings(
    onCheckedCallback,
    layerVisibility,
    isSyncedWithWaveformZoom,
    uiTheme
  );

  return (
    <div className="ian-map-wrapper">
      <MapContextMenus
        getOpenCallback={setMapContextMenusCb}
        setCreateEventMenuCb={setCreateEventCb}
        setPhaseMenuVisibilityCb={setPhaseMenuVisibilityCb}
      />
      <Button
        type="button"
        id="layer-panel-button"
        className="map__layer-button cesium-button cesium-toolbar-button"
        title="Select map layers"
        onClick={() => setDrawerOpen(!isDrawerOpen)}
      >
        <Icon icon={IconNames.LAYERS} />
      </Button>
      <IANConfirmOpenEventPopup
        isCurrentlyOpen={isCurrentlyOpen}
        setIsCurrentlyOpen={setIsCurrentlyOpen}
        eventId={eventId}
        setEventId={setEventId}
        parentComponentId="map"
      />
      <Map
        doMultiSelect={allowMultiSelect}
        selectedStations={selectedStations}
        selectedEvents={selectedEvents}
        selectedSdIds={selectedSdIds}
        dataSources={[
          stationDataSource,
          siteDataSource,
          tooltipDataSource,
          // !Signal detection sources
          intervalSignalDetectionDataSource,
          beforeSignalDetectionDataSource,
          afterSignalDetectionDataSource,
          // !Event sources
          mapEventLocationSource,
          mapEventCoverageEllipseSource,
          mapEventConfidenceEllipseSource
        ]}
        minHeightPx={MAP_MIN_HEIGHT_PX}
        handlers={[ianMapTooltipHandler]}
      />
      <MapLayerPanelDrawer
        layerSelectionEntries={layerSelectionEntries}
        isDrawerOpen={isDrawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
        drawerClassName="ian-select-map-layers"
        title="Select Map Layers"
        checkboxOnChangeCallback={onCheckedCallback}
      />
    </div>
  );
}

/**
 * If map entities change, reload map display
 * Extracted for readability and testing
 *
 * @param prevProps
 * @param nextProps
 */
export const ianMapPanelMemoCheck = (
  prevProps: IANMapPanelProps,
  nextProps: IANMapPanelProps
): boolean => {
  // if false, reload
  if (!prevProps?.stationsResult) {
    return false;
  }

  // if signal detections have changed reload
  if (nextProps?.signalDetections && prevProps.signalDetections !== nextProps.signalDetections) {
    return false;
  }
  // if preferred events have changed reload
  if (
    nextProps?.preferredEventsResult &&
    prevProps.preferredEventsResult !== nextProps.preferredEventsResult
  ) {
    return false;
  }
  // if non-preferred events have changed reload
  if (
    nextProps?.nonPreferredEventsResult &&
    prevProps.nonPreferredEventsResult !== nextProps.nonPreferredEventsResult
  ) {
    return false;
  }

  // if stations have changed reload
  if (nextProps?.stationsResult && prevProps.stationsResult !== nextProps.stationsResult) {
    return false;
  }
  return true;
};

export const IANMapPanel = React.memo(IANMapPanelComponent, ianMapPanelMemoCheck);
