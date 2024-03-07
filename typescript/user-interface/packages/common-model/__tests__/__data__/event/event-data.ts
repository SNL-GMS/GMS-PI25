import { Units } from '../../../src/ts/common/types';
import { EventTypes } from '../../../src/ts/common-model';
import { facetedSignalDetectionHypothesis } from '../signal-detections';

export const eventId = 'eventID';
export const eventId2 = 'eventID2';
export const eventId3 = 'eventID3';
export const deletedEventId = 'deletedEventId';
const hypothesisId = 'hypothesisID';
const hypothesisId2 = 'hypothesisID2';
const deletedHypothesisId = 'deletedHypothesisId';
const locationSolutionId = 'locationSolutionID';
export const openIntervalName = 'AL1';
export const workflowDefinitionId = { name: openIntervalName, effectiveTime: 0 };
export const user = 'preferredAnalyst';

export const eventStatusInfoInProgress = {
  eventStatus: EventTypes.EventStatus.IN_PROGRESS,
  activeAnalystIds: [user]
};
export const eventStatusInfoComplete = {
  eventStatus: EventTypes.EventStatus.COMPLETE,
  activeAnalystIds: [user]
};
export const eventStatusInfoNotStarted = {
  eventStatus: EventTypes.EventStatus.NOT_STARTED,
  activeAnalystIds: [user]
};
export const eventStatusInfoNotComplete = {
  eventStatus: EventTypes.EventStatus.NOT_COMPLETE,
  activeAnalystIds: [user]
};

export const eventHypothesisId: EventTypes.EventHypothesisId = {
  eventId,
  hypothesisId
};

export const eventHypothesisId2: EventTypes.EventHypothesisId = {
  eventId: eventId2,
  hypothesisId: hypothesisId2
};

export const deletedEventHypothesisId: EventTypes.EventHypothesisId = {
  eventId: deletedEventId,
  hypothesisId: deletedHypothesisId
};

export const networkMagnitudeSolutionMB: EventTypes.NetworkMagnitudeSolution = {
  magnitude: { value: 1.2, standardDeviation: 0, units: Units.MAGNITUDE },
  magnitudeBehaviors: [],
  type: EventTypes.MagnitudeType.MB
};

export const location: EventTypes.EventLocation = {
  latitudeDegrees: 1.1,
  longitudeDegrees: 2.2,
  depthKm: 3.3,
  time: 3600
};

export const locationSolution: EventTypes.LocationSolution = {
  id: locationSolutionId,
  networkMagnitudeSolutions: [networkMagnitudeSolutionMB],
  featurePredictions: { featurePredictions: [] },
  locationBehaviors: [],
  location,
  locationRestraint: undefined
};

export const eventHypothesis: EventTypes.EventHypothesis = {
  id: eventHypothesisId,
  rejected: false,
  deleted: false,
  parentEventHypotheses: [],
  associatedSignalDetectionHypotheses: [facetedSignalDetectionHypothesis],
  preferredLocationSolution: locationSolution,
  locationSolutions: [locationSolution]
};

export const eventHypothesis2: EventTypes.EventHypothesis = {
  id: eventHypothesisId2,
  rejected: false,
  deleted: false,
  parentEventHypotheses: [],
  associatedSignalDetectionHypotheses: [facetedSignalDetectionHypothesis],
  preferredLocationSolution: locationSolution,
  locationSolutions: [locationSolution]
};

export const preferredEventHypothesis: EventTypes.PreferredEventHypothesis = {
  preferredBy: user,
  stage: workflowDefinitionId,
  preferred: { id: eventHypothesis.id }
};

export const preferredEventHypothesis2: EventTypes.PreferredEventHypothesis = {
  preferredBy: user,
  stage: workflowDefinitionId,
  preferred: { id: eventHypothesis2.id }
};

export const rejectedEventHypothesis: EventTypes.EventHypothesis = {
  id: eventHypothesisId,
  rejected: true,
  deleted: false,
  parentEventHypotheses: [{ id: eventHypothesis.id }],
  associatedSignalDetectionHypotheses: [],
  preferredLocationSolution: null,
  locationSolutions: []
};

export const preferredEventHypothesisRejected: EventTypes.PreferredEventHypothesis = {
  preferredBy: user,
  stage: workflowDefinitionId,
  preferred: { id: rejectedEventHypothesis.id }
};

export const deletedEventHypothesis: EventTypes.EventHypothesis = {
  id: deletedEventHypothesisId,
  rejected: false,
  deleted: true,
  parentEventHypotheses: [{ id: eventHypothesis.id }],
  associatedSignalDetectionHypotheses: [],
  preferredLocationSolution: null,
  locationSolutions: []
};

export const preferredEventHypothesisDeleted: EventTypes.PreferredEventHypothesis = {
  preferredBy: user,
  stage: workflowDefinitionId,
  preferred: { id: deletedEventHypothesis.id }
};

export const eventData: EventTypes.Event = {
  id: eventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: { id: eventHypothesis.id },
  eventHypotheses: [eventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesis],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: undefined
};

export const eventData2: EventTypes.Event = {
  id: eventId2,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: { id: eventHypothesis2.id },
  eventHypotheses: [eventHypothesis2],
  preferredEventHypothesisByStage: [preferredEventHypothesis2],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: undefined
};

export const rejectedEventData: EventTypes.Event = {
  id: eventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: { id: rejectedEventHypothesis.id },
  eventHypotheses: [eventHypothesis, rejectedEventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesisRejected],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: undefined
};

export const deletedEventData: EventTypes.Event = {
  id: deletedEventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: { id: deletedEventHypothesis.id },
  eventHypotheses: [eventHypothesis, deletedEventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesisDeleted],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: undefined
};

export const eventWithUnsavedChangesData: EventTypes.Event = {
  id: eventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: { id: eventHypothesis.id },
  eventHypotheses: [eventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesis],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: 1681326922.651
};

export const eventList = [
  eventData,
  eventData2,
  eventWithUnsavedChangesData,
  rejectedEventData,
  deletedEventData
];
