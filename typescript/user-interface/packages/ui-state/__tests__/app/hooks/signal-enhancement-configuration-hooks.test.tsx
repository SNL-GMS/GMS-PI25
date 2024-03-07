import { renderHook } from '@testing-library/react-hooks';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { Provider } from 'react-redux';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { waveformInitialState } from '../../../src/ts/app';
import { dataInitialState } from '../../../src/ts/app/api';
import * as getFilterDefinitionForChannelSegments from '../../../src/ts/app/api/data/signal-enhancement/get-filter-definitions-for-channel-segments';
import {
  useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory,
  useGetDefaultFilterDefinitionByUsageForChannelSegments,
  useGetRawUnfilteredUIChannelSegments,
  useGetRawUnfilteredUniqueIChannelSegmentsFaceted
} from '../../../src/ts/app/hooks/signal-enhancement-configuration-hooks';
import { initialState } from '../../../src/ts/app/state/reducer';
import type { AppState } from '../../../src/ts/app/store';

Object.assign(getFilterDefinitionForChannelSegments, {
  ...getFilterDefinitionForChannelSegments,
  getDefaultFilterDefinitionByUsageForChannelSegments: jest.fn()
});

jest.mock('@gms/ui-state', () => {
  const actualRedux = jest.requireActual('@gms/ui-state');
  const mockDispatchFunc = jest.fn();
  const mockDispatch = () => mockDispatchFunc;
  const mockUseAppDispatch = jest.fn(mockDispatch);
  return {
    ...actualRedux,
    useAppDispatch: mockUseAppDispatch
  };
});
describe('signal enhancement configuration hooks', () => {
  it('has export members defined', () => {
    expect(useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory).toBeDefined();
    expect(useGetRawUnfilteredUIChannelSegments).toBeDefined();
    expect(useGetRawUnfilteredUniqueIChannelSegmentsFaceted).toBeDefined();
    expect(useGetDefaultFilterDefinitionByUsageForChannelSegments).toBeDefined();
  });
  it('useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory call history for web service', () => {
    const historyEntry: any = {
      '100.200.1': {
        xJvEoYimC4xmOCdRpikc9: {
          arg: {
            channelSegments: [
              {
                id: {
                  channel: {
                    effectiveAt: 100,
                    name: 'a.b.c'
                  },
                  startTime: 100,
                  endTime: 200,
                  creationTime: 100
                }
              }
            ]
          },
          status: 'fulfilled'
        },
        xJvEoYimC4xmOCdRpikc8: {
          arg: {
            channelSegments: [
              {
                id: {
                  channel: {
                    effectiveAt: 100,
                    name: 'a.b.c'
                  },
                  startTime: 100,
                  endTime: 200,
                  creationTime: 100
                }
              }
            ],
            eventHypothesis: {
              name: 'fake event Hypothesis'
            } as any
          },
          status: 'fulfilled'
        }
      }
    };
    const myDataInitialState = cloneDeep(dataInitialState);
    myDataInitialState.queries.getDefaultFilterDefinitionByUsageForChannelSegments = historyEntry;
    const appState: AppState = {
      eventManagerApi: undefined,
      processingConfigurationApi: undefined,
      processingStationApi: undefined,
      signalEnhancementConfigurationApi: undefined,
      ssamControlApi: undefined,
      systemMessageDefinitionApi: undefined,
      userManagerApi: undefined,
      workflowApi: undefined,
      sohAceiApi: undefined,
      stationDefinitionApi: undefined,
      systemEventGatewayApi: undefined,
      data: myDataInitialState,
      history: undefined,
      app: cloneDeep(initialState)
    };
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const store = mockStoreCreator(appState);

    function Wrapper({ children }) {
      return <Provider store={store}>{children}</Provider>;
    }

    const { result } = renderHook(
      () => useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory(),
      {
        wrapper: Wrapper
      }
    );
    expect(result.current[0]).toEqual(['a.b.c.100.100.100.200']);
    expect(result.current[1]).toEqual(['a.b.c.100.100.100.200']);
  });
  it('useGetRawUnfilteredUIChannelSegments get uiChannelSegments', () => {
    const myDataInitialState = cloneDeep(dataInitialState);
    myDataInitialState.channels.raw = { key1: { name: 'key1' } } as any;
    myDataInitialState.uiChannelSegments = {
      chanSegName: {
        Unfiltered: [{ channelSegmentDescriptor: { channel: { name: 'key1' } } } as any]
      }
    };
    const appState: AppState = {
      eventManagerApi: undefined,
      processingConfigurationApi: undefined,
      processingStationApi: undefined,
      signalEnhancementConfigurationApi: undefined,
      ssamControlApi: undefined,
      systemMessageDefinitionApi: undefined,
      userManagerApi: undefined,
      workflowApi: undefined,
      sohAceiApi: undefined,
      stationDefinitionApi: undefined,
      systemEventGatewayApi: undefined,
      data: myDataInitialState,
      history: undefined,
      app: cloneDeep(initialState)
    };
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const store = mockStoreCreator(appState);

    function Wrapper({ children }) {
      return <Provider store={store}>{children}</Provider>;
    }
    const { result } = renderHook(() => useGetRawUnfilteredUIChannelSegments(), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchObject([
      { channelSegmentDescriptor: { channel: { name: 'key1' } } }
    ]);
  });
  it('useGetRawUnfilteredUniqueIChannelSegmentsFaceted get faceted channel segments', () => {
    const myDataInitialState = cloneDeep(dataInitialState);
    myDataInitialState.channels.raw = { key1: { name: 'key1' } } as any;
    myDataInitialState.uiChannelSegments = {
      chanSegName: {
        Unfiltered: [{ channelSegmentDescriptor: { channel: { name: 'key1' } } } as any]
      }
    };
    const appState: AppState = {
      eventManagerApi: undefined,
      processingConfigurationApi: undefined,
      processingStationApi: undefined,
      signalEnhancementConfigurationApi: undefined,
      ssamControlApi: undefined,
      systemMessageDefinitionApi: undefined,
      userManagerApi: undefined,
      workflowApi: undefined,
      sohAceiApi: undefined,
      stationDefinitionApi: undefined,
      systemEventGatewayApi: undefined,
      data: myDataInitialState,
      history: undefined,
      app: cloneDeep(initialState)
    };
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const store = mockStoreCreator(appState);

    function Wrapper({ children }) {
      return <Provider store={store}>{children}</Provider>;
    }
    const { result } = renderHook(() => useGetRawUnfilteredUniqueIChannelSegmentsFaceted(), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchObject([{ id: { channel: { name: 'key1' } } }]);
  });

  it('useGetDefaultFilterDefinitionByUsageForChannelSegments dispatches web service request', () => {
    const myDataInitialState = cloneDeep(dataInitialState);
    myDataInitialState.channels.raw = { key1: { name: 'key1' } } as any;
    myDataInitialState.uiChannelSegments = {
      chanSegName: {
        Unfiltered: [
          {
            channelSegmentDescriptor: {
              channel: { name: 'key1', effectiveAt: 1 },
              creationTime: 1,
              startTime: 1,
              endTime: 2
            }
          } as any
        ]
      }
    };
    const app = cloneDeep(initialState);
    const appState: AppState = {
      eventManagerApi: undefined,
      processingConfigurationApi: undefined,
      processingStationApi: undefined,
      signalEnhancementConfigurationApi: undefined,
      ssamControlApi: undefined,
      systemMessageDefinitionApi: undefined,
      userManagerApi: undefined,
      workflowApi: undefined,
      sohAceiApi: undefined,
      stationDefinitionApi: undefined,
      systemEventGatewayApi: undefined,
      data: myDataInitialState,
      history: undefined,
      app: {
        ...app,
        waveform: {
          ...waveformInitialState,
          viewableInterval: {
            startTimeSecs: 0,
            endTimeSecs: 1
          }
        }
      }
    };
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const store = mockStoreCreator(appState);

    function Wrapper({ children }) {
      return <Provider store={store}>{children}</Provider>;
    }
    renderHook(() => useGetDefaultFilterDefinitionByUsageForChannelSegments(), {
      wrapper: Wrapper
    });

    expect(
      ((getFilterDefinitionForChannelSegments.getDefaultFilterDefinitionByUsageForChannelSegments as any) as jest.Mock)
        .mock.calls[0]
    ).toMatchInlineSnapshot(`
      [
        {
          "channelSegments": [
            {
              "id": {
                "channel": {
                  "effectiveAt": 1,
                  "name": "key1",
                },
                "creationTime": 1,
                "endTime": 2,
                "startTime": 1,
              },
            },
          ],
          "interval": {
            "endTimeSecs": 1,
            "startTimeSecs": 0,
          },
        },
      ]
    `);
  });
});
