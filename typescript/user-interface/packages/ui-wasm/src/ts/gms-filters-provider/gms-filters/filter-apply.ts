import type {
  CascadedFilterDescription,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import { UILogger } from '@gms/ui-util';

import { defaultIndexInc, defaultIndexOffset } from './constants';
import { convertCascadedFilterDescription, convertIIRLinearFilterDescription } from './converter';
import { gmsFiltersModulePromise } from './gms-filters-module';
import type { WasmCascadedFilterDescription } from './types/cascaded-filter-description';
import type { WasmLinearIIRFilterDescription } from './types/linear-iir-filter-description';

const logger = UILogger.create('GMS_FILTERS_FILTER_APPLY', process.env.GMS_FILTERS);

/**
 * Applies a Cascaded Filter Definition to the provided data (filters the data).
 *
 * @param filterDescription a Cascaded Filter Description
 * @param data  waveform data
 * @param taper the specified amount to taper waveform
 * @param removeGroupDelay optional boolean to determine if group delay should be applied, defaults to false
 * @param indexOffset the index offset (starting position) when accessing the data
 * @param indexInc the index incrementor (starting from indexOffset) used when accessing the data
 * @returns Float64Array of the filtered waveform data
 */
export async function cascadedFilterApply(
  filterDescription: CascadedFilterDescription,
  data: Float64Array,
  taper: number,
  removeGroupDelay: boolean,
  indexOffset: number = defaultIndexOffset,
  indexInc: number = defaultIndexInc
): Promise<Float64Array> {
  const gmsFiltersModule = await gmsFiltersModulePromise;
  let desc: WasmCascadedFilterDescription;
  let result: Float64Array;
  let inputPtr = 0;

  try {
    desc = await convertCascadedFilterDescription(filterDescription);

    /* eslint-disable no-underscore-dangle */
    inputPtr = gmsFiltersModule._malloc(data.length * data.BYTES_PER_ELEMENT);
    gmsFiltersModule.HEAPF64.set(data, inputPtr / data.BYTES_PER_ELEMENT);
    gmsFiltersModule._cascadedFilterApply(
      desc.$$.ptr,
      inputPtr,
      data.length,
      taper,
      removeGroupDelay,
      indexOffset,
      indexInc
    );

    result = new Float64Array(
      gmsFiltersModule.HEAPF64.subarray(
        inputPtr / data.BYTES_PER_ELEMENT,
        inputPtr / data.BYTES_PER_ELEMENT + data.length
      )
    );
  } catch (e) {
    logger.error('Failed to filter using GMS cascade filter', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    if (desc !== undefined) desc.delete();
    gmsFiltersModule._free(desc);
    gmsFiltersModule._free(inputPtr);
    /* eslint-enable no-underscore-dangle */
  }

  return result;
}

export async function iirFilterApply(
  filterDescription: LinearFilterDescription,
  data: Float64Array,
  taper: number,
  removeGroupDelay: boolean,
  indexOffset: number = defaultIndexOffset,
  indexInc: number = defaultIndexInc
): Promise<Float64Array> {
  const gmsFiltersModule = await gmsFiltersModulePromise;

  let linearIIRFilterDescription: WasmLinearIIRFilterDescription;
  let result: Float64Array;
  let inputPtr = 0;
  try {
    linearIIRFilterDescription = await convertIIRLinearFilterDescription(filterDescription);

    /* eslint-disable no-underscore-dangle */
    inputPtr = gmsFiltersModule._malloc(data.length * data.BYTES_PER_ELEMENT);
    gmsFiltersModule.HEAPF64.set(data, inputPtr / data.BYTES_PER_ELEMENT);
    gmsFiltersModule._iirFilterApply(
      linearIIRFilterDescription.$$.ptr,
      inputPtr,
      data.length,
      taper,
      removeGroupDelay,
      indexOffset,
      indexInc
    );
    result = new Float64Array(
      gmsFiltersModule.HEAPF64.subarray(
        inputPtr / data.BYTES_PER_ELEMENT,
        inputPtr / data.BYTES_PER_ELEMENT + data.length
      )
    );
  } catch (e) {
    logger.error('Failed to filter using GMS iir filter', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    if (linearIIRFilterDescription !== undefined) linearIIRFilterDescription.delete();
    gmsFiltersModule._free(inputPtr);
    gmsFiltersModule._free(linearIIRFilterDescription);
    /* eslint-enable no-underscore-dangle */
  }

  return result;
}
