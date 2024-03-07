import type {
  CellRendererParams,
  ColumnDefinition,
  Row,
  TooltipParams
} from '@gms/ui-core-components';
import type React from 'react';

import { digitPrecision } from '../fk-util';

/** Interface that defines a cell of data */
export interface DataCell {
  value: number;
  uncertainty: number | undefined;
}

/** Interface for defining a row in the properties table */
export interface PropertiesRow extends Row {
  id: string;
  description: string;
  peak: DataCell | undefined;
  predicted: DataCell | undefined;
  selected: DataCell | undefined;
  residual: DataCell | undefined;
}

/** Returns true if the params passed in are for the Fstat/Power/Residual cell */
const isFstatOrPowerResidualCell = (params: any) =>
  params.colDef.headerName === 'Residual' &&
  (params.data.id === 'Fstat' || params.data.id === 'Power');

/**
 * Number formatter
 *
 * @param value Number to format
 * @param uncertainty Uncertainty value ot format
 */
const formatValueUncertaintyPair = (value: number, uncertainty: number): string =>
  `${value.toFixed(digitPrecision)} (\u00B1 ${uncertainty.toFixed(digitPrecision)})`;

const labelCellRenderer: React.FunctionComponent<any> = props => props.value;

/** Formats the table data cells */
const formatCell = (params: CellRendererParams<DataCell, any, DataCell, any, any>): string => {
  if (isFstatOrPowerResidualCell(params)) {
    return 'N/A';
  }
  return params.value && params.value.value ? params.value.value.toFixed(digitPrecision) : '-';
};

/** Formats the table data tooltips */
const formatTooltip = (params: TooltipParams): string => {
  if (params.value && params.value.value) {
    if (params.value.uncertainty) {
      return formatValueUncertaintyPair(params.value.value, params.value.uncertainty);
    }
    return params.value.value.toFixed(digitPrecision);
  }
  return '-';
};

/** Custom comparator to compare data cells */
const dataCellComparator = (valueA: DataCell, valueB: DataCell): number =>
  valueA.value - valueB.value;

/** Hard-coded columns for table */
export const columnDefs: ColumnDefinition<DataCell, unknown, DataCell, unknown, unknown>[] = [
  {
    headerName: '',
    field: 'description',
    width: 100,
    resizable: false,
    sortable: false,
    filter: false,
    cellRendererFramework: labelCellRenderer
  },
  {
    headerName: 'Peak',
    field: 'peak',
    width: 70,
    cellStyle: { textAlign: 'right' },
    resizable: true,
    sortable: true,
    filter: false,
    tooltipValueGetter: formatTooltip,
    // TODO should just implement formatValue
    cellRenderer: formatCell,
    comparator: dataCellComparator
  },
  {
    headerName: 'Predicted',
    field: 'predicted',
    width: 80,
    cellStyle: { textAlign: 'right' },
    resizable: true,
    sortable: true,
    filter: false,
    tooltipValueGetter: formatTooltip,
    cellRenderer: formatCell,
    comparator: dataCellComparator
  },
  {
    headerName: 'Selected',
    field: 'selected',
    cellStyle: { textAlign: 'right' },
    width: 80,
    resizable: true,
    sortable: true,
    filter: false,
    tooltipValueGetter: formatTooltip,
    cellRenderer: formatCell,
    comparator: dataCellComparator
  },
  {
    headerName: 'Residual',
    field: 'residual',
    cellStyle: params =>
      isFstatOrPowerResidualCell(params)
        ? { textAlign: 'right', color: 'grey' }
        : { textAlign: 'right' },
    width: 85,
    resizable: true,
    sortable: true,
    filter: false,
    tooltipValueGetter: formatTooltip,
    cellRenderer: formatCell,
    comparator: dataCellComparator
  }
];
