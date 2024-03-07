/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { FilterTypes, FkTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import { UNFILTERED_FILTER } from '@gms/common-model/lib/filter/types';

/**
 * Checks if FK spectra channel segment
 *
 * @param object Channel Segment
 * @returns boolean
 */
export function isFkSpectraChannelSegment(
  object: ChannelSegmentTypes.ChannelSegment<ChannelSegmentTypes.TimeSeries>
): object is ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> {
  return object.timeseriesType === ChannelSegmentTypes.TimeSeriesType.FK_SPECTRA;
}

/**
 * Creates/Returns an unfiltered waveform filter
 */
export function createUnfilteredWaveformFilter(): FilterTypes.Filter {
  return UNFILTERED_FILTER;
}
