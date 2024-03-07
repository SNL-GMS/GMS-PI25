import { EventsColumn } from '@gms/ui-state';

import { getConflictColumnDef } from '~analyst-ui/common/table/conflict-marker/conflict-marker-column-def';
import { getDirtyDotColumnDef } from '~analyst-ui/common/table/dirty-dot/dirty-dot-column-def';

import { eventColumnDisplayStrings } from '../types';
import { activeAnalystsColumnDef } from './columns/active-analysts';
import { confidenceSemiMajorColumnDef } from './columns/confidence-semi-major';
import { confidenceSemiMinorColumnDef } from './columns/confidence-semi-minor';
import { coverageSemiMajorColumnDef } from './columns/coverage-semi-major';
import { coverageSemiMinorColumnDef } from './columns/coverage-semi-minor';
import { deletedColumnDef } from './columns/deleted';
import { depthColumnDef } from './columns/depth';
import { depthUncertaintyColumnDef } from './columns/depth-uncertainty';
import { latitudeColumnDef } from './columns/latitude';
import { longitudeColumnDef } from './columns/longitude';
import { mbColumnDef } from './columns/mb';
import { mlColumnDef } from './columns/ml';
import { msColumnDef } from './columns/ms';
import { numberAssociatedColumnDef } from './columns/number-associated';
import { numberDefiningColumnDef } from './columns/number-defining';
import { observationsStandardDeviationColumnDef } from './columns/observerations-standard-dev';
import { preferredColumnDef } from './columns/preferred';
import { regionColumnDef } from './columns/region';
import { rejectedColumnDef } from './columns/rejected';
import { statusColumnDef } from './columns/status';
import { timeColumnDef } from './columns/time';
import { timeUncertaintyColumnDef } from './columns/time-uncertainty';

/**
 * @returns List of column definition objects for the Events Table
 */
export const getEventsTableColumnDefs = () => {
  return [
    getDirtyDotColumnDef(
      eventColumnDisplayStrings.get(EventsColumn.unsavedChanges),
      EventsColumn.unsavedChanges,
      eventColumnDisplayStrings.get(EventsColumn.unsavedChanges)
    ),
    getConflictColumnDef(
      eventColumnDisplayStrings.get(EventsColumn.conflict),
      EventsColumn.conflict,
      eventColumnDisplayStrings.get(EventsColumn.conflict)
    ),
    timeColumnDef,
    timeUncertaintyColumnDef,
    latitudeColumnDef,
    longitudeColumnDef,
    depthColumnDef,
    depthUncertaintyColumnDef,
    mbColumnDef,
    msColumnDef,
    mlColumnDef,
    numberAssociatedColumnDef,
    numberDefiningColumnDef,
    observationsStandardDeviationColumnDef,
    coverageSemiMajorColumnDef,
    coverageSemiMinorColumnDef,
    confidenceSemiMajorColumnDef,
    confidenceSemiMinorColumnDef,
    regionColumnDef,
    activeAnalystsColumnDef,
    preferredColumnDef,
    statusColumnDef,
    rejectedColumnDef,
    deletedColumnDef
  ];
};
