import type { CommonTypes } from '@gms/common-model';
import {
  asarAS01Channel,
  asarAS02Channel,
  defaultStations,
  linearFilter,
  PD01Channel,
  pdarUiChannelSegmentDescriptor,
  processingAnalystConfigurationData
} from '@gms/common-model/__tests__/__data__';
import type {
  PhaseTypeMeasurementValue,
  SignalDetection
} from '@gms/common-model/lib/signal-detection';
import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import { renderHook } from '@testing-library/react-hooks';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { Provider } from 'react-redux';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { AppState } from '../../../src/ts/app';
import {
  addBeamedChannels,
  createSignalDetection,
  useCreateSignalDetection
} from '../../../src/ts/app';
import { isTemporaryChannel } from '../../../src/ts/app/util/channel-factory-util';
import type { ChannelFilterRecord } from '../../../src/ts/types';
import {
  filteredUiChannelSegmentWithClaimCheck,
  unfilteredClaimCheckUiChannelSegment,
  useQueryStateResult
} from '../../__data__';
import { appState } from '../../test-util';

const processingAnalystConfigurationQuery = cloneDeep(useQueryStateResult);
processingAnalystConfigurationQuery.data = processingAnalystConfigurationData;

const operationalTimeRange: CommonTypes.TimeRange = {
  startTimeSecs: 0,
  endTimeSecs: 2000
};
const operationalTimePeriodConfigurationQuery = cloneDeep(useQueryStateResult);
operationalTimePeriodConfigurationQuery.data = operationalTimeRange;

jest.mock('../../../src/ts/app/hooks/station-definition-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/station-definition-hooks');
  return {
    ...actual,
    useAllStations: jest.fn(() => defaultStations),
    useVisibleStations: jest.fn(() => defaultStations)
  };
});

jest.mock('../../../src/ts/app/hooks/operational-time-period-configuration-hooks', () => {
  return {
    useEffectiveTime: jest.fn(() => 0),
    useOperationalTimePeriodConfiguration: jest.fn(() => ({
      timeRange: {
        startTimeSecs: 0,
        endTimeSecs: 2000
      },
      operationalTimePeriodConfigurationQuery
    }))
  };
});

jest.mock('../../../src/ts/app/hooks/workflow-hooks', () => {
  const actual = jest.requireActual(
    '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
  );
  return {
    ...actual,
    useStageId: jest.fn(() => ({
      startTime: 0,
      definitionId: {
        name: 'AL_1'
      }
    }))
  };
});

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

jest.mock(
  '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
    );
    return {
      ...actual,
      useGetProcessingStationGroupNamesConfigurationQuery: jest.fn(() => ({
        data: {
          stationGroupNames: []
        }
      })),
      useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
        data: {
          defaultSDTimeUncertainty: 0
        }
      })),
      useGetProcessingMonitoringOrganizationConfigurationQuery: jest.fn(() => ({
        data: {
          monitoringOrganization: 'gms'
        }
      }))
    };
  }
);

const uiChannelSegments = {
  [unfilteredClaimCheckUiChannelSegment.channelSegment.id.channel.name.split('.')[0]]: {
    [unfilteredClaimCheckUiChannelSegment.channelSegment._uiFilterId]: [
      unfilteredClaimCheckUiChannelSegment
    ]
  }
};

const filteredUiChannelSegments = {
  [filteredUiChannelSegmentWithClaimCheck.channelSegment.id.channel.name.split('.')[0]]: {
    [filteredUiChannelSegmentWithClaimCheck.channelSegment._uiFilterId]: [
      filteredUiChannelSegmentWithClaimCheck
    ]
  }
};
const channelFilters: ChannelFilterRecord = {
  [filteredUiChannelSegmentWithClaimCheck.channelSegment.id.channel.name.split(
    '.'
  )[0]]: linearFilter
};

