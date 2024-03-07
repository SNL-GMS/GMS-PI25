import { Timer, uuid } from '@gms/common-util';

import { filter } from '../../../src/ts/gms-filters-provider';
import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultTaper
} from '../../../src/ts/gms-filters-provider/gms-filters/constants';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import dataIn from './validation/data-in.json';
import dataOut1 from './validation/data-out-1.json';
import dataOut2 from './validation/data-out-2.json';
import dataOut3 from './validation/data-out-3.json';
import dataOut4 from './validation/data-out-4.json';
import dataOut5 from './validation/data-out-5.json';
import dataOut6 from './validation/data-out-6.json';
import { designedFilterList } from './validation/filter-list-designed';
import { precisionCompare } from './validation/test-utils';

describe('ui-wasm::filter', () => {
  let MODULE: GmsFiltersModule;
  const DEFAULT_PRECISION = 11;
  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });
  test('exists', () => {
    expect(MODULE).toBeDefined();
  });
  test('Simple Low Pass', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut1.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[0].filterDefinition;

    Timer.start(`${id} GMS Filter: iir filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} GMS Filter: iir filter`);
    }
  });

  test('Simple High Pass', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut2.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[1].filterDefinition;

    Timer.start(`${id} GMS Filter: iir filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} GMS Filter: iir filter`);
    }
  });

  test('Simple Band Pass', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut3.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[2].filterDefinition;

    Timer.start(`${id} GMS Filter: iir filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} GMS Filter: iir filter`);
    }
  });

  test('Simple Band Reject', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut4.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[3].filterDefinition;

    Timer.start(`${id} GMS Filter: iir filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} GMS Filter: iir filter`);
    }
  });

  test('Simple Cascaded Filter LP-HP', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut5.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[4].filterDefinition;

    Timer.start(`${id} GMS Filter: cascaded filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} MODULE.cascadedFilterDesign()`);
    }
  });

  test('Cascaded Filter LP-HP-BP-BR-BR', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = new Float64Array(dataIn.x);
    const expectedResult = new Float64Array(dataOut6.y);
    const { length } = expectedResult;
    const id = uuid.asString();

    const designedFilter = designedFilterList.filters[5].filterDefinition;

    Timer.start(`${id} GMS Filter: cascaded filter`);
    try {
      const results: Float64Array = await filter(
        designedFilter,
        data,
        defaultTaper,
        false,
        defaultIndexOffset,
        defaultIndexInc
      ).then(output => {
        return output;
      });

      expect(results).toHaveLength(length);
      precisionCompare(results, expectedResult, DEFAULT_PRECISION);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} MODULE.cascadedFilterDesign()`);
    }
  });
});
