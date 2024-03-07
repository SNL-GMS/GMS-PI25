import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import cloneDeep from 'lodash/cloneDeep';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {
  addComputeFkSpectraReducers,
  computeFkSpectra,
  shouldSkipComputeFkSpectra
} from '../../../../../src/ts/app/api/data/fk/compute-fk-spectra';
import type { AppState } from '../../../../../src/ts/app/store';
import { getStore } from '../../../../../src/ts/app/store';
import { fkInput, getTestFkChannelSegment } from '../../../../__data__';
import { appState } from '../../../../test-util';

const fkChannelSegment = getTestFkChannelSegment(signalDetectionsData[0]);

jest.mock('../../../../../src/ts/workers', () => {
  const actual = jest.requireActual('../../../../../src/ts/workers');
  return {
    ...actual,
    computeFkSpectraWorker: jest.fn(async () => {
      return Promise.reject(new Error('Rejected computeFkSpectra'));
    })
  };
});

describe('Compute Fk for Signal Detection', () => {
  it('have defined', () => {
    expect(shouldSkipComputeFkSpectra).toBeDefined();
    expect(computeFkSpectra).toBeDefined();
    expect(addComputeFkSpectraReducers).toBeDefined();
  });

  it('build a builder using addComputeFkSpectraReducers', () => {
    const mapKeys = [
      'fk/computeFkSpectra/pending',
      'fk/computeFkSpectra/fulfilled',
      'fk/computeFkSpectra/rejected'
    ];
    const builderMap = new Map();
    const builder: any = {
      addCase: (k, v) => {
        builderMap.set(k.type, v);
        return builder;
      }
    };
    addComputeFkSpectraReducers(builder);
    expect(builderMap).toMatchSnapshot();

    // eslint-disable-next-line prefer-const
    let state = {
      queries: { computeFkSpectra: {} },
      fkChannelSegments: {},
      fkFrequencyThumbnails: {}
    };
    // eslint-disable-next-line prefer-const
    let action = {
      meta: { requestId: 12345, arg: fkInput },
      payload: fkChannelSegment
    };
    builderMap.get(mapKeys[0])(state, action);
    expect(state).toMatchSnapshot();
    // exercise fulfilled non-thumbnail compute
    builderMap.get(mapKeys[1])(state, action);
    // exercise fulfilled thumbnail compute
    action.meta.arg = {
      ...action.meta.arg,
      isThumbnailRequest: true
    };
    builderMap.get(mapKeys[0])(state, action);
    builderMap.get(mapKeys[1])(state, action);
    expect(state).toMatchSnapshot();
    builderMap.get(mapKeys[2])(state, action);
    expect(state).toMatchSnapshot();
  });

  it('can determine when to skip compute execution', () => {
    expect(shouldSkipComputeFkSpectra(undefined)).toBeTruthy();
    expect(shouldSkipComputeFkSpectra({ ...fkInput, signalDetectionId: undefined })).toBeTruthy();
    expect(shouldSkipComputeFkSpectra({ ...fkInput, configuration: undefined })).toBeTruthy();
    expect(shouldSkipComputeFkSpectra({ ...fkInput, fkComputeInput: undefined })).toBeTruthy();
    expect(shouldSkipComputeFkSpectra(fkInput)).toBeFalsy();
  });

  it('will not execute query if the args are invalid', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(computeFkSpectra({ ...fkInput, signalDetectionId: undefined }) as any);
    expect(store.getActions()).toHaveLength(0);
  });
  it('will not execute query if the current interval is not defined', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const store = mockStoreCreator(appState);

    await store.dispatch(computeFkSpectra(fkInput) as any);

    // results should have empty arrays since current interval is not set
    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'fk/computeFkSpectra/rejected'
    );
    expect(store.getActions()[store.getActions().length - 1].payload).toMatchInlineSnapshot(
      `[Error: Rejected computeFkSpectra]`
    );
  });

  it('can handle rejected state', async () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

    const realStore = getStore();

    const state = cloneDeep(realStore.getState());
    state.app.workflow.timeRange.startTimeSecs = 4;
    state.app.workflow.timeRange.endTimeSecs = 6;

    const store = mockStoreCreator(state);

    await store.dispatch(computeFkSpectra(fkInput) as any);

    expect(store.getActions()[store.getActions().length - 1].type).toEqual(
      'fk/computeFkSpectra/rejected'
    );
  });
});
