/* eslint-disable @typescript-eslint/no-magic-numbers */

import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';

describe('GMS Filters Constants Test', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('constants and thresholds are defined and equal', () => {
    expect(MODULE.MAX_NAME_SIZE).toBeDefined();
    expect(MODULE.MAX_COMMENT_SIZE).toBeDefined();
    expect(MODULE.MAX_FILTER_ORDER).toBeDefined();
    expect(MODULE.MAX_POLES).toBeDefined();
    expect(MODULE.MAX_SOS).toBeDefined();
    expect(MODULE.MAX_TRANSFER_FUNCTION).toBeDefined();
    expect(MODULE.MAX_FILTER_DESCRIPTIONS).toBeDefined();
  });
});
