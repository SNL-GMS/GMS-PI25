import type { Event } from '@gms/common-model/lib/event';
import {
  findPreferredEventHypothesisByStage,
  findPreferredLocationSolution
} from '@gms/common-model/lib/event';
import type {
  ArrivalTimeFeatureMeasurement,
  InstantValue,
  PhaseTypeFeatureMeasurement,
  SignalDetection
} from '@gms/common-model/lib/signal-detection';
import {
  findArrivalTimeFeatureMeasurement,
  findPhaseFeatureMeasurement,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import { formatTimeForDisplay, setDecimalPrecision } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';

import type { EventId, SignalDetectionIdString } from '../../../types';
import type {
  createSignalDetection,
  deleteSignalDetection,
  updateArrivalTimeSignalDetection,
  updatePhaseSignalDetection
} from '../../api';
import {
  isCreateSignalDetectionAction,
  isDeleteSignalDetectionAction,
  isUpdateArrivalTimeSignalDetectionAction,
  isUpdatePhaseSignalDetectionAction
} from '../../api';
import type { associateSignalDetectionsToEvent } from '../../api/data/event';
import { isAssociateSignalDetectionsToEventAction } from '../../api/data/event';
import type { createEventFromSignalDetections } from '../../api/data/event/create-event-from-sds';
import { isCreateEventFromSignalDetectionsAction } from '../../api/data/event/create-event-from-sds';
import type { createVirtualEvent } from '../../api/data/event/create-virtual-event';
import { isCreateVirtualEventAction } from '../../api/data/event/create-virtual-event';
import type { deleteEvents } from '../../api/data/event/delete-events';
import { isDeleteEventsAction } from '../../api/data/event/delete-events';
import type { duplicateEvents } from '../../api/data/event/duplicate-events';
import { isDuplicateEventsAction } from '../../api/data/event/duplicate-events';
import type { rejectEvents } from '../../api/data/event/reject-events';
import { isRejectEventsAction } from '../../api/data/event/reject-events';
import type { unassociateSignalDetectionsToEvent } from '../../api/data/event/unassociate-sds-to-event';
import { isUnassociateSignalDetectionsToEventAction } from '../../api/data/event/unassociate-sds-to-event';
import type { AppState } from '../../store';
import { ENV_GMS_HISTORY, GMS_HISTORY } from '../history-environment';
import type { HistoryListenerActions } from '../middleware/history-middleware';

const logger = UILogger.create(GMS_HISTORY, ENV_GMS_HISTORY);

const INFO = 'History Label/Description:' as const;

const multiple = 'Multiple' as const;

export interface HistoryLabelDescription {
  readonly history: [string, string];
  readonly events: Record<EventId, [string, string]>;
  readonly signalDetections: Record<SignalDetectionIdString, [string, string]>;
}

/** returns the phase for the for each provided signal detection */
const getPhase = (
  originalSignalDetection: SignalDetection,
  signalDetection: SignalDetection
): [string, string] => {
  let originalPhaseFM: PhaseTypeFeatureMeasurement;
  if (originalSignalDetection) {
    const originalFeatureMeasurements = getCurrentHypothesis(
      originalSignalDetection.signalDetectionHypotheses
    ).featureMeasurements;
    originalPhaseFM = findPhaseFeatureMeasurement(originalFeatureMeasurements);
  }

  const { featureMeasurements } = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
  const phaseFm = findPhaseFeatureMeasurement(featureMeasurements);
  return [originalPhaseFM?.measurementValue?.value, phaseFm.measurementValue.value];
};

/** returns the arrival time for each of the provided signal detections */
const getArrivalTime = (
  originalSignalDetection: SignalDetection,
  signalDetection: SignalDetection
): [InstantValue, InstantValue] => {
  let originalArrivalFM: ArrivalTimeFeatureMeasurement;
  if (originalSignalDetection) {
    const originalFeatureMeasurements = getCurrentHypothesis(
      originalSignalDetection.signalDetectionHypotheses
    ).featureMeasurements;
    originalArrivalFM = findArrivalTimeFeatureMeasurement(originalFeatureMeasurements);
  }
  const { featureMeasurements } = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
  const arrivalFM = findArrivalTimeFeatureMeasurement(featureMeasurements);
  return [originalArrivalFM?.measurementValue?.arrivalTime, arrivalFM.measurementValue.arrivalTime];
};

/** returns the event time for each provided event */
const getEventTime = (
  originalEvent: Event,
  event: Event,
  openIntervalName: string
): [number | undefined, number | undefined] => {
  let originalEventTime: number;
  if (originalEvent) {
    const originalEventHypothesis = findPreferredEventHypothesisByStage(
      originalEvent,
      openIntervalName
    );
    const originalLocationSolution = findPreferredLocationSolution(
      originalEventHypothesis.id.hypothesisId,
      originalEvent.eventHypotheses
    );
    originalEventTime = originalLocationSolution.location.time;
  }

  let eventTime: number;
  if (event) {
    const eventHypothesis = findPreferredEventHypothesisByStage(event, openIntervalName);
    const locationSolution = findPreferredLocationSolution(
      eventHypothesis.id.hypothesisId,
      event.eventHypotheses
    );
    eventTime = locationSolution.location.time;
  }

  return [originalEventTime, eventTime];
};

/** returns a custom label and description for the {@link associateSignalDetectionsToEvent} or {@link unassociateSignalDetectionsToEvent} actions */
const handleAssociateAndUnassociateSignalDetectionsToEventAction = (
  action:
    | ReturnType<typeof associateSignalDetectionsToEvent>
    | ReturnType<typeof unassociateSignalDetectionsToEvent>,
  original: AppState,
  state: AppState,
  label: 'Association' | 'Unassociation'
): HistoryLabelDescription => {
  const actionString = label === 'Association' ? 'associated' : 'unassociated';
  const { eventId, openIntervalName } = action.payload;
  const [, eventTime] = getEventTime(
    original.data.events[eventId],
    state.data.events[eventId],
    openIntervalName
  );
  const signalDetections: Record<EventId, [string, string]> = {};
  action.payload.signalDetectionIds.forEach(id => {
    const signalDetection = state.data.signalDetections[id];
    const station = signalDetection.station.name;
    const [, phase] = getPhase(original.data.signalDetections[id], signalDetection);
    signalDetections[id] = [
      label,
      `${station}-${phase} ${actionString} to EV-${formatTimeForDisplay(eventTime)}`
    ];
  });

  const description =
    action.payload.signalDetectionIds.length === 1
      ? signalDetections[action.payload.signalDetectionIds[0]][1]
      : multiple;
  return { history: [label, description], events: {}, signalDetections };
};

/** returns a custom label and description for the {@link associateSignalDetectionsToEvent} action */
const handleAssociateSignalDetectionsToEventAction = (
  action: ReturnType<typeof associateSignalDetectionsToEvent>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  return handleAssociateAndUnassociateSignalDetectionsToEventAction(
    action,
    original,
    state,
    'Association'
  );
};

/** returns a custom label and description for the {@link unassociateSignalDetectionsToEvent} action */
const handleUnassociateSignalDetectionsToEventAction = (
  action: ReturnType<typeof unassociateSignalDetectionsToEvent>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  return handleAssociateAndUnassociateSignalDetectionsToEventAction(
    action,
    original,
    state,
    'Unassociation'
  );
};

/** returns a custom label and description for the {@link duplicateEvents} action */
const handleDuplicateEventsAction = (
  action: ReturnType<typeof duplicateEvents>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Creation' as const;
  const events: Record<EventId, [string, string]> = {};
  action.payload.newEventIds.forEach(id => {
    const [, eventTime] = getEventTime(
      original.data.events[id],
      state.data.events[id],
      action.payload.openIntervalName
    );
    events[id] = [label, `EV-${formatTimeForDisplay(eventTime)} created (duplicate)`];
  });

  const description =
    action.payload.newEventIds.length === 1 ? events[action.payload.newEventIds[0]][1] : multiple;
  return { history: [label, description], events, signalDetections: {} };
};

/** returns a custom label and description for the {@link rejectEvents} action */
const handleRejectEventsAction = (
  action: ReturnType<typeof rejectEvents>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Rejection' as const;
  const events: Record<EventId, [string, string]> = {};
  action.payload.eventIds.forEach(id => {
    const [, eventTime] = getEventTime(
      original.data.events[id],
      state.data.events[id],
      action.payload.openIntervalName
    );
    events[id] = [label, `EV-${formatTimeForDisplay(eventTime)} rejected`];
  });

  const description =
    action.payload.eventIds.length === 1 ? events[action.payload.eventIds[0]][1] : multiple;
  return { history: [label, description], events, signalDetections: {} };
};

/** returns a custom label and description for the {@link deleteEvents} action */
const handleDeleteEventsAction = (
  action: ReturnType<typeof deleteEvents>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Deletion' as const;
  const events: Record<EventId, [string, string]> = {};
  action.payload.eventIds.forEach(id => {
    const [, eventTime] = getEventTime(
      original.data.events[id],
      state.data.events[id],
      action.payload.openIntervalName
    );
    events[id] = [label, `EV-${formatTimeForDisplay(eventTime)} deleted`];
  });

  const description =
    action.payload.eventIds.length === 1 ? events[action.payload.eventIds[0]][1] : multiple;
  return { history: [label, description], events, signalDetections: {} };
};

/**
 * returns a custom label and description for the {@link createEventFromSignalDetection} and
 * {@link createVirtualEvent} actions */
const handleCreateEvent = (
  action:
    | ReturnType<typeof createEventFromSignalDetections>
    | ReturnType<typeof createVirtualEvent>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Creation' as const;

  const { newEventId: id } = action.payload;
  const events: Record<EventId, [string, string]> = {};
  const [, eventTime] = getEventTime(
    original.data.events[id],
    state.data.events[id],
    state.app.workflow.openIntervalName
  );

  events[id] = [label, `EV-${formatTimeForDisplay(eventTime)} created`];

  const description = events[id][1];

  return { history: [label, description], events, signalDetections: {} };
};

/** returns a custom label and description for the {@link createSignalDetection} action */
const handleCreateSignalDetectionAction = (
  action: ReturnType<typeof createSignalDetection>
): HistoryLabelDescription => {
  const label = 'Creation' as const;

  const signalDetection = action.payload;
  const station = signalDetection.station.name;
  const [, phase] = getPhase(undefined, signalDetection);
  const [, arrivalTime] = getArrivalTime(undefined, signalDetection);
  const description = `${station}-${phase} created at ${formatTimeForDisplay(arrivalTime.value)}`;

  const signalDetections: Record<SignalDetectionIdString, [string, string]> = {};
  signalDetections[signalDetection.id] = [label, description];
  return { history: [label, description], events: {}, signalDetections };
};

/** returns a custom label and description for the {@link updateArrivalTimeSignalDetection} action */
const handleUpdateArrivalTimeSignalDetectionAction = (
  action: ReturnType<typeof updateArrivalTimeSignalDetection>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Time' as const;
  const signalDetections: Record<EventId, [string, string]> = {};
  const signalDetectionIds = Object.keys(action.payload.signalDetectionsRecord);
  signalDetectionIds.forEach(id => {
    const signalDetection = state.data.signalDetections[id];
    const station = signalDetection.station.name;
    const [, phase] = getPhase(original.data.signalDetections[id], signalDetection);
    const [originalArrivalTime, arrivalTime] = getArrivalTime(
      original.data.signalDetections[id],
      signalDetection
    );

    const isArrivalTimeChange = originalArrivalTime.value !== arrivalTime.value;
    const isUncertaintyChange =
      originalArrivalTime.standardDeviation !== arrivalTime.standardDeviation;

    let changeLabel = 'time';
    let originalValue = formatTimeForDisplay(originalArrivalTime.value);
    let value = formatTimeForDisplay(arrivalTime.value);

    // indicate if a time uncertainty change only
    if (!isArrivalTimeChange && isUncertaintyChange) {
      changeLabel = 'time uncertainty';
      originalValue = `${setDecimalPrecision(originalArrivalTime.standardDeviation, 3)}s`;
      value = `${setDecimalPrecision(arrivalTime.standardDeviation, 3)}s`;
    }

    signalDetections[id] = [
      label,
      `${station}-${phase} ${changeLabel} changed from ${originalValue} to ${value}`
    ];
  });

  const description =
    signalDetectionIds.length === 1 ? signalDetections[signalDetectionIds[0]][1] : multiple;
  return { history: [label, description], events: {}, signalDetections };
};

/** returns a custom label and description for the {@link updatePhaseSignalDetection} action */
const handleUpdatePhaseSignalDetectionAction = (
  action: ReturnType<typeof updatePhaseSignalDetection>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Phase' as const;
  const signalDetections: Record<EventId, [string, string]> = {};
  const signalDetectionIds = Object.keys(action.payload.signalDetectionsRecord);
  signalDetectionIds.forEach(id => {
    const signalDetection = state.data.signalDetections[id];
    const station = signalDetection.station.name;
    const [originalPhase, phase] = getPhase(original.data.signalDetections[id], signalDetection);
    signalDetections[id] = [label, `${station}-${originalPhase} phase changed to ${phase}`];
  });

  const description =
    signalDetectionIds.length === 1
      ? signalDetections[signalDetectionIds[0]][1]
      : `${multiple} to ${action.payload.phase}`;
  return { history: [label, description], events: {}, signalDetections };
};

/** returns a custom label and description for the {@link deleteSignalDetection} action */
const handleDeleteSignalDetectionAction = (
  action: ReturnType<typeof deleteSignalDetection>,
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  const label = 'Deletion' as const;
  const signalDetections: Record<EventId, [string, string]> = {};
  action.payload.signalDetectionIds.forEach(id => {
    const signalDetection = state.data.signalDetections[id];
    const station = signalDetection.station.name;

    const [, phase] = getPhase(original.data.signalDetections[id], signalDetection);
    const [, arrivalTime] = getArrivalTime(original.data.signalDetections[id], signalDetection);
    signalDetections[id] = [
      label,
      `${station}-${phase} deleted at ${formatTimeForDisplay(arrivalTime.value)}`
    ];
  });

  const description =
    action.payload.signalDetectionIds.length === 1
      ? signalDetections[action.payload.signalDetectionIds[0]][1]
      : multiple;
  return { history: [label, description], events: {}, signalDetections };
};

/**
 * Returns a custom label and description string for the provided action/payload.
 *
 * @param action the action to retrieve a custom label and description for
 * @returns a custom label and description
 */
export const getHistoryLabelDescriptions = (
  action: HistoryListenerActions | { type: string },
  original: AppState,
  state: AppState
): HistoryLabelDescription => {
  if (isAssociateSignalDetectionsToEventAction(action)) {
    return handleAssociateSignalDetectionsToEventAction(action, original, state);
  }

  if (isUnassociateSignalDetectionsToEventAction(action)) {
    return handleUnassociateSignalDetectionsToEventAction(action, original, state);
  }

  if (isDuplicateEventsAction(action)) {
    return handleDuplicateEventsAction(action, original, state);
  }

  if (isRejectEventsAction(action)) {
    return handleRejectEventsAction(action, original, state);
  }

  if (isDeleteEventsAction(action)) {
    return handleDeleteEventsAction(action, original, state);
  }

  if (isCreateEventFromSignalDetectionsAction(action) || isCreateVirtualEventAction(action)) {
    return handleCreateEvent(action, original, state);
  }

  if (isCreateSignalDetectionAction(action)) {
    return handleCreateSignalDetectionAction(action);
  }

  if (isUpdateArrivalTimeSignalDetectionAction(action)) {
    return handleUpdateArrivalTimeSignalDetectionAction(action, original, state);
  }

  if (isUpdatePhaseSignalDetectionAction(action)) {
    return handleUpdatePhaseSignalDetectionAction(action, original, state);
  }

  if (isDeleteSignalDetectionAction(action)) {
    return handleDeleteSignalDetectionAction(action, original, state);
  }

  logger.warn(`${INFO} type not implemented for custom description`, action);
  return {
    history: [action.type, action.type],
    events: {},
    signalDetections: {}
  };
};
