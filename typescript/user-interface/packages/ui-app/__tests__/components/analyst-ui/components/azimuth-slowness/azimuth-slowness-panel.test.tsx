/* eslint-disable react/jsx-props-no-spreading */
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { eventList, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { fkInput, getTestFkData } from '@gms/ui-state/__tests__/__data__';
import { act, render } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import { getFkParams } from '~analyst-ui/common/utils/fk-utils';
import { AzimuthSlownessPanel } from '~analyst-ui/components/azimuth-slowness/azimuth-slowness-panel';
import { BaseDisplay } from '~common-ui/components/base-display';

import type { AzimuthSlownessPanelProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/types';
import { azSlowPanelProps } from '../../../../__data__/test-util-data';
import { glContainer } from '../workflow/gl-container';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');
// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const fkData = getTestFkData(1000);
const fkParams = getFkParams(fkData);
const buildAzimuthSlownessPanel = (props: AzimuthSlownessPanelProps): JSX.Element => {
  const store = getStore();
  const state = {
    currentMovieSpectrumIndex: 0,
    selectedSdIds: [signalDetectionsData[1].id]
  };
  const fkGlContainer = glContainer;
  fkGlContainer.width = 500;
  fkGlContainer.height = 500;
  return (
    <Provider store={store}>
      <BaseDisplay glContainer={fkGlContainer} />
      <AzimuthSlownessPanel {...props} {...state} />
    </Provider>
  );
};

describe('Azimuth Slowness Panel', () => {
  // enzyme needs a new adapter for each configuration
  beforeEach(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  // Mounting enzyme into the DOM
  // Using a testing DOM not real DOM
  // So a few things will be missing window.fetch, or alert etc...
  const wrapper: ReactWrapper = Enzyme.mount(
    buildAzimuthSlownessPanel(azSlowPanelProps as AzimuthSlownessPanelProps)
  );
  const instance: AzimuthSlownessPanel = wrapper
    .find(AzimuthSlownessPanel)
    .instance() as AzimuthSlownessPanel;
  const anyInstance: any = instance;
  anyInstance.azimuthSlownessContainer = {
    ...anyInstance.azimuthSlownessContainer,
    clientWidth: 500,
    clientHeight: 500
  };

  it('AzimuthSlowness snapshot', () => {
    const { container } = render(
      buildAzimuthSlownessPanel(azSlowPanelProps as AzimuthSlownessPanelProps)
    );
    expect(container).toMatchSnapshot();
  });

  it('componentDidUpdate openEventId changed', () => {
    expect(() =>
      instance.componentDidUpdate(azSlowPanelProps as AzimuthSlownessPanelProps)
    ).not.toThrow();
    const prevProps: Partial<AzimuthSlownessPanelProps> = {
      ...azSlowPanelProps,
      openEvent: eventList[1],
      displayedSignalDetection: signalDetectionsData[0],
      fkThumbnailColumnSizePx: 50
    };
    expect(() => instance.componentDidUpdate(prevProps as AzimuthSlownessPanelProps)).not.toThrow();
  });

  it('execute compute FK', async () => {
    await act(() => {
      expect(() => anyInstance.onNewFkParams(fkParams, fkInput.configuration)).not.toThrow();
    });
  });

  it('setArrivalTimeMovieSpectrumIndex', async () => {
    await act(() => {
      expect(() =>
        anyInstance.setArrivalTimeMovieSpectrumIndex(signalDetectionsData[1])
      ).not.toThrow();
    });
    expect(anyInstance.state.currentMovieSpectrumIndex).toMatchInlineSnapshot(`32`);
  });

  describe('Keyboard and Mouse Events', () => {
    const keyboardEvent: Partial<React.KeyboardEvent<HTMLDivElement>> = {
      key: 'KeyN',
      altKey: false,
      shiftKey: true,
      ctrlKey: true,
      preventDefault: jest.fn(),
      nativeEvent: {
        code: 'KeyN',
        altKey: false,
        shiftKey: true,
        ctrlKey: true
      } as KeyboardEvent
    };

    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      altKey: false,
      shiftKey: true,
      ctrlKey: true,
      preventDefault: jest.fn(),
      clientX: 50,
      clientY: 50
    };
    it('show Fk thumbnail menu', async () => {
      await act(() => {
        expect(() => anyInstance.showFkThumbnailMenu(mouseEvent)).not.toThrow();
      });
    });

    it('on key down', async () => {
      await act(() => {
        expect(() => anyInstance.onKeyDown(keyboardEvent)).not.toThrow();
      });
    });

    it('thumbnail divider drag', async () => {
      // Set the size of the az slow and thumbnail containers
      anyInstance.azimuthSlownessContainer = {
        ...anyInstance.azimuthSlownessContainer,
        clientWidth: 500,
        clientHeight: 500
      };
      anyInstance.fkThumbnailsContainer = {
        ...anyInstance.fkThumbnailsContainer,
        clientWidth: 100,
        clientHeight: 100
      };
      await act(() => {
        expect(() => anyInstance.onThumbnailDividerDrag(mouseEvent)).not.toThrow();
      });

      const eventInit: any = {
        clientX: 110,
        clientY: 110
      };

      // Call mouse move to move divider
      expect(instance.props.setFkThumbnailColumnSizePx).not.toHaveBeenCalled();
      eventInit.clientX = 100;
      let mouse = new MouseEvent('mousemove', eventInit);
      expect(() => document.body.dispatchEvent(mouse)).not.toThrow();
      expect(instance.props.setFkThumbnailColumnSizePx).toHaveBeenCalled();

      // Uninstall document listeners
      mouse = new MouseEvent('mouseup', eventInit);
      expect(() => document.body.dispatchEvent(mouse)).not.toThrow();
    });
  });

  it('clearSelectedUnassociatedFks', async () => {
    await act(() => {
      expect(() => anyInstance.clearSelectedUnassociatedFks()).not.toThrow();
    });
  });
});
