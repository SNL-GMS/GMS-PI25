import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { QcSegmentCategory } from '@gms/common-model/lib/qc-segment';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';
import { toast } from 'react-toastify';

import type {
  QcSegmentCreationMenuGetOpenCallbackFunc,
  QcSegmentCreationMenuProps
} from '../types';
import { QCSegmentEditingDialog } from './qc-segment-editing-content';

export const QcSegmentCreationContextMenuContent = React.memo(
  function QcSegmentCreationContextMenuContent(props: {
    menuProps: QcSegmentCreationMenuProps;
  }): JSX.Element {
    const { startTime, endTime, selectedStationIds, onClose } = props.menuProps;
    let qcSegment: QcSegment;
    let canCreateSegment = false;
    let channels: string[];
    // checking that selected raw channels belong to single station while ignoring station panels
    const selectedChannelForSubstr = selectedStationIds.find(id => id.includes('.'));
    if (selectedChannelForSubstr) {
      const channelSubstring = selectedChannelForSubstr.substring(
        0,
        selectedChannelForSubstr.indexOf('.')
      );
      channels = selectedStationIds.filter(id => id.includes('.'));
      canCreateSegment = !channels.some(channel => !channel.startsWith(channelSubstring));
    }
    if (canCreateSegment) {
      // default values to enable opening the editing dialog
      qcSegment = {
        id: undefined,
        channel: { name: undefined },
        versionHistory: [
          {
            id: { parentQcSegmentId: undefined, effectiveAt: startTime },
            startTime,
            endTime,
            createdBy: undefined,
            rejected: false,
            rationale: '',
            type: undefined,
            discoveredOn: undefined,
            stageId: { name: undefined },
            category: QcSegmentCategory.ANALYST_DEFINED,
            channels: channels.map(stationId => ({
              name: stationId,
              effectiveAt: undefined
            }))
          }
        ]
      };
      return <QCSegmentEditingDialog qcSegment={qcSegment} clearBrushStroke={onClose} />;
    }
    toast.warn(`Cannot create QC segments: please select a single station's channels.`);
    return undefined;
  }
);

/**
 * Displays the QC Segment Create Context Menu.
 *
 * @params props @see {@link QcSegmentCreationMenuGetOpenCallbackFunc}
 */
export const QcSegmentCreationContextMenu = React.memo(
  function QcSegmentCreationContextMenu(props: {
    getOpenCallback: QcSegmentCreationMenuGetOpenCallbackFunc;
  }): JSX.Element {
    const { getOpenCallback } = props;

    const content = React.useCallback(
      (menuProps: QcSegmentCreationMenuProps) => (
        <QcSegmentCreationContextMenuContent menuProps={menuProps} />
      ),
      []
    );

    return (
      <ImperativeContextMenu<QcSegmentCreationMenuProps>
        content={content}
        getOpenCallback={getOpenCallback}
      />
    );
  }
);
