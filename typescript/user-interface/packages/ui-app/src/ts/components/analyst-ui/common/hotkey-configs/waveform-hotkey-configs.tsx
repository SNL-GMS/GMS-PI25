import { useHotkeys } from '@blueprintjs/core';
import type { ConfigurationTypes } from '@gms/common-model';
import {
  buildHotkeyConfigArray,
  selectOpenEventId,
  useAppSelector,
  useKeyboardShortcutConfigurations
} from '@gms/ui-state';
import React from 'react';

import { useToggleQcMaskVisibilityHotkeyConfig } from '~analyst-ui/components/waveform/components/waveform-controls/qc-mask-control';

import { useSignalDetectionConfigs } from './signal-detection-hotkey-configs';

/**
 * @returns the HotkeyConfiguration for waveforms
 */
export const useGetWaveformsKeyboardShortcut = (): {
  zas: ConfigurationTypes.HotkeyConfiguration;
  createEventBeam: ConfigurationTypes.HotkeyConfiguration;
  toggleAlignment: ConfigurationTypes.HotkeyConfiguration;
  hideMeasureWindow: ConfigurationTypes.HotkeyConfiguration;
  increaseVisibleWaveforms: ConfigurationTypes.HotkeyConfiguration;
  decreaseVisibleWaveforms: ConfigurationTypes.HotkeyConfiguration;
  scaleAllWaveformAmplitude: ConfigurationTypes.HotkeyConfiguration;
  toggleUncertainty: ConfigurationTypes.HotkeyConfiguration;
  resetSelectedWaveformAmplitudeScaling: ConfigurationTypes.HotkeyConfiguration;
  resetAllWaveformAmplitudeScaling: ConfigurationTypes.HotkeyConfiguration;
} => {
  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();
  return React.useMemo(
    () => ({
      zas: keyboardShortcutConfigurations?.hotkeys?.zas,
      createEventBeam: keyboardShortcutConfigurations?.hotkeys?.createEventBeam,
      toggleAlignment: keyboardShortcutConfigurations?.hotkeys?.toggleAlignment,
      hideMeasureWindow: keyboardShortcutConfigurations?.hotkeys?.hideMeasureWindow,
      increaseVisibleWaveforms: keyboardShortcutConfigurations?.hotkeys?.increaseVisibleWaveforms,
      decreaseVisibleWaveforms: keyboardShortcutConfigurations?.hotkeys?.decreaseVisibleWaveforms,
      scaleAllWaveformAmplitude: keyboardShortcutConfigurations?.hotkeys?.scaleAllWaveformAmplitude,
      toggleUncertainty: keyboardShortcutConfigurations?.hotkeys?.toggleUncertainty,
      resetSelectedWaveformAmplitudeScaling:
        keyboardShortcutConfigurations?.hotkeys?.resetSelectedWaveformAmplitudeScaling,
      resetAllWaveformAmplitudeScaling:
        keyboardShortcutConfigurations?.hotkeys?.resetAllWaveformAmplitudeScaling
    }),
    [
      keyboardShortcutConfigurations?.hotkeys?.zas,
      keyboardShortcutConfigurations?.hotkeys?.createEventBeam,
      keyboardShortcutConfigurations?.hotkeys?.toggleAlignment,
      keyboardShortcutConfigurations?.hotkeys?.hideMeasureWindow,
      keyboardShortcutConfigurations?.hotkeys?.increaseVisibleWaveforms,
      keyboardShortcutConfigurations?.hotkeys?.decreaseVisibleWaveforms,
      keyboardShortcutConfigurations?.hotkeys?.scaleAllWaveformAmplitude,
      keyboardShortcutConfigurations?.hotkeys?.toggleUncertainty,
      keyboardShortcutConfigurations?.hotkeys?.resetSelectedWaveformAmplitudeScaling,
      keyboardShortcutConfigurations?.hotkeys?.resetAllWaveformAmplitudeScaling
    ]
  );
};

export const useCreateSignalDetectionOverlayKeyboardShortcut = (): {
  closeCreateSignalDetectionOverlay: ConfigurationTypes.HotkeyConfiguration;
} => {
  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();
  return React.useMemo(
    () => ({
      closeCreateSignalDetectionOverlay:
        keyboardShortcutConfigurations?.hotkeys?.closeCreateSignalDetectionOverlay
    }),
    [keyboardShortcutConfigurations?.hotkeys?.closeCreateSignalDetectionOverlay]
  );
};

