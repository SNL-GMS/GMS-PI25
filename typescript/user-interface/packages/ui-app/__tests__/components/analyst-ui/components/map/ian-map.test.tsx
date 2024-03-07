import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { render } from '@testing-library/react';
import * as React from 'react';
import { Provider } from 'react-redux';

import { IANMap } from '../../../../../src/ts/components/analyst-ui/components/map';
import { IANMap as IANMapComponent } from '../../../../../src/ts/components/analyst-ui/components/map/ian-map-component';

jest.mock('../../../../../src/ts/components/analyst-ui/components/map/ian-map-panel', () => {
  function MockMap() {
    return (
      <div className="cesium-viewer-toolbar">
        <span className="cesium-sceneModePicker-wrapper cesium-toolbar-button" />
      </div>
    );
  }
  return { IANMapPanel: () => MockMap() };
});

const getAllStationsQueryFn = jest.fn(() => {
  return {};
});

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,

    useGetAllStationsQuery: jest.fn(() => getAllStationsQueryFn()),
    useGetCurrentStationsQuery: jest.fn(() => ({
      data: []
    }))
  };
});

jest.mock('', () => {
  const actual = jest.requireActual('~analyst-ui/components/waveform/waveform-hooks');
  return {
    ...actual,
    useVisibleSignalDetections: jest.fn(() => ({
      data: signalDetectionsData
    }))
  };
});

describe('ui map', () => {
  test('is defined', () => {
    expect(IANMap).toBeDefined();
  });

  test('can mount map', () => {
    const renderIanMap = render(
      <Provider store={getStore()}>
        <IANMap />
      </Provider>
    );
    expect(renderIanMap.container).toMatchSnapshot();

    const renderIanMapComponent = render(
      <Provider store={getStore()}>
        <IANMapComponent />
      </Provider>
    );
    expect(renderIanMapComponent.container).toMatchSnapshot();
  });

  test('calls station groups', () => {
    const { container } = render(
      <Provider store={getStore()}>
        <IANMap />
      </Provider>
    );
    expect(container).toBeDefined();
    expect(getAllStationsQueryFn).toHaveBeenCalled();
  });
});
