import { IanDisplays } from '@gms/common-model/lib/displays/types';
import {
  findPhaseFeatureMeasurement,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import {
  selectPreviousValidActionTargetSignalDetectionIds,
  selectSelectedSdIds,
  useAllStations,
  useAppSelector,
  useUpdateSignalDetectionPhase
} from '@gms/ui-state';
import React from 'react';

import { CreateEventDialog } from '~analyst-ui/common/dialogs/create-event/create-event-dialog';
import { PhaseSelectorDialog } from '~analyst-ui/common/dialogs/phase-selector/phase-selector-dialog';
import { MapHotkeys } from '~analyst-ui/common/hotkey-configs/map-hotkey-configs';
import type { IANMapComponentProps } from '~analyst-ui/components/map/types';
import { BaseDisplay } from '~common-ui/components/base-display';

import { useVisibleSignalDetections } from '../waveform/waveform-hooks';
import {
  useIsMapSyncedToWaveformZoom,
  useMapNonPreferredEventData,
  useMapPreferredEventData
} from './ian-map-hooks';
import { IANMapPanel } from './ian-map-panel';

/**
 * IAN Map component. Renders a Cesium map and queries for Station Groups
 */
export function IANMapComponent(props: IANMapComponentProps) {
  const { glContainer } = props;
  const stationData = useAllStations();
  const signalDetectionQuery = useVisibleSignalDetections(useIsMapSyncedToWaveformZoom());
  const preferredEventData = useMapPreferredEventData();
  const nonPreferredEventData = useMapNonPreferredEventData();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);

  // getting previous because the action target ids are removed from state
  // when the context menu closes, but we need to pass them to the phase menu
  const previousValidSDActionTargetIds = useAppSelector(
    selectPreviousValidActionTargetSignalDetectionIds
  );

  // CreateEventDialog setup
  const [createEventMenuVisibility, setCreateEventMenuVisibility] = React.useState(false);
  const [newEventLatitude, setNewEventLatitude] = React.useState<number | undefined>();
  const [newEventLongitude, setNewEventLongitude] = React.useState<number | undefined>();

  const setCreateEventCallback = React.useCallback(
    (visibility: boolean, lat: number, lon: number) => {
      setCreateEventMenuVisibility(visibility);
      setNewEventLatitude(lat);
      setNewEventLongitude(lon);
    },
    []
  );

  // PhaseSelectorDialog setup
  const [phaseMenuVisibility, setPhaseMenuVisibility] = React.useState(false);

  const selectedPhases = [];

  previousValidSDActionTargetIds?.forEach(id => {
    const signalDetection = signalDetectionQuery?.data?.find(sd => sd.id === id);
    if (signalDetection) {
      const currentHypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
      selectedPhases.push(
        findPhaseFeatureMeasurement(currentHypothesis.featureMeasurements).measurementValue.value
      );
    }
  });

  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();

  const phaseSelectorCallback = React.useCallback(
    (phases: string[]) => {
      signalDetectionPhaseUpdate(previousValidSDActionTargetIds ?? [], phases[0]);
    },
    [previousValidSDActionTargetIds, signalDetectionPhaseUpdate]
  );

  return (
    <BaseDisplay
      glContainer={glContainer}
      tabName={IanDisplays.MAP}
      className="ian-map-gl-container"
      data-cy="ian-map-container"
    >
      <MapHotkeys
        selectedSignalDetectionsIds={selectedSdIds}
        setPhaseMenuVisibility={setPhaseMenuVisibility}
        setCreateEventMenuVisibility={setCreateEventMenuVisibility}
      >
        <IANMapPanel
          stationsResult={stationData}
          signalDetections={signalDetectionQuery?.data}
          preferredEventsResult={preferredEventData}
          nonPreferredEventsResult={nonPreferredEventData}
          setPhaseMenuVisibilityCb={setPhaseMenuVisibility}
          setCreateEventCb={setCreateEventCallback}
        />
      </MapHotkeys>
      <PhaseSelectorDialog
        isOpen={phaseMenuVisibility}
        title="Set Phase"
        selectedPhases={selectedPhases}
        phaseSelectorCallback={phaseSelectorCallback}
        closeCallback={() => {
          setPhaseMenuVisibility(false);
        }}
      />
      {/* Placed outside of MapHotkeys to retain focus */}
      <CreateEventDialog
        isOpen={createEventMenuVisibility}
        onClose={() => {
          setCreateEventMenuVisibility(false);
          setNewEventLatitude(0);
          setNewEventLongitude(0);
        }}
        lat={newEventLatitude}
        lon={newEventLongitude}
      />
    </BaseDisplay>
  );
}

export const IANMap = React.memo(IANMapComponent);
