import type { Event, EventHypothesis, LocationSolution } from '../../../src/ts/event';
import {
  findEventHypothesisParent,
  findPreferredEventHypothesisByStage,
  findPreferredLocationSolution,
  isPreferredEventHypothesisByStage
} from '../../../src/ts/event';

const openIntervalName = 'AL1';

const locationSolution: LocationSolution = {
  id: 'locationSolutionId',
  networkMagnitudeSolutions: [],
  featurePredictions: { featurePredictions: [] },
  locationBehaviors: [],
  location: undefined,
  locationRestraint: undefined
};

const eventHypothesis1: EventHypothesis = {
  id: { eventId: 'event id', hypothesisId: 'Hypo1' },
  rejected: false,
  deleted: false,
  parentEventHypotheses: [],
  associatedSignalDetectionHypotheses: [],
  locationSolutions: [locationSolution],
  preferredLocationSolution: { id: 'locationSolutionId' }
};

const eventHypothesis2: EventHypothesis = {
  id: { eventId: 'event id', hypothesisId: 'Hypo2' },
  rejected: true,
  deleted: false,
  parentEventHypotheses: [
    {
      id: eventHypothesis1.id
    }
  ],
  associatedSignalDetectionHypotheses: [],
  locationSolutions: []
};
const event: Event = {
  id: 'event id',
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: '',
  eventHypotheses: [eventHypothesis1, eventHypothesis2],
  preferredEventHypothesisByStage: [
    {
      preferred: {
        id: eventHypothesis2.id
      },
      preferredBy: 'test user',
      stage: { name: openIntervalName, effectiveTime: 0 }
    }
  ],
  finalEventHypothesisHistory: [],
  _uiHasUnsavedChanges: undefined
};

describe('Event Util', () => {
  it('findPreferredLocationSolution finds the preferred location solution if it exists', () => {
    expect(findPreferredLocationSolution('Hypo1', [eventHypothesis1, eventHypothesis2])).toEqual(
      locationSolution
    );
  });

  it('findPreferredLocationSolution finds the parents preferred location solution if the hypothesis is rejected', () => {
    expect(findPreferredLocationSolution('Hypo2', [eventHypothesis1, eventHypothesis2])).toEqual(
      locationSolution
    );
  });

  it('findPreferredEventHypothesis finds the preferred event hypothesis solution if it exists', () => {
    expect(findPreferredEventHypothesisByStage(event, openIntervalName)).toEqual(eventHypothesis2);
  });

  it('findEventHypothesisParent finds the non rejected parent', () => {
    expect(findEventHypothesisParent(event, eventHypothesis2)).toEqual(eventHypothesis1);
  });

  it('findEventHypothesisParent returns undefined if no valid parent exists', () => {
    expect(findEventHypothesisParent(event, eventHypothesis1)).toEqual(eventHypothesis1);
  });

  it('isPreferredEventHypothesisByStage returns false', () => {
    const result = isPreferredEventHypothesisByStage(event, 'AL2', eventHypothesis2);
    expect(result).toBe(false);
  });

  it('isPreferredEventHypothesisByStage returns true', () => {
    const result = isPreferredEventHypothesisByStage(event, openIntervalName, eventHypothesis2);
    expect(result).toBe(true);
  });
});
