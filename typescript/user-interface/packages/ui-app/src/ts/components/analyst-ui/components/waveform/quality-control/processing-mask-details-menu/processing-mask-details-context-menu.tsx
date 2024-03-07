import type { ProcessingMask } from '@gms/common-model/lib/channel-segment/types';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import type {
  ProcessingMaskContextMenuGetOpenCallbackFunc,
  QcSegmentContextMenuOpenFunc,
  QcSegmentMenuProps
} from '../types';
import { ProcessingMaskDetailsDialog } from './processing-mask-details-dialog';

export const ProcessingMaskDetailsContextMenuContent = React.memo(
  function ProcessingMaskDetailsContextMenuContent(props: {
    processingMask: ProcessingMask;
    qcSegments: QcSegment[];
    qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  }): JSX.Element {
    const { processingMask, qcSegmentEditContextMenuCb, qcSegments } = props;
    if (processingMask) {
      return (
        <ProcessingMaskDetailsDialog
          processingMask={processingMask}
          qcSegments={qcSegments}
          qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        />
      );
    }
    return undefined;
  }
);

/**
 * Displays the QC Segment Edit Context Menu.
 *
 * @params props @see {@link ProcessingMaskContextMenuGetOpenCallbackFunc}
 * @params props @see {@link QcSegmentContextMenuOpenFunc}
 */
export const ProcessingMaskDetailsContextMenu = React.memo(
  function ProcessingMaskDetailsContextMenu(props: {
    getOpenCallback: ProcessingMaskContextMenuGetOpenCallbackFunc;
    qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  }): JSX.Element {
    const { getOpenCallback, qcSegmentEditContextMenuCb } = props;

    const content = React.useCallback(
      (menuProps: QcSegmentMenuProps) => (
        <ProcessingMaskDetailsContextMenuContent
          processingMask={menuProps?.processingMask}
          qcSegments={menuProps?.qcSegments}
          qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        />
      ),
      [qcSegmentEditContextMenuCb]
    );

    return (
      <ImperativeContextMenu<QcSegmentMenuProps>
        content={content}
        getOpenCallback={getOpenCallback}
      />
    );
  }
);
