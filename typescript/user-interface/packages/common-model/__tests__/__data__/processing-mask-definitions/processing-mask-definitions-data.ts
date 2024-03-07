import { ProcessingOperation } from '../../../src/ts/channel-segment/types';
import type { ProcessingMaskDefinitionTypes } from '../../../src/ts/common-model';
import { QcSegmentCategory, QcSegmentType } from '../../../src/ts/qc-segment';
import { PD01Channel } from '../station-definitions';

export const qcSegmentCategoryAndType: ProcessingMaskDefinitionTypes.QcSegmentCategoryAndType = {
  category: QcSegmentCategory.ANALYST_DEFINED,
  type: QcSegmentType.AGGREGATE
};

export const processingMaskDefinition: ProcessingMaskDefinitionTypes.ProcessingMaskDefinition = {
  appliedQcSegmentCategoryAndTypes: qcSegmentCategoryAndType,
  processingOperation: ProcessingOperation.EVENT_BEAM,
  maskedSegmentMergeThreshold: 50
};

export const processingMaskDefinitionsByPhaseByChannel1: ProcessingMaskDefinitionTypes.ProcessingMaskDefinitionsByPhaseByChannel = {
  channel: PD01Channel,
  processingMaskDefinitionByPhase: { P: [processingMaskDefinition] }
};

export const processingMaskDefinitionsByPhaseByChannel2: ProcessingMaskDefinitionTypes.ProcessingMaskDefinitionsByPhaseByChannel = {
  channel: PD01Channel,
  processingMaskDefinitionByPhase: { S: [processingMaskDefinition] }
};