/**
 * Returns the hotkey config for ZAS that zooms, aligns, and sorts the display,
 *
 * @param zoomAlignSort a function that zooms, aligns, sorts the waveform display. Must be referentially stable.
 * @param featurePredictionQueryDataUnavailable
 * @returns a keydown config for handling ZAS that zooms, aligns, sorts the display
 */
export const useZASHotkeyConfig = (
  featurePredictionQueryDataUnavailable: boolean,
  zoomAlignSort: () => void
) => {
  const openEventId = useAppSelector(selectOpenEventId);
  const canZAS = !(
    openEventId === null ||
    openEventId === undefined ||
    featurePredictionQueryDataUnavailable
  );

  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.zas,
      zoomAlignSort,
      undefined,
      !canZAS
    );
  }, [canZAS, zoomAlignSort, waveformsKeyboardShortcuts]);
};

/**
 * Returns a hotkey config for create event beam
 *
 * @param createEventBeam a function that creates an event beam
 * @returns a keydown config for handling create event beam
 */
export const useCreateEventBeamConfig = (createEventBeam: () => void) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  const openEventId = useAppSelector(selectOpenEventId);
  const canCreate = !(openEventId === null || openEventId === undefined);
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.createEventBeam,
      createEventBeam,
      undefined,
      !canCreate
    );
  }, [canCreate, createEventBeam, waveformsKeyboardShortcuts]);
};

export const useToggleAlignmentHotkeyConfig = (toggleAlignment: () => void) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.toggleAlignment,
      toggleAlignment,
      undefined,
      false
    );
  }, [toggleAlignment, waveformsKeyboardShortcuts?.toggleAlignment]);
};

export const useHideMeasureWindowHotkeyConfig = (
  isMeasureWindowVisible: boolean,
  toggleMeasureWindowVisibility
) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  const canHideMeasureWindow = !!isMeasureWindowVisible;

  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.hideMeasureWindow,
      toggleMeasureWindowVisibility,
      undefined,
      !canHideMeasureWindow,
      false
    );
  }, [
    canHideMeasureWindow,
    toggleMeasureWindowVisibility,
    waveformsKeyboardShortcuts?.hideMeasureWindow
  ]);
};

export const useCurrentPhaseMenuHotkeyConfig = (
  setCurrentPhaseMenuVisibility: (value: boolean) => void
) => {
  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();

  const toggleCurrentPhaseMenuVisibility = React.useCallback(
    () => setCurrentPhaseMenuVisibility(true),
    [setCurrentPhaseMenuVisibility]
  );

  return React.useMemo(
    () =>
      buildHotkeyConfigArray(
        keyboardShortcutConfigurations?.hotkeys?.toggleCurrentPhaseMenu,
        toggleCurrentPhaseMenuVisibility,
        undefined,
        false
      ),
    [
      keyboardShortcutConfigurations?.hotkeys?.toggleCurrentPhaseMenu,
      toggleCurrentPhaseMenuVisibility
    ]
  );
};

/**
 * Hook to build hotkeys to increase or reduce the number of waveforms displayed
 *
 * @param setAnalystNumberOfWaveforms
 * @param analystNumberOfWaveforms
 */
export const useWaveformNumberHotkeyConfig = (
  setAnalystNumberOfWaveforms: (value: number) => void,
  analystNumberOfWaveforms: number
) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    const decreaseHotkeys = buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.decreaseVisibleWaveforms,
      (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setAnalystNumberOfWaveforms(analystNumberOfWaveforms - 1);
      }
    );

    const increaseHotkeys = buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.increaseVisibleWaveforms,
      (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setAnalystNumberOfWaveforms(analystNumberOfWaveforms + 1);
      }
    );

    return [...decreaseHotkeys, ...increaseHotkeys];
  }, [
    waveformsKeyboardShortcuts?.decreaseVisibleWaveforms,
    waveformsKeyboardShortcuts?.increaseVisibleWaveforms,
    setAnalystNumberOfWaveforms,
    analystNumberOfWaveforms
  ]);
};

