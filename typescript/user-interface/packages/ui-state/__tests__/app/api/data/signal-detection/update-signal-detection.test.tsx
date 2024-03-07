import { SignalDetectionTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { UNFILTERED } from '@gms/common-model/lib/filter';
import {
  findArrivalTimeFeatureMeasurementValue,
  findPhaseFeatureMeasurementValue
} from '@gms/common-model/lib/signal-detection/util';
import type * as Redux from 'redux';

import type { DataState } from '../../../../../src/ts/app';
import {
  createSignalDetection,
  deleteSignalDetection,
  updateArrivalTimeSignalDetection,
  updatePhaseSignalDetection
} from '../../../../../src/ts/app';
import { dataInitialState, dataSlice } from '../../../../../src/ts/app/api/data/data-slice';
import {
  getMatchingUiChannelSegmentRecordForSignalDetections,
  getMatchingUiChannelsForSignalDetections
} from '../../../../__data__/ui-channel-segments/ui-channel-segment-data-utils';

const signalDetections = {};
signalDetectionsData.forEach(sd => {
  signalDetections[sd.id] = {
    ...sd,
    _uiHasUnsavedChanges: 5
  };
});

const uiChannelSegmentRecord = getMatchingUiChannelSegmentRecordForSignalDetections(
  signalDetectionsData
);

const channels = getMatchingUiChannelsForSignalDetections(signalDetectionsData);

const state: DataState = {
  ...dataInitialState,
  signalDetections,
  uiChannelSegments: uiChannelSegmentRecord,
  channels: {
    raw: {},
    beamed: channels.reduce((result, channel) => {
      return {
        ...result,
        [channel.name]: channel
      };
    }, {}),
    filtered: {}
  }
};

const payload = {
  signalDetectionsRecord: {
    [signalDetectionsData[0].id]:
      uiChannelSegmentRecord[signalDetectionsData[0].station.name][UNFILTERED][0]
  },
  phase: 'S'
};

const getPhaseType = (sd: SignalDetectionTypes.SignalDetection): string => {
  const sdHyp = SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses);
  const fmValue = findPhaseFeatureMeasurementValue(sdHyp.featureMeasurements);
  return fmValue.value;
};

describe('Update Signal Detection Reducer', () => {
  beforeEach(() => {
    state.signalDetections = signalDetections;
  });

  it('update signal detection with phase feature measurement', () => {
    const action: Redux.AnyAction = {
      type: updatePhaseSignalDetection.type,
      payload
    };
    // confirm phase not equal to S phase
    expect(getPhaseType(state.signalDetections[signalDetectionsData[0].id])).not.toEqual('S');
    const updatedState = dataSlice.reducer(state, action);
    expect(getPhaseType(updatedState.signalDetections[signalDetectionsData[0].id])).toEqual('S');
  });

  it('update signal detection with sd id undefined', () => {
    const action: Redux.AnyAction = {
      type: updatePhaseSignalDetection.type,
      payload: {
        ...payload,
        signalDetectionsRecord: undefined
      }
    };
    // Will throw
    expect(() => dataSlice.reducer(state, action)).toThrow();
  });

  it('update signal detection with unknown sd', () => {
    const action: Redux.AnyAction = {
      type: updatePhaseSignalDetection.type,
      payload: {
        ...payload,
        signalDetectionsRecord: {
          foo: uiChannelSegmentRecord[signalDetectionsData[0].station.name][UNFILTERED][0]
        }
      }
    };
    // Will throw
    expect(() => dataSlice.reducer(state, action)).toThrow();
  });

  it('update signal detection with arrival time feature measurement', () => {
    const arrivalTimeFmValue = findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(
        signalDetectionsData[0].signalDetectionHypotheses
      ).featureMeasurements
    );
    const arrivalTime = arrivalTimeFmValue.arrivalTime.value + 100;
    const arrivalTimePayload = {
      signalDetectionsRecord: {
        [signalDetectionsData[0].id]:
          uiChannelSegmentRecord[signalDetectionsData[0].station.name][UNFILTERED][0]
      },
      arrivalTime: {
        value: arrivalTime,
        uncertainty: 1.0
      }
    };
    const action: Redux.AnyAction = {
      type: updateArrivalTimeSignalDetection.type,
      payload: arrivalTimePayload
    };
    const updatedState = dataSlice.reducer(state, action);

    const updatedArrivalTimeFmValue = findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(
        updatedState.signalDetections[signalDetectionsData[0].id].signalDetectionHypotheses
      ).featureMeasurements
    );

    expect(updatedArrivalTimeFmValue.arrivalTime.value).toEqual(arrivalTime);
  });

  it('delete signal detection', () => {
    const deletedPayload = {
      signalDetectionIds: [signalDetectionsData[0].id],
      isDeleted: true
    };
    const action: Redux.AnyAction = {
      type: deleteSignalDetection.type,
      payload: deletedPayload
    };
    const sdHypo = SignalDetectionTypes.Util.getCurrentHypothesis(
      signalDetectionsData[0].signalDetectionHypotheses
    );
    expect(sdHypo.deleted).toBeFalsy();
    const updatedState = dataSlice.reducer(state, action);

    const updatedSdHypo = SignalDetectionTypes.Util.getCurrentHypothesis(
      updatedState.signalDetections[signalDetectionsData[0].id].signalDetectionHypotheses
    );
    expect(updatedSdHypo.deleted).toBeTruthy();
  });

  it('create signal detection', () => {
    state.signalDetections = {};

    const signalDetection = signalDetectionsData[0];
    const action: Redux.AnyAction = {
      type: createSignalDetection.type,
      payload: signalDetection
    };

    expect(Object.keys(state.signalDetections)).toHaveLength(0);

    const updatedState = dataSlice.reducer(state, action);

    expect(Object.keys(updatedState.signalDetections)).toHaveLength(1);
    expect(updatedState.signalDetections[signalDetection.id]).toMatchObject(signalDetection);
  });
});
