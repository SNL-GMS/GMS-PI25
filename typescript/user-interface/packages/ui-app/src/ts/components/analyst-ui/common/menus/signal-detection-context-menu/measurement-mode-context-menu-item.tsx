import { MenuItem2 } from '@blueprintjs/popover2';
import type { EventTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { findPreferredEventHypothesisByStage } from '@gms/common-model/lib/event';
import { AnalystWorkspaceTypes } from '@gms/ui-state';
import includes from 'lodash/includes';
import React from 'react';

import { systemConfig } from '~analyst-ui/config/system-config';

import {
  hideMeasurementModeEntries,
  showMeasurementModeEntries,
  toggleShownSDs
} from './signal-detection-context-menu-utils';

interface MeasurementModeContextMenuItemProps {
  currentOpenEvent: EventTypes.Event;
  openIntervalName: string;
  measurementMode: AnalystWorkspaceTypes.MeasurementMode;
  signalDetections: SignalDetectionTypes.SignalDetection[];
  selectedSds: SignalDetectionTypes.SignalDetection[];
  setMeasurementModeEntries: (entries: Record<string, boolean>) => void;
}

/**
 * Build measurement mode menu item to add to context menu
 *
 * @returns MenuItem2
 */
export function MeasurementModeContextMenuItem({
  currentOpenEvent,
  openIntervalName,
  measurementMode,
  signalDetections,
  selectedSds,
  setMeasurementModeEntries
}: MeasurementModeContextMenuItemProps): JSX.Element {
  const selectedSdIds = selectedSds.map(sd => sd.id);
  const measurementModeEntries = measurementMode.entries;

  const preferredEventHypothesis = findPreferredEventHypothesisByStage(
    currentOpenEvent,
    openIntervalName
  );
  const associatedSignalDetectionHypothesisIds = React.useMemo(
    () =>
      preferredEventHypothesis
        ? preferredEventHypothesis.associatedSignalDetectionHypotheses
            ?.map(sdHypo => sdHypo.id.signalDetectionId)
            .filter(sdId => selectedSdIds.includes(sdId))
        : [],
    [preferredEventHypothesis, selectedSdIds]
  );

  const areAllSelectedAssociatedAndAutoShow =
    measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT &&
    selectedSds.every(
      sd =>
        includes(
          systemConfig.measurementMode.phases,
          SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
            SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
              .featureMeasurements
          ).value
        ) &&
        includes(
          associatedSignalDetectionHypothesisIds,
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).id.id
        ) &&
        !measurementModeEntries[sd.id]
    );

  const areAllSelectedSdsMarkedAsMeasurementEntriesToShow = selectedSds.every(
    sd => !measurementModeEntries[sd.id]
  );

  /**
   * Memoized click handler for toggling shown SDs
   */
  const toggleShownSDsOnClick = React.useCallback(() => {
    toggleShownSDs(
      selectedSdIds,
      areAllSelectedSdsMarkedAsMeasurementEntriesToShow,
      areAllSelectedAssociatedAndAutoShow,
      measurementMode,
      setMeasurementModeEntries
    );
  }, [
    areAllSelectedAssociatedAndAutoShow,
    areAllSelectedSdsMarkedAsMeasurementEntriesToShow,
    measurementMode,
    selectedSdIds,
    setMeasurementModeEntries
  ]);

  /**
   * Memoized click handler for hiding measurement mode entries
   */
  const hideMeasurementModeEntriesOnClick = React.useCallback(() => {
    hideMeasurementModeEntries(
      associatedSignalDetectionHypothesisIds,
      measurementMode,
      signalDetections,
      setMeasurementModeEntries
    );
  }, [
    associatedSignalDetectionHypothesisIds,
    measurementMode,
    setMeasurementModeEntries,
    signalDetections
  ]);

  /**
   * Memoized click handler for showing measurement mode entries
   */
  const showMeasurementModeEntriesOnClick = React.useCallback(() => {
    showMeasurementModeEntries(
      associatedSignalDetectionHypothesisIds,
      measurementMode,
      signalDetections,
      setMeasurementModeEntries
    );
  }, [
    associatedSignalDetectionHypothesisIds,
    measurementMode,
    setMeasurementModeEntries,
    signalDetections
  ]);

  return (
    <MenuItem2 text="Measure" data-cy="measure" disabled>
      <MenuItem2
        text={
          areAllSelectedSdsMarkedAsMeasurementEntriesToShow || areAllSelectedAssociatedAndAutoShow
            ? 'Hide A5/2'
            : 'Show A5/2'
        }
        onClick={toggleShownSDsOnClick}
        data-cy="show-hide-measure"
      />
      <MenuItem2
        text="Hide all A5/2"
        data-cy="hide-all"
        disabled={
          !(
            measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT ||
            Object.keys(measurementModeEntries).length !== 0
          )
        }
        onClick={hideMeasurementModeEntriesOnClick}
      />
      {measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT ? (
        <MenuItem2
          text="Show all A5/2 for associated"
          onClick={showMeasurementModeEntriesOnClick}
        />
      ) : undefined}
    </MenuItem2>
  );
}
