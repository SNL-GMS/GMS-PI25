import {
  asarAS01Channel,
  PD01Channel,
  PD02Channel,
  PD03Channel,
  pdar,
  processingAnalystConfigurationData
} from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { useQueryStateResult } from '@gms/ui-state/__tests__/__data__';
import { testFilterList } from '@gms/ui-state/__tests__/filter-list-data';
import { render } from '@testing-library/react';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { Provider } from 'react-redux';

import {
  areChannelsIncompatible,
  areRowSelectionsIncompatible,
  EventBeamDialog,
  isBelowThreshold
} from '~analyst-ui/components/waveform/components/waveform-controls/event-beam-dialog/event-beam-dialog';

const processingAnalystConfigurationQuery = cloneDeep(useQueryStateResult);
processingAnalystConfigurationQuery.data = processingAnalystConfigurationData;

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useGetProcessingAnalystConfigurationQuery: jest.fn(() => processingAnalystConfigurationQuery),
    useSelectedFilterList: jest.fn(() => testFilterList)
  };
});

describe('Event beam dialog', () => {
  it('has defined functions', () => {
    expect(areChannelsIncompatible).toBeDefined();
    expect(isBelowThreshold).toBeDefined();
    expect(areRowSelectionsIncompatible).toBeDefined();
  });

  it('matches snapshot', () => {
    const store = getStore();
    const mockSetEventBeamDialogVisibility = jest.fn();
    const { container } = render(
      <Provider store={store}>
        <EventBeamDialog
          setEventBeamDialogVisibility={mockSetEventBeamDialogVisibility}
          isEventBeamDialogVisible
        />
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });

  test('areChannelsIncompatible returns true for incompatible channels and false for compatible channels or zero channels', () => {
    expect(areChannelsIncompatible([asarAS01Channel, PD01Channel])).toBeTruthy();
    expect(areChannelsIncompatible([PD01Channel, PD02Channel, PD03Channel])).toBeFalsy();
    expect(areChannelsIncompatible([])).toBeFalsy();
  });

  test('isBelowThreshold returns true for below threshold, false for meeting threshold or zero channels', () => {
    const mockBeamChannelThreshold = 3;
    expect(isBelowThreshold([PD01Channel], mockBeamChannelThreshold)).toBeTruthy();
    expect(
      isBelowThreshold([PD01Channel, PD02Channel, PD03Channel], mockBeamChannelThreshold)
    ).toBeFalsy();
    expect(isBelowThreshold([], mockBeamChannelThreshold)).toBeFalsy();
  });

  describe('areRowSelectionsIncompatible', () => {
    test('returns false for zero stations and zero channels', () => {
      expect(areRowSelectionsIncompatible([], [])).toBeFalsy();
    });
    test('returns true if stations and channels are incompatible', () => {
      expect(areRowSelectionsIncompatible([pdar], [asarAS01Channel])).toBeTruthy();
    });
    test('returns false if stations and channels are compatible', () => {
      expect(areRowSelectionsIncompatible([pdar], [PD01Channel]));
    });
  });
});
