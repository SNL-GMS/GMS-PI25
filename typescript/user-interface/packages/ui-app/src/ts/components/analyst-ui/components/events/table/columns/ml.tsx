import { setDecimalPrecision } from '@gms/common-util';
import type { ColumnDefinition } from '@gms/ui-core-components';
import { EventsColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import { singleDecimalComparator } from '~common-ui/common/table-utils';

import type { EventRow } from '../../types';
import { eventColumnDisplayStrings } from '../../types';

/**
 * Defines the ml column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const mlColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  number,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.magnitudeMl),
  field: EventsColumn.magnitudeMl,
  headerTooltip: 'Local magnitude',
  width: 60,
  valueFormatter: params => setDecimalPrecision(params.data.magnitudeMl, 1),
  filterValueGetter: params => setDecimalPrecision(params.data.magnitudeMl, 1),
  comparator: singleDecimalComparator
};
