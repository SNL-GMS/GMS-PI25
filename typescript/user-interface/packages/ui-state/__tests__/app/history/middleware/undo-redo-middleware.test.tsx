import type { ConfigurationTypes } from '@gms/common-model';
import { WorkflowTypes } from '@gms/common-model';
import {
  eventData,
  eventStatusInfoNotComplete,
  openIntervalName,
  processingAnalystConfigurationData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { UNFILTERED } from '@gms/common-model/lib/filter';
import type { SignalDetection } from '@gms/common-model/lib/signal-detection';
import {
  findPhaseFeatureMeasurementValue,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import { AnalysisMode } from '@gms/common-model/lib/workflow/types';
import { act, renderHook } from '@testing-library/react-hooks';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { Provider } from 'react-redux';

import type { ReduxStoreType, UpdateSignalDetectionArgs } from '../../../../src/ts/app';
import {
  addBeamedChannels,
  addChannelSegments,
  addEvents,
  addSignalDetections,
  analystActions,
  getStore,
  selectHistory,
  selectUndoRedoPositions,
  setAppAuthenticationStatus,
  useAppSelector,
  useRedo,
  useUndo,
  useUpdateSignalDetection,
  waveformActions,
  workflowSlice
} from '../../../../src/ts/app';
import { undoRedoMiddleware } from '../../../../src/ts/app/history/middleware/undo-redo-middleware';
import {
  getMatchingUiChannelSegmentRecordForSignalDetections,
  getMatchingUiChannelsForSignalDetections
} from '../../../__data__/ui-channel-segments/ui-channel-segment-data-utils';

const events = {};
events[eventData.id] = eventData;

const signalDetections = {};
signalDetectionsData.forEach(signalDetection => {
  signalDetections[signalDetection.id] = signalDetection;
});

const operationalTimePeriodConfiguration: ConfigurationTypes.OperationalTimePeriodConfiguration = {
  operationalPeriodStart: 100,
  operationalPeriodEnd: 200
};

jest.mock(
  '../../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
    );
    return {
      ...actual,
      useGetOperationalTimePeriodConfigurationQuery: jest.fn(() => ({
        operationalTimePeriodConfiguration
      })),
      useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
        data: processingAnalystConfigurationData
      }))
    };
  }
);

jest.mock('../../../../src/ts/app/api/workflow/workflow-api-slice', () => {
  const actual = jest.requireActual('../../../../src/ts/app/api/workflow/workflow-api-slice');
  return {
    ...actual,
    useWorkflowQuery: jest.fn(() => ({
      isSuccess: true,
      data: {
        stages: [
          {
            name: openIntervalName,
            mode: WorkflowTypes.StageMode.INTERACTIVE,
            activities: [{ stationGroup: { name: 'mockStationGroup' } }]
          },
          {
            name: 'AL2',
            mode: WorkflowTypes.StageMode.AUTOMATIC,
            activities: [{ stationGroup: { name: 'mockStationGroup2' } }]
          }
        ]
      }
    }))
  };
});

jest.mock(
  '../../../../src/ts/workers/api/fetch-default-filter-definitions-for-signal-detection-hypotheses',
  () => {
    const actual = jest.requireActual(
      '../../../../src/ts/workers/api/fetch-default-filter-definitions-for-signal-detection-hypotheses'
    );
    return {
      ...actual,
      fetchDefaultFilterDefinitionsForSignalDetectionHypotheses: jest.fn()
    };
  }
);

jest.mock('../../../../src/ts/app/api/event-manager/event-manager-api-slice', () => {
  const actual = jest.requireActual(
    '../../../../src/ts/app/api/event-manager/event-manager-api-slice'
  );
  return {
    ...actual,
    // Prevents async operations from hanging when the test finishes
    useUpdateEventStatusMutation: jest.fn(() => [jest.fn()])
  };
});

