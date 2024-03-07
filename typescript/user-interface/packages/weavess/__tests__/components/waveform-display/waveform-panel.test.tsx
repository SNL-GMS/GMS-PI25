/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { WeavessConstants, WeavessTypes } from '@gms/weavess-core';
import enzyme from 'enzyme';
import Immutable from 'immutable';
import * as React from 'react';
import { act } from 'react-test-renderer';

import type {
  WaveformPanelProps,
  WaveformPanelState
} from '../../../src/ts/components/waveform-display/types';
import { BrushType } from '../../../src/ts/components/waveform-display/types';
import { WaveformPanel } from '../../../src/ts/components/waveform-display/waveform-panel';
import { initialConfiguration } from '../../__data__/test-util-data';
import { actAndWaitForComponentToPaint } from '../../test-util/test-util';

const mockSetSize = jest.fn();
const mockRenderer = {
  canvas: 'canvas',
  context: 'context',
  domElement: 'domElement',
  forceContextLoss: jest.fn(),
  setScissor: jest.fn(),
  setScissorTest: jest.fn(),
  render: jest.fn(),
  setSize: mockSetSize,
  setViewport: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn()
};

jest.mock('three', () => {
  const three = jest.requireActual('three');
  const mockWebGLRenderer = jest.fn();
  mockWebGLRenderer.mockImplementation(() => {
    return mockRenderer;
  });
  return {
    ...three,
    WebGLRenderer: mockWebGLRenderer
  };
});

jest.mock('worker-rpc', () => {
  const realWorkerRpc = jest.requireActual('worker-rpc');
  // We do this here to guarantee that it runs before the waveform panel generates its workers.
  // This works because jest.mock gets hoisted and run before even imports are figured out.
  Object.defineProperty(window.navigator, 'hardwareConcurrency', {
    writable: false,
    value: 4
  });

  // We don't actually need to mock anything in the worker-rpc module... just to hijack the
  // window before it runs.
  return {
    ...realWorkerRpc,
    RPCProvider: {
      constructor: () => ({
        _dispatch: jest.fn(),
        _nextTransactionId: 0,
        _pendingTransactions: {},
        _rpcHandlers: {},
        _rpcTimeout: 0,
        _signalHandlers: {},
        error: {
          _contexts: [],
          _handlers: [],
          dispatch: jest.fn(),
          hasHandlers: false
        }
      })
    }
  };
});
const mockResetAmplitudes = jest.fn();
const viewableInterval = {
  endTimeSecs: 1100,
  startTimeSecs: 0
};
const zoomInterval = {
  endTimeSecs: 1001,
  startTimeSecs: 200
};
const channelSegmentsRecordDefaultChannel: Record<string, WeavessTypes.ChannelSegment[]> = {};
channelSegmentsRecordDefaultChannel.data = [
  {
    configuredInputName: 'default channel id',
    channelName: 'default channel name',
    wfFilterId: WeavessTypes.UNFILTERED,
    isSelected: false,
    dataSegments: [
      {
        color: 'tomato',
        pointSize: 1,
        data: {
          startTimeSecs: 0,
          endTimeSecs: 100,
          sampleRate: 40,
          values: Float32Array.from([0, 0, 1, 10, 2, 20, 3, 30])
        }
      }
    ]
  }
];
const channelSegmentsRecordNonDefaultChannel: Record<string, WeavessTypes.ChannelSegment[]> = {};
channelSegmentsRecordNonDefaultChannel.data = [
  {
    configuredInputName: 'non default channel id',
    channelName: 'non default channel 1 name',
    wfFilterId: WeavessTypes.UNFILTERED,
    isSelected: false,
    dataSegments: [
      {
        color: 'tomato',
        pointSize: 1,
        data: {
          startTimeSecs: 0,
          endTimeSecs: 100,
          sampleRate: 40,
          values: Float32Array.from([0, 0, 1, 10, 2, 20, 3, 30])
        }
      }
    ]
  }
];
const channelSegmentsRecordNonDefaultChannel2: Record<string, WeavessTypes.ChannelSegment[]> = {};
channelSegmentsRecordNonDefaultChannel2.data = [
  {
    configuredInputName: 'non default channel id 2',
    channelName: 'non default channel 2 name',
    wfFilterId: WeavessTypes.UNFILTERED,
    isSelected: false,
    dataSegments: [
      {
        color: 'tomato',
        pointSize: 1,
        data: {
          startTimeSecs: 0,
          endTimeSecs: 100,
          sampleRate: 40,
          values: Float32Array.from([0, 0, 1, 10, 2, 20, 3, 30])
        }
      }
    ]
  }
];
const mockOnZoomChange = jest.fn();
const uncontrolledProps: WaveformPanelProps = {
  displayInterval: viewableInterval,
  flex: true,
  viewableInterval,
  events: {
    ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS,
    stationEvents: {
      ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS.stationEvents,
      defaultChannelEvents: {
        ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS.stationEvents.defaultChannelEvents,
        events: {
          ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS.stationEvents.defaultChannelEvents.events,
          onMaskCreateDragEnd: jest.fn(),
          onChannelClick: jest.fn()
        }
      },
      nonDefaultChannelEvents: {
        ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS.stationEvents.nonDefaultChannelEvents,
        events: {
          ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS.stationEvents.nonDefaultChannelEvents.events,
          onMaskCreateDragEnd: jest.fn(),
          onChannelClick: jest.fn()
        }
      }
    },
    onResetAmplitude: jest.fn(),
    onZoomChange: mockOnZoomChange,
    onMeasureWindowResize: jest.fn()
  },
  shouldRenderSpectrograms: false,
  shouldRenderWaveforms: true,
  isControlledComponent: false,
  clearSelectedChannels: jest.fn(),
  selections: {
    channels: ['default channel name'],
    signalDetections: [],
    predictedPhases: []
  },
  stations: [
    {
      id: 'station id',
      name: `station name`,
      defaultChannel: {
        height: 40,
        id: 'default channel id',
        name: 'default channel name',
        timeOffsetSeconds: 0,
        waveform: {
          channelSegmentId: 'data',
          channelSegmentsRecord: channelSegmentsRecordDefaultChannel
        }
      },
      nonDefaultChannels: [
        {
          height: 40,
          id: 'non default channel 1 id',
          name: 'non default channel 1 name',
          timeOffsetSeconds: 0,
          waveform: {
            channelSegmentId: 'data',
            channelSegmentsRecord: channelSegmentsRecordNonDefaultChannel
          }
        },
        {
          height: 40,
          id: 'non default channel 2 id',
          name: 'non default channel 2 name',
          waveform: {
            channelSegmentId: 'data',
            channelSegmentsRecord: channelSegmentsRecordNonDefaultChannel2
          }
        }
      ]
    }
  ],
  initialConfiguration: {
    ...initialConfiguration,
    shouldRenderSpectrograms: false,
    shouldRenderWaveforms: true,
    defaultChannel: {
      disableMeasureWindow: true
    },
    nonDefaultChannel: {},
    suppressLabelYAxis: false,
    labelWidthPx: 65,
    xAxisLabel: 'x axis'
  },
  convertTimeToGL: jest.fn(),
  resetWaveformPanelAmplitudes: mockResetAmplitudes,
  isResizing: false,
  scrollBarWidthPx: 10
};

