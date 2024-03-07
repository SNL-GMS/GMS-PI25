import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { AnalystWorkspaceTypes, getStore } from '@gms/ui-state/lib/app';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import type { SignalDetectionContextMenuContentProps } from '~analyst-ui/common/menus/signal-detection-context-menu/signal-detection-context-menu-content';
import type { SignalDetectionContextMenusCallbacks } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { SignalDetectionContextMenus } from '~analyst-ui/common/menus/signal-detection-context-menus';

jest.mock('@gms/ui-state', () => {
  const actualRedux = jest.requireActual('@gms/ui-state');
  const mockDispatchFunc = jest.fn();
  const mockDispatch = () => mockDispatchFunc;
  const mockUseAppDispatch = jest.fn(mockDispatch);
  return {
    ...actualRedux,
    useAppDispatch: mockUseAppDispatch,
    useUpdateSignalDetection: jest.fn()
  };
});
describe('Signal Detection Context Menus', () => {
  it('exists', () => {
    expect(SignalDetectionContextMenus).toBeDefined();
  });

  it('renders Signal Detection menus', async () => {
    let callbacks: SignalDetectionContextMenusCallbacks;
    const store = getStore();

    const Display = function Display() {
      return (
        <div>
          <Provider store={store}>
            <SignalDetectionContextMenus
              getOpenCallback={callback => {
                callbacks = callback;
              }}
            />
          </Provider>
        </div>
      );
    };

    const container = await waitFor(() => render(<Display />));
    expect(container.container).toMatchSnapshot();

    const mouseEvent = ({
      nativeEvent: new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 100
      }),
      preventDefault: jest.fn(),
      shiftKey: true,
      stopPropagation: jest.fn()
    } as unknown) as React.MouseEvent;

    const props: SignalDetectionContextMenuContentProps = {
      keyPrefix: 'context-menu-test',
      signalDetectionDetailsCb: jest.fn(),
      measurementMode: {
        mode: AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT,
        entries: {
          [signalDetectionsData[0].id]: true
        }
      },
      setMeasurementModeEntries: jest.fn()
    };

    await waitFor(() => {
      callbacks.signalDetectionContextMenuCb(mouseEvent, { ...props });
      callbacks.signalDetectionDetailsCb(mouseEvent, {
        signalDetection: signalDetectionsData[0]
      });
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
