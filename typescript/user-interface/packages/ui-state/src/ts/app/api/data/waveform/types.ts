import type { VersionReference } from '@gms/common-model/lib/faceted';

import type { AsyncFetchHistory } from '../../../query/types';

/**
 * The interface required by the waveform manager service to make a channel segment query by channels.
 */
export interface GetChannelSegmentsByChannelsQueryArgs {
  /**
   * In seconds. This will get converted into a UTC time string by the AxiosTransformers.
   */
  startTime: number;
  /**
   * In seconds. This will get converted into a UTC time string by the AxiosTransformers.
   */
  endTime: number;
  /**
   * The `channel-timerange` endpoint expects version references of the channels.
   */
  channels: VersionReference<'name'>[];
}

/**
 * The interface required to make a channel segment query by single channel.
 */
export type GetChannelSegmentsByChannelQueryArgs = Omit<
  GetChannelSegmentsByChannelsQueryArgs & { channel: VersionReference<'name'> },
  'channels'
>;

/**
 * Defines the history record type for the getChannelSegmentsByChannel query
 */
export type GetChannelSegmentsByChannelHistory = AsyncFetchHistory<
  GetChannelSegmentsByChannelQueryArgs
>;

/**
 * The interface required to make a qc segment query
 */
export interface FindQCSegmentsByChannelAndTimeRangeQueryArgs {
  startTime: number;
  endTime: number;
  channels: VersionReference<'name'>[];
}

/**
 * Defines the history record type for the FindQCSegmentsByChannelAndTimeRange query
 */
export type FindQCSegmentsByChannelAndTimeRangeHistory = AsyncFetchHistory<
  FindQCSegmentsByChannelAndTimeRangeQueryArgs
>;
