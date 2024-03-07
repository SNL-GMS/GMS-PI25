/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessConstants } from '@gms/weavess-core';
import { act, render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';

import { SignalDetection } from '../../../../../../../../../../../src/ts/components/waveform-display/components/station/components/channel/components/content-renderer/components/signal-detections';
import type { SignalDetectionProps } from '../../../../../../../../../../../src/ts/components/waveform-display/components/station/components/channel/components/content-renderer/components/signal-detections/types';
import { initialConfiguration } from '../../../../../../../../../../__data__/test-util-data';

const displayInterval: WeavessTypes.TimeRange = {
  startTimeSecs: 500,
  endTimeSecs: 600
};
const signalDetection: WeavessTypes.PickMarker = {
  /** unique id of the pick marker */
  id: 'foo',
  timeSecs: displayInterval.startTimeSecs + 10,
  uncertaintySecs: 1.5,
  showUncertaintyBars: true,
  label: 'P',
  color: 'red',
  isConflicted: false,
  isSelected: true,
  isDisabled: false,
  isActionTarget: false,
  isDraggable: true,
  filter: 'none'
};

const weavessEvents: WeavessTypes.ChannelContentEvents = {
  ...WeavessConstants.DEFAULT_UNDEFINED_EVENTS?.stationEvents?.defaultChannelEvents?.events,
  onSignalDetectionDragEnd: jest.fn()
};

const props: SignalDetectionProps = {
  stationId: 'my-station',
  channelId: 'my-channel',
  signalDetection,
  displayInterval,
  viewableInterval: displayInterval,
  offsetSecs: 0,
  events: weavessEvents,
  initialConfiguration,
  getTimeSecsForClientX: jest.fn(() => 2),
  toggleDragIndicator: jest.fn(),
  positionDragIndicator: jest.fn(),
  getClientXForTimeSecs: jest.fn(),
  isOnSplitChannel: false
};

const wrapper = Enzyme.mount(<SignalDetection {...props} />);
const instance: SignalDetection = wrapper.find(SignalDetection).instance() as SignalDetection;

describe('Weavess Signal Detection', () => {
  it('Weavess Pick Marker to be defined', () => {
    expect(SignalDetection).toBeDefined();
    expect(instance).toBeDefined();
  });

  it('renders', () => {
    const { container } = render(<SignalDetection {...props} />);
    expect(container).toMatchSnapshot();
  });
  it('set editing time uncertainty', async () => {
    expect((instance as any).state.isEditingTimeUncertainty).toBeFalsy();
    await act(() => {
      expect(() => (instance as any).setIsEditingTimeUncertainty(true)).not.toThrow();
    });
    expect((instance as any).state.isEditingTimeUncertainty).toBeTruthy();
  });

  it('set signal detection time', () => {
    expect(() =>
      (instance as any).setSignalDetectionTime(displayInterval.startTimeSecs + 50)
    ).not.toThrow();
  });

  it('set uncertainty in state', async () => {
    await act(() => {
      expect(() =>
        (instance as any).setUncertaintyInState(displayInterval.startTimeSecs + 25, true)
      ).not.toThrow();
    });
  });
});
