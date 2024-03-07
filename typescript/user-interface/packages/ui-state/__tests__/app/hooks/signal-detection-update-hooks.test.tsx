import type { CommonTypes } from '@gms/common-model';
import {
  eventData,
  eventStatusInfoNotComplete,
  openIntervalName,
  processingAnalystConfigurationData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { UNFILTERED } from '@gms/common-model/lib/filter';
import { AnalysisMode } from '@gms/common-model/lib/workflow/types';
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';

import type { UpdateSignalDetectionArgs } from '../../../src/ts/app';
import {
  addBeamedChannels,
  addChannelSegments,
  addSignalDetections,
  analystActions,
  setAppAuthenticationStatus,
  waveformActions,
  workflowSlice
} from '../../../src/ts/app';
import {
  useAdjustArrivalTimeToBeWithinViewableInterval,
  useAreUpdateSignalDetectionArgsValid,
  useUpdateSignalDetection,
  useUpdateSignalDetectionPhase
} from '../../../src/ts/app/hooks/update-signal-detection-hooks';
import { useViewableInterval } from '../../../src/ts/app/hooks/waveform-hooks';
import type { ReduxStoreType } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/app/store';
import {
  getMatchingUiChannelSegmentRecordForSignalDetections,
  getMatchingUiChannelsForSignalDetections
} from '../../__data__/ui-channel-segments/ui-channel-segment-data-utils';

jest.mock('../../../src/ts/app/hooks/react-redux-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/react-redux-hooks');
  return {
    ...actual,
    useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
      data: processingAnalystConfigurationData
    }))
  };
});

jest.mock('../../../src/ts/app/hooks/workflow-hooks', () => {
  return {
    useStageId: jest.fn().mockReturnValue({
      startTime: 0,
      definitionId: {
        name: 'AL1'
      }
    })
  };
});
const timeRange: CommonTypes.TimeRange = {
  startTimeSecs: 100,
  endTimeSecs: 200
};

jest.mock(
  '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
    );
    return {
      ...actual,
      useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
        data: processingAnalystConfigurationData
      }))
    };
  }
);

jest.mock('../../../src/ts/app/api/event-manager/event-manager-api-slice', () => {
  const actual = jest.requireActual(
    '../../../src/ts/app/api/event-manager/event-manager-api-slice'
  );
  return {
    ...actual,
    // Prevents async operations from hanging when the test finishes
    useUpdateEventStatusMutation: jest.fn(() => [jest.fn()])
  };
});

jest.mock('../../../src/ts/app/hooks/event-manager-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/event-manager-hooks');
  return {
    ...actual,
    useGetEvents: jest.fn(() => ({
      isSuccess: true,
      data: [eventData]
    })),
    useEventStatusQuery: jest.fn(() => ({
      isSuccess: true,
      data: {
        [eventData.id]: {
          stageId: {
            name: openIntervalName
          },
          eventId: eventData.id,
          eventStatusInfo: { ...eventStatusInfoNotComplete }
        }
      }
    }))
  };
});

