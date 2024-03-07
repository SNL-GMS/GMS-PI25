/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable react/function-component-definition */
import type { CommonTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import {
  eventData,
  openIntervalName,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import type { ArrivalTimeFeatureMeasurement } from '@gms/common-model/lib/signal-detection';
import { uuid } from '@gms/common-util';
import { renderHook } from '@testing-library/react-hooks';
import produce, { enableMapSet } from 'immer';
import type { WritableDraft } from 'immer/dist/internal';
import React from 'react';
import { Provider } from 'react-redux';
import { create } from 'react-test-renderer';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from '../../../src/ts/app';
import {
  addSignalDetections,
  AsyncActionStatus,
  useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses
} from '../../../src/ts/app';
import {
  useDetermineActionTargetsByType,
  useFilterDefinitionsForSignalDetectionsQueryHistory,
  useGetFilterDefinitionsForSignalDetections,
  useGetSignalDetections,
  useSetSelectedSdIds
} from '../../../src/ts/app/hooks/signal-detection-hooks';
import { workflowActions } from '../../../src/ts/app/state';
import type { AppState } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/app/store';
import type { SignalDetectionWithSegmentsFetchResults } from '../../../src/ts/workers/waveform-worker/operations/fetch-signal-detections-segments-by-stations-time';
import { unfilteredClaimCheckUiChannelSegment } from '../../__data__';
import { appState, expectHookToCallWorker } from '../../test-util';

const signalDetectionWithSegmentsFetchResults: SignalDetectionWithSegmentsFetchResults = {
  signalDetections: signalDetectionsData,
  uiChannelSegments: [unfilteredClaimCheckUiChannelSegment]
};

// Set first SD arrival to pre transformed since signalDetection fetch results is post transform
signalDetectionWithSegmentsFetchResults.signalDetections[0] = produce(
  signalDetectionWithSegmentsFetchResults.signalDetections[0],
  draft => {
    const fixedArrivalTimeFM: WritableDraft<ArrivalTimeFeatureMeasurement> = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
      SignalDetectionTypes.Util.getCurrentHypothesis(draft.signalDetectionHypotheses as any)
        .featureMeasurements
    );
    fixedArrivalTimeFM.measurementValue = {
      arrivalTime: {
        value: 1546715054.2,
        standardDeviation: 1.162
      },
      travelTime: null
    };
  }
);

// Set second SD arrival to null feature measurement value
signalDetectionWithSegmentsFetchResults.signalDetections[1] = produce(
  signalDetectionWithSegmentsFetchResults.signalDetections[1],
  draft => {
    const fixedArrivalTimeFM: WritableDraft<ArrivalTimeFeatureMeasurement> = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
      SignalDetectionTypes.Util.getCurrentHypothesis(draft.signalDetectionHypotheses as any)
        .featureMeasurements
    );
    fixedArrivalTimeFM.measurementValue = null;
  }
);

// Set third SD arrival time value to null
signalDetectionWithSegmentsFetchResults.signalDetections[2] = produce(
  signalDetectionWithSegmentsFetchResults.signalDetections[2],
  draft => {
    const fixedArrivalTimeFM: WritableDraft<ArrivalTimeFeatureMeasurement> = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
      SignalDetectionTypes.Util.getCurrentHypothesis(draft.signalDetectionHypotheses as any)
        .featureMeasurements
    );
    fixedArrivalTimeFM.measurementValue = {
      arrivalTime: {
        value: 1546715054.2,
        standardDeviation: 1.162
      },
      travelTime: null
    };
  }
);

enableMapSet();
const MOCK_TIME = 1606818240000;
global.Date.now = jest.fn(() => MOCK_TIME);

// mock the uuid
uuid.asString = jest.fn().mockImplementation(() => '12345789');

jest.mock('worker-rpc', () => ({
  RpcProvider: jest.fn().mockImplementation(() => {
    // eslint-disable-next-line no-var
    var mockRpc = jest.fn(async () => {
      return new Promise(resolve => {
        resolve(signalDetectionWithSegmentsFetchResults);
      });
    });
    return { rpc: mockRpc };
  })
}));

jest.mock('../../../src/ts/app/hooks/workflow-hooks', () => {
  return {
    useStageId: jest.fn().mockReturnValue({
      startTime: 0,
      definitionId: {
        name: 'AL1'
      }
    })
  };
});

const mockedGetFilterDefinitionsForSignalDetections = jest.fn();

jest.mock(
  '../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detections',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detections'
    );
    return {
      ...actual,
      getFilterDefinitionsForSignalDetections: () => mockedGetFilterDefinitionsForSignalDetections
    };
  }
);

const mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses = jest.fn();

jest.mock(
  '../../../src/ts/workers/api/fetch-default-filter-definitions-for-signal-detection-hypotheses',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/workers/api/fetch-default-filter-definitions-for-signal-detection-hypotheses'
    );
    return {
      ...actual,
      fetchDefaultFilterDefinitionsForSignalDetectionHypotheses: () =>
        mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses()
    };
  }
);

const mockUseSetSelectedSdIds = jest.fn();

jest.mock('../../../src/ts/app/hooks/signal-detection-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/signal-detection-hooks');
  return {
    ...actual,
    useSetSelectedSdIds: jest.fn(() => mockUseSetSelectedSdIds)
  };
});

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const now = 1234567890 / 1000;
const timeRange: CommonTypes.TimeRange = {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  startTimeSecs: now - 3600,
  endTimeSecs: now
};