const uncontrolledWrapper = enzyme.mount(<WaveformPanel {...uncontrolledProps} />);
const uncontrolledInstance: any = uncontrolledWrapper.instance();
uncontrolledInstance.waveformsViewportRef = {
  scroll: jest.fn()
};
const testRect = {
  width: 1000,
  left: 0
};
uncontrolledInstance.dimensions.canvas.rect.height = 1000;
uncontrolledInstance.canvasRef = {
  rect: testRect,
  getBoundingClientRect: jest.fn(() => testRect),
  offsetWidth: 1,
  offsetHeight: 1
};
uncontrolledInstance.postZoomUpdate = jest.fn();
uncontrolledInstance.renderer = mockRenderer;

let element = document.createElement('div');
element = {
  ...element,
  style: {
    ...element.style,
    width: '1000px'
  },
  clientWidth: 1065
};

window.getComputedStyle = jest.fn().mockReturnValue({
  width: '1000px'
});

uncontrolledInstance.visibleChannels = Immutable.List();
const defaultChannelRef = {
  getChannelId: jest.fn().mockReturnValue('default channel name'),
  resetAmplitude: mockResetAmplitudes
};
const nonDefaultChannelRefs = {
  chanId: {
    getChannelId: jest.fn().mockReturnValue('non default channel name'),
    resetAmplitude: mockResetAmplitudes
  }
};
const testStation = {
  defaultChannelRef,
  state: {
    expanded: true
  },
  nonDefaultChannelRefs,
  resetAmplitude: mockResetAmplitudes,
  getChannelList: jest.fn(() => {
    return [defaultChannelRef, nonDefaultChannelRefs.chanId];
  })
};

