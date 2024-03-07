import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { eventData, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { act, renderHook } from '@testing-library/react-hooks';
import clone from 'lodash/clone';

import type { AppState } from '../../../src/ts/app';
import {
  dataInitialState,
  useGetFkChannelSegments,
  useGetFkFrequencyThumbnails,
  useMarkFkReviewed
} from '../../../src/ts/app';
import type { FkFrequencyThumbnailRecord } from '../../../src/ts/types';
import { createChannelSegmentString } from '../../../src/ts/workers/waveform-worker/util/channel-segment-util';
import { fkInput, getTestFkChannelSegment } from '../../__data__';
import { appState } from '../../test-util';

const fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = getTestFkChannelSegment(
  signalDetectionsData[0]
);

const fkFrequencyThumbnail: FkTypes.FkFrequencyThumbnail = {
  fkSpectra: fkChannelSegment.timeseries[0],
  frequencyBand: {
    maxFrequencyHz: fkInput.fkComputeInput.highFrequency,
    minFrequencyHz: fkInput.fkComputeInput.lowFrequency
  }
};
const fkThumbnailRecord: FkFrequencyThumbnailRecord = {};
fkThumbnailRecord[signalDetectionsData[0].id] = [fkFrequencyThumbnail];
const channelSegmentString = createChannelSegmentString(fkChannelSegment.id);
const fkChannelSegmentRecord = {};
fkChannelSegmentRecord[channelSegmentString] = fkChannelSegment;
const dataInitialStateCopy = clone(dataInitialState);
dataInitialStateCopy.fkChannelSegments = fkChannelSegmentRecord;
dataInitialStateCopy.fkFrequencyThumbnails = fkThumbnailRecord;

jest.mock('../../../src/ts/app/hooks/react-redux-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/react-redux-hooks');
  const mockDispatchFunc = jest.fn();
  const mockDispatch = () => mockDispatchFunc;
  const mockUseAppDispatch = jest.fn(mockDispatch);
  return {
    ...actual,
    useAppDispatch: mockUseAppDispatch,
    useAppSelector: jest.fn((stateFunc: (state: AppState) => any) => {
      const state: AppState = appState;
      state.app.userSession.authenticationStatus.userName = 'test';
      state.app.workflow.openIntervalName = 'AL1';
      state.app.workflow.openActivityNames = ['AL1 Event Review'];
      state.app.analyst.openEventId = eventData.id;
      state.app.workflow.timeRange = { startTimeSecs: 1669150800, endTimeSecs: 1669154400 };
      state.app.analyst.selectedSdIds = [signalDetectionsData[1].id];
      state.data = dataInitialStateCopy;
      return stateFunc(state);
    })
  };
});

describe('fetch fk channel segment hooks', () => {
  it('is exported', () => {
    expect(useGetFkChannelSegments).toBeDefined();
    expect(useGetFkFrequencyThumbnails).toBeDefined();
    expect(useMarkFkReviewed).toBeDefined();
  });

  it('can use fetch fk channel segments', () => {
    const { result } = renderHook(() => useGetFkChannelSegments());
    expect(result.current).toEqual(fkChannelSegmentRecord);
  });

  it('can use fetch fk frequency thumbnails', () => {
    const { result } = renderHook(() => useGetFkFrequencyThumbnails());
    expect(result.current).toEqual(fkThumbnailRecord);
  });

  it('can use mark fk reviewed', () => {
    const { result } = renderHook(() => useMarkFkReviewed());
    act(() => {
      expect(() => result.current(fkChannelSegment.id)).not.toThrow();
    });
  });
});
