import { EventTypes } from '@gms/common-model';
import { eventData, openIntervalName } from '@gms/common-model/__tests__/__data__';
import type { AgGridReact } from '@gms/ui-core-components';
import type { EventStatus } from '@gms/ui-state';

import {
  buildEventRow,
  updateRowSelection
} from '../../../../../src/ts/components/analyst-ui/components/events/events-util';

const getTableApi = () => ({
  forEachNode: jest.fn()
});
const tableRef = {
  current: {
    getTableApi
  }
};
const selectedEvents = ['event1', 'event2', 'event3'];

describe('Events util', () => {
  const eventStatuses: Record<string, EventStatus> = {};
  eventStatuses[eventData.id] = {
    stageId: { name: openIntervalName },
    eventId: eventData.id,
    eventStatusInfo: {
      eventStatus: EventTypes.EventStatus.IN_PROGRESS,
      activeAnalystIds: ['user1', 'user2']
    }
  };
  it('builds a row correctly', () => {
    expect(
      buildEventRow(
        {
          event: eventData,
          eventStatus: eventStatuses[eventData.id],
          eventIsOpen: false,
          eventInConflict: false,
          eventIsActionTarget: false
        },
        openIntervalName,
        { startTimeSecs: 0, endTimeSecs: 100 },
        null
      )
    ).toMatchInlineSnapshot(`
      {
        "activeAnalysts": [
          "user1",
          "user2",
        ],
        "confidenceSemiMajorAxis": undefined,
        "confidenceSemiMinorAxis": undefined,
        "conflict": false,
        "coverageSemiMajorAxis": undefined,
        "coverageSemiMinorAxis": undefined,
        "deleted": false,
        "depthKm": {
          "uncertainty": undefined,
          "value": 3.3,
        },
        "eventFilterOptions": [
          "After",
        ],
        "id": "eventID",
        "isActionTarget": false,
        "isOpen": false,
        "isUnqualifiedActionTarget": false,
        "latitudeDegrees": 1.1,
        "longitudeDegrees": 2.2,
        "magnitudeMb": 1.2,
        "magnitudeMl": undefined,
        "magnitudeMs": undefined,
        "numberAssociated": 1,
        "numberDefining": 0,
        "observationsStandardDeviation": undefined,
        "preferred": true,
        "region": "TBD",
        "rejected": false,
        "status": "IN_PROGRESS",
        "time": {
          "uncertainty": undefined,
          "value": 3600,
        },
        "unsavedChanges": false,
      }
    `);
  });

  test('updateRowSelection returns tableRef', () => {
    const result = updateRowSelection(
      (tableRef as unknown) as React.MutableRefObject<AgGridReact>,
      selectedEvents
    );
    expect(result).toEqual(tableRef);
  });

  test('updateRowSelection returns null', () => {
    const emptyTableRef = {};
    let result = updateRowSelection(
      emptyTableRef as React.MutableRefObject<AgGridReact>,
      selectedEvents
    );
    expect(result).toEqual({});
    result = updateRowSelection(null, selectedEvents);
    expect(result).toBeNull();
  });
});
