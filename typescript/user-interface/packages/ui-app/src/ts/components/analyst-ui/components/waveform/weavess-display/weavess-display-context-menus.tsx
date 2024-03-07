import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import type { CreateSignalDetectionContextMenuCallbacks } from '~analyst-ui/common/menus/create-signal-detection-context-menu';
import { CreateSignalDetectionMenu } from '~analyst-ui/common/menus/create-signal-detection-context-menu';
import type { SignalDetectionContextMenusCallbacks } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { SignalDetectionContextMenus } from '~analyst-ui/common/menus/signal-detection-context-menus';

import type { QcContextMenuCallbacks } from '../quality-control';
import { QcContextMenus } from '../quality-control';

export interface WeavessContextMenuCallbacks {
  qc: QcContextMenuCallbacks;
  sd: SignalDetectionContextMenusCallbacks;
  csd: CreateSignalDetectionContextMenuCallbacks;
}

export type WeavessContextMenuGetOpenCallbackFunc = (
  callbacks: WeavessContextMenuCallbacks
) => void;

/**
 * Handles the display of the Weavess Context Menus and their callbacks.
 *
 * @params props @see {@link WeavessContextMenuGetOpenCallbackFunc}
 */
export const WeavessDisplayContextMenus = React.memo(function WeavessDisplayContextMenus(props: {
  getOpenCallback: WeavessContextMenuGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  const [sdContextMenusCb, setSdContextMenusCb] = useImperativeContextMenuCallback<
    SignalDetectionContextMenusCallbacks,
    SignalDetectionContextMenusCallbacks
  >();
  const [qcContextMenuCb, setQcContextMenuCb] = useImperativeContextMenuCallback<
    QcContextMenuCallbacks,
    QcContextMenuCallbacks
  >();

  const [
    createSignalDetectionContextMenuCb,
    setCreateSignalDetectionContextMenuCb
  ] = useImperativeContextMenuCallback<
    CreateSignalDetectionContextMenuCallbacks,
    CreateSignalDetectionContextMenuCallbacks
  >();

  React.useEffect(() => {
    if (qcContextMenuCb && sdContextMenusCb && createSignalDetectionContextMenuCb) {
      getOpenCallback({
        qc: qcContextMenuCb,
        sd: sdContextMenusCb,
        csd: createSignalDetectionContextMenuCb
      });
    }
  }, [getOpenCallback, sdContextMenusCb, qcContextMenuCb, createSignalDetectionContextMenuCb]);

  return (
    <>
      <SignalDetectionContextMenus getOpenCallback={setSdContextMenusCb} />
      <QcContextMenus getOpenCallback={setQcContextMenuCb} />
      <CreateSignalDetectionMenu getOpenCallback={setCreateSignalDetectionContextMenuCb} />
    </>
  );
});
