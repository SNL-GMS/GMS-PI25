import { getByText, render, waitFor } from '@testing-library/react';
import React from 'react';

import type {
  CreateSignalDetectionContextMenuCallbacks,
  CreateSignalDetectionContextMenuProps
} from '~analyst-ui/common/menus/create-signal-detection-context-menu';
import {
  CreateSignalDetectionMenu,
  CreateSignalDetectionMenuContent
} from '~analyst-ui/common/menus/create-signal-detection-context-menu';

jest.mock('@gms/ui-state', () => {
  const actualRedux = jest.requireActual('@gms/ui-state');
  const mockDispatchFunc = jest.fn();
  const mockDispatch = () => mockDispatchFunc;
  const mockUseAppDispatch = jest.fn(mockDispatch);
  return {
    ...actualRedux,
    useAppDispatch: mockUseAppDispatch,
    useUpdateSignalDetection: jest.fn(),
    useGetProcessingAnalystConfigurationQuery: jest.fn(),
    useKeyboardShortcutConfigurations: jest.fn()
  };
});

const props: CreateSignalDetectionContextMenuProps = {
  channelId: 'ABC',
  createSignalDetection: jest.fn(),
  timeSecs: 1000,
  currentPhase: 'PP',
  defaultSignalDetectionPhase: 'P'
};

describe('create-signal-detection-menu', () => {
  test('exists and renders', async () => {
    expect(CreateSignalDetectionMenu).toBeDefined();

    let theCallback: CreateSignalDetectionContextMenuCallbacks;
    const Display = function Display() {
      return (
        <div>
          <CreateSignalDetectionMenu
            getOpenCallback={cb => {
              theCallback = cb;
            }}
          />
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
      stopPropagation: jest.fn()
    } as unknown) as React.MouseEvent;

    await waitFor(() => {
      theCallback.createSignalDetectionCb(mouseEvent, props);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
  describe('CreateSignalDetectionMenuContent', () => {
    let rendered;
    beforeEach(() => {
      rendered =
        // eslint-disable-next-line react/jsx-props-no-spreading
        render(<CreateSignalDetectionMenuContent {...props} />);
    });
    test('matches snapshot', () => {
      expect(rendered.container).toMatchSnapshot();
    });
    test('creates a signal detection associated to a waveform with current phase', () => {
      const menuItem = getByText(
        rendered.container,
        'Create signal detection associated to a waveform with current phase'
      );
      menuItem.click();
      expect(props.createSignalDetection).toHaveBeenCalledWith('ABC', undefined, 1000, 'PP');
    });
    test('creates a signal detection associated to a waveform with default phase', () => {
      const menuItem = getByText(
        rendered.container,
        'Create signal detection associated to a waveform with default phase'
      );
      menuItem.click();
      expect(props.createSignalDetection).toHaveBeenCalledWith('ABC', undefined, 1000, 'P');
    });
    test('creates a signal detection not associated to a waveform with current phase', () => {
      const menuItem = getByText(
        rendered.container,
        'Create signal detection not associated to a waveform with current phase'
      );
      menuItem.click();
      expect(props.createSignalDetection).toHaveBeenCalledWith('ABC', undefined, 1000, 'PP', true);
    });
    test('creates a signal detection not associated to a waveform with default phase', () => {
      const menuItem = getByText(
        rendered.container,
        'Create signal detection not associated to a waveform with default phase'
      );
      menuItem.click();
      expect(props.createSignalDetection).toHaveBeenCalledWith('ABC', undefined, 1000, 'P', true);
    });
  });
});
