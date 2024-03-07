import { UILogger } from '@gms/ui-util';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/**
 * !!! Super important info about returning array values
 * https://stackoverflow.com/questions/17883799/how-to-handle-passing-returning-array-pointers-to-emscripten-compiled-code
 */
import { uiWasmProviderModule } from './ui-wasm-module';

const logger = UILogger.create('GMS_UI_WASM', process.env.GMS_UI_WASM);

export const getBoundsForPositionBuffer = async (
  data: Float64Array,
  startIndex = 1,
  endIndex = data.length - 1
): Promise<{ min: number; minSecs: number; max: number; maxSecs: number }> => {
  const uiProviderModule = await uiWasmProviderModule;

  let inputPtr: number;
  let minPtr: number;
  let minSecsPtr: number;
  let maxPtr: number;
  let maxSecsPtr: number;
  let resultMin: number;
  let resultMinSecs: number;
  let resultMax: number;
  let resultMaxSecs: number;

  try {
    // eslint-disable-next-line no-underscore-dangle
    inputPtr = uiProviderModule._malloc(data.length * data.BYTES_PER_ELEMENT);
    uiProviderModule.HEAPF64.set(data, inputPtr / data.BYTES_PER_ELEMENT);
    minPtr = uiProviderModule._malloc(data.BYTES_PER_ELEMENT);
    minSecsPtr = uiProviderModule._malloc(data.BYTES_PER_ELEMENT);
    maxPtr = uiProviderModule._malloc(data.BYTES_PER_ELEMENT);
    maxSecsPtr = uiProviderModule._malloc(data.BYTES_PER_ELEMENT);

    uiProviderModule.ccall(
      'cGetBoundsForPositionBuffer',
      null,
      ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
      [inputPtr, data.length, startIndex, endIndex, minPtr, minSecsPtr, maxPtr, maxSecsPtr]
    );

    resultMin = uiProviderModule.HEAPF64.at(minPtr / data.BYTES_PER_ELEMENT);
    resultMinSecs = uiProviderModule.HEAPF64.at(minSecsPtr / data.BYTES_PER_ELEMENT);
    resultMax = uiProviderModule.HEAPF64.at(maxPtr / data.BYTES_PER_ELEMENT);
    resultMaxSecs = uiProviderModule.HEAPF64.at(maxSecsPtr / data.BYTES_PER_ELEMENT);
  } catch (e) {
    logger.error('Failed to calculate the position buffer', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    uiProviderModule._free(inputPtr);
    uiProviderModule._free(minPtr);
    uiProviderModule._free(minSecsPtr);
    uiProviderModule._free(maxPtr);
    uiProviderModule._free(maxSecsPtr);
    /* eslint-enable no-underscore-dangle */
  }
  return {
    min: resultMin,
    minSecs: resultMinSecs,
    max: resultMax,
    maxSecs: resultMaxSecs
  };
};
