import { ConfigurationTypes, EventTypes, LegacyEventTypes } from '@gms/common-model';
import { eventData, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import type { LocationSolution } from '@gms/common-model/lib/event';
import type { Location } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { EventStatus } from '@gms/ui-state';
import cloneDeep from 'lodash/cloneDeep';

import {
  determineDetectionColorLegacy,
  getDistanceToStationsForPreferredLocationSolutionId,
  getLocationToEventDistance,
  isAssociatedToCurrentEventHypothesisLegacy,
  isSignalDetectionAssociated,
  isSignalDetectionCompleteAssociated,
  isSignalDetectionOpenAssociated,
  isSignalDetectionOtherAssociated
} from '../../../../../src/ts/components/analyst-ui/common/utils/event-util';
import { data } from '../../components/station-properties/mock-station-data';

const MOCK_DEGREES = 5;

const KM_TO_DEGREES = 111.1949266;
const MOCK_KM = KM_TO_DEGREES * MOCK_DEGREES;
const MOCK_BEARING = 10;

jest.mock('geolib', () => {
  return {
    getDistance: jest.fn(() => MOCK_KM * 1000),
    getGreatCircleBearing: jest.fn(() => MOCK_BEARING)
  };
});

describe('Event utils', () => {
  const mockLocationSolution: LocationSolution = {
    id: '',
    networkMagnitudeSolutions: [],
    featurePredictions: { featurePredictions: [] },
    locationBehaviors: [],
    location: {
      latitudeDegrees: 0,
      longitudeDegrees: 0,
      depthKm: 0,
      time: 0
    },
    locationRestraint: undefined
  };
  const mockOpenInterval = 'AL1';
  it('getLocationToEventDistance returns a valid distance', () => {
    const { station } = data;

    expect(getLocationToEventDistance(station.location, mockLocationSolution.location)).toEqual({
      degrees: MOCK_DEGREES,
      km: MOCK_KM
    });
  });

  it('getDistanceToStationsForPreferredLocationSolutionId returns a valid distance array', () => {
    const stationLocation2: Location = {
      latitudeDegrees: 2,
      longitudeDegrees: 2,
      elevationKm: 2,
      depthKm: 0
    };

    const { station } = data;
    const station2 = cloneDeep(station);
    station2.location = stationLocation2;
    const sdData = cloneDeep(signalDetectionsData);
    sdData[0].station.name = 'STA';
    const associatedEvent = cloneDeep(eventData);
    // associate  the detection to the event
    associatedEvent.eventHypotheses[0].associatedSignalDetectionHypotheses.push(
      sdData[0].signalDetectionHypotheses[0]
    );

    expect(
      getDistanceToStationsForPreferredLocationSolutionId(
        associatedEvent,
        [station, station2],
        mockOpenInterval,
        station.allRawChannels.concat(station2.allRawChannels)
      )
    ).toEqual([
      { azimuth: MOCK_BEARING, distance: { degrees: MOCK_DEGREES, km: MOCK_KM }, id: 'STA' },
      {
        azimuth: MOCK_BEARING,
        distance: { degrees: MOCK_DEGREES, km: MOCK_KM },
        id: 'BPPPP.BPP01.CNN'
      },
      {
        azimuth: MOCK_BEARING,
        distance: { degrees: MOCK_DEGREES, km: MOCK_KM },
        id: 'BPPPP.BPP01.BBC'
      },
      { azimuth: MOCK_BEARING, distance: { degrees: MOCK_DEGREES, km: MOCK_KM }, id: 'STA' },
      {
        azimuth: MOCK_BEARING,
        distance: { degrees: MOCK_DEGREES, km: MOCK_KM },
        id: 'BPPPP.BPP01.CNN'
      },
      {
        azimuth: MOCK_BEARING,
        distance: { degrees: MOCK_DEGREES, km: MOCK_KM },
        id: 'BPPPP.BPP01.BBC'
      }
    ]);
  });

  it('determineDetectionColor for initial state', () => {
    const sd = signalDetectionsData[0];
    expect(determineDetectionColorLegacy(sd, undefined, 'foobar')).toEqual(
      ConfigurationTypes.defaultColorTheme.unassociatedSDColor
    );
    expect(determineDetectionColorLegacy(sd, [], 'foobar')).toEqual(
      ConfigurationTypes.defaultColorTheme.unassociatedSDColor
    );

    const event: LegacyEventTypes.Event = {
      id: 'legacyEvent',
      status: LegacyEventTypes.EventStatus.ReadyForRefinement,
      modified: true,
      hasConflict: false,
      currentEventHypothesis: undefined,
      conflictingSdIds: []
    };
    expect(determineDetectionColorLegacy(undefined, [event], 'foobar')).toEqual(
      ConfigurationTypes.defaultColorTheme.unassociatedSDColor
    );
    // TODO need to fix EventUtils to take new event type before testing more of the functionality
    expect(determineDetectionColorLegacy(sd, [event], undefined)).toEqual(
      ConfigurationTypes.defaultColorTheme.unassociatedSDColor
    );
  });

  it('isSignalDetectionOpenAssociated detects signal detections  associated with the open event', () => {
    const associatedEvent = cloneDeep(eventData);
    const detection = cloneDeep(signalDetectionsData[0]);
    // associate  the detection to the event
    associatedEvent.eventHypotheses[0].associatedSignalDetectionHypotheses.push(
      detection.signalDetectionHypotheses[0]
    );
    // test with open event == associatedEvent
    expect(
      isSignalDetectionOpenAssociated(
        detection,
        [associatedEvent],
        associatedEvent.id,
        mockOpenInterval
      )
    ).toBeTruthy();
    // test with open event != associatedEvent
    expect(
      isSignalDetectionOpenAssociated(
        detection,
        [associatedEvent],
        'otherEventId',
        mockOpenInterval
      )
    ).toBeFalsy();
  });

  it('isSignalDetectionCompleteAssociated detects signal detections associated with a complete event', () => {
    const eventStatuses: Record<string, EventStatus> = {};

    // test with event status == complete
    eventStatuses[eventData.id] = {
      stageId: { name: 'sample' },
      eventId: 'eventData.id',
      eventStatusInfo: {
        eventStatus: EventTypes.EventStatus.COMPLETE,
        activeAnalystIds: ['user1', 'user2']
      }
    };
    expect(
      isSignalDetectionCompleteAssociated(
        signalDetectionsData[0],
        [eventData],
        eventStatuses,
        mockOpenInterval
      )
    ).toBeTruthy();

    // test with open event != in progress

    eventStatuses[eventData.id] = {
      stageId: { name: 'sample' },
      eventId: 'eventData.id',
      eventStatusInfo: {
        eventStatus: EventTypes.EventStatus.IN_PROGRESS,
        activeAnalystIds: ['user1', 'user2']
      }
    };
    expect(
      isSignalDetectionCompleteAssociated(
        signalDetectionsData[0],
        [eventData],
        eventStatuses,
        mockOpenInterval
      )
    ).toBeFalsy();
  });

  it('isSignalDetectionOtherAssociated detects signal detections  associated with a non open event', () => {
    // test with open event == associatedEvent
    expect(
      isSignalDetectionOtherAssociated(
        signalDetectionsData[0],
        [eventData],
        eventData.id,
        mockOpenInterval
      )
    ).toBeFalsy();
    // test with open event != associatedEvent
    expect(
      isSignalDetectionOtherAssociated(
        signalDetectionsData[0],
        [eventData],
        'otherEventId',
        mockOpenInterval
      )
    ).toBeTruthy();
  });

  it('isSignalDetectionAssociated detects signal detections  associated an event', () => {
    // test with associated SD
    expect(
      isSignalDetectionAssociated(signalDetectionsData[0], [eventData], mockOpenInterval)
    ).toBeTruthy();
    // test with unassociated SD
    expect(
      isSignalDetectionAssociated(signalDetectionsData[1], [eventData], mockOpenInterval)
    ).toBeFalsy();
  });
});

describe('Determine if a signal detection is associated to a legacy event', () => {
  const nullEvent = null;
  const undefinedEvent = undefined;
  const event: LegacyEventTypes.Event = {
    id: '1',
    status: LegacyEventTypes.EventStatus.AwaitingReview,
    modified: false,
    hasConflict: false,
    currentEventHypothesis: {
      processingStage: { id: '1' },
      eventHypothesis: {
        id: '1',
        rejected: false,
        event: {
          id: '1',
          status: LegacyEventTypes.EventStatus.AwaitingReview
        },
        associationsMaxArrivalTime: 1000000,
        signalDetectionAssociations: [
          {
            id: '1',
            deleted: false,
            signalDetectionHypothesis: {
              id: '20cc9505-efe3-3068-b7d5-59196f37992c',
              deleted: false,
              parentSignalDetectionId: '0'
            },
            eventHypothesisId: '1'
          }
        ],
        locationSolutionSets: [{ id: '1', count: 1, locationSolutions: [] }],
        preferredLocationSolution: { locationSolution: undefined }
      }
    },
    conflictingSdIds: []
  };
  const signalDetectionHypothesis = signalDetectionsData[0].signalDetectionHypotheses[0];
  test('Null event', () => {
    expect(
      isAssociatedToCurrentEventHypothesisLegacy(signalDetectionHypothesis, nullEvent)
    ).toEqual(false);
  });
  test('Undefined event', () => {
    expect(
      isAssociatedToCurrentEventHypothesisLegacy(signalDetectionHypothesis, undefinedEvent)
    ).toEqual(false);
  });
  test('Non-null event', () => {
    expect(isAssociatedToCurrentEventHypothesisLegacy(signalDetectionHypothesis, event)).toEqual(
      true
    );
  });
});
