import type { Depth } from '@gms/common-model/lib/event';
import { setDecimalPrecision } from '@gms/common-util';
import type {
  CellRendererParams,
  ColumnDefinition,
  ValueFormatterParams,
  ValueGetterParams
} from '@gms/ui-core-components';
import { EventsColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import { medCellWidthPx } from '~common-ui/common/table-types';

import type { EventRow } from '../../types';
import { eventColumnDisplayStrings } from '../../types';

/**
 * @returns Formatted string
 */
function depthValueFormatter(
  params: ValueFormatterParams<
    EventRow,
    unknown,
    Depth,
    CellRendererParams<EventRow, unknown, Depth, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): string {
  return setDecimalPrecision(params.data.depthKm.value, 3);
}

/**
 * Custom valueGetter so that this column can be sorted on depthKm only.
 *
 * @returns depthKm as a number
 */
function timeValueGetter(
  params: ValueGetterParams<
    EventRow,
    unknown,
    string,
    CellRendererParams<EventRow, unknown, Depth, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): number {
  return params.data.depthKm.value;
}

/**
 * Defines the depth column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const depthColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  Depth,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.depthKm),
  field: EventsColumn.depthKm,
  headerTooltip: 'Depth in kilometers',
  width: medCellWidthPx,
  valueFormatter: depthValueFormatter,
  valueGetter: timeValueGetter
};
