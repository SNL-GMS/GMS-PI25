import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from '../../../../../src/ts/app';
import {
  addGetFilterDefinitionsForSignalDetectionsReducers,
  getFilterDefinitionsForSignalDetections,
  shouldSkipGetFilterDefinitionsForSignalDetections
} from '../../../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detections';
import type { AppState } from '../../../../../src/ts/app/store';
import type { FetchFilterDefinitionsForSignalDetectionsResult } from '../../../../../src/ts/workers/waveform-worker/operations/fetch-filter-definitions-for-signal-detections';
import { appState } from '../../../../test-util';

jest.mock('../../../../../src/ts/workers', () => {
  const actual = jest.requireActual('../../../../../src/ts/workers');
  return {
    ...actual,
    fetchFilterDefinitionsForSignalDetections: jest.fn(async () =>
      Promise.reject(new Error('Rejected fetchFilterDefinitionsForSignalDetections'))
    )
  };
});

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

const payload: FetchFilterDefinitionsForSignalDetectionsResult = {
  missingSignalDetectionsHypothesesForFilterDefinitions: [],
  filterDefinitionsForSignalDetectionRecords: {
    a1: {
      ONSET: linearFilterDefinition,
      FK: linearFilterDefinition,
      DETECTION: linearFilterDefinition
    }
  }
};

describe('Get filter definitions for signal detections', () => {
  it('have defined', () => {
    expect(shouldSkipGetFilterDefinitionsForSignalDetections).toBeDefined();
    expect(getFilterDefinitionsForSignalDetections).toBeDefined();
    expect(addGetFilterDefinitionsForSignalDetectionsReducers).toBeDefined();
  });

  it('build a builder using addGetFilterDefinitionsForSignalDetectionsReducers', () => {
    const mapKeys = [
      'signalDetection/fetchFilterDefinitionsForSignalDetections/pending',
      'signalDetection/fetchFilterDefinitionsForSignalDetections/fulfilled',
      'signalDetection/fetchFilterDefinitionsForSignalDetections/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addGetFilterDefinitionsForSignalDetectionsReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      filterDefinitionsForSignalDetections: {},
      missingSignalDetectionsHypothesesForFilterDefinitions: [],
      queries: { getFilterDefinitionsForSignalDetections: {} }
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: queryArgs },
      payload
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetections[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('pending');
    expect(state.filterDefinitionsForSignalDetections).toMatchObject({});

    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetections[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('fulfilled');
    expect(state.filterDefinitionsForSignalDetections).toMatchObject(
      payload.filterDefinitionsForSignalDetectionRecords
    );

    builderMap.get(mapKeys[2])(state, action);
    expect(
      state.queries.getFilterDefinitionsForSignalDetections[queryArgs.stageId.name][
        action.meta.requestId
      ].status
    ).toMatch('rejected');
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetFilterDefinitionsForSignalDetections(undefined)).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetections({ ...queryArgs, stageId: null })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetections({ ...queryArgs, stageId: { name: null } })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetections({
        ...queryArgs,
        signalDetectionsHypotheses: null
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetFilterDefinitionsForSignalDetections({
        ...queryArgs,
        signalDetectionsHypotheses: []
      })
    ).toBeTruthy();
    expect(shouldSkipGetFilterDefinitionsForSignalDetections(queryArgs)).toBeFalsy();
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    const badQueryArgs = {
      ...queryArgs,
      stageId: null
    };

    await store.dispatch(getFilterDefinitionsForSignalDetections(badQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(getFilterDefinitionsForSignalDetections(queryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'signalDetection/fetchFilterDefinitionsForSignalDetections/rejected'
    );
  });
});
