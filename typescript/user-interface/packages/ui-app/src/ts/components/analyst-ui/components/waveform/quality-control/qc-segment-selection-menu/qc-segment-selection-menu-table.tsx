import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type { UITheme } from '@gms/common-model/lib/ui-configuration/types';
import {
  DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  secondsToString
} from '@gms/common-util';
import type { ColumnDefinition } from '@gms/ui-core-components';
import { closeContextMenu, Table } from '@gms/ui-core-components';
import { useUiTheme } from '@gms/ui-state';
import type { RowDoubleClickedEvent } from 'ag-grid-community';
import classNames from 'classnames';
import flatten from 'lodash/flatten';
import React from 'react';

import type { SwatchRow } from '../qc-segment-utils';
import {
  getQCSegmentCategoryOrTypeString,
  getQCSegmentSwatchColor,
  getTableContainerHeight,
  SwatchCellRenderer
} from '../qc-segment-utils';
import type { QcSegmentContextMenuOpenFunc } from '../types';

/**
 * Defines the properties of a table row in {@link QcSegmentSelectionMenuTable}
 */
interface QcSegmentDetailsRow extends SwatchRow {
  channelName: string;
  startTime: number;
  endTime: number;
  category: string;
  type: string;
  stage: string;
  author: string;
  effectiveAt: number;
  rationale: string;
}

/**
 * Component props for {@link QcSegmentSelectionMenuTable}
 */
interface QcSegmentSelectionMenuTableProps {
  /** List of QC segments to be displayed by the table */
  qcSegments: QcSegment[];
  /** Callback function used to open a selected QC Segment in the editing context menu. */
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
}

/** Base column properties for the {@link QcSegmentSelectionMenuTable} */
const DEFAULT_COL_DEF: ColumnDefinition<QcSegmentDetailsRow, unknown, unknown, unknown, unknown> = {
  sortable: true,
  cellClass: ['monospace', 'selectable'],
  cellStyle: { textAlign: 'left' }
};

/**
 * Column definitions for the {@link QcSegmentSelectionMenuTable}
 */
const QC_SEGMENT_DETAILS_COLUMN_DEFINITIONS: ColumnDefinition<
  QcSegmentDetailsRow,
  unknown,
  unknown,
  unknown,
  unknown
>[] = [
  {
    headerName: '', // No header text for the swatch
    field: 'color',
    width: 30,
    sortable: false,
    cellRenderer: SwatchCellRenderer,
    cellStyle: { paddingLeft: '0px', paddingRight: '0px' } // Allow the swatch to fully fill the cell
  },
  {
    headerName: 'Category',
    field: 'category',
    width: 125
  },
  {
    headerName: 'Type',
    field: 'type',
    width: 160
  },
  {
    headerName: 'Channel name',
    field: 'channelName',
    width: 125
  },
  {
    headerName: 'Start time',
    field: 'startTime',
    width: 165,
    sort: 'asc', // Default sort based on Start Time
    valueFormatter: e =>
      secondsToString(e.data.startTime, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'End time',
    field: 'endTime',
    width: 165,
    valueFormatter: e =>
      secondsToString(e.data.endTime, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'Stage',
    field: 'stage',
    width: 125
  },
  {
    headerName: 'Author',
    field: 'author',
    width: 125
  },
  {
    headerName: 'Effective at',
    field: 'effectiveAt',
    width: 165,
    valueFormatter: e =>
      e.data.effectiveAt === -1
        ? 'TBD'
        : secondsToString(e.data.effectiveAt, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'Rationale',
    field: 'rationale',
    width: 300
  }
];

/**
 * @returns An array of {@link QcSegmentDetailsRow}s that can be used by AG Grid.
 */
function generateQcSegmentSelectionMenuTableRows(
  qcSegments: QcSegment[],
  uiTheme: UITheme
): QcSegmentDetailsRow[] {
  const rows = flatten(
    qcSegments.map<QcSegmentDetailsRow>(qc => {
      const { versionHistory } = qc;
      const {
        category = 'Unknown',
        startTime,
        endTime,
        createdBy,
        id,
        rationale,
        rejected,
        type = 'Unknown',
        stageId = { name: 'Unknown' }
      } = versionHistory[versionHistory.length - 1];

      const swatchColor = getQCSegmentSwatchColor(category, uiTheme, rejected);

      return {
        color: swatchColor,
        id: qc.id,
        channelName: qc.channel.name,
        startTime,
        endTime,
        category: getQCSegmentCategoryOrTypeString(category, rejected),
        type: getQCSegmentCategoryOrTypeString(type, rejected),
        stage: stageId.name,
        author: createdBy,
        effectiveAt: id.effectiveAt,
        rationale
      };
    })
  );
  if (rows.length > 0) rows[0]['first-in-table'] = true;
  return rows;
}

/**
 * Table that displays the details of a given {@link QcSegment} array.
 * For use within the QcSegmentSelectionMenu.
 */
export const QcSegmentSelectionMenuTable = React.memo(function QcSegmentSelectionMenuTable({
  qcSegments,
  qcSegmentEditContextMenuCb
}: QcSegmentSelectionMenuTableProps): JSX.Element {
  /**
   * Opens the double-clicked QC Segment in the editing context menu.
   * Programmatically closes the {@link QcSegmentSelectionMenuTable} (this component).
   */
  const onRowDoubleClickedCallback = React.useCallback(
    (event: RowDoubleClickedEvent) => {
      const { node } = event;
      const selectedQcSegment = qcSegments.find(qc => qc.id === node.data.id);
      closeContextMenu();
      qcSegmentEditContextMenuCb(event.event, selectedQcSegment);
    },
    [qcSegmentEditContextMenuCb, qcSegments]
  );

  const [uiTheme] = useUiTheme();

  const rowData = React.useMemo(
    () => generateQcSegmentSelectionMenuTableRows(qcSegments, uiTheme),
    [qcSegments, uiTheme]
  );

  const maxRows = 5;
  const style = getTableContainerHeight(rowData.length, maxRows);

  if (qcSegments?.length > 0) {
    return (
      <div className={classNames('ag-theme-dark', 'qc-segment-selection-menu-table')} style={style}>
        <div className="max">
          <Table<QcSegmentDetailsRow, unknown>
            defaultColDef={DEFAULT_COL_DEF}
            columnDefs={QC_SEGMENT_DETAILS_COLUMN_DEFINITIONS}
            rowData={rowData}
            overlayNoRowsTemplate="No QC segments to display"
            getRowId={params => params.data.id}
            rowSelection="multiple"
            suppressCellFocus
            onRowDoubleClicked={onRowDoubleClickedCallback}
          />
        </div>
      </div>
    );
  }
  return undefined;
});
