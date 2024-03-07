import { formatTimeForDisplay } from '@gms/common-util';
import type {
  CellRendererParams,
  ColumnDefinition,
  ValueFormatterParams,
  ValueGetterParams
} from '@gms/ui-core-components';
import type { ArrivalTime } from '@gms/ui-state';
import { EventsColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import type { EventRow } from '../../types';
import { eventColumnDisplayStrings } from '../../types';

/**
 * @returns Formatted date string
 */
function timeValueFormatter(
  params: ValueFormatterParams<
    EventRow,
    unknown,
    string,
    CellRendererParams<EventRow, unknown, ArrivalTime, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): string {
  return formatTimeForDisplay(params.data.time.value);
}

/**
 * Custom valueGetter so that this column can be sorted on time only.
 *
 * @returns time as a number
 */
function timeValueGetter(
  params: ValueGetterParams<
    EventRow,
    unknown,
    string,
    CellRendererParams<EventRow, unknown, ArrivalTime, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): number {
  return params.data.time.value;
}

/**
 * Defines the time column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const timeColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  ArrivalTime,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.time),
  field: EventsColumn.time,
  headerTooltip: 'Time',
  width: 300,
  valueFormatter: timeValueFormatter,
  valueGetter: timeValueGetter,
  sort: 'asc'
};
