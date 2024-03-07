import {
  PD01Channel,
  processingMaskDefinitionsByPhaseByChannel1
} from '@gms/common-model/__tests__/__data__';
import { ProcessingOperation } from '@gms/common-model/lib/channel-segment/types';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { AppState } from '../../../../../src/ts/app';
import {
  addGetProcessingMaskDefinitionsReducers,
  getProcessingMaskDefinitionRequestLookupKey,
  getProcessingMaskDefinitions,
  shouldSkipGetProcessingMaskDefinitions
} from '../../../../../src/ts/app/api/data/signal-enhancement/get-processing-mask-definitions';
import type {
  GetProcessingMaskDefinitionsQueryArgs,
  GetProcessingMaskDefinitionsQueryResult
} from '../../../../../src/ts/app/api/data/signal-enhancement/types';
import { appState } from '../../../../test-util';
import { workflowStationGroup } from '../../workflow/sample-data';

const queryArgs: GetProcessingMaskDefinitionsQueryArgs = {
  stationGroup: workflowStationGroup,
  channels: [PD01Channel],
  processingOperations: [ProcessingOperation.EVENT_BEAM],
  phaseTypes: ['P']
};

const payload: GetProcessingMaskDefinitionsQueryResult = {
  processingMaskDefinitionByPhaseByChannel: [processingMaskDefinitionsByPhaseByChannel1]
};

jest.mock('@gms/ui-workers', () => {
  const actual = jest.requireActual('@gms/ui-workers');
  return {
    ...actual,
    axiosBaseQuery: jest.fn(() => async () =>
      Promise.reject(new Error('Rejected getProcessingMaskDefinitions'))
    )
  };
});

describe('Get processing mask definitions for channels', () => {
  it('have defined', () => {
    expect(addGetProcessingMaskDefinitionsReducers).toBeDefined();
    expect(shouldSkipGetProcessingMaskDefinitions).toBeDefined();
    expect(getProcessingMaskDefinitionRequestLookupKey).toBeDefined();
    expect(getProcessingMaskDefinitions).toBeDefined();
  });

  it('build a builder using addGetProcessingMaskDefinitionsReducers', () => {
    const mapKeys = [
      'endpoint-configuration/getProcessingMaskDefinitions/pending',
      'endpoint-configuration/getProcessingMaskDefinitions/fulfilled',
      'endpoint-configuration/getProcessingMaskDefinitions/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addGetProcessingMaskDefinitionsReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      processingMaskDefinitions: {},
      queries: { getProcessingMaskDefinitions: {} }
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: queryArgs },
      payload
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(
      state.queries.getProcessingMaskDefinitions[
        getProcessingMaskDefinitionRequestLookupKey(queryArgs)
      ][action.meta.requestId].status
    ).toMatch('pending');
    expect(state.processingMaskDefinitions).toMatchObject({});

    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getProcessingMaskDefinitions[
        getProcessingMaskDefinitionRequestLookupKey(queryArgs)
      ][action.meta.requestId].status
    ).toMatch('fulfilled');
    expect(state.processingMaskDefinitions).toMatchObject({
      'PDAR.PD01.SHZ': payload.processingMaskDefinitionByPhaseByChannel
    });

    builderMap.get(mapKeys[2])(state, action);
    expect(
      state.queries.getProcessingMaskDefinitions[
        getProcessingMaskDefinitionRequestLookupKey(queryArgs)
      ][action.meta.requestId].status
    ).toMatch('rejected');
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetProcessingMaskDefinitions(undefined)).toBeTruthy();
    expect(
      shouldSkipGetProcessingMaskDefinitions({
        ...queryArgs,
        stationGroup: null
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetProcessingMaskDefinitions({
        ...queryArgs,
        channels: []
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetProcessingMaskDefinitions({
        ...queryArgs,
        phaseTypes: []
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetProcessingMaskDefinitions({
        ...queryArgs,
        processingOperations: []
      })
    ).toBeTruthy();
    expect(shouldSkipGetProcessingMaskDefinitions(null)).toBeTruthy();
    expect(shouldSkipGetProcessingMaskDefinitions(queryArgs)).toBeFalsy();
  });

  it('can create lookup keys from the arguments', () => {
    const key = 'station-groupPPDAR.PD01.SHZ';
    expect(getProcessingMaskDefinitionRequestLookupKey(queryArgs)).toEqual(key);
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    const badQueryArgs: GetProcessingMaskDefinitionsQueryArgs = {
      ...queryArgs,
      channels: []
    };

    await store.dispatch(getProcessingMaskDefinitions(badQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(getProcessingMaskDefinitions(queryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'endpoint-configuration/getProcessingMaskDefinitions/rejected'
    );
  });
});
