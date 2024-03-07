/* eslint-disable react/function-component-definition */
import { UNFILTERED } from '@gms/common-model/lib/filter';
import { renderHook } from '@testing-library/react-hooks';
import clone from 'lodash/clone';
import React from 'react';
import { Provider } from 'react-redux';
import { create } from 'react-test-renderer';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { dataInitialState } from '../../../src/ts/app';
import type { GetChannelSegmentsByChannelsQueryArgs } from '../../../src/ts/app/api/data/waveform/types';
import {
  useGetChannelSegments,
  useGetChannelSegmentsByChannels,
  useGetVisibleChannelSegmentsByStationAndTime
} from '../../../src/ts/app/hooks/channel-segment-hooks';
import type { AppState } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/app/store';
import { unfilteredSamplesUiChannelSegment } from '../../__data__';
import { appState } from '../../test-util';

describe('channel segment hooks', () => {
  it('exists', () => {
    expect(useGetChannelSegments).toBeDefined();
    expect(useGetChannelSegmentsByChannels).toBeDefined();
  });

  it('useGetChannelSegmentsByChannels returns an object with loading values', () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const dataInitialStateCopy = clone(dataInitialState);
    dataInitialStateCopy.uiChannelSegments = {
      'PDAR.BHZ': { unfiltered: [unfilteredSamplesUiChannelSegment] }
    };
    const mockAppState = appState;
    mockAppState.data = dataInitialStateCopy;
    const store = mockStoreCreator(mockAppState);
    const queryArgs: GetChannelSegmentsByChannelsQueryArgs = {
      startTime: 1274391900,
      endTime: 1274399099,
      channels: [
        { name: 'PDAR.BHZ', effectiveAt: 101 },
        { name: 'PDAR.BHA', effectiveAt: 101 }
      ]
    };
    const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useGetChannelSegmentsByChannels(queryArgs), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchSnapshot();
  });

  it('useGetChannelSegmentsByChannels filters out channel segments outside the requested range', () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const dataInitialStateCopy = clone(dataInitialState);
    dataInitialStateCopy.uiChannelSegments = {
      'PDAR.BHZ': { unfiltered: [unfilteredSamplesUiChannelSegment] }
    };
    const mockAppState = appState;
    mockAppState.data = dataInitialStateCopy;
    const store = mockStoreCreator(mockAppState);
    const queryArgs: GetChannelSegmentsByChannelsQueryArgs = {
      startTime: 0,
      endTime: 100,
      channels: [
        { name: 'PDAR.BHZ', effectiveAt: 101 },
        { name: 'PDAR.BHA', effectiveAt: 101 }
      ]
    };
    const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useGetChannelSegmentsByChannels(queryArgs), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchSnapshot();
  });

  it('hook query for channel segments', () => {
    const store = getStore();

    const Component1: React.FC = () => {
      const result = useGetChannelSegments({ startTimeSecs: 1274391900, endTimeSecs: 1274399099 });
      return <>{JSON.stringify(result.data)}</>;
    };

    const Component2: React.FC = () => {
      // call twice to hit other blocks of code
      const result = useGetChannelSegments({ startTimeSecs: 1274391900, endTimeSecs: 1274399099 });
      return <>{JSON.stringify(result.data)}</>;
    };

    expect(
      create(
        <Provider store={store}>
          <Component1 />
          <Component2 />
        </Provider>
      ).toJSON()
    ).toMatchSnapshot();

    expect(
      create(
        <Provider store={store}>
          <Component1 />
          <Component2 />
        </Provider>
      ).toJSON()
    ).toMatchSnapshot();
  });

  describe('useVisibleChannelSegmentsByStationAndTime', () => {
    it('is defined', () => {
      expect(useGetVisibleChannelSegmentsByStationAndTime).toBeDefined();
    });

    it('returns a callback', () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments: {
            [unfilteredSamplesUiChannelSegment.channelSegment.id.channel.name]: {
              unfiltered: [unfilteredSamplesUiChannelSegment]
            }
          }
        }
      };

      const store = mockStoreCreator(mockAppState);

      const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
      const { result } = renderHook(() => useGetVisibleChannelSegmentsByStationAndTime(), {
        wrapper: Wrapper
      });
      expect(result.current).toBeDefined();
    });

    it('callback finds channel segments based on input', () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const { startTime, endTime } = unfilteredSamplesUiChannelSegment.channelSegmentDescriptor;

      const mockAppState: AppState = {
        ...appState,
        app: {
          ...appState.app,
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: endTime + 1000
            }
          }
        },
        data: {
          ...appState.data,
          uiChannelSegments: {
            AAK: { [UNFILTERED]: [unfilteredSamplesUiChannelSegment] },
            BAK: {
              [UNFILTERED]: [unfilteredSamplesUiChannelSegment, unfilteredSamplesUiChannelSegment]
            }
          }
        }
      };

      const store = mockStoreCreator(mockAppState);

      const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
      const { result } = renderHook(() => useGetVisibleChannelSegmentsByStationAndTime(), {
        wrapper: Wrapper
      });

      expect(result.current('AAK', startTime - 1)).toHaveLength(0);
      expect(result.current('AAK', endTime + 1)).toHaveLength(0);
      expect(result.current('AAK', startTime)).toHaveLength(1);
      expect(result.current('AAK', endTime)).toHaveLength(1);

      expect(result.current('BAK', startTime - 1)).toHaveLength(0);
      expect(result.current('BAK', endTime + 1)).toHaveLength(0);
      expect(result.current('BAK', startTime)).toHaveLength(2);
      expect(result.current('BAK', endTime)).toHaveLength(2);
    });
  });
});
