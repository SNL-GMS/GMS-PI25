/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { WeavessTypes } from '@gms/weavess-core';
import { act, render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';

import { PickMarker } from '../../../../../../src/ts/components/waveform-display/components/markers/pick-marker/pick-marker';
import type { PickMarkerProps } from '../../../../../../src/ts/components/waveform-display/components/markers/pick-marker/types';

const viewableRange: WeavessTypes.TimeRange = {
  startTimeSecs: 200,
  endTimeSecs: 900
};
const props: PickMarkerProps = {
  id: 'my-id',
  channelId: 'my-channel',
  startTimeSecs: viewableRange.startTimeSecs - 100,
  endTimeSecs: viewableRange.endTimeSecs + 200,
  viewableInterval: viewableRange,
  offsetSecs: -10,
  position: 8,
  label: 'my pick marker',
  color: '#ff000',
  filter: 'none',
  timeSecs: 540,
  predicted: false,
  isConflicted: false,
  isSelected: false,
  isActionTarget: false,
  isDraggable: false,
  isSelectable: true,
  onClick: jest.fn(),
  toggleDragIndicator: jest.fn(),
  positionDragIndicator: jest.fn(),
  onContextMenu: jest.fn(),
  setPickerMarkerTime: jest.fn(),
  getClientXForTimeSecs: timeSecs => {
    return timeSecs;
  },
  getTimeSecsForClientX: clientX => {
    return viewableRange.startTimeSecs + clientX;
  }
};

const buildHTMLDivMouseEvent = (clientX: number) => {
  const keyboardEvent = {
    shiftKey: false,
    clientX,
    clientY: 50,
    stopPropagation: jest.fn(() => true),
    preventDefault: jest.fn()
  };
  return keyboardEvent;
};

const event: any = {
  stopPropagation: jest.fn(),
  target: {
    offsetLeft: 5
  },
  nativeEvent: {
    offsetX: 200,
    offsetY: 180
  },
  clientX: 200
};

const wrapper = Enzyme.mount(<PickMarker {...props} />);
const instance: PickMarker = wrapper.find(PickMarker).instance() as PickMarker;
instance.state = {
  position: 50
};

describe('Weavess PickMarker Marker', () => {
  it('Weavess Pick Marker to be defined', () => {
    expect(PickMarker).toBeDefined();
  });

  it('renders', () => {
    const { container } = render(<PickMarker {...props} />);
    expect(container).toMatchSnapshot();
  });

  it('componentDidUpdate', async () => {
    await act(() => {
      const spy = jest.spyOn(instance, 'componentDidUpdate');

      instance.componentDidUpdate({
        ...props
      });
      expect(spy).toHaveBeenCalledTimes(1);

      instance.componentDidUpdate({
        ...props,
        position: 22
      });
      expect(spy).toHaveBeenCalledTimes(2);

      instance.componentDidUpdate({
        ...props,
        color: '0000ff'
      });
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  it('componentDidCatch', () => {
    const spy = jest.spyOn(instance, 'componentDidCatch');
    instance.componentDidCatch(new Error('error'), { componentStack: undefined });
    expect(spy).toHaveBeenCalled();
  });

  it('onClick', () => {
    const pm: any = new PickMarker(props);
    const spy = jest.spyOn(pm, 'onClick');
    pm.onClick(event);
    expect(spy).toHaveBeenCalled();
  });

  it('onContextMenu', () => {
    const pm: any = new PickMarker(props);
    const spy = jest.spyOn(pm, 'onContextMenu');
    pm.onContextMenu(event);
    expect(spy).toHaveBeenCalled();
  });

  it('onMouseDown', async () => {
    await act(() => {
      let pm: any = new PickMarker(props);
      pm.state = {
        position: 100
      };
      const mouseEvent = buildHTMLDivMouseEvent(200);
      let spy = jest.spyOn(pm, 'onMouseDown');
      pm.onMouseDown(mouseEvent);
      expect(spy).toHaveBeenCalled();
      mouseEvent.clientX = 220;
      const moveMoveEvent = new MouseEvent('mousemove', mouseEvent);
      expect(document.body.dispatchEvent(moveMoveEvent)).toBeTruthy();

      pm = new PickMarker({ ...props, isConflicted: true });
      pm.state = {
        position: 100
      };
      spy = jest.spyOn(pm, 'onMouseDown');
      pm.onMouseDown(event);
      expect(spy).toHaveBeenCalled();

      pm = new PickMarker({ ...props, predicted: true });
      pm.state = {
        position: 100
      };
      spy = jest.spyOn(pm, 'onMouseDown');
      pm.onMouseDown(event);
      expect(spy).toHaveBeenCalled();

      pm = new PickMarker({ ...props });
      pm.state = {
        position: 100
      };
      spy = jest.spyOn(pm, 'onMouseDown');
      pm.onMouseDown(event);
      expect(spy).toHaveBeenCalled();
    });
  });
  it('onMouseUp', async () => {
    await act(() => {
      const pm: any = new PickMarker(props);
      pm.state = {
        position: 100
      };
      const spy = jest.spyOn(pm, 'onMouseDown');
      pm.onMouseDown(event);
      expect(spy).toHaveBeenCalled();
      pm.labelRef = document.createElement('div');
      pm.lineRef = document.createElement('div');
      pm.containerRef = document.createElement('div');
      const mouseEventInit: MouseEventInit = {
        clientX: 220,
        clientY: 200,
        button: 0
      };
      const mouseUpEvent = new MouseEvent('mouseup', mouseEventInit);
      expect(document.body.dispatchEvent(mouseUpEvent)).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });
  });

  it('can drag pick marker beyond viewable interval', async () => {
    const mouseEvent = buildHTMLDivMouseEvent(50);
    let mouse = new MouseEvent('mousedown', mouseEvent);
    await act(() => {
      expect(() => (instance as any).onMouseDown(mouse)).not.toThrow();
      // Move the mouse around from outside (before and after) and within viewable interval
      mouseEvent.clientX = -100;
      mouse = new MouseEvent('mousemove', mouseEvent);
      expect(document.body.dispatchEvent(mouse)).toBeTruthy();
      mouseEvent.clientX = 500;
      mouse = new MouseEvent('mousemove', mouseEvent);
      expect(document.body.dispatchEvent(mouse)).toBeTruthy();
      mouseEvent.clientX = 1000;
      mouse = new MouseEvent('mousemove', mouseEvent);
      expect(document.body.dispatchEvent(mouse)).toBeTruthy();

      mouse = new MouseEvent('mouseup', mouseEvent);
      expect(document.body.dispatchEvent(mouse)).toBeTruthy();
    });
  });
});
