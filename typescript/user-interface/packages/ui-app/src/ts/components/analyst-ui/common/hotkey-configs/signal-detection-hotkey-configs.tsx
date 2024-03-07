import type { HotkeyConfig } from '@blueprintjs/core';
import { useHotkeys } from '@blueprintjs/core';
import type { ConfigurationTypes } from '@gms/common-model';
import {
  buildHotkeyConfigArray,
  selectOpenEventId,
  selectSelectedSdIds,
  useAppSelector,
  useAssociateSignalDetections,
  useKeyboardShortcutConfigurations,
  useUnassociateSignalDetections,
  useUpdateSignalDetectionPhase
} from '@gms/ui-state';
import React from 'react';

import { useCreateNewEventHotkeyConfig } from './event-hotkey-configs';

export interface SignalDetectionsHotkeysProps {
  selectedSignalDetectionsIds: string[];
  setPhaseMenuVisibility: (value: boolean) => void;
  setCreateEventMenuVisibility: (value: boolean) => void;
}

/**
 * @returns the HotkeyConfiguration for signal detections
 */
export const useGetSignalDetectionKeyboardShortcut = (): {
  associateSelectedSignalDetections: ConfigurationTypes.HotkeyConfiguration;
  unassociateSelectedSignalDetections: ConfigurationTypes.HotkeyConfiguration;
  currentPhaseLabel: ConfigurationTypes.HotkeyConfiguration;
  defaultPhaseLabel: ConfigurationTypes.HotkeyConfiguration;
} => {
  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();

  return React.useMemo(
    () => ({
      associateSelectedSignalDetections:
        keyboardShortcutConfigurations?.hotkeys.associateSelectedSignalDetections,
      currentPhaseLabel: keyboardShortcutConfigurations?.hotkeys.currentPhaseLabel,
      toggleSetPhaseMenu: keyboardShortcutConfigurations?.hotkeys.toggleSetPhaseMenu,
      unassociateSelectedSignalDetections:
        keyboardShortcutConfigurations?.hotkeys.unassociateSelectedSignalDetections,
      defaultPhaseLabel: keyboardShortcutConfigurations?.hotkeys.defaultPhaseLabel
    }),
    [
      keyboardShortcutConfigurations?.hotkeys.associateSelectedSignalDetections,
      keyboardShortcutConfigurations?.hotkeys.currentPhaseLabel,
      keyboardShortcutConfigurations?.hotkeys?.toggleSetPhaseMenu,
      keyboardShortcutConfigurations?.hotkeys.unassociateSelectedSignalDetections,
      keyboardShortcutConfigurations?.hotkeys.defaultPhaseLabel
    ]
  );
};

/**
 * Returns the hotkey config for unassociate selected signal detections to open event,
 *
 * @param currentOpenEventId
 * @param selectedSignalDetectionsIds
 * @param unassociateSelectedSignalDetections a function that unassociates selected sds to open event
 * @returns a keydown config for handling associating selected sds to open event
 */
export const useUnassociateSignalDetectionHotkeyConfig = (
  currentOpenEventId,
  selectedSignalDetectionsIds: string[]
) => {
  const canAssociate = !(
    currentOpenEventId == null ||
    currentOpenEventId === undefined ||
    selectedSignalDetectionsIds == null ||
    selectedSignalDetectionsIds === undefined ||
    selectedSignalDetectionsIds.length === 0
  );

  const hotkeyCombo = useGetSignalDetectionKeyboardShortcut();
  const unassociateSelectedSignalDetections = useUnassociateSignalDetections();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      hotkeyCombo?.unassociateSelectedSignalDetections,
      () => unassociateSelectedSignalDetections(selectedSdIds, false),
      undefined,
      !canAssociate
    );
  }, [hotkeyCombo, canAssociate, unassociateSelectedSignalDetections, selectedSdIds]);
};

/**
 * Returns the hotkey config for toggling the set phase menu
 *
 * @param callBack function called by onKeyDown for blueprint keyboard shortcut
 * @returns a keydown config for handling toggling set phase menu
 */
