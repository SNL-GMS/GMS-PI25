import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import { Timer, uuid } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';

import { design } from '../../../src/ts/gms-filters-provider';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { undesignedFilterList } from './validation/filter-list';
import { designedFilterList } from './validation/filter-list-designed';
import { areFilterDefinitionsEquivalent } from './validation/test-utils';
import { uiFilterList } from './validation/ui-filter-list';
import { designedUiFilterList } from './validation/ui-filter-list-designed';

const logger = UILogger.create('GMS_FILTERS_CONVERTER_TESTS', process.env.GMS_FILTERS);

describe('ui-wasm::design', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('Simple Low Pass', async () => {
    // Filter is destructive. Preserve inputs for comparison!
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[0].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[0].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Simple High Pass', async () => {
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[1].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[1].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Simple Band Pass', async () => {
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[2].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[2].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Simple Band Reject', async () => {
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[3].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[3].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('UI FilterDefinition design validation', async () => {
    const id = uuid.asString();
    const undesigned: FilterDefinition = uiFilterList.filters[0].filterDefinition;
    const expected: FilterDefinition = designedUiFilterList.filters[0].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('UI CascadedFilterDefinition design validation', async () => {
    const id = uuid.asString();
    const undesigned: FilterDefinition = uiFilterList.filters[5].filterDefinition;
    const expected: FilterDefinition = designedUiFilterList.filters[5].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Cascaded Filter LP-HP', async () => {
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[4].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[4].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });

  test('Cascaded Filter LP-HP-BP-BR-BR', async () => {
    const id = uuid.asString();
    const expected: FilterDefinition = designedFilterList.filters[5].filterDefinition;
    const undesigned: FilterDefinition = undesignedFilterList.filters[5].filterDefinition;

    Timer.start(`${id} ui-wasm::design`);
    try {
      const results = await design(undesigned).then(designed => {
        return designed;
      });
      areFilterDefinitionsEquivalent(expected, results);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      Timer.end(`${id} ui-wasm::design`);
    }
  });
});
