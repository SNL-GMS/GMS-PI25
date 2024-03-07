import type { ProcessingMask } from '@gms/common-model/lib/channel-segment/types';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc,
  Row
} from '@gms/ui-core-components';

export type QcSegmentContextMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegment>;

export type QcSegmentsContextMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegmentMenuProps>;
export type QcSegmentSelectionMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegment[]>;
export type QcSegmentCreationMenuOpenFunc = ImperativeContextMenuOpenFunc<
  QcSegmentCreationMenuProps
>;
export type ProcessingMaskMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegmentMenuProps>;

export type QcSegmentContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegment
>;

export type QcSegmentSelectionMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegment[]
>;

export type QcSegmentsContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegmentMenuProps
>;

export type QcSegmentCreationMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegmentCreationMenuProps
>;

export type ProcessingMaskContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegmentMenuProps
>;

export interface QcSegmentMenuProps {
  qcSegments?: QcSegment[];
  allSegments: QcSegment[];
  processingMask?: ProcessingMask;
}

export interface QcSegmentCreationMenuProps {
  startTime: number;
  endTime: number;
  selectedStationIds: string[];
  // TODO: remove this when code to clear brush stroke is refactored
  onClose: () => void;
}

export interface QcMaskTableButtonParams {
  onClick(x: number, y: number, params: any);
}

/**
 * Interface that describes the QC Mask history information.
 */
export interface QcMaskHistoryRow extends Row {
  author: string;
  category: string;
  type: string;
  startTime: number;
  channelName: string[];
  endTime: number;
  rationale: string;
  effectiveAt: number;
  rejected: string;
}
