/* eslint-disable react/function-component-definition */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react/display-name */
import type { ChannelTypes, CommonTypes, FilterTypes } from '@gms/common-model';
import {
  cascadedFilter,
  defaultStations,
  filterDefinitionsData,
  linearFilter,
  namedFilter,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { getFilterName } from '@gms/common-model/lib/filter/filter-util';
import { FilterError } from '@gms/common-model/lib/filter/types';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';

import {
  addChannelSegments,
  addDefaultFilterDefinitionsByUsageForChannelSegments,
  addDesignedFilterDefinitions,
  addFilterDefinitionsForSignalDetections,
  addRawChannels,
  addSignalDetections,
  dataSlice,
  workflowActions
} from '../../../src/ts/app';
import {
  useFilterCycle,
  useFilterQueue,
  usePreferredFilterListForActivity,
  useSelectedFilter,
  useSelectedFilterList,
  useSetFilterList
} from '../../../src/ts/app/hooks/filter-hooks';
import {
  analystActions,
  analystSlice,
  waveformActions,
  waveformSlice
} from '../../../src/ts/app/state';
import { getStore } from '../../../src/ts/app/store';
import type {
  FilterDescriptor,
  FilterResult
} from '../../../src/ts/workers/api/ui-filter-processor';
import { designFilterDefinitions, filter } from '../../../src/ts/workers/api/ui-filter-processor';
import { createChannelSegmentString } from '../../../src/ts/workers/waveform-worker/util/channel-segment-util';
import { testChannel } from '../../__data__/channel-data';
import { buildUiChannelSegmentWithPopulatedClaimCheck } from '../../__data__/ui-channel-segments/ui-channel-segment-data-utils';
import { testFilterList } from '../../filter-list-data';

const mockDispatch = jest.fn();
jest.mock('../../../src/ts/app/hooks/react-redux-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/react-redux-hooks');
  return {
    ...actual,
    useAppDispatch: () => mockDispatch
  };
});

jest.mock('../../../src/ts/app/api/signal-enhancement-configuration/selectors', () => {
  return {
    selectFilterLists: jest.fn().mockReturnValue([
      {
        defaultFilterIndex: 0,
        name: 'test',
        filters: [
          {
            withinHotKeyCycle: true,
            unfiltered: true,
            namedFilter: null,
            filterDefinition: null
          },
          {
            withinHotKeyCycle: false,
            unfiltered: null,
            namedFilter: 'Test Filter should appear in snapshot',
            filterDefinition: null
          }
        ],
        description: 'foo'
      }
    ])
  };
});

jest.mock(
  '../../../src/ts/app/api/signal-enhancement-configuration/signal-enhancement-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/signal-enhancement-configuration/signal-enhancement-api-slice'
    );
    return {
      ...actual,
      useGetFilterListsDefinitionQuery: jest.fn().mockReturnValue({
        data: {
          preferredFilterListByActivity: [
            { name: 'test', workflowDefinitionId: { name: 'test-open-interval' } }
          ],
          filterLists: [
            {
              defaultFilterIndex: 0,
              name: 'test',
              filters: [
                {
                  withinHotKeyCycle: true,
                  unfiltered: true,
                  namedFilter: null,
                  filterDefinition: null
                },
                {
                  withinHotKeyCycle: false,
                  unfiltered: null,
                  namedFilter: 'Test Filter should appear in snapshot',
                  filterDefinition: null
                },
                {
                  withinHotKeyCycle: true,
                  unfiltered: null,
                  namedFilter: 'Test Filter should appear in snapshot',
                  filterDefinition: null
                }
              ],
              description: 'foo'
            }
          ]
        }
      })
    };
  }
);

jest.mock('../../../src/ts/app/hooks/station-definition-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/station-definition-hooks');
  return {
    ...actual,
    useAllStations: jest.fn(() => defaultStations),
    useVisibleStations: () => defaultStations
  };
});

jest.mock(
  '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
    );
    return {
      ...actual,
      useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
        data: {
          gmsFilters: {
            defaultTaper: 0,
            defaultRemoveGroupDelay: 0,
            defaultGroupDelaySecs: 0,
            defaultSampleRateToleranceHz: 0.1
          }
        }
      }))
    };
  }
);

