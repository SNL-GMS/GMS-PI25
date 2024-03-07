/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import type { WasmCascadedFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/cascade-filter-parameters';

describe('GMS Filters Cascaded Filters Parameters Test', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('CascadedFilterParameters is defined and can be created', () => {
    expect(MODULE.CascadedFilterParameters).toBeDefined();

    let cascadedFilterParameters: WasmCascadedFilterParameters;

    try {
      cascadedFilterParameters = new MODULE.CascadedFilterParameters(3, true, 20, 5);
      expect(cascadedFilterParameters).toBeDefined();
      expect(cascadedFilterParameters.delete).toBeDefined();
      expect(cascadedFilterParameters.sampleRateHz).toBeDefined();
      expect(cascadedFilterParameters.sampleRateHz).toEqual(20);
      expect(cascadedFilterParameters.sampleRateToleranceHz).toBeDefined();
      expect(cascadedFilterParameters.sampleRateToleranceHz).toEqual(5);
      expect(cascadedFilterParameters.groupDelaySec).toBeDefined();
      expect(cascadedFilterParameters.groupDelaySec).toEqual(3);
    } finally {
      cascadedFilterParameters.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(cascadedFilterParameters);
    }
  });
});
