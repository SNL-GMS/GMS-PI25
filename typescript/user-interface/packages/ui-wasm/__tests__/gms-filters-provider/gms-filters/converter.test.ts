import type {
  CascadedFilterDefinition,
  CascadedFilterDescription,
  LinearFilterDefinition,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import { Timer, uuid } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';

import {
  convertCascadedFilterDescription,
  convertIIRLinearFilterDescription,
  convertWasmCascadedFilterDescription,
  convertWasmLinearIIRFilterDescription
} from '../../../src/ts/gms-filters-provider/gms-filters/converter';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import type { WasmCascadedFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/cascaded-filter-description';
import type { WasmLinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-description';
import { designedFilterList } from './validation/filter-list-designed';
import {
  areCascadedFilterEquivalent,
  areLinearFilterDescEquivalent
} from './validation/test-utils';

const logger = UILogger.create('GMS_FILTERS_CONVERTER_TESTS', process.env.GMS_FILTERS);

describe('GMSFilters: Converter tests', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('Convert UI to WASM: LinearFilterDescription', async () => {
    const id = uuid.asString();
    const inputFilter: LinearFilterDefinition = designedFilterList.filters[0]
      .filterDefinition as LinearFilterDefinition;
    let wasmFilter: WasmLinearIIRFilterDescription;
    try {
      Timer.start(`${id} ui-wasm::ui to wasm converter`);
      wasmFilter = await convertIIRLinearFilterDescription(inputFilter.filterDescription);
      expect(wasmFilter.$$.ptr).not.toEqual(0);
      expect(wasmFilter.parameters.$$.ptr).not.toEqual(0);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      if (wasmFilter !== undefined) wasmFilter.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(wasmFilter);
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Convert UI to WASM: CascadedFilterDescription', async () => {
    const id = uuid.asString();
    const inputFilter: CascadedFilterDefinition = designedFilterList.filters[4]
      .filterDefinition as CascadedFilterDefinition;
    let wasmFilter: WasmCascadedFilterDescription;
    try {
      Timer.start(`${id} ui-wasm::ui to wasm converter`);
      wasmFilter = await convertCascadedFilterDescription(inputFilter.filterDescription);
      expect(wasmFilter.$$.ptr).not.toEqual(0);
      expect(wasmFilter.parameters.$$.ptr).not.toEqual(0);
      expect(wasmFilter.filterDescriptions.$$.ptr).not.toEqual(0);
      expect(wasmFilter.filterDescriptions.size()).toEqual(
        inputFilter.filterDescription.filterDescriptions.length
      );
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      if (wasmFilter !== undefined) wasmFilter.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(wasmFilter);
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Convert WASM to UI: LinearFilterDescription', async () => {
    const id = uuid.asString();
    const inputFilter: LinearFilterDefinition = designedFilterList.filters[0]
      .filterDefinition as LinearFilterDefinition;
    let wasmFilter: WasmLinearIIRFilterDescription;
    try {
      Timer.start(`${id} ui-wasm::ui to wasm converter`);
      wasmFilter = await convertIIRLinearFilterDescription(inputFilter.filterDescription);
      const actual: LinearFilterDescription = convertWasmLinearIIRFilterDescription(wasmFilter);
      areLinearFilterDescEquivalent(inputFilter.filterDescription, actual);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      if (wasmFilter !== undefined) wasmFilter.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(wasmFilter);
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Convert WASM to UI: CascadedFilterDescription', async () => {
    const id = uuid.asString();
    const inputFilter: CascadedFilterDefinition = designedFilterList.filters[4]
      .filterDefinition as CascadedFilterDefinition;
    let wasmFilter: WasmCascadedFilterDescription;
    try {
      Timer.start(`${id} ui-wasm::ui to wasm converter`);
      wasmFilter = await convertCascadedFilterDescription(inputFilter.filterDescription);
      const actual: CascadedFilterDescription = convertWasmCascadedFilterDescription(wasmFilter);
      areCascadedFilterEquivalent(inputFilter.filterDescription, actual);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      if (wasmFilter !== undefined) wasmFilter.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(wasmFilter);
      Timer.end(`${id} ui-wasm::design`);
    }
  });
});
