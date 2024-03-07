import type { ColumnDefinition } from '@gms/ui-core-components';
import { SignalDetectionColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import type { SignalDetectionRow } from '../../types';
import { signalDetectionColumnDisplayStrings } from '../../types';

/**
 * Signal Detection time std deviation definition
 */
export const timeStandardDeviationColumnDef: ColumnDefinition<
  SignalDetectionRow,
  unknown,
  string,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.timeStandardDeviation),
  field: SignalDetectionColumn.timeStandardDeviation,
  headerTooltip: 'Arrival time standard deviation',
  editable: true,
  cellClass: 'ag-cell-is-editable'
};
