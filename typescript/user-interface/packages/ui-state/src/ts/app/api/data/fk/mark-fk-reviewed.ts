import type { ChannelSegmentTypes } from '@gms/common-model';
import type { CaseReducer } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import { createChannelSegmentString } from '../../../../workers/waveform-worker/util/channel-segment-util';
import type { DataState } from '../types';

/**
 * The action for marking the FK as reviewed.
 */
export const markFkReviewed = createAction<
  {
    channelSegmentDescriptor: ChannelSegmentTypes.ChannelSegmentDescriptor;
  },
  'data/markFkReviewed'
>('data/markFkReviewed');

/**
 * Mutates a writable draft fk channel segment record with new fk channel segment
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const markFkReviewedReducer: CaseReducer<DataState, ReturnType<typeof markFkReviewed>> = (
  state,
  action
) => {
  const { channelSegmentDescriptor: fkChannelSegmentDescriptor } = action.payload;
  const fkChannelSegmentRecord = state.fkChannelSegments;

  // Update the FkChannelSegmentRecord timeseries (fk) as reviewed
  const channelDescriptorString = createChannelSegmentString(fkChannelSegmentDescriptor);
  fkChannelSegmentRecord[channelDescriptorString].timeseries.forEach(ts => {
    // eslint-disable-next-line no-param-reassign
    ts.reviewed = true;
  });
};
