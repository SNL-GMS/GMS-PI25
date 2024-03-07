import { SignalDetectionTypes } from '@gms/common-model';
import { FilterDefinitionUsage, isFilterDefinition } from '@gms/common-model/lib/filter';
import type { ArrivalTimeFeatureMeasurement } from '@gms/common-model/lib/signal-detection';
import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { IntervalId } from '@gms/common-model/lib/workflow/types';
import { epochSecondsNow } from '@gms/common-util';
import type { AnyAction, CaseReducer } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { UiChannelSegment } from '../../../../types';
import type { ArrivalTime } from '../../../state';
import {
  createWorkingHypothesisAndRemoveAssociations,
  createWorkingHypothesisAndUpdateAssociations
} from '../event/create-working-hypothesis';
import { markAssociatedEventsWithUnsavedChanges } from '../event/mark-associated-events-with-unsaved-changes';
import type { DataState } from '../types';
import { getWorkingSignalDetectionHypothesis } from './get-working-signal-detection-hypothesis';

const updateArrivalTimeSignalDetectionAction = 'data/updateArrivalTimeSignalDetection' as const;
const updatePhaseSignalDetectionAction = 'data/updatePhaseSignalDetection' as const;
const deleteSignalDetectionAction = 'data/deleteSignalDetection' as const;
const createSignalDetectionAction = 'data/createSignalDetection' as const;

/**
 * The create signal detection action.
 */
export const createSignalDetection = createAction<
  SignalDetectionTypes.SignalDetection,
  typeof createSignalDetectionAction
>(createSignalDetectionAction);

/**
 * Returns true if the action is of type {@link createSignalDetection}.
 */
export const isCreateSignalDetectionAction = (
  action: AnyAction
): action is ReturnType<typeof createSignalDetection> =>
  action.type === createSignalDetectionAction;

/**
 * Update the Arrival Time Feature Measurement
 * in the current (working) Signal Detection Hypothesis
 */
export const updateArrivalTimeSignalDetection = createAction<
  {
    readonly username: string;
    readonly stageId: IntervalId;
    readonly openIntervalName: string;
    readonly signalDetectionsRecord: Record<string, UiChannelSegment>;
    readonly arrivalTime: ArrivalTime;
  },
  typeof updateArrivalTimeSignalDetectionAction
>(updateArrivalTimeSignalDetectionAction);

/**
 * Returns true if the action is of type {@link updateArrivalTimeSignalDetection}.
 */
export const isUpdateArrivalTimeSignalDetectionAction = (
  action: AnyAction
): action is ReturnType<typeof updateArrivalTimeSignalDetection> =>
  action.type === updateArrivalTimeSignalDetectionAction;

/**
 * Update the Phase Feature Measurement
 * in the current (working) Signal Detection Hypothesis
 */
export const updatePhaseSignalDetection = createAction<
  {
    readonly username: string;
    readonly stageId: IntervalId;
    readonly openIntervalName: string;
    readonly signalDetectionsRecord: Record<string, UiChannelSegment>;
    readonly phase: string;
  },
  typeof updatePhaseSignalDetectionAction
>(updatePhaseSignalDetectionAction);

/**
 * Returns true if the action is of type {@link updatePhaseSignalDetection}.
 */
export const isUpdatePhaseSignalDetectionAction = (
  action: AnyAction
): action is ReturnType<typeof updatePhaseSignalDetection> =>
  action.type === updatePhaseSignalDetectionAction;

/**
 * Delete the Signal Detection
 * in the current (working) Signal Detection Hypothesis
 */
export const deleteSignalDetection = createAction<
  {
    readonly username: string;
    readonly stageId: IntervalId;
    readonly openIntervalName: string;
    readonly signalDetectionIds: string[];
    readonly isDeleted: boolean;
  },
  typeof deleteSignalDetectionAction
>(deleteSignalDetectionAction);

/**
 * Returns true if the action is of type {@link deleteSignalDetection}.
 */
export const isDeleteSignalDetectionAction = (
  action: AnyAction
): action is ReturnType<typeof deleteSignalDetection> =>
  action.type === deleteSignalDetectionAction;

