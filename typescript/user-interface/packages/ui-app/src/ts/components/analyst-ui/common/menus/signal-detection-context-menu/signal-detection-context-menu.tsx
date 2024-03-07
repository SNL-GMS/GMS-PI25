import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import type { UpdateSignalDetectionArgs } from '@gms/ui-state';
import { useSetSignalDetectionActionTargets } from '@gms/ui-state';
import React from 'react';

import type { SignalDetectionDetailsProps } from '~analyst-ui/common/dialogs/signal-detection-details/types';

import type { SignalDetectionContextMenuContentProps } from './signal-detection-context-menu-content';
import { SignalDetectionContextMenuContent } from './signal-detection-context-menu-content';

/**
 * Defines the callback signature for updating signal detection.
 */
export type UpdateSignalDetection = (args: UpdateSignalDetectionArgs) => void;

export type SignalDetectionPhaseUpdate = (sdIds: string[], phase: string) => void;

export interface SignalDetectionContextMenuProps {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<SignalDetectionContextMenuContentProps>;
  signalDetectionDetailsCb?: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
  setCreateEventMenuCb?: (visibility: boolean, lat: number, lon: number) => void;
}

/**
 * Displays the Signal Detection Details Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const SignalDetectionContextMenu = React.memo(function SignalDetectionDetailsContextMenu(
  props: SignalDetectionContextMenuProps
): JSX.Element {
  const { getOpenCallback, signalDetectionDetailsCb } = props;
  const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();

  const content = React.useCallback(
    (p: SignalDetectionContextMenuContentProps) => (
      <SignalDetectionContextMenuContent
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...p}
        signalDetectionDetailsCb={signalDetectionDetailsCb}
      />
    ),
    [signalDetectionDetailsCb]
  );

  return (
    <ImperativeContextMenu<SignalDetectionContextMenuContentProps>
      content={content}
      getOpenCallback={getOpenCallback}
      onClose={() => setSignalDetectionActionTargets([])}
    />
  );
});
