import type { ColumnDefinition } from '@gms/ui-core-components';
import { EventsColumn } from '@gms/ui-state';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import type { EventRow } from '../../types';
import { eventColumnDisplayStrings } from '../../types';

/**
 * Defines the region column definition
 *
 * @param columnsToDisplayMap a map that specifies if the column is visible
 * @returns the column definition
 */
export const regionColumnDef: ColumnDefinition<
  EventRow,
  unknown,
  string,
  ICellRendererParams,
  IHeaderParams
> = {
  headerName: eventColumnDisplayStrings.get(EventsColumn.region),
  field: EventsColumn.region,
  headerTooltip: 'Region'
};
