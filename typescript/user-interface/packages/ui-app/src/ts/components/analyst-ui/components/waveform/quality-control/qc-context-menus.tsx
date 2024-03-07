import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import { ProcessingMaskDetailsContextMenu } from './processing-mask-details-menu/processing-mask-details-context-menu';
import { QcSegmentContextMenu } from './qc-segment-context-menu';
import { QcSegmentCreationContextMenu } from './qc-segment-edit-menu';
import { QcSegmentEditContextMenu } from './qc-segment-edit-menu/qc-segment-edit-context-menu';
import { QcSegmentSelectionMenu } from './qc-segment-selection-menu';
import type {
  ProcessingMaskMenuOpenFunc,
  QcSegmentContextMenuOpenFunc,
  QcSegmentCreationMenuOpenFunc,
  QcSegmentCreationMenuProps,
  QcSegmentMenuProps,
  QcSegmentsContextMenuOpenFunc,
  QcSegmentSelectionMenuOpenFunc
} from './types';

export interface QcContextMenuCallbacks {
  qcSegmentsContextMenuCb: QcSegmentsContextMenuOpenFunc;
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentSelectionMenuOpenFunc;
  qcSegmentCreationContextMenuCb: QcSegmentCreationMenuOpenFunc;
  processingMaskContextMenuCb: ProcessingMaskMenuOpenFunc;
}

export type QcContextMenuGetOpenCallbackFunc = (callbacks: QcContextMenuCallbacks) => void;

/**
 * Handles the display of the QC Context Menus their callbacks.
 *
 * @params props @see {@link QcSegmentOpenFunc}
 */
export const QcContextMenus = React.memo(function QcContextMenus(props: {
  getOpenCallback: QcContextMenuGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  const [qcSegmentsContextMenuCb, setQcSegmentsContextMenuCb] = useImperativeContextMenuCallback<
    QcSegmentMenuProps
  >();

  const [
    qcSegmentEditContextMenuCb,
    setQcSegmentEditContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegment>();

  const [
    qcSegmentSelectionContextMenuCb,
    setQcSegmentSelectionContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegment[]>();

  const [
    qcSegmentCreationContextMenuCb,
    setQcSegmentCreationContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegmentCreationMenuProps>();

  const [
    processingMaskContextMenuCb,
    setProcessingMaskContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegmentMenuProps>();

  React.useEffect(() => {
    if (
      qcSegmentsContextMenuCb &&
      qcSegmentEditContextMenuCb &&
      qcSegmentSelectionContextMenuCb &&
      qcSegmentCreationContextMenuCb
    ) {
      getOpenCallback({
        qcSegmentsContextMenuCb,
        qcSegmentEditContextMenuCb,
        qcSegmentSelectionContextMenuCb,
        qcSegmentCreationContextMenuCb,
        processingMaskContextMenuCb
      });
    }
  }, [
    getOpenCallback,
    qcSegmentEditContextMenuCb,
    qcSegmentSelectionContextMenuCb,
    qcSegmentsContextMenuCb,
    processingMaskContextMenuCb,
    qcSegmentCreationContextMenuCb
  ]);

  return (
    <>
      <QcSegmentContextMenu
        getOpenCallback={setQcSegmentsContextMenuCb}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        qcSegmentSelectionContextMenuCb={qcSegmentSelectionContextMenuCb}
        processingMaskContextMenuCb={processingMaskContextMenuCb}
      />
      <QcSegmentEditContextMenu getOpenCallback={setQcSegmentEditContextMenuCb} />
      <ProcessingMaskDetailsContextMenu
        getOpenCallback={setProcessingMaskContextMenuCb}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
      />
      <QcSegmentSelectionMenu
        getOpenCallback={setQcSegmentSelectionContextMenuCb}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
      />
      <QcSegmentCreationContextMenu getOpenCallback={setQcSegmentCreationContextMenuCb} />
    </>
  );
});
