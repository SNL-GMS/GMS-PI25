/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { location } from '@gms/common-model/__tests__/__data__';
import type {
  CellRendererParams,
  TooltipParams,
  ValueFormatterParams
} from '@gms/ui-core-components';

import { deletedColumnDef } from '~analyst-ui/components/events/table/columns/deleted';
import { depthUncertaintyColumnDef } from '~analyst-ui/components/events/table/columns/depth-uncertainty';
import { numberAssociatedColumnDef } from '~analyst-ui/components/events/table/columns/number-associated';
import { numberDefiningColumnDef } from '~analyst-ui/components/events/table/columns/number-defining';
import { timeUncertaintyColumnDef } from '~analyst-ui/components/events/table/columns/time-uncertainty';

import { getEventsTableColumnDefs } from '../../../../../../src/ts/components/analyst-ui/components/events/table/column-definitions';
import type { EventValueGetterParams } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/active-analysts';
import {
  activeAnalystsColumnDef,
  activeAnalystsTooltipValueGetter,
  activeAnalystsValueFormatter,
  activeAnalystsValueGetter
} from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/active-analysts';
import { confidenceSemiMajorColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/confidence-semi-major';
import { confidenceSemiMinorColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/confidence-semi-minor';
import { coverageSemiMajorColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/coverage-semi-major';
import { coverageSemiMinorColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/coverage-semi-minor';
import { depthColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/depth';
import { latitudeColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/latitude';
import { longitudeColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/longitude';
import { mbColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/mb';
import { mlColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/ml';
import { msColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/ms';
import { preferredColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/preferred';
import { regionColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/region';
import { statusColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/status';
import { timeColumnDef } from '../../../../../../src/ts/components/analyst-ui/components/events/table/columns/time';
import type { EventRow } from '../../../../../../src/ts/components/analyst-ui/components/events/types';
import { dummyData } from '../event-table-mock-data';

describe('Event Table Column Defs', () => {
  it('is exported', () => {
    expect(activeAnalystsValueGetter).toBeDefined();
    expect(activeAnalystsTooltipValueGetter).toBeDefined();
    expect(activeAnalystsValueFormatter).toBeDefined();
    expect(activeAnalystsColumnDef).toBeDefined();
    expect(confidenceSemiMajorColumnDef).toBeDefined();
    expect(confidenceSemiMinorColumnDef).toBeDefined();
    expect(coverageSemiMajorColumnDef).toBeDefined();
    expect(coverageSemiMinorColumnDef).toBeDefined();
    expect(depthColumnDef).toBeDefined();
    expect(depthUncertaintyColumnDef).toBeDefined();
    expect(latitudeColumnDef).toBeDefined();
    expect(longitudeColumnDef).toBeDefined();
    expect(mbColumnDef).toBeDefined();
    expect(mlColumnDef).toBeDefined();
    expect(msColumnDef).toBeDefined();
    expect(preferredColumnDef).toBeDefined();
    expect(regionColumnDef).toBeDefined();
    expect(timeColumnDef).toBeDefined();
    expect(timeUncertaintyColumnDef).toBeDefined();
    expect(statusColumnDef).toBeDefined();
    expect(numberAssociatedColumnDef).toBeDefined();
    expect(numberDefiningColumnDef).toBeDefined();
    expect(deletedColumnDef).toBeDefined();
    expect(getEventsTableColumnDefs).toBeDefined();
  });

  it('has column definitions', () => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(getEventsTableColumnDefs()).toHaveLength(24);
    expect(getEventsTableColumnDefs()).toMatchSnapshot();
  });

  it('has active analysts value getters', () => {
    const params: EventValueGetterParams = {
      getValue(field: string) {
        dummyData.activeAnalysts.join(', ');
      },
      node: undefined,
      data: dummyData,
      colDef: undefined,
      column: undefined,
      api: undefined,
      columnApi: undefined,
      context: undefined
    };

    const formattedParams: ValueFormatterParams<
      EventRow,
      unknown,
      string,
      CellRendererParams<any, any, any, any, any>,
      unknown
    > = {
      value: '',
      node: undefined,
      data: undefined,
      colDef: undefined,
      column: undefined,
      api: undefined,
      columnApi: undefined,
      context: undefined
    };

    const tooltipParams: TooltipParams = {
      ...params,
      location: 'cell'
    };

    params.data = { ...params.data, activeAnalysts: undefined };

    expect(activeAnalystsValueGetter(params)).toMatchInlineSnapshot(`undefined`);
    expect(activeAnalystsValueFormatter(formattedParams)).toMatchInlineSnapshot(`""`);

    params.data = { ...params.data, activeAnalysts: [] };

    expect(activeAnalystsValueGetter(params)).toMatchInlineSnapshot(`""`);
    expect(activeAnalystsValueFormatter(formattedParams)).toMatchInlineSnapshot(`""`);

    params.data = { ...params.data, activeAnalysts: ['Chillas'] };

    expect(activeAnalystsValueGetter(params)).toMatchInlineSnapshot(`"Chillas"`);
    expect(activeAnalystsValueFormatter(formattedParams)).toMatchInlineSnapshot(`""`);

    params.data = { ...params.data, activeAnalysts: dummyData.activeAnalysts };

    expect(activeAnalystsValueGetter(params)).toMatchInlineSnapshot(
      `"Chillas, Echidnas, I&T, Platform, SMEs"`
    );
    expect(activeAnalystsValueFormatter(formattedParams)).toMatchInlineSnapshot(`""`);
    expect(activeAnalystsTooltipValueGetter(tooltipParams)).toMatchInlineSnapshot(`undefined`);
  });
  it('has data formatters', () => {
    const formatterParams: any = {
      data: dummyData,
      api: undefined,
      colDef: undefined,
      column: undefined,
      addRenderedRowListener: undefined,
      columnApi: undefined,
      context: undefined,
      eGridCell: undefined,
      eParentOfValue: undefined,
      node: undefined,
      value: dummyData.activeAnalysts.join(', '),
      refreshCell: undefined,
      rowIndex: undefined,
      formatValue: undefined,
      getValue: undefined,
      setValue: undefined,
      valueFormatted: undefined,
      $scope: undefined
    };

    const mockSetDecimalPrecision = jest.fn(() => '0.0');

    jest.mock('@gms/ui-core-components', () => ({
      setDecimalPrecision: mockSetDecimalPrecision
    }));

    let testValue = '';

    // lat
    const latColDefFormatter = getEventsTableColumnDefs()[4].valueFormatter;
    if (typeof latColDefFormatter === 'function') {
      testValue = latColDefFormatter(formatterParams);
    }
    expect(testValue).toMatch(`${location.latitudeDegrees}`);

    // lon
    const lonDefFormatter = getEventsTableColumnDefs()[5].valueFormatter;
    if (typeof lonDefFormatter === 'function') {
      testValue = lonDefFormatter(formatterParams);
    }
    expect(testValue).toMatch(`${location.longitudeDegrees}`);
    // depth
    const depthDefFormatter = getEventsTableColumnDefs()[6].valueFormatter;
    if (typeof depthDefFormatter === 'function') {
      testValue = depthDefFormatter(formatterParams);
    }
    expect(testValue).toMatch(`${location.depthKm}`);

    // mb
    const mbDefFormatter = getEventsTableColumnDefs()[8].valueFormatter;
    if (typeof mbDefFormatter === 'function') {
      testValue = mbDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('5.2');

    // ms
    const msDefFormatter = getEventsTableColumnDefs()[9].valueFormatter;
    if (typeof msDefFormatter === 'function') {
      testValue = msDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('4.9');

    // ml
    const mlDefFormatter = getEventsTableColumnDefs()[10].valueFormatter;
    if (typeof mlDefFormatter === 'function') {
      testValue = mlDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('5.0');

    // number associated
    const numberAssociatedDefFormatter = getEventsTableColumnDefs()[11].valueFormatter;
    if (typeof numberAssociatedDefFormatter === 'function') {
      testValue = numberAssociatedDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('0');

    // number defining
    const numberDefiningDefFormatter = getEventsTableColumnDefs()[12].valueFormatter;
    if (typeof numberDefiningDefFormatter === 'function') {
      testValue = numberDefiningDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('0');

    // coverage major axis
    const coverageSemiMajorDefFormatter = getEventsTableColumnDefs()[14].valueFormatter;
    if (typeof coverageSemiMajorDefFormatter === 'function') {
      testValue = coverageSemiMajorDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('820.24');

    // coverage minor axis
    const coverageSemiMinorDefFormatter = getEventsTableColumnDefs()[15].valueFormatter;
    if (typeof coverageSemiMinorDefFormatter === 'function') {
      testValue = coverageSemiMinorDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('677.49');

    // confidence major axis
    const confidenceSemiMajorDefFormatter = getEventsTableColumnDefs()[16].valueFormatter;
    if (typeof confidenceSemiMajorDefFormatter === 'function') {
      testValue = confidenceSemiMajorDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('120.25');

    // confidence minor axis
    const confidenceSemiMinorDefFormatter = getEventsTableColumnDefs()[17].valueFormatter;
    if (typeof confidenceSemiMinorDefFormatter === 'function') {
      testValue = confidenceSemiMinorDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('67.41');
  });

  it('has filter value getters', () => {
    const formatterParams: any = {
      data: dummyData,
      api: undefined,
      colDef: undefined,
      column: undefined,
      addRenderedRowListener: undefined,
      columnApi: undefined,
      context: undefined,
      eGridCell: undefined,
      eParentOfValue: undefined,
      node: undefined,
      value: dummyData.activeAnalysts.join(', '),
      refreshCell: undefined,
      rowIndex: undefined,
      formatValue: undefined,
      getValue: undefined,
      setValue: undefined,
      valueFormatted: undefined,
      $scope: undefined
    };

    const mockSetDecimalPrecision = jest.fn(() => '0.0');

    jest.mock('@gms/ui-core-components', () => ({
      setDecimalPrecision: mockSetDecimalPrecision
    }));

    let testValue = '';

    // lat
    const latColDefFormatter = getEventsTableColumnDefs()[4].filterValueGetter;
    if (typeof latColDefFormatter === 'function') {
      testValue = latColDefFormatter(formatterParams);
    }
    expect(testValue).toMatch(`${location.latitudeDegrees}`);

    // lon
    const lonDefFormatter = getEventsTableColumnDefs()[5].filterValueGetter;
    if (typeof lonDefFormatter === 'function') {
      testValue = lonDefFormatter(formatterParams);
    }
    expect(testValue).toMatch(`${location.longitudeDegrees}`);

    // mb
    const mbDefFormatter = getEventsTableColumnDefs()[8].filterValueGetter;
    if (typeof mbDefFormatter === 'function') {
      testValue = mbDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('5.2');

    // ms
    const msDefFormatter = getEventsTableColumnDefs()[9].valueFormatter;
    if (typeof msDefFormatter === 'function') {
      testValue = msDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('4.9');

    // ml
    const mlDefFormatter = getEventsTableColumnDefs()[10].filterValueGetter;
    if (typeof mlDefFormatter === 'function') {
      testValue = mlDefFormatter(formatterParams);
    }
    expect(testValue).toMatch('5.0');
  });
});
