import { BeamformingTemplateTypes } from '@gms/common-model';
import {
  beamformingTemplatesByBeamTypeByStationByPhase,
  beamformingTemplatesByStationByPhase
} from '@gms/common-model/__tests__/__data__/beamforming-templates/beamforming-templates-data';
import type { AnyAction } from '@reduxjs/toolkit';
import { produce } from 'immer';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { AppState } from '../../../../../src/ts/app';
import {
  addBeamformingTemplatesReducers,
  getBeamformingTemplates,
  getBeamformingTemplatesRequestLookupKey,
  shouldSkipGetBeamformingTemplates
} from '../../../../../src/ts/app/api/data/signal-enhancement/get-beamforming-templates';
import type { GetBeamformingTemplatesQueryArgs } from '../../../../../src/ts/app/api/data/signal-enhancement/types';
import { appState } from '../../../../test-util';

const queryArgs: GetBeamformingTemplatesQueryArgs = {
  phases: ['P'],
  stations: [
    { name: 'ASAR', effectiveAt: 1689026400 },
    { name: 'PDAR', effectiveAt: 1689026400 }
  ],
  beamType: BeamformingTemplateTypes.BeamType.EVENT
};

const payload: BeamformingTemplateTypes.BeamformingTemplatesByStationByPhase = beamformingTemplatesByStationByPhase;

const stateWithBeams: AppState = produce(appState, draft => {
  draft.data.beamformingTemplates = beamformingTemplatesByBeamTypeByStationByPhase;
});

jest.mock('@gms/ui-workers', () => {
  const actual = jest.requireActual('@gms/ui-workers');
  return {
    ...actual,
    axiosBaseQuery: jest.fn(() => async () =>
      Promise.reject(new Error('Rejected getBeamformingTemplates'))
    )
  };
});
describe('Get beamforming templates for stations', () => {
  it('has defined functions', () => {
    expect(getBeamformingTemplatesRequestLookupKey).toBeDefined();
    expect(addBeamformingTemplatesReducers).toBeDefined();
    expect(shouldSkipGetBeamformingTemplates).toBeDefined();
    expect(getBeamformingTemplates).toBeDefined();
  });

  it('builds a builder using addBeamformingTemplatesReducers', () => {
    const mapKeys = [
      'endpoint-configuration/getBeamformingTemplates/pending',
      'endpoint-configuration/getBeamformingTemplates/fulfilled',
      'endpoint-configuration/getBeamformingTemplates/rejected'
    ];

    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addBeamformingTemplatesReducers(builder);

    // eslint-disable-next-line prefer-const
    let state = {
      beamformingTemplates: {
        FK: {},
        EVENT: {}
      },
      queries: {
        getBeamformingTemplates: {}
      }
    };

    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: queryArgs },
      payload
    };

    builderMap.get(mapKeys[0])(state, action);
    expect(
      state.queries.getBeamformingTemplates[getBeamformingTemplatesRequestLookupKey(queryArgs)][
        action.meta.requestId
      ].status
    ).toMatch('pending');
    expect(state.beamformingTemplates).toMatchObject({});

    builderMap.get(mapKeys[1])(state, action);
    expect(
      state.queries.getBeamformingTemplates[getBeamformingTemplatesRequestLookupKey(queryArgs)][
        action.meta.requestId
      ].status
    ).toMatch('fulfilled');
    expect(state.beamformingTemplates[BeamformingTemplateTypes.BeamType.EVENT]).toMatchObject(
      payload
    );

    builderMap.get(mapKeys[2])(state, action);
    expect(
      state.queries.getBeamformingTemplates[getBeamformingTemplatesRequestLookupKey(queryArgs)][
        action.meta.requestId
      ].status
    ).toMatch('rejected');

    expect('').toBeFalsy();
  });

  it('can determine when to skip query execution', () => {
    expect(shouldSkipGetBeamformingTemplates(undefined)).toBeTruthy();
    expect(
      shouldSkipGetBeamformingTemplates({
        ...queryArgs,
        phases: null
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetBeamformingTemplates({
        ...queryArgs,
        stations: []
      })
    ).toBeTruthy();
    expect(
      shouldSkipGetBeamformingTemplates({
        ...queryArgs,
        beamType: null
      })
    ).toBeTruthy();
    expect(shouldSkipGetBeamformingTemplates(null)).toBeTruthy();
    expect(shouldSkipGetBeamformingTemplates(queryArgs)).toBeFalsy();
  });

  it('can create lookup keys from the arguments', () => {
    const key = 'P_1689026400_ASAR_1689026400_PDAR_EVENT';
    expect(getBeamformingTemplatesRequestLookupKey(queryArgs)).toEqual(key);
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(stateWithBeams);

    const badQueryArgs: GetBeamformingTemplatesQueryArgs = {
      ...queryArgs,
      stations: []
    };

    await store.dispatch(getBeamformingTemplates(badQueryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()).toHaveLength(0);
  });

  it('will execute query if the args are valid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(stateWithBeams);

    await store.dispatch(getBeamformingTemplates(queryArgs) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'endpoint-configuration/getBeamformingTemplates/rejected'
    );
  });
});