describe('Update signal detection hooks', () => {
  describe('useCreateSignalDetection', () => {
    beforeEach(() => {
      mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses.mockClear();
    });

    it('returns a callback function', () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          channels: {
            raw: {
              [asarAS01Channel.name]: asarAS01Channel
            },
            beamed: {
              [asarAS02Channel.name]: asarAS02Channel
            },
            filtered: {}
          }
        }
      };

      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      expect(result.current).toBeDefined();
    });
    it('creates a signal detection with the current phase associated to a temp channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {},
            beamed: {
              [PD01Channel.name]: PD01Channel
            },
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      // Time before the channel segment
      const timeSec = pdarUiChannelSegmentDescriptor.startTime - 1;
      const stationId = PD01Channel.station.name;

      await result.current(stationId, undefined, timeSec, currentPhase);

      const actions = store.getActions();

      const beamedChannel: Channel = actions[0].payload[0];

      expect(actions[0].type).toBe(addBeamedChannels.type);
      expect(isTemporaryChannel(beamedChannel)).toBe(true);

      const signalDetection: SignalDetection = actions[1].payload;

      expect(actions[1].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(currentPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the default phase associated to a temp channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {},
            beamed: {
              [PD01Channel.name]: PD01Channel
            },
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      // Time before the channel segment
      const timeSec = pdarUiChannelSegmentDescriptor.startTime - 1;
      const stationId = PD01Channel.station.name;

      await result.current(stationId, undefined, timeSec, defaultSignalDetectionPhase);

      const actions = store.getActions();

      const beamedChannel: Channel = actions[0].payload[0];

      expect(actions[0].type).toBe(addBeamedChannels.type);
      expect(isTemporaryChannel(beamedChannel)).toBe(true);

      const signalDetection: SignalDetection = actions[1].payload;

      expect(actions[1].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(defaultSignalDetectionPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the current phase associated to an existing beamed channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {},
            beamed: {
              [PD01Channel.name]: PD01Channel
            },
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        currentPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(currentPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the default phase associated to an existing beamed channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {},
            beamed: {
              [PD01Channel.name]: PD01Channel
            },
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        defaultSignalDetectionPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(defaultSignalDetectionPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the current phase associated to an existing raw channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {
              [PD01Channel.name]: PD01Channel
            },
            beamed: {},
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        currentPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(currentPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the default phase associated to an existing raw channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments,
          channels: {
            raw: {
              [PD01Channel.name]: PD01Channel
            },
            beamed: {},
            filtered: {}
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        defaultSignalDetectionPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(defaultSignalDetectionPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the current phase associated to an existing filtered channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments: filteredUiChannelSegments,
          channels: {
            raw: {},
            beamed: {},
            filtered: {
              [PD01Channel.name]: PD01Channel
            }
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            channelFilters,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        currentPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(currentPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
    it('creates a signal detection with the default phase associated to an existing filtered channel', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const currentPhase = 'P';
      const defaultSignalDetectionPhase = 'I';

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          uiChannelSegments: filteredUiChannelSegments,
          channels: {
            raw: {},
            beamed: {},
            filtered: {
              [PD01Channel.name]: PD01Channel
            }
          }
        },
        app: {
          ...appState.app,
          analyst: {
            ...appState.app.analyst,
            currentPhase,
            defaultSignalDetectionPhase
          },
          waveform: {
            ...appState.app.waveform,
            channelFilters,
            viewableInterval: {
              startTimeSecs: 0,
              endTimeSecs: Number.MAX_SAFE_INTEGER
            }
          }
        }
      });

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useCreateSignalDetection(), {
        wrapper: Wrapper
      });

      const timeSec = pdarUiChannelSegmentDescriptor.startTime;
      const stationId = PD01Channel.station.name;

      await result.current(
        stationId,
        pdarUiChannelSegmentDescriptor.channel.name,
        timeSec,
        defaultSignalDetectionPhase
      );

      const actions = store.getActions();
      const signalDetection: SignalDetection = actions[0].payload;

      expect(actions[0].type).toBe(createSignalDetection.type);
      expect(signalDetection).toBeDefined();
      expect(
        (signalDetection.signalDetectionHypotheses[0].featureMeasurements[1]
          .measurementValue as PhaseTypeMeasurementValue).value
      ).toBe(defaultSignalDetectionPhase);

      expect(mockFetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toHaveBeenCalled();
    });
  });
});
