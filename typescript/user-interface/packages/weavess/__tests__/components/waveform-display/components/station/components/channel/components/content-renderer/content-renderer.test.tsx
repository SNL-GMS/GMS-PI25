/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable react/jsx-props-no-spreading */
import { WeavessTypes } from '@gms/weavess-core';
import { act, render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';

import { ContentRenderer } from '../../../../../../../../../src/ts/components/waveform-display/components/station/components/channel/components/content-renderer/content-renderer';
import type { ContentRendererProps } from '../../../../../../../../../src/ts/components/waveform-display/components/station/components/channel/components/content-renderer/types';
import { initialConfiguration } from '../../../../../../../../__data__/test-util-data';

const configuration: WeavessTypes.Configuration = {
  ...initialConfiguration,
  shouldRenderSpectrograms: false,
  defaultChannel: {
    disableMeasureWindow: true,
    disableMaskModification: true
  },
  nonDefaultChannel: {
    disableMeasureWindow: true,
    disableMaskModification: false
  }
};

const timeRange: WeavessTypes.TimeRange = {
  startTimeSecs: 300,
  endTimeSecs: 700
};
const props: ContentRendererProps = {
  initialConfiguration: configuration,
  channelId: 'channel-id',
  stationId: 'station-id',
  displayInterval: timeRange,
  viewableInterval: timeRange,
  offsetSecs: 0,
  getZoomRatio: jest.fn().mockReturnValue(0.5),
  isDefaultChannel: true,
  predictedPhases: [],
  selections: {
    channels: [],
    predictedPhases: [],
    signalDetections: []
  },
  signalDetections: [],
  isSplitChannelOverlayOpen: true,
  theoreticalPhaseWindows: [],
  workerRpcs: [],
  contentRenderers: [],
  description: 'description',
  descriptionLabelColor: '#ff000',
  events: {
    onChannelClick: jest.fn(),
    onClickSelectionWindow: jest.fn(),
    onContextMenu: jest.fn(),
    onMaskClick: jest.fn(),
    onMaskContextClick: jest.fn(),
    onMaskCreateDragEnd: jest.fn(),
    onMeasureWindowUpdated: jest.fn(),
    onMoveSelectionWindow: jest.fn(),
    onPredictivePhaseClick: jest.fn(),
    onPredictivePhaseContextMenu: jest.fn(),
    onSignalDetectionClick: jest.fn(),
    onSignalDetectionDoubleClick: jest.fn(),
    onSignalDetectionContextMenu: jest.fn(),
    onSignalDetectionDragEnd: jest.fn(),
    onUpdateMarker: jest.fn(),
    onUpdateSelectionWindow: jest.fn()
  },
  markers: {
    moveableMarkers: [],
    selectionWindows: [],
    verticalMarkers: []
  },
  canvasRef: jest.fn(),
  converters: {
    computeFractionOfCanvasFromMouseXPx: jest.fn(() => 88),
    computeTimeSecsForMouseXFractionalPosition: jest.fn(() => 88),
    computeTimeSecsFromMouseXPixels: jest.fn(() => 88)
  },
  onContextMenu: jest.fn(),
  onKeyDown: jest.fn(),
  onMouseDown: jest.fn(),
  onMouseMove: jest.fn(),
  onMouseUp: jest.fn(),
  renderWaveforms: jest.fn(),
  updateMeasureWindow: jest.fn()
};
const computeTimeSecsForMouseXFractionalPosition = jest.fn(() => 88);
const wrapper = Enzyme.mount(
  <ContentRenderer
    {...props}
    converters={{
      computeFractionOfCanvasFromMouseXPx: jest.fn(() => 88),
      computeTimeSecsForMouseXFractionalPosition,
      computeTimeSecsFromMouseXPixels: jest.fn(() => 88)
    }}
    canvasRef={() =>
      ({
        getBoundingClientRect: () => ({
          right: 9,
          left: 11,
          width: 100
        })
      } as any)
    }
  />
);
const contentInstance: any = wrapper.find(ContentRenderer).instance();

describe('Weavess Content Renderer', () => {
  it('to be defined', () => {
    expect(ContentRenderer).toBeDefined();
  });

  it('renders', () => {
    const { container } = render(<ContentRenderer {...props} isSplitChannelOverlayOpen={false} />);
    expect(container).toMatchSnapshot();
  });

  it('create all markers', () => {
    const p: ContentRendererProps = {
      ...props,
      markers: {
        moveableMarkers: [
          {
            id: 'moveable',
            timeSecs: 40,
            color: 'ff000',
            lineStyle: WeavessTypes.LineStyle.DASHED,
            minTimeSecsConstraint: 4,
            maxTimeSecsConstraint: 200
          }
        ],
        selectionWindows: [
          {
            id: 'selection',
            color: '00ff00',
            isMoveable: true,
            startMarker: {
              id: 'start',
              color: '#ff0000',
              lineStyle: WeavessTypes.LineStyle.SOLID,
              timeSecs: 10,
              minTimeSecsConstraint: 1,
              maxTimeSecsConstraint: 200
            },
            endMarker: {
              id: 'end',
              color: '#ff0000',
              lineStyle: WeavessTypes.LineStyle.SOLID,
              timeSecs: 80,
              minTimeSecsConstraint: 1,
              maxTimeSecsConstraint: 200
            }
          }
        ],
        verticalMarkers: [
          {
            id: 'vertical',
            color: '0000ff',
            lineStyle: WeavessTypes.LineStyle.DASHED,
            timeSecs: 120,
            minTimeSecsConstraint: 0,
            maxTimeSecsConstraint: 300
          }
        ]
      },
      isSplitChannelOverlayOpen: false
    };
    const { container } = render(<ContentRenderer {...p} />);
    expect(container).toMatchSnapshot();
  });

  it('getTimeSecsForClientX', () => {
    const localWrapper = Enzyme.mount(<ContentRenderer {...props} />);
    const localInstance: any = localWrapper.find(ContentRenderer).instance();
    expect(localInstance.getTimeSecsForClientX(10)).toBeUndefined();

    // Test if x position is < left && > right
    expect(contentInstance.getTimeSecsForClientX(10)).toBeUndefined();
    expect(contentInstance.getTimeSecsForClientX(18)).toEqual(88);
    expect(computeTimeSecsForMouseXFractionalPosition).toHaveBeenCalledTimes(1);
  });

  it('getClientXForTimeSecs', () => {
    const localWrapper = Enzyme.mount(<ContentRenderer {...props} />);
    const localInstance: any = localWrapper.find(ContentRenderer).instance();
    expect(localInstance.getClientXForTimeSecs(timeRange.startTimeSecs + 100)).toBeUndefined();
    expect(
      contentInstance.getClientXForTimeSecs(timeRange.startTimeSecs + 100)
    ).toMatchInlineSnapshot(`36`);
  });

  it('toggleDragIndicator', () => {
    contentInstance.toggleDragIndicator(true, '000000');
    expect(contentInstance.dragIndicatorRef.style.display).toEqual('initial');
    contentInstance.toggleDragIndicator(false, '000000');
    expect(contentInstance.dragIndicatorRef.style.display).toEqual('none');

    contentInstance.dragIndicatorRef = undefined;
    contentInstance.toggleDragIndicator(true, '000000');
  });

  it('onChannelMouseEnter and onChannelMouseLeave', async () => {
    await act(() => {
      contentInstance.onChannelMouseEnter();
    });
    expect(contentInstance.state.backgroundColor).toEqual('rgba(150,150,150,0.2)');
    await act(() => {
      contentInstance.onChannelMouseLeave();
    });
    expect(contentInstance.state.backgroundColor).toEqual('initial');
  });

  it('positionDragIndicator', () => {
    const content = Enzyme.mount(<ContentRenderer {...props} />);

    const getBoundingClientRect = jest.fn(() => ({
      left: 44,
      right: 12,
      width: 100
    }));
    const localInstance: any = content.find(ContentRenderer).instance();
    expect(localInstance.dragIndicatorRef.style.display).toEqual('');

    localInstance.containerRef = {
      getBoundingClientRect
    };
    localInstance.positionDragIndicator(48);
    expect(localInstance.dragIndicatorRef.style.left).toEqual('4%');
    expect(getBoundingClientRect).toHaveBeenCalledTimes(1);

    localInstance.dragIndicatorRef = undefined;
    localInstance.positionDragIndicator(48);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(1);
  });
});
