import type { ColumnDefinition } from '@gms/ui-core-components';
import type { IHeaderParams } from 'ag-grid-community';

import type { DirtyDotCellRendererParams, UnsavedChangesRow } from './dirty-dot-cell-renderer';
import { DirtyDotCellRenderer } from './dirty-dot-cell-renderer';
import { DirtyDotHeaderComponent } from './dirty-dot-header';
import { dirtyDotCellComparator } from './dirty-dot-util';

/**
 * Base dirty dot/unsaved changes column definition
 */
export const getDirtyDotColumnDef = (
  headerName: string,
  field: string,
  headerTooltip: string
): ColumnDefinition<
  UnsavedChangesRow,
  unknown,
  boolean,
  DirtyDotCellRendererParams,
  IHeaderParams
> => ({
  headerClass: 'ag-grid__unsaved-changes',
  headerName,
  headerComponent: DirtyDotHeaderComponent,
  field,
  headerTooltip,
  cellRenderer: DirtyDotCellRenderer,
  comparator: dirtyDotCellComparator,
  width: 55
});
