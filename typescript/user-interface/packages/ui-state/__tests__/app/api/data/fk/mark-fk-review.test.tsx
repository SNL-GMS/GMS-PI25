import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import type * as Redux from 'redux';

import { markFkReviewed } from '../../../../../src/ts/app';
import { dataInitialState, dataSlice } from '../../../../../src/ts/app/api/data/data-slice';
import { createChannelSegmentString } from '../../../../../src/ts/workers/waveform-worker/util/channel-segment-util';
import { getTestFkChannelSegment } from '../../../../__data__/fk/fk-channel-segment-data';

const fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = getTestFkChannelSegment(
  signalDetectionsData[0]
);
const channelSegmentString = createChannelSegmentString(fkChannelSegment.id);
const fkChannelSegments = {};
fkChannelSegments[channelSegmentString] = fkChannelSegment;
const state = {
  ...dataInitialState,
  fkChannelSegments
};

describe('Fk Reducers', () => {
  it('should mark FK as reviewed', () => {
    const action: Redux.AnyAction = {
      type: markFkReviewed.type,
      payload: { channelSegmentDescriptor: fkChannelSegment.id }
    };
    const updatedState = dataSlice.reducer(state, action);
    expect(updatedState).toMatchSnapshot();
    const updatedFkChannelSegment = updatedState.fkChannelSegments[channelSegmentString];
    updatedFkChannelSegment.timeseries.forEach(ts => expect(ts.reviewed).toBeTruthy());
  });
});