export const useSetPhaseMenuHotkeyConfig = (
  callBack: () => void,
  selectedSignalDetectionsIds: string[]
) => {
  const canToggle = !(
    selectedSignalDetectionsIds != null &&
    selectedSignalDetectionsIds !== undefined &&
    selectedSignalDetectionsIds.length > 0
  );

  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      keyboardShortcutConfigurations?.hotkeys?.toggleSetPhaseMenu,
      callBack,
      undefined,
      canToggle
    );
  }, [callBack, canToggle, keyboardShortcutConfigurations]);
};

/**
 * Returns the hotkey config for associate selected signal detections to open event,
 *
 * @param currentOpenEventId
 * @param selectedSignalDetectionsIds
 * @param associateSelectedSignalDetections a function that associates selected sds to open event
 * @returns a keydown config for handling associating selected sds to open event
 */
export const useAssociateSignalDetectionHotkeyConfig = (
  currentOpenEventId,
  selectedSignalDetectionsIds: string[]
) => {
  const canAssociate = !(
    currentOpenEventId == null ||
    currentOpenEventId === undefined ||
    selectedSignalDetectionsIds == null ||
    selectedSignalDetectionsIds === undefined ||
    selectedSignalDetectionsIds.length === 0
  );

  const hotkeyCombo = useGetSignalDetectionKeyboardShortcut();
  const associateSelectedSignalDetections = useAssociateSignalDetections();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      hotkeyCombo?.associateSelectedSignalDetections,
      () => associateSelectedSignalDetections(selectedSdIds),
      undefined,
      !canAssociate
    );
  }, [associateSelectedSignalDetections, canAssociate, hotkeyCombo, selectedSdIds]);
};

/**
 * Returns the hotkey config to update phase label to current phase
 *
 * @returns a keydown config for handling phase label update
 */
export const useCurrentPhaseSignalDetectionHotkeyConfig = (
  selectedSignalDetectionsIds: string[]
) => {
  const hotkeyCombo = useGetSignalDetectionKeyboardShortcut();
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();
  const currentPhase = useAppSelector(state => state.app.analyst.currentPhase);
  const sdIdsSelected = !(
    selectedSignalDetectionsIds == null ||
    selectedSignalDetectionsIds === undefined ||
    selectedSignalDetectionsIds.length === 0
  );
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      hotkeyCombo?.currentPhaseLabel,
      () => signalDetectionPhaseUpdate(selectedSignalDetectionsIds, currentPhase),
      undefined,
      !sdIdsSelected
    );
  }, [
    hotkeyCombo?.currentPhaseLabel,
    sdIdsSelected,
    signalDetectionPhaseUpdate,
    selectedSignalDetectionsIds,
    currentPhase
  ]);
};

/**
 * Returns the hotkey config to update phase label to default phase
 *
 * @returns a keydown config for handling phase label update
 */
export const useDefaultPhaseSignalDetectionHotkeyConfig = (
  selectedSignalDetectionsIds: string[]
) => {
  const hotkeyCombo = useGetSignalDetectionKeyboardShortcut();
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();
  const defaultPhase = useAppSelector(state => state.app.analyst.defaultSignalDetectionPhase);
  const sdIdsSelected = !(
    selectedSignalDetectionsIds == null ||
    selectedSignalDetectionsIds === undefined ||
    selectedSignalDetectionsIds.length === 0
  );
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      hotkeyCombo?.defaultPhaseLabel,
      () => signalDetectionPhaseUpdate(selectedSignalDetectionsIds, defaultPhase),
      undefined,
      !sdIdsSelected
    );
  }, [
    hotkeyCombo?.defaultPhaseLabel,
    sdIdsSelected,
    signalDetectionPhaseUpdate,
    selectedSignalDetectionsIds,
    defaultPhase
  ]);
};
/**
 * Builds the hotkey configurations
 *
 * @param currentOpenEventId
 * @param selectedSignalDetectionsIds
 * @param setPhaseMenuVisibility function to show the phase selector menu for the Set Phase action
 * @returns HotkeyConfig list
 */