describe('signal detection hooks', () => {
  describe('useGetSignalDetections', () => {
    const store = getStore();

    it('exists', () => {
      expect(useGetSignalDetections).toBeDefined();
    });

    it('calls useGetSignalDetections', async () => {
      const useTestHook = () => useGetSignalDetections();
      const result = await expectHookToCallWorker(useTestHook);
      expect(result).toMatchSnapshot();
    });

    it('calls useDetermineActionTargetsByType', async () => {
      const useTestHook = () => useDetermineActionTargetsByType();
      const result = await expectHookToCallWorker(useTestHook);
      expect(result).toMatchSnapshot();
    });

    it('hook query for signal detections for current stations with initial state', () => {
      const Component: React.FC = () => {
        const result = useGetSignalDetections();
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });

    it('hook query for signal detections for current stations', () => {
      store.dispatch(workflowActions.setTimeRange(timeRange));
      store.dispatch(addSignalDetections(signalDetectionsData));

      const Component: React.FC = () => {
        const result = useGetSignalDetections();
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });

    it('hook query for signal detections', () => {
      store.dispatch(workflowActions.setTimeRange(timeRange));
      const Component: React.FC = () => {
        const result = useGetSignalDetections();
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });
  });

  describe('useFilterDefinitionsForSignalDetectionsQueryHistory', () => {
    it('exists', () => {
      expect(useFilterDefinitionsForSignalDetectionsQueryHistory).toBeDefined();
    });

    it('returns an empty array if nothing has been requested', () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(appState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useFilterDefinitionsForSignalDetectionsQueryHistory(), {
        wrapper: Wrapper
      });
      expect(result.current).toMatchObject({});
    });

    it('returns the ids of signal detections requested', () => {
      const queryArgs: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
        stageId: {
          name: 'AL1'
        },
        signalDetectionsHypotheses: [
          {
            id: {
              id: 'a1',
              signalDetectionId: 'b1'
            }
          }
        ]
      };

      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          queries: {
            ...appState.data.queries,
            getFilterDefinitionsForSignalDetections: {
              AL1: {
                12345: {
                  arg: queryArgs,
                  status: AsyncActionStatus.pending,
                  error: undefined
                }
              }
            }
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useFilterDefinitionsForSignalDetectionsQueryHistory(), {
        wrapper: Wrapper
      });
      expect(result.current).toMatchObject({ b1: ['a1'] });
    });
  });
  describe('useGetFilterDefinitionsForSignalDetections', () => {
    beforeEach(() => {
      mockedGetFilterDefinitionsForSignalDetections.mockClear();
    });

    it('exists', () => {
      expect(useGetFilterDefinitionsForSignalDetections).toBeDefined();
    });

    it('does not trigger a request if there are no signalDetections', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(appState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() =>
        expect(mockedGetFilterDefinitionsForSignalDetections).not.toHaveBeenCalled()
      );
    });
    it('does not repeat a request for the same signal detection', async () => {
      const queryArgs: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
        stageId: {
          name: 'AL1'
        },
        signalDetectionsHypotheses: [signalDetectionsData[0].signalDetectionHypotheses[0]]
      };

      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          signalDetections: {
            [signalDetectionsData[0].id]: signalDetectionsData[0]
          },
          queries: {
            ...appState.data.queries,
            getFilterDefinitionsForSignalDetections: {
              AL1: {
                12345: {
                  arg: queryArgs,
                  status: AsyncActionStatus.pending,
                  error: undefined
                }
              }
            }
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() =>
        expect(mockedGetFilterDefinitionsForSignalDetections).not.toHaveBeenCalled()
      );
    });
    it('makes a request for a new signal detection', async () => {
      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          signalDetections: {
            a1: signalDetectionsData[0]
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() => expect(mockedGetFilterDefinitionsForSignalDetections).toHaveBeenCalled());
    });
  });
  describe('useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses', () => {
    beforeEach(() => {
      mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses.mockClear();
    });

    it('exists', () => {
      expect(useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses).toBeDefined();
    });

    it('requests filters for the given signal detection hypotheses', () => {
      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          signalDetections: {
            a1: signalDetectionsData[0]
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(
        () => useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses(),
        {
          wrapper: Wrapper
        }
      );

      result.current(signalDetectionsData[0].signalDetectionHypotheses);
      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalledTimes(
        1
      );
    });

    it('requests filters twice for the given signal detection hypotheses if an event is open', () => {
      const mockAppState: AppState = {
        ...appState,
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            openEventId: eventData.id
          },
          workflow: {
            ...appState.app.workflow,
            openIntervalName
          }
        },
        data: {
          ...appState.data,
          signalDetections: {
            a1: signalDetectionsData[0]
          },
          events: {
            [eventData.id]: eventData
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(
        () => useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses(),
        {
          wrapper: Wrapper
        }
      );

      result.current(signalDetectionsData[0].signalDetectionHypotheses);
      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalledTimes(
        2
      );
    });
  });

  describe('useSetSelectedSdIds', () => {
    it('exists', () => {
      expect(useSetSelectedSdIds).toBeDefined();
    });

    it('adds a selected sd id to store', () => {
      const store = getStore();

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useSetSelectedSdIds(), {
        wrapper: Wrapper
      });
      result.current([signalDetectionsData[0].id]);

      expect(mockUseSetSelectedSdIds).toHaveBeenCalledTimes(1);
      expect(mockUseSetSelectedSdIds).toHaveBeenCalledWith([signalDetectionsData[0].id]);
    });
  });
});