describe('Uncontrolled Weavess Waveform Panel', () => {
  it('matches a snapshot', () => {
    expect(uncontrolledWrapper).toMatchSnapshot();
  });
  it('WaveformPanel componentDidMount', () => {
    const props: WaveformPanelProps = {
      ...uncontrolledProps,
      isResizing: true
    };
    const wrapper = enzyme.mount(<WaveformPanel {...props} />);
    const instance: any = wrapper.instance();
    instance.canvasResizeObserver = jest.fn();
    instance.renderWaveforms = jest.fn();
    const spy = jest.spyOn(instance, 'updateSize');
    instance.updateSize();
    expect(spy).toHaveBeenCalled();
  });
  it('get waveform y axis bounds', async () => {
    await actAndWaitForComponentToPaint(uncontrolledWrapper, () => uncontrolledWrapper.update());
    // Test for existing channel
    expect(
      uncontrolledInstance.getChannelWaveformYAxisBounds('default channel id')
    ).toMatchSnapshot();
  });

  it('get waveform y axis bounds for non existing channel', async () => {
    await actAndWaitForComponentToPaint(uncontrolledWrapper, () => uncontrolledWrapper.update());
    expect(uncontrolledInstance.getChannelWaveformYAxisBounds('FOO')).toBeUndefined();
  });

  it('updates its dimensions when updateTrackedDimensions is called', () => {
    const testDimensions = {
      clientHeight: 100,
      clientWidth: 0,
      scrollWidth: 1000,
      scrollLeft: 1000
    };
    uncontrolledInstance.waveformsViewportRef = {
      ...uncontrolledInstance.waveformsViewportRef,
      clientHeight: 100,
      clientWidth: 100,
      scrollWidth: 1000,
      scrollLeft: 1000
    };
    uncontrolledInstance.canvasRef = {
      rect: testRect,
      getBoundingClientRect: jest.fn(() => testRect),
      offsetWidth: 1,
      offsetHeight: 1
    };

    uncontrolledInstance.updateTrackedDimensions();
    expect(uncontrolledInstance.dimensions.viewport.clientHeight).toBe(testDimensions.clientHeight);
    expect(uncontrolledInstance.dimensions.viewport.clientWidth).not.toBe(
      testDimensions.clientWidth
    );
    expect(uncontrolledInstance.dimensions.viewport.scrollWidth).toBe(testDimensions.scrollWidth);
    expect(uncontrolledInstance.dimensions.viewport.scrollLeft).toBe(testDimensions.scrollLeft);
    expect(uncontrolledInstance.dimensions.canvas.rect.width).toBe(testRect.width);
    expect(uncontrolledInstance.dimensions.canvas.rect.left).toBe(testRect.left);
    expect(uncontrolledInstance.getCanvasBoundingClientRect()).toMatchSnapshot();
  });

  it('calls renderWaveforms on scroll', async () => {
    const originalRenderWaveforms = uncontrolledInstance.renderWaveforms;
    uncontrolledInstance.renderWaveforms = jest.fn();
    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0,
      scrollTop: 0,
      scroll: jest.fn()
    };
    uncontrolledInstance.canvasRef = {
      clientWidth: 1000,
      getBoundingClientRect: jest.fn(() => ({
        width: 1000,
        left: 0
      }))
    };
    uncontrolledInstance.stationComponentRefs = new Map();
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };

    // Set uncontrolled state zoom to interval other than where current viewport
    // is causing update
    const movedZoomInterval = {
      startTimeSecs: zoomInterval.startTimeSecs + 15,
      endTimeSecs: zoomInterval.endTimeSecs + 5
    };
    uncontrolledInstance.state.zoomInterval = movedZoomInterval;
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      uncontrolledInstance.onScroll();
    });

    expect(uncontrolledInstance.postZoomUpdate).toHaveBeenCalled();
    uncontrolledInstance.renderWaveforms = originalRenderWaveforms;
  });

  it('can get the current view range in seconds', () => {
    const zoomIntervalSet = uncontrolledInstance.getCurrentZoomInterval();
    expect(zoomIntervalSet.startTimeSecs).toBe(viewableInterval.startTimeSecs);
    expect(zoomIntervalSet.endTimeSecs).toBe(viewableInterval.endTimeSecs);
    expect(zoomIntervalSet).toMatchSnapshot();
  });

  it('no display interval', () => {
    const zoomProps: WaveformPanelProps = {
      ...uncontrolledProps,
      displayInterval: undefined
    };
    const wrapper = enzyme.mount(<WaveformPanel {...zoomProps} />);
    const instance: any = wrapper.instance();

    const zoomIntervalSet = instance.getCurrentZoomInterval();
    expect(zoomIntervalSet).not.toBe(viewableInterval);
    expect(zoomIntervalSet).toMatchSnapshot();
  });

  it('get zoom range', () => {
    expect(uncontrolledInstance.getCurrentZoomInterval()).toMatchSnapshot();
  });

  it('updates the visible child channels for a station when updateVisibleChannelsForStation is called', () => {
    uncontrolledInstance.stationComponentRefs.set('testStation', testStation);
    expect(uncontrolledInstance.getStationsChannels()).toHaveLength(2);
  });

  it('gets code coverage for not calling reset amplitudes on stations if stationComponentRefs undefined', () => {
    // Reset call count to 0
    mockResetAmplitudes.mockClear();

    const backup = uncontrolledInstance.stationComponentRefs;
    uncontrolledInstance.stationComponentRefs = undefined;
    uncontrolledInstance.resetAmplitudes();
    expect(mockResetAmplitudes).toHaveBeenCalledTimes(0);

    uncontrolledInstance.stationComponentRefs = backup;
    uncontrolledInstance.resetAmplitudes();
    expect(mockResetAmplitudes).toHaveBeenCalledTimes(1);
  });

  it('can update the size of the webgl renderer', async () => {
    // Call update size
    uncontrolledInstance.canvasRef = {
      ...uncontrolledInstance.canvasRef,
      offsetWidth: 1234,
      offsetHeight: 50
    };
    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0
    };
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };
    mockSetSize.mockClear();

    await act(() => {
      uncontrolledInstance.updateSize();
    });
    expect(mockSetSize).toHaveBeenCalled();
  });

  it('can update the size of the webgl renderer width equal, but not height', () => {
    // Call update size
    uncontrolledInstance.canvasRef = {
      ...uncontrolledInstance.canvasRef,
      offsetWidth: 1,
      offsetHeight: 50
    };

    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0
    };
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };
    const sizeSpy = jest.spyOn(uncontrolledInstance.renderer, 'setSize');
    uncontrolledInstance.updateSize();
    expect(sizeSpy).toHaveBeenCalled();
  });
  it('can update the size of the webgl renderer wd', () => {
    // Call update size
    uncontrolledInstance.canvasRef = {
      ...uncontrolledInstance.canvasRef,
      offsetWidth: 1234,
      offsetHeight: 50
    };
    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0
    };
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };
    const sizeSpy = jest.spyOn(uncontrolledInstance.renderer, 'setSize');
    uncontrolledInstance.updateSize();
    expect(sizeSpy).toHaveBeenCalled();
  });

  it('calls renderWaveforms when you call refresh', () => {
    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.canvasRef = {
      clientWidth: 1000,
      rect: testRect,
      getBoundingClientRect: jest.fn(() => testRect),
      offsetWidth: 1,
      offsetHeight: 1
    };
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0
    };
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };
    const originalRenderWaveforms = uncontrolledInstance.renderWaveforms;
    uncontrolledInstance.renderWaveforms = jest.fn();
    uncontrolledInstance.refresh();
    expect(uncontrolledInstance.renderWaveforms).toHaveBeenCalled();
    uncontrolledInstance.renderWaveforms = originalRenderWaveforms;
  });

  it('zoom back out with double click', () => {
    uncontrolledInstance.waveformsContainerRef = element;
    uncontrolledInstance.canvasRef = {
      clientWidth: 1000,
      rect: testRect,
      getBoundingClientRect: jest.fn(() => testRect),
      offsetWidth: 1,
      offsetHeight: 1
    };
    uncontrolledInstance.waveformsViewportRef = {
      scrollLeft: 0,
      clientHeight: 200,
      clientWidth: 1000,
      scrollWidth: 1000,
      scrollHeight: 200,
      scrollTop: 20
    };
    uncontrolledInstance.timeAxisRef = {
      update: jest.fn()
    };

    const newZoomInterval = {
      startTimeSecs: viewableInterval.startTimeSecs + 100,
      endTimeSecs: viewableInterval.endTimeSecs - 100
    };

    // Update the track dimensions
    expect(() => uncontrolledInstance.updateTrackedDimensions()).not.toThrow();
    // zoom to zoom time interval
    expect(() => uncontrolledInstance.zoomToTimeWindow(newZoomInterval)).not.toThrow();
    expect(uncontrolledInstance.getCurrentZoomInterval()).toMatchSnapshot();

    expect(() => uncontrolledInstance.fullZoomOut()).not.toThrow();
  });

  describe('Keyboard and Mouse Wheel events', () => {
    interface KeyboardEventRequest {
      code: string;
      key: string;
      altKey: boolean;
      shiftKey: boolean;
      ctrlKey: boolean;
    }
    interface MouseEventRequest {
      altKey: boolean;
      shiftKey: boolean;
      ctrlKey: boolean;
    }
    const buildKeyboardEvent = (eventReq: KeyboardEventRequest): Partial<KeyboardEvent> => {
      const nativeKeyboardEvent: Partial<KeyboardEvent> = {
        code: eventReq.code,
        key: eventReq.key,
        altKey: eventReq.altKey,
        shiftKey: eventReq.shiftKey,
        ctrlKey: eventReq.ctrlKey
      };
      return nativeKeyboardEvent;
    };

    const buildHTMLDivKeyboardEvent = (
      nativeKeyboardEvent: Partial<KeyboardEvent>
    ): Partial<React.KeyboardEvent<HTMLDivElement>> => {
      const keyboardEvent: Partial<React.KeyboardEvent<HTMLDivElement>> = {
        preventDefault: jest.fn(),
        shiftKey: nativeKeyboardEvent.shiftKey,
        repeat: false,
        nativeEvent: nativeKeyboardEvent as KeyboardEvent,
        stopPropagation: jest.fn(() => true)
      };
      return keyboardEvent;
    };

    const buildWheelEvent = (eventReq: MouseEventRequest, left: boolean): Partial<WheelEvent> => {
      const nativeKeyboardEvent: Partial<WheelEvent> = {
        ctrlKey: eventReq.ctrlKey,
        shiftKey: eventReq.shiftKey,
        altKey: eventReq.altKey,
        deltaY: left ? -1 : 1
      };
      return nativeKeyboardEvent;
    };

    const buildHTMLDivWheelEvent = (
      nativeWheelEvent: Partial<WheelEvent>
    ): Partial<React.WheelEvent<HTMLDivElement>> => {
      const wheelEvent: Partial<React.WheelEvent<HTMLDivElement>> = {
        preventDefault: jest.fn(),
        ctrlKey: nativeWheelEvent.ctrlKey,
        shiftKey: nativeWheelEvent.shiftKey,
        deltaY: nativeWheelEvent.deltaY,
        nativeEvent: nativeWheelEvent as WheelEvent,
        stopPropagation: jest.fn(() => true)
      };
      return wheelEvent;
    };

    const buildMouseEvent = (eventReq: MouseEventRequest): Partial<MouseEvent> => {
      const nativeKeyboardEvent: Partial<MouseEvent> = {
        ctrlKey: eventReq.ctrlKey,
        shiftKey: eventReq.shiftKey,
        altKey: eventReq.altKey
      };
      return nativeKeyboardEvent;
    };

    const buildHTMLDivMouseEvent = (
      nativeWheelEvent: Partial<MouseEvent>
    ): Partial<React.MouseEvent<HTMLDivElement>> => {
      const wheelEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
        preventDefault: jest.fn(),
        ctrlKey: nativeWheelEvent.ctrlKey,
        shiftKey: nativeWheelEvent.shiftKey,
        nativeEvent: nativeWheelEvent as MouseEvent,
        stopPropagation: jest.fn(() => true)
      };
      return wheelEvent;
    };

    describe('Keyboard events', () => {
      beforeEach(() => {
        uncontrolledInstance.waveformsViewportRef = {
          scroll: jest.fn()
        };
        uncontrolledInstance.dimensions.viewport.scrollTop = 500;
      });
      uncontrolledInstance.selectionStart = false;

      it('scrolls down when pageDown is called', () => {
        uncontrolledInstance.dimensions.viewport.scrollTop = 500;
        uncontrolledInstance.dimensions.canvas.rect.height = 1000;
        const start = uncontrolledInstance.dimensions.viewport.scrollTop;
        uncontrolledInstance.pageDown();
        expect(uncontrolledInstance.waveformsViewportRef.scroll).toHaveBeenCalled();
        expect(
          uncontrolledInstance.waveformsViewportRef.scroll.mock.calls[
            uncontrolledInstance.waveformsViewportRef.scroll.mock.calls.length - 1
          ][
            uncontrolledInstance.waveformsViewportRef.scroll.mock.calls[
              uncontrolledInstance.waveformsViewportRef.scroll.mock.calls.length - 1
            ].length - 1
          ].top
        ).toBeGreaterThan(start);
      });
      it('scrolls up when pageUp is called', () => {
        uncontrolledInstance.dimensions.viewport.scrollTop = 500;
        uncontrolledInstance.dimensions.canvas.rect.height = 1000;
        const start = uncontrolledInstance.dimensions.viewport.scrollTop;
        uncontrolledInstance.dimensions.viewport.scrollTop = start;
        uncontrolledInstance.pageUp();
        expect(uncontrolledInstance.waveformsViewportRef.scroll).toHaveBeenCalled();
        expect(
          uncontrolledInstance.waveformsViewportRef.scroll.mock.calls[
            uncontrolledInstance.waveformsViewportRef.scroll.mock.calls.length - 1
          ][
            uncontrolledInstance.waveformsViewportRef.scroll.mock.calls[
              uncontrolledInstance.waveformsViewportRef.scroll.mock.calls.length - 1
            ].length - 1
          ].top
        ).toBeLessThan(start);
      });
      it('makes a call to reset amplitudes for selected channels', () => {
        uncontrolledInstance.stationComponentRefs.set('testStation', testStation);

        // Reset call count to 0
        mockResetAmplitudes.mockClear();
        expect(mockResetAmplitudes).not.toHaveBeenCalled();
        expect(() =>
          uncontrolledInstance.resetSelectedWaveformAmplitudeScaling(
            ['default channel name'],
            false
          )
        ).not.toThrow();
        expect(mockResetAmplitudes).toHaveBeenCalled();
      });

      it('toggles the brush type to "mask" when the M key is pressed', () => {
        const eventReq: KeyboardEventRequest = {
          code: 'KeyM',
          key: 'm',
          altKey: false,
          shiftKey: false,
          ctrlKey: false
        };
        const maskKey = buildHTMLDivKeyboardEvent(buildKeyboardEvent(eventReq));
        // Key down
        expect(() => uncontrolledInstance.createQcSegmentsKeyDown(maskKey)).not.toThrow();
        expect(uncontrolledInstance.brushType).toEqual(BrushType.CreateMask);

        // Key up
        expect(() => uncontrolledInstance.createQcSegmentsKeyUp(maskKey)).not.toThrow();
        expect(uncontrolledInstance.brushType).toMatchInlineSnapshot(`undefined`);
      });
    });

    describe('Wheel events', () => {
      it('correctly calls to zoom for control + mouse down', () => {
        uncontrolledInstance.canvasRef = {
          clientWidth: 1000,
          getBoundingClientRect: jest.fn(() => ({
            width: 1000,
            left: 0
          }))
        };
        // In this case ctrl and not shift
        const eventReq: MouseEventRequest = {
          altKey: false,
          shiftKey: false,
          ctrlKey: true
        };
        const wheelEvent = buildHTMLDivMouseEvent(buildMouseEvent(eventReq));
        expect(() => uncontrolledInstance.onWheel(wheelEvent)).not.toThrow();
        expect(() => uncontrolledInstance.onRenderWaveformsLoopEnd()).not.toThrow();
        wheelEvent.ctrlKey = false;
        expect(() => uncontrolledInstance.onWheel(wheelEvent)).not.toThrow();
      });

      it('correctly calls to scroll with the control + shift + mouse down event', () => {
        uncontrolledInstance.canvasRef = {
          clientWidth: 1000,
          getBoundingClientRect: jest.fn(() => ({
            width: 1000,
            left: 0
          }))
        };

        // In this case holding down ctrl and shift keys
        const eventReq: MouseEventRequest = {
          altKey: false,
          shiftKey: true,
          ctrlKey: true
        };
        const wheelEvent = buildHTMLDivMouseEvent(buildMouseEvent(eventReq));
        expect(() => uncontrolledInstance.onWheel(wheelEvent)).not.toThrow();
        expect(() => uncontrolledInstance.onRenderWaveformsLoopEnd()).not.toThrow();
        wheelEvent.shiftKey = false;
        expect(() => uncontrolledInstance.onWheel(wheelEvent)).not.toThrow();
        wheelEvent.ctrlKey = false;
        expect(() => uncontrolledInstance.onWheel(wheelEvent)).not.toThrow();
      });

      it('can control + wheel', () => {
        uncontrolledInstance.canvasRef = {
          clientWidth: 1000,
          getBoundingClientRect: jest.fn(() => ({
            width: 1000,
            left: 100
          }))
        };
        // In this case ctrl and not shift
        const eventReq: MouseEventRequest = {
          altKey: false,
          shiftKey: false,
          ctrlKey: true
        };
        expect(() =>
          uncontrolledInstance.onWheel(buildHTMLDivWheelEvent(buildWheelEvent(eventReq, false)))
        ).not.toThrow();

        expect(() =>
          uncontrolledInstance.onWheel(buildHTMLDivWheelEvent(buildWheelEvent(eventReq, true)))
        ).not.toThrow();
      });

      it('can control + shift + wheel', () => {
        uncontrolledInstance.canvasRef = {
          clientWidth: 1000,
          getBoundingClientRect: jest.fn(() => ({
            width: 1000,
            left: 0
          }))
        };
        // In this case ctrl and shift
        const eventReq: MouseEventRequest = {
          altKey: false,
          shiftKey: true,
          ctrlKey: true
        };
        expect(() =>
          uncontrolledInstance.onWheel(buildHTMLDivWheelEvent(buildWheelEvent(eventReq, false)))
        ).not.toThrow();

        expect(() =>
          uncontrolledInstance.onWheel(buildHTMLDivWheelEvent(buildWheelEvent(eventReq, true)))
        ).not.toThrow();
      });

      it('can retrieve ordered visible channels', () => {
        expect(uncontrolledInstance.getOrderedVisibleChannelNames()).toMatchSnapshot();
      });

      it('componentWillUnmount nulls out refs', () => {
        uncontrolledInstance.componentWillUnmount();
        expect(uncontrolledInstance.renderer).toEqual(null);
      });

      it('can mount with missing canvas', () => {
        const myWrapper = enzyme.mount(<WaveformPanel {...uncontrolledProps} />);

        expect(myWrapper).toBeDefined();
        const myInstance: any = uncontrolledWrapper.instance();
        expect(myInstance).toBeDefined();
        myInstance.canvasRef = undefined;
        expect(() => myInstance.componentDidMount()).not.toThrow();
      });

      it('componentDidCatch', () => {
        const spy = jest.spyOn(uncontrolledInstance, 'componentDidCatch');
        uncontrolledInstance.componentDidCatch(new Error('error'), { componentStack: undefined });
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});

// Controlled waveform panel component is thru prop changes from the parent
// events.onZoomChange and therefore more difficult to test
describe('Controlled Weavess Waveform Panel', () => {
  const controlledZoomInterval = {
    startTimeSecs: 100,
    endTimeSecs: 200
  };
  const controlledProps: WaveformPanelProps = {
    ...uncontrolledProps,
    isControlledComponent: true,
    displayInterval: viewableInterval,
    flex: false
  };
  const controlledWrapper = enzyme.mount(<WaveformPanel {...controlledProps} />);
  const controlledInstance: any = controlledWrapper.instance();
  controlledInstance.waveformsContainerRef = element;
  controlledInstance.canvasRef = {
    clientWidth: 1000,
    rect: testRect,
    getBoundingClientRect: jest.fn(() => testRect),
    offsetWidth: 1,
    offsetHeight: 1
  };
  controlledInstance.waveformsViewportRef = {
    scrollLeft: 0,
    clientHeight: 200,
    clientWidth: 1000,
    scrollWidth: 1000,
    scrollHeight: 200,
    scrollTop: 20
  };
  controlledInstance.timeAxisRef = {
    update: jest.fn()
  };
  controlledInstance.brushType = BrushType.Zoom;
  const controlledWrapper2 = enzyme.mount(<WaveformPanel {...controlledProps} />);
  const controlledInstance2: any = controlledWrapper2.instance();
  controlledInstance2.waveformsContainerRef = element;
  controlledInstance2.canvasRef = {
    clientWidth: 1000,
    rect: testRect,
    getBoundingClientRect: jest.fn(() => testRect),
    offsetWidth: 1,
    offsetHeight: 1
  };
  controlledInstance2.waveformsViewportRef = {
    scrollLeft: 0,
    clientHeight: 200,
    clientWidth: 1000,
    scrollWidth: 1000,
    scrollHeight: 200,
    scrollTop: 20
  };
  controlledInstance2.timeAxisRef = {
    update: jest.fn()
  };

  controlledInstance2.selectionAreaRef = {
    style: { display: 'test' }
  };

  test('can mount and render controlled waveform panel', () => {
    expect(controlledWrapper).toBeDefined();
    expect(controlledInstance).toBeDefined();
  });
  it('controlled component update when zoom interval has changed and pruneStationComponentRefs with and without stationComponentRefs', async () => {
    const prevZoomInterval = {
      startTimeSecs: controlledZoomInterval.startTimeSecs + 5,
      endTimeSecs: controlledZoomInterval.endTimeSecs + 5
    };

    const prevState: WaveformPanelState = {
      ...controlledInstance.state,
      zoomTimeInterval: prevZoomInterval
    };

    // Set current zoom interval to previous zoom interval
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() =>
        controlledInstance.setZoomIntervalInState(
          controlledInstance.checkMaxZoomInterval(prevZoomInterval)
        )
      ).not.toThrow();
    });
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      controlledInstance.stationComponentRefs.set('testStation', testStation);
      expect(() => controlledInstance.componentDidUpdate(controlledProps, prevState)).not.toThrow();
    });

    await act(() => {
      controlledInstance.stationComponentRefs = undefined;
      expect(() => controlledInstance.componentDidUpdate(controlledProps, prevState)).not.toThrow();
    });
  });

  it('can update zoom interval in parent for controlled components', () => {
    mockOnZoomChange.mockClear();
    controlledInstance.updateZoomIntervalInControlledComponent();
    expect(mockOnZoomChange).toHaveBeenCalled();
  });

  it('controlled component update when viewable interval has changed and ignores when it has not', async () => {
    const prevViewableInterval = {
      startTimeSecs: viewableInterval.startTimeSecs - 10,
      endTimeSecs: zoomInterval.endTimeSecs + 10
    };

    const prevControlledProps = {
      ...controlledProps,
      viewableInterval: prevViewableInterval
    };

    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() =>
        controlledInstance.componentDidUpdate(prevControlledProps, controlledInstance.state)
      ).not.toThrow();
    });
  });

  it('is zoom interval the same', async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() =>
        controlledInstance.setZoomIntervalInState(
          controlledInstance.checkMaxZoomInterval(zoomInterval)
        )
      ).not.toThrow();
    });
    expect(controlledInstance.isCurrentZoomIntervalEqual(zoomInterval)).toBeTruthy();
    expect(controlledInstance.isCurrentZoomIntervalEqual(undefined)).toBeFalsy();
  });

  it('clear the brush stroke with selectionAreaRef', () => {
    expect(() => controlledInstance.clearBrushStroke()).not.toThrow();
  });

  test('can call scroll', async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() => controlledInstance.onScroll()).not.toThrow();
    });
  });

  it('updates its dimensions after updateTrackedDimensions is called', () => {
    const testDimensions = {
      clientHeight: 100,
      clientWidth: 100,
      scrollWidth: 1000,
      scrollLeft: 1000
    };
    controlledInstance.waveformsViewportRef = {
      ...controlledInstance.waveformsViewportRef,
      clientHeight: 100,
      clientWidth: 100,
      scrollWidth: 1000,
      scrollLeft: 1000
    };
    const canvasRef = {
      rect: testRect,
      getBoundingClientRect: jest.fn(() => testRect),
      offsetWidth: 1,
      offsetHeight: 1
    };
    controlledInstance.canvasRef = canvasRef;

    controlledInstance.updateTrackedDimensions();
    expect(controlledInstance.dimensions.viewport.clientHeight).toBe(testDimensions.clientHeight);
    expect(controlledInstance.dimensions.viewport.clientWidth).toBe(testDimensions.clientWidth);
    expect(controlledInstance.dimensions.viewport.scrollWidth).toBe(testDimensions.scrollWidth);
    expect(controlledInstance.dimensions.viewport.scrollLeft).toBe(testDimensions.scrollLeft);
    expect(controlledInstance.dimensions.canvas.rect.width).toBe(testRect.width);
    expect(controlledInstance.dimensions.canvas.rect.left).toBe(testRect.left);
    expect(controlledInstance.getCanvasBoundingClientRect()).toMatchSnapshot();

    const canvasRect = controlledInstance.dimensions.canvas.rect;
    controlledInstance.dimensions.canvas.rect = undefined;
    const modifiedTestRect = {
      ...testRect,
      left: 5
    };
    const modifiedCanvasRef = {
      ...canvasRef,
      getBoundingClientRect: jest.fn(() => modifiedTestRect)
    };
    controlledInstance.canvasRef = modifiedCanvasRef;
    expect(controlledInstance.getCanvasBoundingClientRect()).toEqual(modifiedTestRect);
    // Restore canvas rect
    controlledInstance.dimensions.canvas.rect = canvasRect;
  });

  it('can compute time from mouse fractional position', () => {
    expect(
      controlledInstance.computeTimeSecsForMouseXFractionalPosition(0.73)
    ).toMatchInlineSnapshot(`803`);
  });

  it('can compute time from mouse x pixels position', () => {
    expect(controlledInstance.computeTimeSecsFromMouseXPixels(201)).toMatchInlineSnapshot(
      `221.10000000000002`
    );
  });

  it('can compute canvas fraction from x pixel position', () => {
    expect(controlledInstance.computeFractionOfCanvasFromXPositionPx(201)).toMatchInlineSnapshot(
      `0.201`
    );
  });

  it('can update size while resizing and not resizing', async () => {
    controlledInstance.props = {
      ...controlledProps,
      isResizing: true
    };
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() => controlledInstance.updateSize()).not.toThrow();
    });
    controlledInstance.props = controlledProps;
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await act(() => {
      expect(() => controlledInstance.updateSize()).not.toThrow();
    });
  });

  describe('can zoom', () => {
    controlledInstance.renderer = {
      canvas: 'canvas',
      context: 'context',
      domElement: 'domElement',
      forceContextLoss: jest.fn(),
      setScissor: jest.fn(),
      setScissorTest: jest.fn(),
      render: jest.fn(),
      setSize: jest.fn(),
      setViewport: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn()
    };
    const zoomElement = {
      ...element,
      clientWidth: 1000
    };
    it('controlled component zoom start end range are robust', async () => {
      controlledInstance.waveformsContainerRef = zoomElement;
      controlledInstance.waveformsViewportRef = {
        scrollLeft: 0,
        scrollTop: 0,
        scroll: jest.fn()
      };
      controlledInstance.canvasRef = {
        clientWidth: 1000,
        getBoundingClientRect: jest.fn(() => ({
          width: 1000,
          left: 0
        }))
      };

      // start < 0
      let interval = {
        startTimeSecs: viewableInterval.startTimeSecs - 10,
        endTimeSecs: viewableInterval.endTimeSecs
      };
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() => controlledInstance.zoom(interval)).not.toThrow();
      });
      expect(controlledInstance.getCurrentZoomInterval()).toMatchSnapshot();

      // end > 1
      interval = {
        startTimeSecs: viewableInterval.startTimeSecs,
        endTimeSecs: viewableInterval.endTimeSecs + 100
      };
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() => controlledInstance.zoom(interval)).not.toThrow();
      });
      expect(controlledInstance.getCurrentZoomInterval()).toMatchSnapshot();

      // end before start
      interval = {
        startTimeSecs: zoomInterval.endTimeSecs,
        endTimeSecs: zoomInterval.startTimeSecs
      };
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() => controlledInstance.zoom(interval)).not.toThrow();
      });
      expect(controlledInstance.getCurrentZoomInterval()).toMatchSnapshot();

      // start and end undefined
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() => controlledInstance.zoom(undefined, undefined)).not.toThrow();
      });
    });
    it('controlled component max zoom interval can be reached', async () => {
      controlledInstance.waveformsContainerRef = zoomElement;
      controlledInstance.waveformsViewportRef = {
        scrollLeft: 0,
        scrollTop: 0,
        scroll: jest.fn()
      };
      controlledInstance.canvasRef = {
        clientWidth: 1000,
        getBoundingClientRect: jest.fn(() => ({
          width: 1000,
          left: 0
        }))
      };
      const interval = {
        startTimeSecs: 0.1,
        endTimeSecs: 0.100009
      };
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() =>
          controlledInstance.setZoomIntervalInState(
            controlledInstance.checkMaxZoomInterval(interval)
          )
        ).not.toThrow();
      });
      expect(controlledInstance.hasCurrentZoomIntervalReachedMax()).toBeTruthy();

      // Do it again to test max zoom is still set
      interval.startTimeSecs = 0.11;
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() =>
          controlledInstance.setZoomIntervalInState(
            controlledInstance.checkMaxZoomInterval(interval)
          )
        ).not.toThrow();
      });
      expect(controlledInstance.hasCurrentZoomIntervalReachedMax()).toBeTruthy();

      // Confirm can't zoom in anymore (zoomInterval shouldn't change)
      const zoomedInterval = controlledInstance.getCurrentZoomInterval();
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await act(() => {
        expect(() => controlledInstance.zoom(interval)).not.toThrow();
      });
      expect(controlledInstance.hasCurrentZoomIntervalReachedMax()).toBeTruthy();
      expect(controlledInstance.getCurrentZoomInterval()).toEqual(zoomedInterval);
    });
  });

  describe('Mouse events for zoom and create masks', () => {
    const dummyEvent = ({
      preventDefault: jest.fn(),
      shiftKey: true,
      clientX: 50,
      clientY: 50,
      altKey: false,
      stopPropagation: jest.fn(() => true)
    } as unknown) as React.MouseEvent<HTMLDivElement>;

    it('mouse up', () => {
      // test undefined state
      expect(() => controlledInstance.onMouseUp(dummyEvent)).not.toThrow();

      // set up to call handleSingleDoubleClick
      controlledInstance.isMouseDown = {
        clientX: 50,
        clientY: 50
      };
      // set up to call zoomOrCreateMas
      controlledInstance.isMouseDown = {
        clientX: 50,
        clientY: 50
      };
      controlledInstance.brushType = BrushType.Zoom;
      controlledInstance.startOfBrush = false;
      controlledInstance.selectionStart = true;
      expect(() =>
        controlledInstance.onMouseUp(
          dummyEvent,
          undefined,
          'default channel id',
          zoomInterval.startTimeSecs,
          true
        )
      ).not.toThrow();
      expect(() =>
        controlledInstance.onMouseDown(
          dummyEvent,
          undefined,
          'default channel id',
          zoomInterval.startTimeSecs,
          true
        )
      ).not.toThrow();
    });
  });

  describe('Mouse move events', () => {
    const dummyEvent2 = ({
      shiftKey: true,
      clientX: 50,
      clientY: 50
    } as unknown) as React.MouseEvent<HTMLDivElement>;

    it('mouse move', () => {
      // set up to call handleSingleDoubleClick
      controlledInstance2.isMouseDown = {
        clientX: 50,
        clientY: 50
      };
      controlledInstance2.brushType = BrushType.Zoom;
      controlledInstance2.startOfBrush = true;
      controlledInstance2.selectionStart = true;

      // test undefined state
      expect(() => controlledInstance2.onMouseMove(dummyEvent2)).not.toThrow();
      expect(() => controlledInstance2.onMouseMove(dummyEvent2, 2)).not.toThrow();
      expect(() =>
        controlledInstance2.onMouseDown(dummyEvent2, undefined, undefined, undefined, undefined)
      ).not.toThrow();
    });
  });
});
