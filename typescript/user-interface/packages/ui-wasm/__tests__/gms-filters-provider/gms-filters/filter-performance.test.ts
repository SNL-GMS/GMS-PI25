import { filter } from '../../../src/ts/gms-filters-provider';
import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultTaper
} from '../../../src/ts/gms-filters-provider/gms-filters/constants';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import testData from './90-minute-waveform-payload.json';
import { designedFilterList } from './validation/filter-list-designed';

function loadPayload() {
  let cnt = 0;
  const temp = [];
  Object.values(testData).forEach(val => {
    temp[cnt] = val;
    cnt += 1;
  });
  return Float64Array.from([...temp, ...temp, ...temp, ...temp]);
}

const MAX_TIME_ALLOWED = 100;

describe('ui-wasm::filter', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('Low Pass Performance', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = loadPayload();
    const designedFilter = designedFilterList.filters[0].filterDefinition;
    const startingMs = performance.now();
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
      const totalMs = performance.now() - startingMs;
      expect(results).toHaveLength(data.length);
      expect(totalMs).toBeLessThanOrEqual(MAX_TIME_ALLOWED * 2);
      console.log(`Low Pass Performance, ${totalMs}`);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    }
  });

  test('Cascaded Filter Performance', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const data = loadPayload();
    const designedFilter = designedFilterList.filters[4].filterDefinition;

    // TODO: The actual allowable time for cascaded filters to run is unknown
    const maxCascadeTime = MAX_TIME_ALLOWED * 5;
    const startingMs = performance.now();
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
      const totalMs = performance.now() - startingMs;
      expect(results).toHaveLength(data.length);
      expect(totalMs).toBeLessThanOrEqual(maxCascadeTime);
      console.log(`Cascaded Filter Performance, ${totalMs}`);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    }
  });
});
