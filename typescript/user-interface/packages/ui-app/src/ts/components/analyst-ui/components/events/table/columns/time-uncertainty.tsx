import { setDecimalPrecision } from '@gms/common-util';
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
 * @returns Formatted string for timeUncertainty when it exists
 */
function timeUncertaintyValueFormatter(
  params: ValueFormatterParams<
    EventRow,
    unknown,
    string,
    CellRendererParams<EventRow, unknown, ArrivalTime, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): string {
  return params.data.time.uncertainty ? setDecimalPrecision(params.data.time.uncertainty, 3) : '';
}

/**
 * Custom valueGetter so that this column can be sorted on time only.
 *
 * @returns time as a number
 */
function timeUncertaintyValueGetter(
  params: ValueGetterParams<
    EventRow,
    unknown,
    string,
    CellRendererParams<EventRow, unknown, ArrivalTime, ICellRendererParams, IHeaderParams>,
    IHeaderParams
  >
): number {
  return params.data.time.uncertainty;
}

/**
 * Defines the time column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const timeUncertaintyColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  ArrivalTime,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.timeUncertainty),
  field: EventsColumn.timeUncertainty,
  headerTooltip: 'Event time standard deviation',
  width: 150,
  valueFormatter: timeUncertaintyValueFormatter,
  valueGetter: timeUncertaintyValueGetter
};
