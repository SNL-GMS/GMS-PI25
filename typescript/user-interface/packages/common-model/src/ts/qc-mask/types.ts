// ***************************************
import type { TimeRange } from '../common/types';

/**
 * @deprecated
 */
export interface QcMaskInput {
  timeRange: TimeRange;
  category: string;
  type: string;
  rationale: string;
}
