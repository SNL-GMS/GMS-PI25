import type { EventHypothesis } from '@gms/common-model/lib/event';
import type { SignalDetectionHypothesis } from '@gms/common-model/lib/signal-detection';
import { findPhaseFeatureMeasurementValue } from '@gms/common-model/lib/signal-detection/util';
import includes from 'lodash/includes';

/**
 * Determines all associable signal detections
 *
 * @param preferredEventHypothesisByStageForOpenEvent
 * @param selectedSignalDetectionsCurrentHypotheses
 * @returns ids of all associable signal detections
 */
export const determineAllAssociableSignalDetections = (
  preferredEventHypothesisByStageForOpenEvent: EventHypothesis,
  selectedSignalDetectionsCurrentHypotheses: SignalDetectionHypothesis[]
): string[] => {
  const result: string[] = [];
  const associatedSignalDetectionHypothesesIds = preferredEventHypothesisByStageForOpenEvent?.associatedSignalDetectionHypotheses?.map(
    associatedSignalDetectionHypothesis => associatedSignalDetectionHypothesis.id.id
  );
  result.push(
    ...selectedSignalDetectionsCurrentHypotheses
      .filter(
        signalDetectionHypothesis =>
          !signalDetectionHypothesis.deleted &&
          !includes(associatedSignalDetectionHypothesesIds, signalDetectionHypothesis.id.id)
      )
      .map(hypothesis => hypothesis.id.signalDetectionId)
  );
  return result;
};

/**
 * Determines all non-associable signal detections
 *
 * @param preferredEventHypothesisByStageForOpenEvent
 * @param selectedSignalDetectionsCurrentHypotheses
 * @returns ids of all non associable signal detections
 */
export const determineAllNonAssociableSignalDetections = (
  preferredEventHypothesisByStageForOpenEvent: EventHypothesis,
  selectedSignalDetectionsCurrentHypotheses: SignalDetectionHypothesis[]
): string[] => {
  const result: string[] = [];
  const associatedSignalDetectionHypothesesIds = preferredEventHypothesisByStageForOpenEvent?.associatedSignalDetectionHypotheses?.map(
    associatedSignalDetectionHypothesis => associatedSignalDetectionHypothesis.id.id
  );
  result.push(
    ...selectedSignalDetectionsCurrentHypotheses
      .filter(
        signalDetectionHypothesis =>
          !signalDetectionHypothesis.deleted &&
          includes(associatedSignalDetectionHypothesesIds, signalDetectionHypothesis.id.id)
      )
      .map(hypothesis => hypothesis.id.signalDetectionId)
  );
  return result;
};

/**
 * Determines all deleteable signal detections
 *
 * @param selectedSignalDetectionsCurrentHypotheses
 * @returns sdIds that are deleteable
 */
export const determineAllDeletableSignalDetections = (
  selectedSignalDetectionsCurrentHypotheses: SignalDetectionHypothesis[]
): string[] => {
  return selectedSignalDetectionsCurrentHypotheses
    .filter(signalDetectionHypothesis => !signalDetectionHypothesis.deleted)
    .map(hypothesis => hypothesis.id.signalDetectionId);
};

/**
 * Determines all valid signal detections for phase change
 *
 * @param selectedSignalDetectionsCurrentHypotheses
 * @param phase string value for phase change
 * @returns sdIds that are deleteable
 */
export const determineAllValidPhaseChangesForSignalDetections = (
  selectedSignalDetectionsCurrentHypotheses: SignalDetectionHypothesis[],
  phase: string
): string[] => {
  return selectedSignalDetectionsCurrentHypotheses
    .filter(
      signalDetectionHypothesis =>
        findPhaseFeatureMeasurementValue(signalDetectionHypothesis.featureMeasurements).value !==
          phase && !signalDetectionHypothesis.deleted
    )
    .map(hypothesis => hypothesis.id.signalDetectionId);
};
