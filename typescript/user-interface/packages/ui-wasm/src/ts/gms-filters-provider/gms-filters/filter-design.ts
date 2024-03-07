import type {
  CascadedFilterDescription,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import { UILogger } from '@gms/ui-util';

import {
  convertCascadedFilterDescription,
  convertIIRLinearFilterDescription,
  convertWasmCascadedFilterDescription,
  convertWasmLinearIIRFilterDescription
} from './converter';
import { gmsFiltersModulePromise } from './gms-filters-module';
import type { WasmCascadedFilterDescription } from './types/cascaded-filter-description';
import type { WasmLinearIIRFilterDescription } from './types/linear-iir-filter-description';
import { validateLinearFilterDescription } from './validators';

const logger = UILogger.create('GMS_FILTERS_FILTER_DESIGN', process.env.GMS_FILTERS);

/**
 * Designs a Cascaded Filter Description
 *
 * @param filterDescription the filter description to design
 * @returns the designed filter definition
 */
export async function cascadedFilterDesign(
  filterDescription: CascadedFilterDescription
): Promise<CascadedFilterDescription> {
  const gmsFiltersModule = await gmsFiltersModulePromise;
  let filterDesc: WasmCascadedFilterDescription;
  let clone: CascadedFilterDescription;
  let result: WasmCascadedFilterDescription;
  try {
    filterDesc = await convertCascadedFilterDescription(filterDescription);
    // eslint-disable-next-line no-underscore-dangle
    result = gmsFiltersModule.cascadedFilterDesign(filterDesc);
    clone = convertWasmCascadedFilterDescription(result);
  } catch (e) {
    logger.error('Failed to design filter using GMS cascade filter design', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    if (filterDesc !== undefined) filterDesc.delete();
    if (result !== undefined) result.delete();
    gmsFiltersModule._free(result);
    gmsFiltersModule._free(filterDesc);
    /* eslint-enable no-underscore-dangle */
  }

  return clone;
}

/**
 * Exposes the WASM IIR filter design algorithm
 *
 * @param filterDefinition the UI filter definition
 * @returns the designed UI LinearFilterDefinition
 */
export async function iirFilterDesign(
  filterDescription: LinearFilterDescription
): Promise<LinearFilterDescription> {
  let clone: LinearFilterDescription;
  let desc: WasmLinearIIRFilterDescription;
  const gmsFiltersModule = await gmsFiltersModulePromise;
  validateLinearFilterDescription(filterDescription);

  try {
    desc = await convertIIRLinearFilterDescription(filterDescription);
    // eslint-disable-next-line no-underscore-dangle
    const designedFilter: WasmLinearIIRFilterDescription = gmsFiltersModule.iirFilterDesign(desc);
    clone = convertWasmLinearIIRFilterDescription(designedFilter);
  } catch (e) {
    logger.error('Failed to design filter using GMS iir filter design', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    if (desc !== undefined) desc.delete();
    gmsFiltersModule._free(desc);
    /* eslint-enable no-underscore-dangle */
  }
  return clone;
}
