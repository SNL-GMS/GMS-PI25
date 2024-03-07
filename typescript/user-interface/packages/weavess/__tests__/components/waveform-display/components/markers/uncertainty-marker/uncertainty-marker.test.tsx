/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable react/jsx-props-no-spreading */
import { HotkeyListener } from '@gms/ui-util';
import { render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';

import type { UncertaintyMarkerProps } from '../../../../../../src/ts/components/waveform-display/components/markers/uncertainty-marker/types';
import { UncertaintyMarker } from '../../../../../../src/ts/components/waveform-display/components/markers/uncertainty-marker/uncertainty-marker';
import { initialConfiguration } from '../../../../../__data__/test-util-data';

const timeRange = {
  startTimeSecs: 1000,
  endTimeSecs: 2000
};
const mockSetIsEditingTimeUncertainty = jest.fn().mockReturnValue(true);
const props: UncertaintyMarkerProps = {
  color: '#ff0000',
  pickMarkerTimeSecs: 1920,
  pickMarkerPosition: 92,
  isLeftUncertaintyBar: true,
  uncertaintySecs: 1.5,
  startTimeSecs: timeRange.startTimeSecs,
  endTimeSecs: timeRange.endTimeSecs,
  initialConfiguration,
  setIsEditingTimeUncertainty: mockSetIsEditingTimeUncertainty,
  getTimeSecsForClientX: jest.fn().mockReturnValue(1920 + 20),
  setUncertaintySecs: jest.fn()
};

const wrapper = Enzyme.mount(<UncertaintyMarker {...props} />);
const instance: UncertaintyMarker = wrapper.find(UncertaintyMarker).instance() as UncertaintyMarker;

const keyDownEvent: KeyboardEvent = new KeyboardEvent('keydown', {
  key: 'e',
  code: 'KeyE',
  altKey: true,
  ctrlKey: true
});

const buildHTMLDivMouseEvent = (clientX: number) => {
  const keyboardEvent = {
    shiftKey: false,
    clientX,
    clientY: 50,
    altKey: true,
    stopPropagation: jest.fn(() => true),
    preventDefault: jest.fn()
  };
  return keyboardEvent;
};
describe('Weavess Vertical Marker', () => {
  let listener;
  beforeEach(() => {
    listener = HotkeyListener.subscribeToGlobalHotkeyListener();
    document.body.dispatchEvent(keyDownEvent);
  });
  afterEach(() => {
    HotkeyListener.unsubscribeFromGlobalHotkeyListener(listener);
    listener = undefined;
  });
  it('Weavess Vertical Marker to be defined', () => {
    expect(UncertaintyMarker).toBeDefined();
  });

  it('shallow renders as left marker', () => {
    const { container } = render(<UncertaintyMarker {...props} />);
    expect(container).toMatchSnapshot();
  });

  it('shallow renders as right marker', () => {
    const rightProps = {
      ...props,
      isLeftUncertaintyBar: false
    };
    const { container } = render(<UncertaintyMarker {...rightProps} />);
    expect(container).toMatchSnapshot();
  });

  it('componentDidCatch', () => {
    const spy = jest.spyOn(instance, 'componentDidCatch');
    instance.componentDidCatch(new Error('error'), { componentStack: undefined });
    expect(spy).toHaveBeenCalled();
  });

  it('isEditingUncertainty', () => {
    expect((instance as any).isEditingUncertainty()).toBeTruthy();
  });

  it('can drag uncertainty bars', () => {
    const mouseEvent = buildHTMLDivMouseEvent(50);
    let mouse = new MouseEvent('mousedown', mouseEvent);
    expect(() => (instance as any).onMouseDown(mouse)).not.toThrow();
    mouseEvent.clientX = 60;
    mouse = new MouseEvent('mousemove', mouseEvent);
    expect(document.body.dispatchEvent(mouse)).toBeTruthy();
    mouse = new MouseEvent('mouseup', mouseEvent);
    expect(document.body.dispatchEvent(mouse)).toBeTruthy();
  });

  it('set uncertainty time', () => {
    const updatedProps = {
      ...(instance as any).props,
      isLeftUncertaintyBar: false
    };
    (instance as any).props = updatedProps;
    expect(() =>
      (instance as any).setUncertaintyTime(props.pickMarkerTimeSecs - 200, true)
    ).not.toThrow();
  });

  it('prevent defaults', () => {
    const mouseEvent = buildHTMLDivMouseEvent(50);
    expect(() => (instance as any).preventDefaults(mouseEvent)).not.toThrow();
  });

  it('call on context Menu', () => {
    expect(document.body.dispatchEvent(keyDownEvent)).toBeTruthy();
    const mouseEvent = buildHTMLDivMouseEvent(50);
    expect(() => (instance as any).onContextMenu(mouseEvent)).not.toThrow();
  });
});