describe('signal detection hooks useUpdateSignalDetection', () => {
  describe('useUpdateSignalDetection', () => {
    let store: ReduxStoreType;

    beforeEach(() => {
      store = getStore();

      act(() => {
        const uiChannelSegmentRecord = getMatchingUiChannelSegmentRecordForSignalDetections(
          signalDetectionsData
        );

        const addChannelsPayload = getMatchingUiChannelsForSignalDetections(signalDetectionsData);

        const addChannelSegmentsPayload = Object.entries(uiChannelSegmentRecord).map(
          ([name, filterRecord]) => {
            const channelSegments = filterRecord[UNFILTERED];

            return {
              name,
              channelSegments
            };
          }
        );

        store.dispatch(
          waveformActions.setViewableInterval({ startTimeSecs: 0, endTimeSecs: Infinity })
        );

        store.dispatch(addChannelSegments(addChannelSegmentsPayload));
        store.dispatch(addBeamedChannels(addChannelsPayload));
        store.dispatch(addSignalDetections(signalDetectionsData));

        store.dispatch(
          setAppAuthenticationStatus({
            authenticated: true,
            authenticationCheckComplete: true,
            failedToConnect: false,
            userName: 'test'
          })
        );
        store.dispatch(
          workflowSlice.actions.setTimeRange({ startTimeSecs: 1669150800, endTimeSecs: 1669154400 })
        );
        store.dispatch(
          workflowSlice.actions.setStationGroup({
            effectiveAt: 1669150800,
            name: 'ALL_1',
            description: 'test'
          })
        );
        store.dispatch(workflowSlice.actions.setOpenIntervalName('AL1'));
        store.dispatch(workflowSlice.actions.setOpenActivityNames(['AL1 Event Review']));
        store.dispatch(workflowSlice.actions.setAnalysisMode(AnalysisMode.EVENT_REVIEW));

        store.dispatch(analystActions.setSelectedSdIds([signalDetectionsData[0].id]));
      });
    });

    it('exists', () => {
      expect(useAreUpdateSignalDetectionArgsValid).toBeDefined();
      expect(useAdjustArrivalTimeToBeWithinViewableInterval).toBeDefined();
      expect(useUpdateSignalDetection).toBeDefined();
    });

    it('can validate UpdateSignalDetectionArgs', () => {
      const { result } = renderHook(() => useAreUpdateSignalDetectionArgsValid(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      expect(
        result.current({
          arrivalTime: undefined,
          phase: undefined,
          isDeleted: undefined,
          signalDetectionIds: undefined
        })
      ).toBeFalsy();
      expect(
        result.current({
          arrivalTime: undefined,
          phase: undefined,
          isDeleted: undefined,
          signalDetectionIds: []
        })
      ).toBeFalsy();
      expect(
        result.current({
          arrivalTime: undefined,
          phase: undefined,
          isDeleted: undefined,
          signalDetectionIds: ['A']
        })
      ).toBeFalsy();

      expect(
        result.current({
          arrivalTime: { uncertainty: 0, value: 10 },
          phase: undefined,
          isDeleted: undefined,
          signalDetectionIds: ['A']
        })
      ).toBeTruthy();
      expect(
        result.current({
          arrivalTime: undefined,
          phase: 'P',
          isDeleted: undefined,
          signalDetectionIds: ['A']
        })
      ).toBeTruthy();
      expect(
        result.current({
          arrivalTime: undefined,
          phase: undefined,
          isDeleted: true,
          signalDetectionIds: ['A']
        })
      ).toBeTruthy();
      expect(
        result.current({
          arrivalTime: { uncertainty: 0, value: 10 },
          phase: 'P',
          isDeleted: true,
          signalDetectionIds: ['A']
        })
      ).toBeTruthy();
    });

    it('can adjust arrival time to be within viewable interval', () => {
      const { result, rerender } = renderHook(() => useViewableInterval(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      act(() => {
        result.current[1](timeRange);
        rerender();
      });

      expect(store.getState().app.waveform.viewableInterval).toEqual(timeRange);
      expect(result.current[0]).toEqual(timeRange);

      const resultAdjustArrivalTime = renderHook(
        () => useAdjustArrivalTimeToBeWithinViewableInterval(),
        {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            <Provider store={store}>{props.children}</Provider>
          )
        }
      );

      act(() => {
        resultAdjustArrivalTime.rerender();
      });

      expect(resultAdjustArrivalTime.result.current({ value: 0, uncertainty: 0 })).toEqual({
        value: timeRange.startTimeSecs,
        uncertainty: 0
      });

      expect(resultAdjustArrivalTime.result.current({ value: 500, uncertainty: 0 })).toEqual({
        value: timeRange.endTimeSecs,
        uncertainty: 0
      });

      const value = timeRange.startTimeSecs + (timeRange.endTimeSecs - timeRange.startTimeSecs) / 2;
      expect(resultAdjustArrivalTime.result.current({ value, uncertainty: 0 })).toEqual({
        value,
        uncertainty: 0
      });
    });

    it('calls useUpdateSignalDetection with arrival time', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: false,
        signalDetectionIds: signalDetectionsData.map(s => s.id),
        phase: undefined,
        arrivalTime: {
          value: timeRange.startTimeSecs,
          uncertainty: 1.0
        }
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls useUpdateSignalDetection with phase', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: false,
        signalDetectionIds: signalDetectionsData.map(s => s.id),
        phase: 'P',
        arrivalTime: undefined
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls useUpdateSignalDetection deleted', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: true,
        signalDetectionIds: signalDetectionsData.map(s => s.id),
        phase: undefined,
        arrivalTime: undefined
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls useUpdateSignalDetection no changes', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: false,
        signalDetectionIds: signalDetectionsData.map(s => s.id),
        phase: undefined,
        arrivalTime: undefined
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls useUpdateSignalDetection no signal detection Id', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: false,
        signalDetectionIds: undefined,
        phase: undefined,
        arrivalTime: undefined
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls useUpdateSignalDetection missing signal detection', () => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: false,
        signalDetectionIds: ['fooSignalDetectionId'],
        phase: undefined,
        arrivalTime: undefined
      };
      const { result } = renderHook(() => useUpdateSignalDetection(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current(args)).not.toThrow();
      });
    });

    it('calls usePerformUpdateSignalDetectionPhase', () => {
      const { result } = renderHook(() => useUpdateSignalDetectionPhase(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      act(() => {
        expect(() => result.current([signalDetectionsData[0].id], 'pN')).not.toThrow();
      });
    });

    it('calls usePerformUpdateSignalDetectionPhase with wrapper', () => {
      const result = renderHook(() => useUpdateSignalDetectionPhase(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      act(() => {
        expect(() => result.rerender()).not.toThrow();
      });
    });
  });
});
