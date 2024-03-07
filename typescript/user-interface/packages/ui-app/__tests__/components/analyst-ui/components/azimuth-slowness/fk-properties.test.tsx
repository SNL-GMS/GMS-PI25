/* eslint-disable react/jsx-props-no-spreading */
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { FkTypes } from '@gms/common-model';
import { asar, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { getTestFkData } from '@gms/ui-state/__tests__/__data__';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import * as util from 'util';

import { BaseDisplay } from '~common-ui/components/base-display';

import type {
  FkPropertiesProps,
  FkPropertiesState
} from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-display/fk-properties';
import { FkProperties } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-display/fk-properties';
import { newConfiguration } from '../../../../__data__/azimuth-slowness';
import { glContainer } from '../workflow/gl-container';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');

const buildFkProperties = (props: FkPropertiesProps, state: FkPropertiesState): JSX.Element => {
  const store = getStore();
  return (
    <Provider store={store}>
      <BaseDisplay glContainer={glContainer} />
      <FkProperties {...props} {...state} />
    </Provider>
  );
};

Object.defineProperty(window, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(window, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});
Object.defineProperty(global, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(global, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});

const state: FkPropertiesState = {
  presetFrequency: true,
  configurationOpen: false
};

const fk = getTestFkData(1000);
const props: FkPropertiesProps = {
  defaultStations: [asar],
  signalDetection: signalDetectionsData[0],
  signalDetectionFeaturePredictions: [],
  analystCurrentFk: {
    x: 10,
    y: 20
  },
  userInputFkFrequency: {
    maxFrequencyHz: fk.highFrequency,
    minFrequencyHz: fk.lowFrequency
  },
  fkUnitDisplayed: FkTypes.FkUnits.FSTAT,
  fkFrequencyThumbnails: [],
  currentMovieSpectrumIndex: 0,
  selectedFk: fk,

  updateFrequencyPair: jest.fn(),
  onFkConfigurationChange: jest.fn(),

  windowParams: {
    leadSeconds: 1.0,
    lengthSeconds: 5.0,
    stepSize: 1.0
  },
  fkConfiguration: newConfiguration,
  presets: {
    window: ['Lead: 1, Dur: 4', 'Lead: 1, Dur: 6', 'Lead: 1, Dur: 9', 'Lead: 1, Dur: 11'],
    frequencyBand: ['0.5 - 2 Hz', '1 - 2.5 Hz', '1.5 - 3 Hz', '2 - 4 Hz', '3 - 6 Hz']
  }
};
describe('FK thumbnails details tests', () => {
  // enzyme needs a new adapter for each configuration
  beforeEach(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  // Mounting enzyme into the DOM
  // Using a testing DOM not real DOM
  // So a few things will be missing window.fetch, or alert etc...
  const wrapper: ReactWrapper = Enzyme.mount(buildFkProperties(props, state));
  const instance: FkProperties = wrapper.find(FkProperties).instance() as FkProperties;
  const anyInstance: any = instance;
  test('properties mount', () => {
    expect(wrapper).toBeDefined();
    expect(instance).toBeDefined();
    expect(anyInstance).toBeDefined();
  });

  // eslint-disable-next-line jest/no-done-callback
  test('fk data changes on input', (done: jest.DoneCallback) => {
    expect(FkProperties).toBeDefined();
    done();
  });

  test('onClickFrequencyMenu', () => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const value = anyInstance.frequencyBandToString([1.5, 3]);
    expect(value).toBeDefined();
    expect(() => anyInstance.onClickFrequencyMenu(value)).not.toThrow();
  });

  test('onThumbnailClick', () => {
    expect(() => anyInstance.onThumbnailClick(2, 4)).not.toThrow();
  });

  test('onChangeLowFrequency', () => {
    expect(() => anyInstance.onChangeLowFrequency(2, '2.2')).not.toThrow();
  });

  test('onChangeHighFrequency', () => {
    expect(() => anyInstance.onChangeHighFrequency(2, '2.2')).not.toThrow();
  });
});
