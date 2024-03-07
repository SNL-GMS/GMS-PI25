import type { ChannelSegmentTypes } from '@gms/common-model';
import type { WeavessTypes } from '@gms/weavess-core';

import { isRawChannelName, isSplitChannelName } from './channel-factory-util';

/**
 * Determines a {@link TimeRange} from a given {@link ChannelSegment} object.
 *
 * @returns startTime and endTime in seconds
 */
export const getTimeRangeFromChannelSegment = (
  cs: ChannelSegmentTypes.ChannelSegment<ChannelSegmentTypes.TimeSeries>
): WeavessTypes.TimeRange => {
  return cs.timeseries.reduce(
    (finalRange, timeseries) => {
      const timeRange: WeavessTypes.TimeRange = {
        startTimeSecs: timeseries.startTime,
        endTimeSecs: timeseries.endTime
      };
      return {
        startTimeSecs: Math.min(finalRange.startTimeSecs, timeRange.startTimeSecs),
        endTimeSecs: Math.max(finalRange.endTimeSecs, timeRange.endTimeSecs)
      };
    },
    { startTimeSecs: Infinity, endTimeSecs: -Infinity }
  );
};

/**
 * Will provide the correct key to select entries in a channel segment record, or filter record.
 *
 * @param stationId the station id or weavess row name commonly found in a weavess channel or station
 * @param stationName the station name from a weavess station
 * @param channelName the channel name from a weavess channel
 * @returns the correct key to use in a channel segment record, or the channel filter record
 */
export const getChannelRecordKey = (
  stationId: string,
  stationName: string,
  channelName: string
) => {
  if (!isSplitChannelName(stationId)) return stationId;
  if (!isSplitChannelName(channelName) && isRawChannelName(channelName)) return channelName;
  return stationName;
};
