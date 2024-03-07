import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import type { SignalDetectionDetailsProps } from '../dialogs/signal-detection-details/types';
import { SignalDetectionContextMenu } from './signal-detection-context-menu';
import type { SignalDetectionContextMenuContentProps } from './signal-detection-context-menu/signal-detection-context-menu-content';
import { SignalDetectionDetailsContextMenu } from './signal-detection-details-context-menu';

export interface SignalDetectionContextMenusCallbacks {
  readonly signalDetectionContextMenuCb: ImperativeContextMenuOpenFunc<
    SignalDetectionContextMenuContentProps
  >;
  readonly signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
}

export type SignalDetectionContextMenusGetOpenCallbackFunc = (
  callbacks: SignalDetectionContextMenusCallbacks
) => void;

export interface SignalDetectionContextMenusProps {
  getOpenCallback: SignalDetectionContextMenusGetOpenCallbackFunc;
}

/**
 * Handles the display of the Signal Detection Context Menus their callbacks.
 *
 * @params props @see {@link SignalDetectionContextMenusGetOpenCallbackFunc}
 */
export const SignalDetectionContextMenus = React.memo(function SignalDetectionContextMenus(
  props: SignalDetectionContextMenusProps
): JSX.Element {
  const { getOpenCallback } = props;

  const [
    signalDetectionContextMenuCb,
    setSignalDetectionContextMenuCb
  ] = useImperativeContextMenuCallback<SignalDetectionContextMenuContentProps>();

  const [signalDetectionDetailsCb, setSignalDetectionDetailsCb] = useImperativeContextMenuCallback<
    SignalDetectionDetailsProps
  >();

  React.useEffect(() => {
    if (signalDetectionDetailsCb) {
      getOpenCallback({
        signalDetectionContextMenuCb,
        signalDetectionDetailsCb
      });
    }
  }, [getOpenCallback, signalDetectionContextMenuCb, signalDetectionDetailsCb]);

  return (
    <>
      <SignalDetectionContextMenu
        getOpenCallback={setSignalDetectionContextMenuCb}
        signalDetectionDetailsCb={signalDetectionDetailsCb}
      />
      <SignalDetectionDetailsContextMenu getOpenCallback={setSignalDetectionDetailsCb} />
    </>
  );
});
