import type { ColumnDefinition } from '@gms/ui-core-components';
import { EventsColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import { decimalPrecisionValueFormatter } from '~common-ui/common/table-utils';

import type { EventRow } from '../../types';
import { eventColumnDisplayStrings } from '../../types';

/**
 * Defines the status column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const observationsStandardDeviationColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  string,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.observationsStandardDeviation),
  field: EventsColumn.observationsStandardDeviation,
  headerTooltip: 'Standard deviation of observations',
  valueFormatter: params =>
    decimalPrecisionValueFormatter<EventRow>(params, EventsColumn.observationsStandardDeviation, 3)
};