import { isDesigned } from '../../src/ts/gms-filters-provider';
import type { GmsFiltersModule } from '../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { undesignedFilterList } from './gms-filters/validation/filter-list';
import { designedFilterList } from './gms-filters/validation/filter-list-designed';

describe('ui-wasm::filter', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('is-designed::LinearFilterDescription', () => {
    const designed = designedFilterList.filters[0].filterDefinition;
    expect(isDesigned(designed)).toBeTruthy();
  });

  test('is-designed::CascadedFilterDescription', () => {
    const designed = designedFilterList.filters[4].filterDefinition;
    expect(isDesigned(designed)).toBeTruthy();
  });

  test('is-not-designed::LinearFilterDescription', () => {
    const notDesigned = undesignedFilterList.filters[0].filterDefinition;
    expect(isDesigned(notDesigned)).toBeFalsy();
  });

  test('is-not-designed::CascadedFilterDescription', () => {
    const notDesigned = undesignedFilterList.filters[4].filterDefinition;
    expect(isDesigned(notDesigned)).toBeFalsy();
  });
});