jest.mock('../../../../src/ts/app/hooks/event-manager-hooks', () => {
  const actual = jest.requireActual('../../../../src/ts/app/hooks/event-manager-hooks');
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

describe('global undo redo middleware', () => {
  let store: ReduxStoreType;

  beforeEach(() => {
    store = getStore();

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
    store.dispatch(addEvents([eventData]));
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

  it('exists', () => {
    expect(undoRedoMiddleware).toBeDefined();
  });

  it('can handle an undo/redo request', async () => {
    const args: UpdateSignalDetectionArgs = {
      isDeleted: false,
      signalDetectionIds: signalDetectionsData.map(s => s.id),
      phase: 'P5KPdf',
      arrivalTime: undefined
    };

    const useSelectHistoryResult = renderHook(() => useAppSelector(selectHistory), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        <Provider store={store}>{props.children}</Provider>
      )
    });

    act(() => {
      expect(() => useSelectHistoryResult.result.current.stack).toHaveLength(0);
    });

    const useSelectHistoryPositionResult = renderHook(
      () => useAppSelector(selectUndoRedoPositions),
      {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      }
    );

    act(() => {
      expect(useSelectHistoryPositionResult.result.current).toMatchInlineSnapshot(`
        [
          -1,
          0,
        ]
      `);
    });

    const useSelectSignalDetectionsResult = renderHook(
      () => useAppSelector(s => s.data.signalDetections),
      {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      }
    );

    act(() => {
      expect(Object.values(useSelectSignalDetectionsResult.result.current)).toEqual(
        signalDetectionsData
      );
    });

    const useUpdateSignalDetectionResult = renderHook(() => useUpdateSignalDetection(), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        <Provider store={store}>{props.children}</Provider>
      )
    });

    // UPDATE SD PHASE

    act(() => {
      expect(() => useUpdateSignalDetectionResult.result.current(args)).not.toThrow();
    });

    await act(async () => useSelectHistoryResult.waitForNextUpdate());

    const signalDetectionDataAfterChange: SignalDetection[] = [];
    act(() => {
      signalDetectionDataAfterChange.push(
        ...cloneDeep(Object.values(store.getState().data.signalDetections))
      );
      signalDetectionsData.forEach(originalSignalDetection => {
        const signalDetection = store.getState().data.signalDetections[originalSignalDetection.id];

        const originalHypothesis = getCurrentHypothesis(
          originalSignalDetection.signalDetectionHypotheses
        );
        const originalPhase = findPhaseFeatureMeasurementValue(
          originalHypothesis.featureMeasurements
        );

        const hypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
        const phase = findPhaseFeatureMeasurementValue(hypothesis.featureMeasurements);

        expect(originalHypothesis).not.toEqual(hypothesis);
        expect(originalPhase.value).not.toEqual(phase.value);
        expect(phase.value).toEqual('P5KPdf');
        expect(store.getState().history.signalDetections[originalSignalDetection.id]).toBeDefined();
        expect(
          store.getState().history.signalDetections[originalSignalDetection.id].stack
        ).toHaveLength(1);
      });
    });

    // UNDO ACTION

    const useUndoResult = renderHook(() => useUndo(), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        <Provider store={store}>{props.children}</Provider>
      )
    });

    act(() => {
      expect(() => useUndoResult.result.current(1)).not.toThrow();
    });

    await act(async () => useSelectSignalDetectionsResult.waitForNextUpdate());

    act(() => {
      signalDetectionsData.forEach(originalSignalDetection => {
        const signalDetection = store.getState().data.signalDetections[originalSignalDetection.id];

        const originalHypothesis = getCurrentHypothesis(
          originalSignalDetection.signalDetectionHypotheses
        );
        const originalPhase = findPhaseFeatureMeasurementValue(
          originalHypothesis.featureMeasurements
        );

        const hypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
        const phase = findPhaseFeatureMeasurementValue(hypothesis.featureMeasurements);

        expect(originalHypothesis).toEqual(hypothesis);
        expect(originalPhase.value).toEqual(phase.value);
        expect(phase.value).not.toEqual('P5KPdf');
        expect(store.getState().history.signalDetections[originalSignalDetection.id]).toBeDefined();
        expect(
          store.getState().history.signalDetections[originalSignalDetection.id].stack
        ).toHaveLength(1);
      });
    });

    // REDO ACTION

    const useRedoResult = renderHook(() => useRedo(), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        <Provider store={store}>{props.children}</Provider>
      )
    });

    act(() => {
      expect(() => useRedoResult.result.current(1)).not.toThrow();
    });

    await act(async () => useSelectSignalDetectionsResult.waitForNextUpdate());

    act(() => {
      signalDetectionsData.forEach(originalSignalDetection => {
        const signalDetection = store.getState().data.signalDetections[originalSignalDetection.id];

        const originalHypothesis = getCurrentHypothesis(
          originalSignalDetection.signalDetectionHypotheses
        );
        const originalPhase = findPhaseFeatureMeasurementValue(
          originalHypothesis.featureMeasurements
        );

        const hypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
        const phase = findPhaseFeatureMeasurementValue(hypothesis.featureMeasurements);

        expect(originalHypothesis).not.toEqual(hypothesis);
        expect(originalPhase.value).not.toEqual(phase.value);
        expect(phase.value).toEqual('P5KPdf');
        expect(store.getState().history.signalDetections[originalSignalDetection.id]).toBeDefined();
        expect(
          store.getState().history.signalDetections[originalSignalDetection.id].stack
        ).toHaveLength(1);

        expect(
          getCurrentHypothesis(
            signalDetectionDataAfterChange.find(sd => sd.id === originalSignalDetection.id)
              .signalDetectionHypotheses
          )
        ).toEqual(hypothesis);
      });
    });
  });
});
