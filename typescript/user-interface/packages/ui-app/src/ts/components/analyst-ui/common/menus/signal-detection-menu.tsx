import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import {
  selectAreSelectedSdsAllDeleted,
  selectCurrentPhase,
  selectDefaultPhase,
  selectSelectedPhasesForSignalDetectionsCurrentHypotheses,
  selectSelectedSignalDetectionIdsNotDeleted,
  useAppSelector,
  useDetermineActionTargetsByType,
  useKeyboardShortcutConfigurations,
  useSetActionType,
  useUpdateSignalDetectionPhase
} from '@gms/ui-state';
import React from 'react';

import { CreateEventMenuItem } from '~analyst-ui/components/map/context-menus/create-event-menu-item';
import {
  formatHotkeyString,
  getKeyboardShortcutCombos
} from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import { EventAssociationSubmenu } from './event-association-sub-menu';
import { WaveformExportMenuItem } from './signal-detection-context-menu/signal-detection-export-menu-item';
import { DeleteContextMenuItem } from './signal-detection-delete-context-menu-item';

export interface CreateEventMenuProps {
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
  latitude: number;
  longitude: number;
}

export interface SignalDetectionMenuProps {
  readonly keyPrefix: string;
  readonly signalDetectionDetailsOnClick: (
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => void;
  readonly setSdIdsToShowFkOnClick: () => void;
  readonly setPhaseMenuVisibilityCb: (visibility: boolean) => void;
  readonly setMeasurementModeEntries?: (entries: Record<string, boolean>) => void;
  readonly createEventMenuProps?: CreateEventMenuProps;
}

/**
 * Provides context menu options for signal detection
 *
 * @returns the menu item options
 */
export function SignalDetectionMenu({
  keyPrefix,
  signalDetectionDetailsOnClick,
  setSdIdsToShowFkOnClick,
  setPhaseMenuVisibilityCb,
  createEventMenuProps
}: SignalDetectionMenuProps): JSX.Element {
  const setActionType = useSetActionType();
  const determineActionTargetsByType = useDetermineActionTargetsByType();
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();

  const keyboardShortcutConfigs = useKeyboardShortcutConfigurations();
  const areSelectedSdsAllDeleted = useAppSelector(selectAreSelectedSdsAllDeleted);
  const selectedSignalDetectionIdsNotDeleted = useAppSelector(
    selectSelectedSignalDetectionIdsNotDeleted
  );
  const defaultPhase = useAppSelector(selectDefaultPhase);
  const currentPhase = useAppSelector(selectCurrentPhase);
  const selectedPhases = useAppSelector(selectSelectedPhasesForSignalDetectionsCurrentHypotheses);

  // TODO: fix when SDs (in conflict) is implemented
  const anyInConflictAndNotAssociatedToOpenEvent = false;
  const menuOptionSignalDetectionDetails = (
    <MenuItem2
      text="Open signal detection details"
      key={`${keyPrefix}-sd-details`}
      label={
        keyboardShortcutConfigs?.clickEvents?.showSignalDetectionDetails
          ? formatHotkeyString(
              getKeyboardShortcutCombos(
                keyboardShortcutConfigs?.clickEvents?.showSignalDetectionDetails,
                keyboardShortcutConfigs
              )[0]
            )
          : ''
      }
      disabled={determineActionTargetsByType('details').length !== 1}
      data-cy="show-sd-details"
      onClick={signalDetectionDetailsOnClick}
      onMouseEnter={() => setActionType('details')}
      onMouseLeave={() => setActionType(null)}
    />
  );
  const menuOptionSetPhase = (
    <MenuItem2
      text={`Set ${determineActionTargetsByType('phase').length} phase${
        determineActionTargetsByType('phase').length === 1 ? '' : 's'
      }`}
      key={`${keyPrefix}-sd-set-phase`}
      label={
        keyboardShortcutConfigs?.hotkeys?.toggleSetPhaseMenu
          ? formatHotkeyString(keyboardShortcutConfigs?.hotkeys?.toggleSetPhaseMenu?.combos[0])
          : ''
      }
      disabled={
        determineActionTargetsByType('phase').length === 0 ||
        anyInConflictAndNotAssociatedToOpenEvent ||
        areSelectedSdsAllDeleted
      }
      data-cy="set-phase"
      onClick={() => {
        setPhaseMenuVisibilityCb(true);
      }}
      onMouseEnter={() => setActionType('phase')}
      onMouseLeave={() => setActionType(null)}
    />
  );
  const menuOptionSetCurrentPhase = (
    <MenuItem2
      text={`Set ${
        determineActionTargetsByType('current phase').length
      } to current phase: ${currentPhase}`}
      key={`${keyPrefix}-sd-current-phase`}
      label={
        keyboardShortcutConfigs?.hotkeys?.currentPhaseLabel
          ? formatHotkeyString(keyboardShortcutConfigs.hotkeys?.currentPhaseLabel.combos[0])
          : ''
      }
      disabled={
        determineActionTargetsByType('current phase').length === 0 ||
        selectedPhases.every(phase => phase === currentPhase)
      }
      onClick={() => signalDetectionPhaseUpdate(selectedSignalDetectionIdsNotDeleted, currentPhase)}
      data-cy="rephaseCurrent-sd"
      onMouseEnter={() => setActionType('current phase')}
      onMouseLeave={() => setActionType(null)}
    />
  );
  const menuOptionSetDefaultPhase = (
    <MenuItem2
      text={`Set ${
        determineActionTargetsByType('default phase').length
      } to default phase: ${defaultPhase}`}
      key={`${keyPrefix}-sd-default-phase`}
      label={
        keyboardShortcutConfigs?.hotkeys?.defaultPhaseLabel
          ? formatHotkeyString(keyboardShortcutConfigs.hotkeys?.defaultPhaseLabel.combos[0])
          : ''
      }
      disabled={
        determineActionTargetsByType('default phase').length === 0 ||
        selectedPhases.every(phase => phase === defaultPhase)
      }
      onClick={() => signalDetectionPhaseUpdate(selectedSignalDetectionIdsNotDeleted, defaultPhase)}
      data-cy="rephaseDefault-sd"
      onMouseEnter={() => setActionType('default phase')}
      onMouseLeave={() => setActionType(null)}
    />
  );
  const menuOptionShowFk = (
    <MenuItem2
      text={`Show ${determineActionTargetsByType('fk').length} FK`}
      key={`${keyPrefix}-show-fk`}
      disabled={
        true || // TODO: remove when Fk display is enabled update logic to use selector for fk able selected sds||
        anyInConflictAndNotAssociatedToOpenEvent
      }
      onClick={setSdIdsToShowFkOnClick}
      data-cy="show-fk"
      onMouseEnter={() => setActionType('fk')}
      onMouseLeave={() => setActionType(null)}
    />
  );
  return (
    <Menu className="signal-detection-table__context-menu">
      {createEventMenuProps ? (
        <CreateEventMenuItem
          latitude={createEventMenuProps.latitude}
          longitude={createEventMenuProps.longitude}
          setCreateEventMenuCb={createEventMenuProps.setCreateEventMenuCb}
        />
      ) : undefined}
      {menuOptionSignalDetectionDetails}
      <EventAssociationSubmenu keyPrefix={keyPrefix} />
      {menuOptionSetPhase}
      {menuOptionSetCurrentPhase}
      {menuOptionSetDefaultPhase}
      {menuOptionShowFk}
      {/* LEGACY future work
      {setMeasurementModeEntries && (
        <MeasurementModeContextMenuItem
          currentOpenEvent={currentOpenEvent}
          openIntervalName={openIntervalName}
          measurementMode={undefined}
          signalDetections={Object.values(signalDetections)}
          selectedSds={selectedSignalDetections}
          setMeasurementModeEntries={setMeasurementModeEntries}
        />
      )} */}
      <DeleteContextMenuItem keyPrefix={keyPrefix} />
      <WaveformExportMenuItem keyPrefix={keyPrefix} />
    </Menu>
  );
}
