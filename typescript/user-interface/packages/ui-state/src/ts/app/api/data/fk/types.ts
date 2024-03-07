/**
 * Input type for Compute FK service call. This input
 * is compatible with the COI input i.e. start/end are strings
 */
import type { FkTypes } from '@gms/common-model';

import type { AsyncFetchHistory } from '../../../query';

/**
 * Defines the history record type for the getChannelSegmentsByChannel query
 */
export type ComputeFkSpectraHistory = AsyncFetchHistory<FkTypes.FkInputWithConfiguration>;
