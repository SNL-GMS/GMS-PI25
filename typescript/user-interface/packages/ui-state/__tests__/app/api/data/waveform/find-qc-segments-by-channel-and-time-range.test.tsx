import { PD01Channel } from '@gms/common-model/__tests__/__data__';

import type { FindQCSegmentsByChannelAndTimeRangeQueryArgs } from '../../../../../src/ts/app';
import {
  addFindQCSegmentsByChannelAndTimeRangeReducers,
  findQCSegmentsByChannelAndTimeRange,
  shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery
} from '../../../../../src/ts/app/api/data/waveform/find-qc-segments-by-channel-and-time-range';

const fiveMinutes = 300000;
const endTimeMils = 123456789;
const startTimeSecs = (endTimeMils - fiveMinutes) / 1000;

const waveformQueryChannelInput: FindQCSegmentsByChannelAndTimeRangeQueryArgs = {
  channels: [PD01Channel],
  startTime: startTimeSecs,
  endTime: endTimeMils / 1000
};

describe('finds qc segments by channel and time', () => {
  it('have defined', () => {
    expect(shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery).toBeDefined();
    expect(findQCSegmentsByChannelAndTimeRange).toBeDefined();
    expect(addFindQCSegmentsByChannelAndTimeRangeReducers).toBeDefined();
  });

  it('build a builder using addGetChannelSegmentsByChannelReducers', () => {
    const mapKeys = [
      'qcSegment/findQCSegmentsByChannelAndTimeRange/pending',
      'qcSegment/findQCSegmentsByChannelAndTimeRange/fulfilled',
      'qcSegment/findQCSegmentsByChannelAndTimeRange/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addFindQCSegmentsByChannelAndTimeRangeReducers(builder);
    expect(builderMap).toMatchSnapshot();

    // eslint-disable-next-line prefer-const
    let state = { queries: { findQCSegmentsByChannelAndTimeRange: {} } };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: { startTime: 0 } },
      payload: []
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(state).toMatchSnapshot();
    builderMap.get(mapKeys[1])(state, action);
    expect(state).toMatchSnapshot();
    builderMap.get(mapKeys[2])(state, action);
    expect(state).toMatchSnapshot();
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery(undefined)).toBeTruthy();
    expect(
      shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery({
        ...waveformQueryChannelInput,
        startTime: undefined
      })
    ).toBeTruthy();
    expect(
      shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery({
        ...waveformQueryChannelInput,
        endTime: undefined
      })
    ).toBeTruthy();
    expect(
      shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery({
        ...waveformQueryChannelInput,
        channels: undefined
      })
    ).toBeTruthy();
    expect(
      shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery(waveformQueryChannelInput)
    ).toBeFalsy();
  });
});
