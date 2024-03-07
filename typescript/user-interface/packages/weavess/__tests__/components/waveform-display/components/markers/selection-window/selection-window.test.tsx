/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { WeavessTypes } from '@gms/weavess-core';
import { render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';

import { SelectionWindow } from '../../../../../../src/ts/components/waveform-display/components/markers/selection-window/selection-window';
import type { SelectionWindowProps } from '../../../../../../src/ts/components/waveform-display/components/markers/selection-window/types';

const leadBorderRef = {
  containerRef: {
    style: { left: 1, right: 2 }
  },
  getMinConstraintPercentage: jest.fn().mockReturnValue(1),
  getMaxConstraintPercentage: jest.fn().mockReturnValue(2)
};
const endBorderRef = {
  containerRef: {
    style: { left: 3, right: 4 }
  },
  getMinConstraintPercentage: jest.fn().mockReturnValue(1),
  getMaxConstraintPercentage: jest.fn().mockReturnValue(2)
};
const testRect = {
  width: 1000,
  left: 0
};
const props: SelectionWindowProps = {
  selectionWindow: {
    id: 'selection-window',
    startMarker: {
      id: 'my-start-marker',
      color: '#ff0000',
      lineStyle: WeavessTypes.LineStyle.DASHED,
      timeSecs: 200,
      minTimeSecsConstraint: 15,
      maxTimeSecsConstraint: 600
    },
    endMarker: {
      id: 'my-end-marker',
      color: '#ff0000',
      lineStyle: WeavessTypes.LineStyle.DASHED,
      timeSecs: 400,
      minTimeSecsConstraint: 15,
      maxTimeSecsConstraint: 600
    },
    color: '#ff0000',
    isMoveable: true
  },
  labelWidthPx: 5,
  timeRange: jest.fn(() => ({ startTimeSecs: 0, endTimeSecs: 1000 })),
  getZoomRatio: jest.fn(() => 0.5),
  canvasRef: jest.fn().mockReturnValue({
    rect: testRect,
    getBoundingClientRect: jest.fn(() => testRect),
    offsetWidth: 1,
    offsetHeight: 1
  }),
  containerClientWidth: jest.fn(() => 800),
  viewportClientWidth: jest.fn(() => 800),
  computeTimeSecsForMouseXPosition: jest.fn(() => 10),
  onMoveSelectionWindow: jest.fn(),
  onUpdateSelectionWindow: jest.fn(),
  onClickSelectionWindow: jest.fn(),
  onMouseMove: jest.fn(),
  onMouseDown: jest.fn(),
  onMouseUp: jest.fn()
};

const event: any = {
  clientX: 50,
  stopPropagation: jest.fn(),
  target: {
    offsetLeft: 5,
    style: { right: 1, left: 2 }
  },
  nativeEvent: {
    offsetX: 200,
    offsetY: 180
  }
};

const wrapper = Enzyme.mount(<SelectionWindow {...props} />);
const instance: SelectionWindow = wrapper.find(SelectionWindow).instance() as SelectionWindow;

describe('Weavess SelectionWindow Marker', () => {
  it('Weavess Selection Window to be defined', () => {
    expect(SelectionWindow).toBeDefined();
  });

  it('renders', () => {
    const { container } = render(<SelectionWindow {...props} />);
    expect(container).toMatchSnapshot();
  });

  it('componentDidUpdate', () => {
    const spy = jest.spyOn(instance, 'componentDidUpdate');

    instance.componentDidUpdate({
      ...props
    });
    expect(spy).toHaveBeenCalledTimes(1);

    instance.componentDidUpdate({
      ...props,
      onMoveSelectionWindow: () => jest.fn()
    });
    instance.componentDidUpdate({
      ...props,
      onMoveSelectionWindow: () => jest.fn()
    });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('componentDidCatch', () => {
    const spy = jest.spyOn(instance, 'componentDidCatch');
    instance.componentDidCatch(new Error('error'), { componentStack: undefined });
    expect(spy).toHaveBeenCalled();
  });

  it('onSelectionWindowClick', () => {
    const sw: any = new SelectionWindow(props);
    sw.leadBorderRef = leadBorderRef;
    sw.endBorderRef = endBorderRef;
    const spy = jest.spyOn(sw, 'onSelectionWindowClick');
    const spy2 = jest.spyOn(sw, 'getTimeSecsForClientX');
    sw.onSelectionWindowClick(event);
    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    event.clientX = 500;
    const moveEvent = {
      ...event,
      clientX: 500
    };
    let mouse = new MouseEvent('mousemove', moveEvent);
    expect(document.body.dispatchEvent(mouse)).toBeTruthy();
    mouse = new MouseEvent('mouseup', moveEvent);
    expect(document.body.dispatchEvent(mouse)).toBeTruthy();
  });

  it('onSelectionWindowClick guard', () => {
    const mockCallBack = jest.fn();
    const selectionWindowComponent = Enzyme.mount(
      <SelectionWindow {...props} onClickSelectionWindow={mockCallBack} />
    );
    const selectionWindow: any = selectionWindowComponent
      .find(SelectionWindow)
      .instance() as SelectionWindow;
    expect(() => selectionWindow.onSelectionWindowClick({ ...event, button: 2 })).not.toThrow();
    expect(() => selectionWindow.onSelectionWindowClick({ ...event, button: 0 })).not.toThrow();
  });
  it('onSelectionWindowClick handleSingleDoubleClick', () => {
    const sw: any = new SelectionWindow(props);
    sw.leadBorderRef = leadBorderRef;
    sw.endBorderRef = endBorderRef;
    sw.onSelectionWindowClick(event);
    const mouse = new MouseEvent('mouseup', event);
    expect(document.body.dispatchEvent(mouse)).toBeTruthy();
  });

  it('onUpdateMarker', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'onUpdateMarker');
    sw.onUpdateMarker({
      onUpdateSelectionWindow: () => jest.fn()
    });
    expect(spy).toHaveBeenCalled();
  });

  it('updateTimeWindowSelection', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'updateTimeWindowSelection');
    sw.updateTimeWindowSelection(event);
    expect(spy).toHaveBeenCalled();
  });

  it('getTimeSecsForClientX', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'getTimeSecsForClientX');
    sw.getTimeSecsForClientX(event);
    expect(spy).toHaveBeenCalled();
  });

  it('onMouseDown', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'onMouseDown');
    sw.onMouseDown(event);
    expect(spy).toHaveBeenCalled();

    const mockCallBack = jest.fn();
    const selectionWindowComponent = Enzyme.mount(
      <SelectionWindow {...props} onMouseDown={mockCallBack} />
    );
    const selectionWindow: any = selectionWindowComponent
      .find(SelectionWindow)
      .instance() as SelectionWindow;
    selectionWindow.onMouseDown();
    expect(mockCallBack).toHaveBeenCalled();
  });

  it('onMouseMove', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'onMouseMove');
    sw.onMouseMove(event);
    expect(spy).toHaveBeenCalled();

    const mockCallBack = jest.fn();
    const selectionWindowComponent = Enzyme.mount(
      <SelectionWindow {...props} onMouseMove={mockCallBack} />
    );
    const selectionWindow: any = selectionWindowComponent
      .find(SelectionWindow)
      .instance() as SelectionWindow;
    selectionWindow.onMouseMove();
    expect(mockCallBack).toHaveBeenCalled();
  });

  it('onMouseUp', () => {
    const sw: any = new SelectionWindow(props);
    const spy = jest.spyOn(sw, 'onMouseUp');
    sw.onMouseUp(event);
    expect(spy).toHaveBeenCalled();

    const mockCallBack = jest.fn();
    const selectionWindowComponent = Enzyme.mount(
      <SelectionWindow {...props} onMouseUp={mockCallBack} />
    );
    const selectionWindow: any = selectionWindowComponent
      .find(SelectionWindow)
      .instance() as SelectionWindow;
    selectionWindow.onMouseUp();
    expect(mockCallBack).toHaveBeenCalled();
  });
});