/**
 * Update Arrival Time feature measurement in the Signal Detection Hypothesis.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const updateArrivalTimeSignalDetectionReducer: CaseReducer<
  DataState,
  ReturnType<typeof updateArrivalTimeSignalDetection>
> = (state, action) => {
  const {
    username,
    stageId,
    openIntervalName,
    signalDetectionsRecord,
    arrivalTime
  } = action.payload;

  // create any necessary working hypothesis
  createWorkingHypothesisAndUpdateAssociations(state, {
    username,
    openIntervalName,
    stageId,
    eventIds: [],
    signalDetectionIds: Object.keys(signalDetectionsRecord)
  });

  Object.entries(signalDetectionsRecord).forEach(([signalDetectionId, uiChannelSegment]) => {
    const signalDetection = state.signalDetections[signalDetectionId];
    const signalDetectionHypothesis = getWorkingSignalDetectionHypothesis(signalDetection);

    // Update each feature measurement in the SD
    const fmIndex = signalDetectionHypothesis.featureMeasurements.findIndex(
      fm => fm.featureMeasurementType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
    );
    if (fmIndex < 0) {
      throw new Error(
        `Failed to find Arrival Time feature measurement will not update arrival time.`
      );
    }

    const arrivalTimeFm: SignalDetectionTypes.ArrivalTimeFeatureMeasurement = signalDetectionHypothesis
      .featureMeasurements[fmIndex] as SignalDetectionTypes.ArrivalTimeFeatureMeasurement;

    const { processingDefinition } = uiChannelSegment?.channelSegmentDescriptor.channel as Channel;
    const versionChannel = {
      name: uiChannelSegment?.channelSegmentDescriptor.channel.name,
      effectiveAt: uiChannelSegment?.channelSegmentDescriptor.channel.effectiveAt
    };

    const updatedArrivalTimeFM: ArrivalTimeFeatureMeasurement = {
      ...arrivalTimeFm,
      channel: versionChannel,
      measuredChannelSegment: {
        id: {
          ...uiChannelSegment?.channelSegmentDescriptor,
          channel: versionChannel
        }
      },
      analysisWaveform: arrivalTimeFm.analysisWaveform && {
        ...arrivalTimeFm.analysisWaveform,
        filterDefinition: isFilterDefinition(processingDefinition)
          ? processingDefinition
          : undefined,
        filterDefinitionUsage: isFilterDefinition(processingDefinition)
          ? FilterDefinitionUsage.ONSET
          : undefined
      },
      measurementValue: {
        ...arrivalTimeFm.measurementValue,
        arrivalTime: {
          ...arrivalTimeFm.measurementValue.arrivalTime,
          standardDeviation: arrivalTime.uncertainty,
          value: arrivalTime.value
        }
      }
    };

    signalDetectionHypothesis.featureMeasurements[fmIndex] = updatedArrivalTimeFM;

    state.signalDetections[signalDetectionId]._uiHasUnsavedChanges = epochSecondsNow();

    markAssociatedEventsWithUnsavedChanges(
      openIntervalName,
      signalDetectionHypothesis,
      Object.values(state.events)
    );
  });
};

/**
 * Update phase feature measurement in the Signal Detection Hypothesis.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const updatePhaseSignalDetectionReducer: CaseReducer<
  DataState,
  ReturnType<typeof updatePhaseSignalDetection>
> = (state, action) => {
  const { username, stageId, openIntervalName, signalDetectionsRecord, phase } = action.payload;

  // create any necessary working hypothesis
  createWorkingHypothesisAndUpdateAssociations(state, {
    username,
    openIntervalName,
    stageId,
    eventIds: [],
    signalDetectionIds: Object.keys(signalDetectionsRecord)
  });

  Object.entries(signalDetectionsRecord).forEach(([signalDetectionId, uiChannelSegment]) => {
    const signalDetection = state.signalDetections[signalDetectionId];
    const signalDetectionHypothesis = getWorkingSignalDetectionHypothesis(signalDetection);

    // Update each feature measurement in the SD
    const phaseFmIndex = signalDetectionHypothesis.featureMeasurements.findIndex(
      fm => fm.featureMeasurementType === SignalDetectionTypes.FeatureMeasurementType.PHASE
    );
    if (phaseFmIndex < 0) {
      throw new Error(`Failed to find Phase feature measurement will not update phase.`);
    }
    const arrivalTimeFmIndex = signalDetectionHypothesis.featureMeasurements.findIndex(
      fm => fm.featureMeasurementType === SignalDetectionTypes.FeatureMeasurementType.ARRIVAL_TIME
    );
    if (arrivalTimeFmIndex < 0) {
      throw new Error(`Failed to find Arrival Time feature measurement; will not update phase.`);
    }
    const { processingDefinition } = uiChannelSegment?.channelSegmentDescriptor.channel as Channel;
    const versionChannel = {
      name: uiChannelSegment?.channelSegmentDescriptor.channel.name,
      effectiveAt: uiChannelSegment?.channelSegmentDescriptor.channel.effectiveAt
    };
    const phaseFM: SignalDetectionTypes.PhaseTypeFeatureMeasurement = signalDetectionHypothesis
      .featureMeasurements[phaseFmIndex] as SignalDetectionTypes.PhaseTypeFeatureMeasurement;
    const arrivalTimeFM: SignalDetectionTypes.ArrivalTimeFeatureMeasurement = signalDetectionHypothesis
      .featureMeasurements[
      arrivalTimeFmIndex
    ] as SignalDetectionTypes.ArrivalTimeFeatureMeasurement;
    const updatedPhaseFM = {
      ...phaseFM,
      channel: versionChannel,
      measuredChannelSegment: {
        id: {
          ...uiChannelSegment?.channelSegmentDescriptor,
          channel: versionChannel
        }
      },
      analysisWaveform: {
        ...phaseFM.analysisWaveform,
        filterDefinition: isFilterDefinition(processingDefinition)
          ? processingDefinition
          : undefined
      },
      measurementValue: {
        ...phaseFM.measurementValue,
        value: phase,
        referenceTime: arrivalTimeFM.measurementValue.arrivalTime.value
      }
    };
    signalDetectionHypothesis.featureMeasurements[phaseFmIndex] = updatedPhaseFM;

    state.signalDetections[signalDetectionId]._uiHasUnsavedChanges = epochSecondsNow();

    markAssociatedEventsWithUnsavedChanges(
      openIntervalName,
      signalDetectionHypothesis,
      Object.values(state.events)
    );
  });
};

/**
 * Update deleted flag in Signal Detection Hypothesis.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const deleteSignalDetectionReducer: CaseReducer<
  DataState,
  ReturnType<typeof deleteSignalDetection>
> = (state, action) => {
  const { username, stageId, openIntervalName, signalDetectionIds, isDeleted } = action.payload;

  // create any necessary working hypothesis
  createWorkingHypothesisAndRemoveAssociations(state, {
    username,
    openIntervalName,
    stageId,
    eventIds: [],
    signalDetectionIds
  });

  signalDetectionIds.forEach(signalDetectionId => {
    const signalDetection = state.signalDetections[signalDetectionId];
    const signalDetectionHypothesis = getWorkingSignalDetectionHypothesis(signalDetection);

    if (signalDetectionHypothesis.deleted && !isDeleted) {
      throw new Error(
        `Failed to find Signal Detection ${signalDetectionId} in state cannot delete signal detection`
      );
    }
    // Set the rejected flag if false to false no harm no foul
    signalDetectionHypothesis.deleted = isDeleted;

    state.signalDetections[signalDetectionId]._uiHasUnsavedChanges = epochSecondsNow();

    markAssociatedEventsWithUnsavedChanges(
      openIntervalName,
      signalDetectionHypothesis,
      Object.values(state.events)
    );
  });
};

/**
 * Adds a new signal detection. It's separate from addSignalDetection to make it possible to undo this action.
 *
 * @param state the current redux state of the slice
 * @param action the action being invoked
 */
export const createSignalDetectionReducer: CaseReducer<
  DataState,
  ReturnType<typeof createSignalDetection>
> = (state, action) => {
  state.signalDetections[action.payload.id] = action.payload;
};