export const useCreateSignalDetectionOverlayHotkeyConfig = (
  closeSplitWeavessStations: () => void
) => {
  const signalDetectionOverlayKeyboardShortcuts = useCreateSignalDetectionOverlayKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      signalDetectionOverlayKeyboardShortcuts?.closeCreateSignalDetectionOverlay,
      (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        closeSplitWeavessStations();
      }
    );
  }, [
    signalDetectionOverlayKeyboardShortcuts?.closeCreateSignalDetectionOverlay,
    closeSplitWeavessStations
  ]);
};

export const useScaleAllWaveformAmplitudeConfig = (scaleAllWaveformAmplitude: () => void) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.scaleAllWaveformAmplitude,
      scaleAllWaveformAmplitude
    );
  }, [scaleAllWaveformAmplitude, waveformsKeyboardShortcuts?.scaleAllWaveformAmplitude]);
};

export const useToggleUncertaintyConfig = (
  shouldShowTimeUncertainty: boolean,
  toggleUncertainty: (value: boolean) => void
) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.toggleUncertainty,
      (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleUncertainty(!shouldShowTimeUncertainty);
      }
    );
  }, [shouldShowTimeUncertainty, toggleUncertainty, waveformsKeyboardShortcuts?.toggleUncertainty]);
};

export const useResetAllWaveformAmplitudeConfig = (
  resetAllWaveformAmplitudeScaling: (force: boolean) => void
) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.resetAllWaveformAmplitudeScaling,
      () => resetAllWaveformAmplitudeScaling(true)
    );
  }, [
    resetAllWaveformAmplitudeScaling,
    waveformsKeyboardShortcuts?.resetAllWaveformAmplitudeScaling
  ]);
};

export const useResetSelectedWaveformAmplitudeConfig = (
  selectedChannelIds: string[],
  resetSelectedWaveformAmplitudeScaling: (
    selectedChannelIds: string[],
    isMeasureWindow: boolean
  ) => void
) => {
  const waveformsKeyboardShortcuts = useGetWaveformsKeyboardShortcut();
  return React.useMemo(() => {
    return buildHotkeyConfigArray(
      waveformsKeyboardShortcuts?.resetSelectedWaveformAmplitudeScaling,
      () => resetSelectedWaveformAmplitudeScaling(selectedChannelIds, false)
    );
  }, [
    resetSelectedWaveformAmplitudeScaling,
    selectedChannelIds,
    waveformsKeyboardShortcuts?.resetSelectedWaveformAmplitudeScaling
  ]);
};

export interface WaveformHotkeysProps {
  selectedSignalDetectionsIds: string[];
  featurePredictionQueryDataUnavailable: boolean;
  isMeasureWindowVisible: boolean;
  shouldShowTimeUncertainty: boolean;
  analystNumberOfWaveforms: number;
  selectedStationIds: string[];
  zoomAlignSort: () => void;
  createEventBeam: () => void;
  setPhaseMenuVisibility: (value: boolean) => void;
  setCreateEventVisibility: (value: boolean) => void;
  setCurrentPhaseMenuVisibility: (value: boolean) => void;
  toggleAlignment: () => void;
  toggleMeasureWindowVisibility: () => void;
  setAnalystNumberOfWaveforms: (value: number) => void;
  closeSignalDetectionOverlay: () => void;
  scaleAllWaveformAmplitude: () => void;
  toggleUncertainty: (value: boolean) => void;
  resetSelectedWaveformAmplitudeScaling: (channelIds: string[], isMeasureWindow: boolean) => void;
  resetAllWaveformAmplitudeScaling: (force: boolean) => void;
  isSplitMode: boolean;
}

/**
 * Hotkey handler for the Waveform display at a GMS-level. Hotkeys established here
 * should be apply to a "GMS-specific" functionality.
 */
