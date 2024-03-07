import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {
  addGetChannelsByNamesReducers,
  getChannelsByNamesTimeRange,
  shouldSkipGetChannelByNames
} from '../../../../../src/ts/app/api/data/channel/get-channels-by-names-timerange';
import type { GetChannelsByNamesTimeRangeQueryArgs } from '../../../../../src/ts/app/api/data/channel/types';
import type { AppState } from '../../../../../src/ts/app/store';
import { testChannel } from '../../../../__data__/channel-data';
import { appState } from '../../../../test-util';

jest.mock('../../../../../src/ts/workers', () => {
  const actual = jest.requireActual('../../../../../src/ts/workers');
  return {
    ...actual,
    fetchChannelsByNamesTimeRange: jest.fn(async () =>
      Promise.reject(new Error('Rejected fetchChannelsByNamesTimeRange'))
    )
  };
});

const channelQueryArgs: GetChannelsByNamesTimeRangeQueryArgs = {
  channelNames: ['ASAR'],
  startTime: 0,
  endTime: 1
};

describe('Get Channel Segments for Channels', () => {
  it('have defined', () => {
    expect(shouldSkipGetChannelByNames).toBeDefined();
    expect(getChannelsByNamesTimeRange).toBeDefined();
    expect(addGetChannelsByNamesReducers).toBeDefined();
  });

  it('build a builder using addGetChannelsByNamesReducers', () => {
    const mapKeys = [
      'channel/getChannelsByNamesTimeRange/pending',
      'channel/getChannelsByNamesTimeRange/fulfilled',
      'channel/getChannelsByNamesTimeRange/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addGetChannelsByNamesReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      channels: {
        raw: {},
        derived: {}
      },
      queries: { getChannelsByNamesTimeRange: {} }
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: channelQueryArgs },
      payload: [testChannel]
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(state.queries.getChannelsByNamesTimeRange['0'][action.meta.requestId].status).toMatch(
      'pending'
    );
    expect(state.channels).toMatchObject({
      raw: {},
      derived: {}
    });

    builderMap.get(mapKeys[1])(state, action);
    expect(state.queries.getChannelsByNamesTimeRange['0'][action.meta.requestId].status).toMatch(
      'fulfilled'
    );
    expect(state.channels).toMatchObject({
      raw: {
        [testChannel.name]: testChannel
      },
      derived: {}
    });

    builderMap.get(mapKeys[2])(state, action);
    expect(state.queries.getChannelsByNamesTimeRange['0'][action.meta.requestId].status).toMatch(
      'rejected'
    );
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetChannelByNames(undefined)).toBeTruthy();
    expect(shouldSkipGetChannelByNames({ ...channelQueryArgs, channelNames: [] })).toBeTruthy();
    expect(shouldSkipGetChannelByNames({ ...channelQueryArgs, channelNames: null })).toBeTruthy();
    expect(shouldSkipGetChannelByNames({ ...channelQueryArgs, startTime: null })).toBeTruthy();
    expect(shouldSkipGetChannelByNames({ ...channelQueryArgs, endTime: null })).toBeTruthy();
    expect(shouldSkipGetChannelByNames(channelQueryArgs)).toBeFalsy();
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(
      getChannelsByNamesTimeRange({ ...channelQueryArgs, channelNames: [] }) as any
    );

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(getChannelsByNamesTimeRange(channelQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'channel/getChannelsByNamesTimeRange/rejected'
    );
  });
});
