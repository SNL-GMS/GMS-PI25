import type { ColumnDefinition } from '@gms/ui-core-components';
import type { IHeaderParams } from 'ag-grid-community';

import type {
  ConflictMarkerCellRendererParams,
  ConflictRow
} from './conflict-marker-cell-renderer';
import { ConflictMarkerCellRenderer } from './conflict-marker-cell-renderer';

/**
 * Base conflict marker column definition
 */
export const getConflictColumnDef = (
  headerName: string,
  field: string,
  headerTooltip: string
): ColumnDefinition<
  ConflictRow,
  unknown,
  boolean,
  ConflictMarkerCellRendererParams,
  IHeaderParams
> => ({
  headerName,
  field,
  headerTooltip,
  cellRenderer: ConflictMarkerCellRenderer
});
