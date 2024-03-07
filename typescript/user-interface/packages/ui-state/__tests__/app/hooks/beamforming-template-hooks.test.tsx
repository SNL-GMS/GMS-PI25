import {
  defaultStations,
  processingAnalystConfigurationData
} from '@gms/common-model/__tests__/__data__';
import { beamformingTemplatesByBeamTypeByStationByPhase } from '@gms/common-model/__tests__/__data__/beamforming-templates/beamforming-templates-data';
import { renderHook } from '@testing-library/react-hooks';
import { produce } from 'immer';
import React from 'react';
import { Provider } from 'react-redux';

import {
  useBeamformingTemplatesForEvent,
  useBeamformingTemplatesForFK,
  useBeamformingTemplatesForVisibleStationsAndFavoritePhases
} from '../../../src/ts/app/hooks/beamforming-template-hooks';
import type { AppState } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/ui-state';
import { appState } from '../../test-util';

const providerStore = getStore();

function TestReduxWrapper({ children }) {
  return <Provider store={providerStore}>{children}</Provider>;
}

jest.mock('../../../src/ts/app/hooks/react-redux-hooks', () => {
  const actualRedux = jest.requireActual('../../../src/ts/app/hooks/react-redux-hooks');
  const mockUseAppDispatch = jest
    .fn()
    .mockImplementation(() => jest.fn(async () => Promise.resolve()));
  return {
    ...actualRedux,
    useAppDispatch: mockUseAppDispatch,
    useAppSelector: jest.fn((stateFunc: (state: AppState) => any) => {
      const state: AppState = produce(appState, draft => {
        draft.app.analyst.phaseSelectorFavorites = {
          'Seismic & Hydroacoustic': [
            'P',
            'Pn',
            'Pg',
            'pP',
            'S',
            'PKP',
            'PKPdf',
            'PKPbc',
            'PKPab',
            'PcP',
            'ScP',
            'Sn',
            'Lg',
            'Rg',
            'sP'
          ]
        };
        draft.data.beamformingTemplates = beamformingTemplatesByBeamTypeByStationByPhase;
      });
      return stateFunc(state);
    })
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
        data: processingAnalystConfigurationData
      }))
    };
  }
);

jest.mock('../../../src/ts/app/hooks/station-definition-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/station-definition-hooks');
  return {
    ...actual,
    useVisibleStations: jest.fn(() => defaultStations)
  };
});

describe('test hooks', () => {
  it('is defined', () => {
    expect(useBeamformingTemplatesForVisibleStationsAndFavoritePhases).toBeDefined();
    expect(useBeamformingTemplatesForFK).toBeDefined();
  });

  it('gets an FK template', () => {
    const { result } = renderHook(useBeamformingTemplatesForFK, { wrapper: TestReduxWrapper });
    expect(result.current.data).toMatchSnapshot();
  });

  it('gets an EVENT template', () => {
    const { result } = renderHook(useBeamformingTemplatesForEvent, { wrapper: TestReduxWrapper });
    expect(result.current.data).toMatchSnapshot();
  });
});