jest.mock('../../../src/ts/workers/api/ui-filter-processor');

jest.mock('../../../src/ts/app/hooks/operational-time-period-configuration-hooks', () => {
  return {
    useEffectiveTime: jest.fn(() => 0),
    useOperationalTimePeriodConfiguration: jest.fn(() => ({
      timeRange: {
        startTimeSecs: 0,
        endTimeSecs: 1
      }
    }))
  };
});

jest.mock('../../../src/ts/app/state/analyst/selectors', () => {
  const actual = jest.requireActual('../../../src/ts/app/state/analyst/selectors');

  return {
    ...actual,
    selectSelectedFilterList: jest.fn(() => testFilterList)
  };
});

const mockedFilter = jest.mocked(filter);
const mockedDesignFilterDefinitions = jest.mocked(designFilterDefinitions);
const store = getStore();

describe('Filter Hooks', () => {
  describe('useSetFilterList', () => {
    beforeEach(() => {
      store.dispatch(dataSlice.actions.clearAll());
      mockDispatch.mockClear();
    });
    it('gives us a set filter list function that can handle an object', () => {
      const TestComponent: React.FC = () => {
        const setFilterList = useSetFilterList();
        expect(typeof setFilterList).toBe('function');
        setFilterList(testFilterList);
        return null;
      };
      renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );

      expect(mockDispatch.mock.calls[0][0]).toMatchObject(
        analystActions.setSelectedFilterList(testFilterList.name)
      );
    });
    it('gives us a set filter list function that can handle a string', () => {
      const TestComponent: React.FC = () => {
        const setFilterList = useSetFilterList();
        expect(typeof setFilterList).toBe('function');
        setFilterList(testFilterList.name);
        return null;
      };
      renderer.create(
        <Provider store={getStore()}>
          <TestComponent />
        </Provider>
      );

      expect(mockDispatch.mock.calls[0][0]).toMatchObject(
        analystActions.setSelectedFilterList(testFilterList.name)
      );
    });
    it('sets the default filter for all stations when the filter list changes', () => {
      const TestComponent: React.FC = () => {
        const setFilterList = useSetFilterList();
        expect(typeof setFilterList).toBe('function');
        setFilterList(testFilterList.name);
        return null;
      };
      renderer.create(
        <Provider store={getStore()}>
          <TestComponent />
        </Provider>
      );
      // Call the action creator passed into mock dispatch, in order to dispatch the testable value
      // eslint-disable-next-line @typescript-eslint/unbound-method
      mockDispatch.mock.calls[2][0](mockDispatch, getStore().getState);
      expect(mockDispatch.mock.calls[3][0].payload).toMatchObject(
        defaultStations.reduce<Record<string, FilterTypes.Filter>>((channelFilters, station) => {
          return {
            ...channelFilters,
            [station.name]: testFilterList.filters[testFilterList.defaultFilterIndex]
          };
        }, {})
      );
    });
  });

  describe('usePreferredFilterListForActivity', () => {
    beforeEach(() => {
      store.dispatch(dataSlice.actions.clearAll());
    });
    const TestComponent: React.FC = () => {
      const preferredFilterList = usePreferredFilterListForActivity();
      // eslint-disable-next-line react/jsx-no-useless-fragment
      return <>{preferredFilterList}</>;
    };
    it('calls the query and gets a result', () => {
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('returns the preferred list with the correct data', () => {
      store.dispatch(workflowActions.setOpenActivityNames(['test-open-interval']));
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });

  describe('useSelectedFilterList', () => {
    beforeEach(() => {
      store.dispatch(dataSlice.actions.clearAll());
    });
    const TestComponent: React.FC = () => {
      const selectedFilterList = useSelectedFilterList();
      return <>{JSON.stringify(selectedFilterList)}</>;
    };

    it('returns null with initial state', () => {
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('returns filter list from state', () => {
      store.dispatch(analystActions.setSelectedFilterList('test'));
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });
  describe('useFilterCycle', () => {
    beforeEach(() => {
      store.dispatch(dataSlice.actions.clearAll());
    });

    const { result } = renderHook(() => useFilterCycle(), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        // eslint-disable-next-line react/destructuring-assignment
        <Provider store={store}>{props.children}</Provider>
      )
    });
    it('creates two functions', () => {
      expect(result.current?.selectNextFilter).toBeDefined();
      expect(result.current?.selectPreviousFilter).toBeDefined();
    });
    describe('selectNextFilter', () => {
      beforeEach(() => {
        store.dispatch(dataSlice.actions.clearAll());
      });
      result.current.selectNextFilter();
      it('does not dispatch if no selectedFilterIndex is set', () => {
        mockDispatch.mockClear();
        expect(mockDispatch).not.toHaveBeenCalled();
      });
      it('does not dispatch if no hotkeyCycle is set', () => {
        // set this to make sure it hits the hotkey cycle condition
        mockDispatch.mockClear();
        store.dispatch(analystActions.setSelectedFilterIndex(0));
        renderHook(() => useFilterCycle(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            // eslint-disable-next-line react/destructuring-assignment
            <Provider store={store}>{props.children}</Provider>
          )
        });
        expect(mockDispatch).not.toHaveBeenCalled();
      });
      store.dispatch(analystActions.setSelectedFilterIndex(0));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: false,
          1: true,
          2: true
        })
      );
      let renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });
      it('calls dispatch if hotkeyCycle and selectedFilterIndex are set', () => {
        store.dispatch(analystActions.setSelectedFilterIndex(0));
        store.dispatch(
          analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
            0: false,
            1: true,
            2: true
          })
        );
        renderedHook = renderHook(() => useFilterCycle(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            // eslint-disable-next-line react/destructuring-assignment
            <Provider store={store}>{props.children}</Provider>
          )
        });
        renderedHook.result.current.selectNextFilter();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 1,
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
    describe('selectPreviousFilter', () => {
      beforeEach(() => {
        store.dispatch(dataSlice.actions.clearAll());
      });
      store.dispatch(analystActions.setSelectedFilterIndex(2));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: true,
          1: false,
          2: true
        })
      );
      mockDispatch.mockClear();
      const renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });

      it('calls dispatch if hotkeyCycle and selectedFilterIndex are set', () => {
        renderedHook.result.current.selectPreviousFilter();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 0,
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
    describe('selectUnfiltered', () => {
      beforeEach(() => {
        store.dispatch(dataSlice.actions.clearAll());
      });
      store.dispatch(analystActions.setSelectedFilterIndex(2));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: true,
          1: false,
          2: true
        })
      );
      mockDispatch.mockClear();
      const renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });

      it('calls dispatch to select the unfiltered option if hotkeyCycle and selectedFilterIndex are set', () => {
        renderedHook.result.current.selectUnfiltered();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 0, // the index of the unfiltered option
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
  });

  describe('useFilterQueue', () => {
    describe('non-named filters', () => {
      let uiChannelSegment;

      beforeAll(async () => {
        uiChannelSegment = await buildUiChannelSegmentWithPopulatedClaimCheck();
      });

      beforeEach(() => {
        const viewableInterval: CommonTypes.TimeRange = {
          startTimeSecs: 1636503404,
          endTimeSecs: 1636506404
        };
        store.dispatch(waveformSlice.actions.setViewableInterval(viewableInterval));
        store.dispatch(dataSlice.actions.clearAll());
        mockedDesignFilterDefinitions.mockImplementation(async filterDefinitions => {
          const results: PromiseFulfilledResult<
            FilterTypes.FilterDefinition
          >[] = filterDefinitions.map(fd => ({
            status: 'fulfilled',
            value: fd
          }));

          return Promise.resolve(results);
        });
        mockedFilter.mockImplementation(
          async (descriptor: FilterDescriptor): Promise<PromiseSettledResult<FilterResult>[]> => {
            const uiChannelSegments = descriptor.filterSegments.map(seg => {
              return {
                ...seg.uiChannelSegment,
                channelSegment: {
                  ...seg.uiChannelSegment.channelSegment,
                  wfFilterId: linearFilter.filterDefinition.name
                }
              };
            });

            const results: PromiseFulfilledResult<FilterResult>[] = uiChannelSegments.map(uis => ({
              status: 'fulfilled',
              value: { uiChannelSegment: uis, channel: undefined }
            }));

            return Promise.resolve(results);
          }
        );
      });

      it('sets a filter error if no channel is found', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('waveform/setFilterForChannel');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject({
          channelOrSdName: channelName,
          filter: {
            ...channelFilters[channelName],
            _uiIsError: true
          }
        });
      });

      it.skip('designs the selected filter if needed', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('data/addDesignedFilterDefinitions');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject([
          linearFilter.filterDefinition
        ]);
      });

      it('does not redesign a filter thats already cached', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: {
            withinHotKeyCycle: false,
            unfiltered: false,
            namedFilter: null,
            filterDefinition: filterDefinitionsData[0]
          }
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(addDesignedFilterDefinitions(filterDefinitionsData));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();
        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

        expect(mockDispatch.mock.calls[0][0].type).not.toBe('data/addDesignedFilterDefinitions');
      });

      it('sets a filter error if designing the filter fails', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockedDesignFilterDefinitions.mockImplementation(() => {
          throw new FilterError(
            'Boom 💣!',
            getFilterName(channelFilters[channelName]),
            channelName
          );
        });

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('waveform/setFilterForChannel');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject({
          channelOrSdName: channelName,
          filter: {
            ...channelFilters[channelName],
            _uiIsError: true
          }
        });
      });

      it('processes the uiChannelSegment record with the selected filter', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'data/addFilteredChannelSegments' })
        );
      });

      it('sets a filter error if the filter operation fails', async () => {
        mockedFilter.mockImplementation(() => {
          throw new Error('boom');
        });

        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: {
            ...linearFilter,
            filterDefinition: {
              ...linearFilter.filterDefinition,
              filterDescription: {
                ...linearFilter.filterDefinition.filterDescription,
                filterType: 'FAIL'
              }
            }
          }
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters as any));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'waveform/setFilterForChannel',
            payload: {
              channelOrSdName: channelName,
              filter: {
                ...channelFilters[channelName],
                _uiIsError: true
              }
            }
          })
        );
      });

      it('deals with missing channel definition gracefully', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('waveform/setFilterForChannel');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject({
          channelOrSdName: channelName,
          filter: {
            ...channelFilters[channelName],
            _uiIsError: true
          }
        });
      });

      it('deals with missing channel segments gracefully', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: linearFilter
        };

        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).not.toHaveBeenCalled());
      });
    });

    describe('named filters', () => {
      let uiChannelSegment;

      beforeAll(async () => {
        uiChannelSegment = await buildUiChannelSegmentWithPopulatedClaimCheck();
      });

      beforeEach(() => {
        store.dispatch(dataSlice.actions.clearAll());
        const viewableInterval: CommonTypes.TimeRange = {
          startTimeSecs: 1636503404,
          endTimeSecs: 1636506404
        };
        store.dispatch(waveformSlice.actions.setViewableInterval(viewableInterval));
        mockedDesignFilterDefinitions.mockImplementation(async filterDefinitions => {
          const results: PromiseFulfilledResult<
            FilterTypes.FilterDefinition
          >[] = filterDefinitions.map(fd => ({
            status: 'fulfilled',
            value: fd
          }));

          return Promise.resolve(results);
        });
        mockedFilter.mockImplementation(
          async (descriptor: FilterDescriptor): Promise<PromiseSettledResult<FilterResult>[]> => {
            const uiChannelSegments = descriptor.filterSegments.map(seg => {
              return {
                ...seg.uiChannelSegment,
                channelSegment: {
                  ...seg.uiChannelSegment.channelSegment,
                  wfFilterId: linearFilter.filterDefinition.name
                }
              };
            });

            const results: PromiseFulfilledResult<FilterResult>[] = uiChannelSegments.map(uis => ({
              status: 'fulfilled',
              value: { uiChannelSegment: uis, channel: undefined }
            }));

            return Promise.resolve(results);
          }
        );
      });

      it.skip('designs the selected filter if needed', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: linearFilter.filterDefinition,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();
        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('data/addDesignedFilterDefinitions');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject([
          linearFilter.filterDefinition
        ]);
      });

      it('processes the uiChannelSegment record with the selected filter', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: linearFilter.filterDefinition,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'data/addFilteredChannelSegments' })
        );
      });

      it('falls back to the default filter if the filter operation fails', async () => {
        mockedFilter.mockImplementation(() => {
          throw new Error('boom');
        });

        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: {
                  ...linearFilter.filterDefinition,
                  filterDescription: {
                    ...linearFilter.filterDefinition.filterDescription,
                    filterType: 'FAIL'
                  }
                } as any,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters as any));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'waveform/setFilterForChannel' })
        );
      });

      it('deals with missing channel definition gracefully', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: linearFilter.filterDefinition,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });
        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(mockDispatch.mock.calls[0][0].type).toBe('waveform/setFilterForChannel');
        expect(mockDispatch.mock.calls[0][0].payload).toMatchObject({
          channelOrSdName: channelName,
          filter: {
            ...channelFilters[channelName],
            _uiIsError: true
          }
        });
      });

      it('deals with missing channel segments gracefully', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: linearFilter.filterDefinition,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).not.toHaveBeenCalled());
      });

      it('filters selected raw channels with the filter definition from the selected signal detection', async () => {
        const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
        const relatedChannel: ChannelTypes.Channel = {
          ...testChannel,
          name: channelName,
          canonicalName: channelName,
          station: {
            ...testChannel.station,
            name: channelName
          }
        };

        const channelFilters = {
          [relatedChannel.name]: namedFilter
        };

        // Adding different defaults to confirm they are not used
        store.dispatch(
          addDefaultFilterDefinitionsByUsageForChannelSegments([
            {
              channelSegmentDescriptorId: createChannelSegmentString(
                uiChannelSegment.channelSegmentDescriptor
              ),
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: cascadedFilter.filterDefinition,
                FK: cascadedFilter.filterDefinition,
                ONSET: cascadedFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(
          addFilterDefinitionsForSignalDetections([
            {
              signalDetectionHypothesisId:
                signalDetectionsData[0].signalDetectionHypotheses[0].id.id,
              filterDefinitionByFilterDefinitionUsage: {
                DETECTION: linearFilter.filterDefinition,
                FK: linearFilter.filterDefinition,
                ONSET: linearFilter.filterDefinition
              }
            }
          ])
        );

        store.dispatch(addSignalDetections(signalDetectionsData));

        store.dispatch(
          addChannelSegments([
            {
              name: channelName,
              channelSegments: [uiChannelSegment]
            }
          ])
        );

        store.dispatch(analystSlice.actions.setSelectedSdIds([signalDetectionsData[0].id]));
        store.dispatch(addRawChannels([relatedChannel]));
        store.dispatch(waveformActions.setChannelFilters(channelFilters));

        mockDispatch.mockClear();

        const { waitFor } = renderHook(() => useFilterQueue(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        });

        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'data/addFilteredChannels'
          })
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'data/addFilteredChannelSegments'
          })
        );
        expect(
          mockDispatch.mock.calls[1][0].payload[0].channelSegments[0].channelSegment.wfFilterId
        ).toBe('Sample Filter Definition Name');
      });
    });
  });

  describe('useSelectedFilter', () => {
    beforeEach(() => {
      mockDispatch.mockClear();
      store.dispatch(dataSlice.actions.clearAll());
      store.dispatch(analystActions.setSelectedFilterIndex(0));
    });
    it('sets the filter and filter index', async () => {
      const { waitFor, result } = renderHook(() => useSelectedFilter(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      const { setSelectedFilter } = result.current;

      expect(typeof setSelectedFilter).toBe('function');

      setSelectedFilter(testFilterList.filters[1]);

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

      expect(mockDispatch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          payload: expect.objectContaining({ ASAR: testFilterList.filters[1] })
        })
      );
      expect(mockDispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({ payload: 1 }));
    });

    it('wont fail if the filter is undefined', async () => {
      const { waitFor, result } = renderHook(() => useSelectedFilter(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      const { setSelectedFilter } = result.current;

      expect(typeof setSelectedFilter).toBe('function');

      setSelectedFilter(undefined);

      await waitFor(() => expect(mockDispatch).not.toHaveBeenCalled());
    });
  });
});
