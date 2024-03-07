import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {
  addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers,
  getDefaultFilterDefinitionByUsageForChannelSegments,
  getStartTimeConcatEndTimeLookupKey,
  shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments
} from '../../../../../src/ts/app/api/data/signal-enhancement/get-filter-definitions-for-channel-segments';
import type { GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } from '../../../../../src/ts/app/api/data/signal-enhancement/types';
import type { AppState } from '../../../../../src/ts/app/store';
import type { FilterDefinitionsForSignalDetectionsRecord } from '../../../../../src/ts/types';
import { appState } from '../../../../test-util';

jest.mock('../../../../../src/ts/workers', () => {
  const actual = jest.requireActual('../../../../../src/ts/workers');
  return {
    ...actual,
    fetchDefaultFilterDefinitionByUsageForChannelSegments: jest.fn(async () =>
      Promise.reject(new Error('Rejected fetchDefaultFilterDefinitionByUsageForChannelSegments'))
    )
  };
});

const queryArgs: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs = {
  interval: {
    startTimeSecs: 100,
    endTimeSecs: 200
  },
  channelSegments: [
    {
      id: {
        channel: {
          effectiveAt: 100,
          name: 'my.rawChannel.name'
        },
        startTime: 200,
        endTime: 300,
        creationTime: 200
      }
    }
  ]
};

const payload: FilterDefinitionsForSignalDetectionsRecord = {
  'my.rawChannel.name': {
    ONSET: linearFilterDefinition,
    FK: linearFilterDefinition,
    DETECTION: linearFilterDefinition
  }
};

describe('Get filter definitions for channel segments', () => {
  it('have defined', () => {
    expect(addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers).toBeDefined();
    expect(shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments).toBeDefined();
    expect(getStartTimeConcatEndTimeLookupKey).toBeDefined();
    expect(getDefaultFilterDefinitionByUsageForChannelSegments).toBeDefined();
  });

  it('build a builder using addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers', () => {
    const mapKeys = [
      'endpoint-configuration/fetchDefaultFilterDefinitionByUsageForChannelSegments/pending',
      'endpoint-configuration/fetchDefaultFilterDefinitionByUsageForChannelSegments/fulfilled',
      'endpoint-configuration/fetchDefaultFilterDefinitionByUsageForChannelSegments/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      defaultFilterDefinitionByUsageForChannelSegments: {},
      queries: { getDefaultFilterDefinitionByUsageForChannelSegments: {} }
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: queryArgs },
      payload
    };
    console.log(builderMap);
    builderMap.get(mapKeys[0])(state, action);
    expect(
      state.queries.getDefaultFilterDefinitionByUsageForChannelSegments[
        getStartTimeConcatEndTimeLookupKey(queryArgs.interval)
      ][action.meta.requestId].status
    ).toMatch('pending');
    expect(state.defaultFilterDefinitionByUsageForChannelSegments).toMatchObject({});

    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getDefaultFilterDefinitionByUsageForChannelSegments[
        getStartTimeConcatEndTimeLookupKey(queryArgs.interval)
      ][action.meta.requestId].status
    ).toMatch('fulfilled');
    expect(state.defaultFilterDefinitionByUsageForChannelSegments).toMatchObject(payload);

    builderMap.get(mapKeys[2])(state, action);
    expect(
      state.queries.getDefaultFilterDefinitionByUsageForChannelSegments[
        getStartTimeConcatEndTimeLookupKey(queryArgs.interval)
      ][action.meta.requestId].status
    ).toMatch('rejected');
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments(undefined)).toBeTruthy();
    expect(
      shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments({
        ...queryArgs,
        channelSegments: null
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments({
        ...queryArgs,
        channelSegments: []
      })
    ).toBeTruthy();
    expect(shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments(null)).toBeTruthy();
    expect(shouldSkipGetDefaultFilterDefinitionByUsageForChannelSegments(queryArgs)).toBeFalsy();
  });

  it('can create lookup keys from channel segment list', () => {
    const key = queryArgs.interval.startTimeSecs
      .toString()
      .concat(queryArgs.interval.endTimeSecs.toString());
    expect(getStartTimeConcatEndTimeLookupKey(queryArgs.interval)).toEqual(key);
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    const badQueryArgs = {
      ...queryArgs,
      channelSegments: []
    };

    await store.dispatch(getDefaultFilterDefinitionByUsageForChannelSegments(badQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(getDefaultFilterDefinitionByUsageForChannelSegments(queryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'endpoint-configuration/fetchDefaultFilterDefinitionByUsageForChannelSegments/rejected'
    );
  });
});
