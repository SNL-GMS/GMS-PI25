/* eslint-disable @typescript-eslint/no-unused-vars */
import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs } from '../../../../../src/ts/app';
import {
  addGetFilterDefinitionsForSignalDetectionHypothesesReducers,
  getFilterDefinitionsForSignalDetectionHypotheses,
  shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses
} from '../../../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detection-hypotheses';
import type { AppState } from '../../../../../src/ts/app/store';
import type { FilterDefinitionsForSignalDetectionsRecord } from '../../../../../src/ts/types';
import { appState } from '../../../../test-util';

jest.mock('../../../../../src/ts/workers', () => {
  const actual = jest.requireActual('../../../../../src/ts/workers');
  return {
    ...actual,
    fetchDefaultFilterDefinitionsForSignalDetectionHypotheses: jest.fn(async () =>
      Promise.reject(new Error('Rejected fetchFilterDefinitionsForSignalDetectionHypotheses'))
    )
  };
});

const queryArgs: GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs = {
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
  ],
  eventHypothesis: null
};

const payload: FilterDefinitionsForSignalDetectionsRecord = {
  a1: {
    ONSET: linearFilterDefinition,
    FK: linearFilterDefinition,
    DETECTION: linearFilterDefinition
  }
};

describe('Get filter definitions for signal detection hypotheses', () => {
  it('have defined', () => {
    expect(shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses).toBeDefined();
    expect(getFilterDefinitionsForSignalDetectionHypotheses).toBeDefined();
    expect(addGetFilterDefinitionsForSignalDetectionHypothesesReducers).toBeDefined();
  });

  it('build a builder using addGetFilterDefinitionsForSignalDetectionsReducers', () => {
    const mapKeys = [
      'signalDetection/fetchFilterDefinitionsForSignalDetectionHypotheses/pending',
      'signalDetection/fetchFilterDefinitionsForSignalDetectionHypotheses/fulfilled',
      'signalDetection/fetchFilterDefinitionsForSignalDetectionHypotheses/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addGetFilterDefinitionsForSignalDetectionHypothesesReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      filterDefinitionsForSignalDetectionHypothesesEventOpen: {},
      filterDefinitionsForSignalDetectionHypotheses: {},
      queries: { getFilterDefinitionsForSignalDetectionHypotheses: {} }
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: queryArgs },
      payload
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetectionHypotheses[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('pending');
    expect(state.filterDefinitionsForSignalDetectionHypotheses).toMatchObject({});

    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetectionHypotheses[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('fulfilled');
    expect(state.filterDefinitionsForSignalDetectionHypotheses).toMatchObject(payload);

    action.meta.arg.eventHypothesis = { id: 'id' } as any;
    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetectionHypotheses[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('fulfilled');
    expect(state.filterDefinitionsForSignalDetectionHypothesesEventOpen).toMatchObject(payload);

    builderMap.get(mapKeys[2])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetectionHypotheses[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('rejected');
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses(undefined)).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses({ ...queryArgs, stageId: null })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses({
        ...queryArgs,
        stageId: { name: null }
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses({
        ...queryArgs,
        signalDetectionsHypotheses: null
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses({
        ...queryArgs,
        signalDetectionsHypotheses: []
      })
    ).toBeTruthy();
    expect(shouldSkipGetFilterDefinitionsForSignalDetectionHypotheses(queryArgs)).toBeFalsy();
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    const badQueryArgs = {
      ...queryArgs,
      stageId: null
    };

    await store.dispatch(getFilterDefinitionsForSignalDetectionHypotheses(badQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(getFilterDefinitionsForSignalDetectionHypotheses(queryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'signalDetection/fetchFilterDefinitionsForSignalDetectionHypotheses/rejected'
    );
  });
});
