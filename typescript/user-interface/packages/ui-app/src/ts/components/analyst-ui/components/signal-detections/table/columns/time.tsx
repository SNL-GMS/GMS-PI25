import type { ColumnDefinition } from '@gms/ui-core-components';
import { SignalDetectionColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import { largeCellWidthPx } from '~common-ui/common/table-types';

import type { SignalDetectionRow } from '../../types';
import { signalDetectionColumnDisplayStrings } from '../../types';

/**
 * Signal Detection time definition
 */
export const timeColumnDef: ColumnDefinition<
  SignalDetectionRow,
  unknown,
  string,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: signalDetectionColumnDisplayStrings.get(SignalDetectionColumn.time),
  field: SignalDetectionColumn.time,
  headerTooltip: 'Arrival time',
  width: largeCellWidthPx,
  initialSort: 'asc',
  editable: true,
  cellClass: 'ag-cell-is-editable'
};
