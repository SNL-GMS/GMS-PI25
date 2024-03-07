import type { ChannelSegmentTypes } from '@gms/common-model';
import React from 'react';

import type { FkChannelSegmentRecord, FkFrequencyThumbnailRecord } from '../../types';
import { selectFkChannelSegments, selectFkFrequencyThumbnails } from '../api';
import { markFkReviewed } from '../api/data/fk/mark-fk-reviewed';
import type { AsyncFetchResult } from '../query';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';

/**
 * Defines async fetch result for the fk channel segments. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type FkChannelSegmentFetchResult = AsyncFetchResult<FkChannelSegmentRecord>;

/**
 * A hook that can be used to retrieve fk channel segments.
 *
 * @returns the fk channel segments record.
 */
export const useGetFkChannelSegments = (): FkChannelSegmentRecord => {
  return useAppSelector(selectFkChannelSegments);
};

/**
 * A hook that can be used to retrieve fk channel segments.
 *
 * @returns the fk channel segments record.
 */
export const useGetFkFrequencyThumbnails = (): FkFrequencyThumbnailRecord => {
  return useAppSelector(selectFkFrequencyThumbnails);
};

/**
 * Hook to mark Fk as reviewed
 *
 * @returns a callback that requires FkChannelSegment to mark reviewed
 */
export const useMarkFkReviewed = (): ((
  channelSegmentDescriptor: ChannelSegmentTypes.ChannelSegmentDescriptor
) => void) => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    (channelSegmentDescriptor: ChannelSegmentTypes.ChannelSegmentDescriptor) => {
      dispatch(
        markFkReviewed({
          channelSegmentDescriptor
        })
      );
    },
    [dispatch]
  );
};
