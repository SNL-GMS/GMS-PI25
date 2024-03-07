import type { ProcessingOperation } from '../channel-segment/types';
import type { QcSegmentCategory, QcSegmentType } from '../qc-segment';
import type { Channel } from '../station-definitions/channel-definitions/channel-definitions';

export interface QcSegmentCategoryAndType {
  category: QcSegmentCategory;
  type?: QcSegmentType;
}

export interface ProcessingMaskDefinition {
  processingOperation: ProcessingOperation;
  appliedQcSegmentCategoryAndTypes: QcSegmentCategoryAndType;
  maskedSegmentMergeThreshold: number;
}

export interface ProcessingMaskDefinitionsByPhaseByChannel {
  channel: Channel;
  processingMaskDefinitionByPhase: Record<string, ProcessingMaskDefinition[]>;
}