export const useSignalDetectionConfigs = (
  selectedSignalDetectionsIds: string[],
  setPhaseMenuVisibility: (value: boolean) => void,
  setCreateEventMenuVisibility: (newValue: boolean) => void
): HotkeyConfig[] => {
  const openEventId = useAppSelector(selectOpenEventId);
  const associateHotkeyConfig = useAssociateSignalDetectionHotkeyConfig(
    openEventId,
    selectedSignalDetectionsIds
  );
  const unassociateHotkeyConfig = useUnassociateSignalDetectionHotkeyConfig(
    openEventId,
    selectedSignalDetectionsIds
  );
  const currentPhaseHotkeyConfig = useCurrentPhaseSignalDetectionHotkeyConfig(
    selectedSignalDetectionsIds
  );
  const defaultPhaseHotkeyConfig = useDefaultPhaseSignalDetectionHotkeyConfig(
    selectedSignalDetectionsIds
  );
  const createNewEventHotKeyConfig = useCreateNewEventHotkeyConfig(setCreateEventMenuVisibility);

  const toggleSetPhaseMenuCallback = React.useCallback(() => {
    setPhaseMenuVisibility(true);
  }, [setPhaseMenuVisibility]);
  const setPhaseMenuHotkeyConfig = useSetPhaseMenuHotkeyConfig(
    toggleSetPhaseMenuCallback,
    selectedSignalDetectionsIds
  );

  return React.useMemo(() => {
    // combine hotkey configurations
    return [
      ...associateHotkeyConfig,
      ...createNewEventHotKeyConfig,
      ...currentPhaseHotkeyConfig,
      ...defaultPhaseHotkeyConfig,
      ...setPhaseMenuHotkeyConfig,
      ...unassociateHotkeyConfig
    ];
  }, [
    associateHotkeyConfig,
    createNewEventHotKeyConfig,
    currentPhaseHotkeyConfig,
    defaultPhaseHotkeyConfig,
    setPhaseMenuHotkeyConfig,
    unassociateHotkeyConfig
  ]);
};

/**
 * Builds the keydown handler for blue print hotkeys
 *
 * @param currentOpenEventId
 * @param selectedSignalDetectionsIds
 * @param setPhaseMenuVisibility function to show the phase selector menu for the Set Phase action
 * @returns
 */
export const useSignalDetectionConfigKeyDown = (
  selectedSignalDetectionsIds: string[],
  setPhaseMenuVisibility: (value: boolean) => void,
  setCreateEventMenuVisibility: (newValue: boolean) => void
): React.KeyboardEventHandler<HTMLElement> => {
  const { handleKeyDown } = useHotkeys(
    useSignalDetectionConfigs(
      selectedSignalDetectionsIds,
      setPhaseMenuVisibility,
      setCreateEventMenuVisibility
    )
  );
  return handleKeyDown;
};

/**
 * Wrapper component to handle hotkeys for signal detection actions
 *
 * @param currentOpenEventId
 * @param selectedSignalDetectionsIds
 * @param setPhaseMenuVisibility function to show the phase selector menu for the Set Phase action
 * @returns wrapper component to handle hotkey actions when triggered
 */
export const SignalDetectionsHotkeys = React.memo(function SignalDetectionsHotkeys({
  selectedSignalDetectionsIds,
  setPhaseMenuVisibility,
  setCreateEventMenuVisibility,
  children
}: React.PropsWithChildren<SignalDetectionsHotkeysProps>) {
  const containerRef = React.useRef<HTMLDivElement>();

  const handleKeyDown = useSignalDetectionConfigKeyDown(
    selectedSignalDetectionsIds,
    setPhaseMenuVisibility,
    setCreateEventMenuVisibility
  );

  return (
    <div
      ref={ref => {
        containerRef.current = ref;
      }}
      onKeyDown={handleKeyDown}
      style={{ height: '100%' }}
      role="tab"
      tabIndex={-1}
    >
      {children}
    </div>
  );
});
