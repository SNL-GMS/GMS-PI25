import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import { useUpdateSignalDetectionPhase } from '@gms/ui-state';
import React from 'react';

import type { UpdateSignalDetection } from '../signal-detection-context-menu';
import { PhaseContextMenuContent } from './phase-context-menu-content';

/**
 * Displays the Signal Detection Phase Context Menu.
 * This context menu provides the ability to change the signal detection phase.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const PhaseContextMenu = React.memo(function PhaseContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<{
    sdIds: string[];
    updateSignalDetection: UpdateSignalDetection;
  }>;
}): JSX.Element {
  const { getOpenCallback } = props;
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();
  const content = React.useCallback(
    (p: { sdIds: string[]; updateSignalDetection: UpdateSignalDetection }) => {
      if (p) {
        const { sdIds } = p;
        return (
          <PhaseContextMenuContent
            signalDetectionIds={sdIds}
            signalDetectionPhaseUpdate={signalDetectionPhaseUpdate}
          />
        );
      }
      return undefined;
    },
    [signalDetectionPhaseUpdate]
  );

  return (
    <ImperativeContextMenu<{
      sdIds: string[];
      updateSignalDetection: UpdateSignalDetection;
    }>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
