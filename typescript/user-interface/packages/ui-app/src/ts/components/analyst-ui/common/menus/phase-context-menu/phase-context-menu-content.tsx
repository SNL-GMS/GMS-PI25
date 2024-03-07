import { closeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import { PhaseSelectionMenu } from '~analyst-ui/common/dialogs';
import { systemConfig } from '~analyst-ui/config/system-config';

export interface PhaseContextMenuContentProps {
  signalDetectionIds: string[];
  signalDetectionPhaseUpdate: (sdIds: string[], phase: string) => void;
}

/**
 * Returns  context menu display for selecting a signal detection phase.
 *
 * @param signalDetectionIds string array of signal detection ids
 * @param updateSignalDetection mutation that is used to change a signal detection phase
 * @returns the phase selection context menu
 */
export function PhaseContextMenuContent(props: PhaseContextMenuContentProps): JSX.Element {
  const { signalDetectionIds, signalDetectionPhaseUpdate } = props;
  return (
    <PhaseSelectionMenu
      sdPhases={systemConfig.defaultSdPhases}
      prioritySdPhases={systemConfig.prioritySdPhases}
      onBlur={phase => {
        signalDetectionPhaseUpdate(signalDetectionIds, phase);
      }}
      onEnterForPhases={phase => {
        signalDetectionPhaseUpdate(signalDetectionIds, phase);
        closeContextMenu();
      }}
      onPhaseClicked={phase => {
        signalDetectionPhaseUpdate(signalDetectionIds, phase);
        closeContextMenu();
      }}
    />
  );
}