export const WaveformHotkeys = React.memo(function WaveformHotkeys({
  zoomAlignSort,
  createEventBeam,
  selectedSignalDetectionsIds,
  featurePredictionQueryDataUnavailable,
  children,
  selectedStationIds,
  isMeasureWindowVisible,
  analystNumberOfWaveforms,
  shouldShowTimeUncertainty,
  setPhaseMenuVisibility,
  setCreateEventVisibility,
  setCurrentPhaseMenuVisibility,
  toggleAlignment,
  toggleMeasureWindowVisibility,
  setAnalystNumberOfWaveforms,
  closeSignalDetectionOverlay,
  scaleAllWaveformAmplitude,
  toggleUncertainty,
  resetSelectedWaveformAmplitudeScaling,
  resetAllWaveformAmplitudeScaling,
  isSplitMode
}: React.PropsWithChildren<WaveformHotkeysProps>) {
  const zasHotkeyConfig = useZASHotkeyConfig(featurePredictionQueryDataUnavailable, zoomAlignSort);
  const createEventBeamConfig = useCreateEventBeamConfig(createEventBeam);

  const signalDetectionConfigs = useSignalDetectionConfigs(
    selectedSignalDetectionsIds,
    setPhaseMenuVisibility,
    setCreateEventVisibility
  );

  const toggleCurrentPhaseMenuConfig = useCurrentPhaseMenuHotkeyConfig(
    setCurrentPhaseMenuVisibility
  );

  const toggleQcMaskVisibilityConfig = useToggleQcMaskVisibilityHotkeyConfig();

  const toggleAlignmentConfig = useToggleAlignmentHotkeyConfig(toggleAlignment);

  const hideMeasureWindowConfig = useHideMeasureWindowHotkeyConfig(
    isMeasureWindowVisible,
    toggleMeasureWindowVisibility
  );

  const waveformNumberConfig = useWaveformNumberHotkeyConfig(
    setAnalystNumberOfWaveforms,
    analystNumberOfWaveforms
  );

  const createSignalDetectionOverlayConfig = useCreateSignalDetectionOverlayHotkeyConfig(
    closeSignalDetectionOverlay
  );

  const scaleAllWaveformAmplitudeConfig = useScaleAllWaveformAmplitudeConfig(
    scaleAllWaveformAmplitude
  );

  const toggleUncertaintyConfig = useToggleUncertaintyConfig(
    shouldShowTimeUncertainty,
    toggleUncertainty
  );

  const resetAllAmplitudeScalingConfig = useResetAllWaveformAmplitudeConfig(
    resetAllWaveformAmplitudeScaling
  );

  const resetSelectedAmplitudeScalingConfig = useResetSelectedWaveformAmplitudeConfig(
    selectedStationIds,
    resetSelectedWaveformAmplitudeScaling
  );

  const configs = React.useMemo(() => {
    // combine hotkey configurations
    return isSplitMode
      ? [
          ...toggleAlignmentConfig,
          ...hideMeasureWindowConfig,
          ...scaleAllWaveformAmplitudeConfig,
          ...resetAllAmplitudeScalingConfig,
          ...resetSelectedAmplitudeScalingConfig
        ]
      : [
          ...signalDetectionConfigs,
          ...toggleCurrentPhaseMenuConfig,
          ...zasHotkeyConfig,
          ...toggleQcMaskVisibilityConfig,
          ...createEventBeamConfig,
          ...toggleAlignmentConfig,
          ...hideMeasureWindowConfig,
          ...waveformNumberConfig,
          ...createSignalDetectionOverlayConfig,
          ...scaleAllWaveformAmplitudeConfig,
          ...toggleUncertaintyConfig,
          ...resetAllAmplitudeScalingConfig,
          ...resetSelectedAmplitudeScalingConfig
        ];
  }, [
    isSplitMode,
    zasHotkeyConfig,
    createEventBeamConfig,
    toggleQcMaskVisibilityConfig,
    toggleAlignmentConfig,
    hideMeasureWindowConfig,
    scaleAllWaveformAmplitudeConfig,
    resetAllAmplitudeScalingConfig,
    resetSelectedAmplitudeScalingConfig,
    signalDetectionConfigs,
    toggleCurrentPhaseMenuConfig,
    waveformNumberConfig,
    createSignalDetectionOverlayConfig,
    toggleUncertaintyConfig
  ]);

  const { handleKeyDown } = useHotkeys(configs);

  return (
    <div onKeyDown={handleKeyDown} style={{ height: '100%' }} role="tab" tabIndex={-1}>
      {children}
    </div>
  );
});
