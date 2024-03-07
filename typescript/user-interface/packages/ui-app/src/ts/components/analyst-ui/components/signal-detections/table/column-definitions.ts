import { SignalDetectionColumn } from '@gms/ui-state';

import { getConflictColumnDef } from '~analyst-ui/common/table/conflict-marker/conflict-marker-column-def';
import { getDirtyDotColumnDef } from '~analyst-ui/common/table/dirty-dot/dirty-dot-column-def';

import { signalDetectionColumnDisplayStrings } from '../types';
import { amplitudeColumnDef } from './columns/amplitude';
import { assocStatusColumnDef } from './columns/assoc-status';
import { azimuthColumnDef } from './columns/azimuth';
import { azimuthStdDevColumnDef } from './columns/azimuth-std-dev';
import { channelColumnDef } from './columns/channel';
import { deletedColumnDef } from './columns/deleted';
import { emergenceAngleColumnDef } from './columns/emergence-angle';
import { longPeriodFirstMotionColumnDef } from './columns/long-period-first-motion';
import { periodColumnDef } from './columns/period';
import { phaseColumnDef } from './columns/phase';
import { phaseConfidenceColumnDef } from './columns/phase-confidence';
import { rectilinearityColumnDef } from './columns/rectilinearity';
import { shortPeriodFirstMotionColumnDef } from './columns/short-period-first-motion';
import { slownessColumnDef } from './columns/slowness';
import { slownessStandardDeviationColumnDef } from './columns/slowness-std-dev';
import { sNRColumnDef } from './columns/snr';
import { stationColumnDef } from './columns/station';
import { timeColumnDef } from './columns/time';
import { timeStandardDeviationColumnDef } from './columns/time-std-dev';

/**
 * @returns List of column definition objects for the Signal Detection Table
 */
export const getSignalDetectionTableColumnDefs = () => {
  return [
    getDirtyDotColumnDef(
      signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.unsavedChanges),
      SignalDetectionColumn.unsavedChanges,
      signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.unsavedChanges)
    ),
    assocStatusColumnDef,
    getConflictColumnDef(
      signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.conflict),
      SignalDetectionColumn.conflict,
      signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.conflict)
    ),
    stationColumnDef,
    channelColumnDef,
    phaseColumnDef,
    phaseConfidenceColumnDef,
    timeColumnDef,
    timeStandardDeviationColumnDef,
    azimuthColumnDef,
    azimuthStdDevColumnDef,
    slownessColumnDef,
    slownessStandardDeviationColumnDef,
    amplitudeColumnDef,
    periodColumnDef,
    sNRColumnDef,
    rectilinearityColumnDef,
    emergenceAngleColumnDef,
    shortPeriodFirstMotionColumnDef,
    longPeriodFirstMotionColumnDef,
    deletedColumnDef
  ];
};
