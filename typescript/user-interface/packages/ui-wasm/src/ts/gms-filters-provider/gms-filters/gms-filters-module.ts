/// <reference types="emscripten" />
import { UILogger } from '@gms/ui-util';

// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../wasm/gms-filters-provider';
import type { WasmCascadedFilterParametersModule } from './types/cascade-filter-parameters';
import type {
  WasmCascadedFilterDescription,
  WasmCascadedFilterDescriptionModule
} from './types/cascaded-filter-description';
import type { IFilterBandType } from './types/filter-band-type';
import type { IFilterComputationType } from './types/filter-computation-type';
import type { IFilterDescriptionType } from './types/filter-description-types';
import type { WasmFilterDescriptionWrapper } from './types/filter-description-wrapper';
import type { IFilterDesignModel } from './types/filter-design-model';
import type { WasmFIRFilterParametersModule } from './types/fir-filter-parameters';
import type { WasmIIRFilterParametersModule } from './types/iir-filter-parameters';
import type {
  WasmLinearFIRFilterDescription,
  WasmLinearFIRFilterDescriptionModule
} from './types/linear-fir-filter-description';
import type {
  WasmLinearIIRFilterDescription,
  WasmLinearIIRFilterDescriptionModule
} from './types/linear-iir-filter-description';
import type { WasmVectorDoubleModule } from './types/vector-double';
import type { WasmVectorFilterDescriptionWrapperModule } from './types/vector-filter-description-wrapper';
import type { WasmVectorStringModule } from './types/vector-string';

const logger = UILogger.create('GMS_FILTERS', process.env.GMS_FILTERS);

export interface GmsFiltersModule extends EmscriptenModule {
  HEAPF64: Float64Array;
  HEAPF32: Float32Array;
  MAX_NAME_SIZE: number;
  MAX_COMMENT_SIZE: number;
  MAX_FILTER_ORDER: number;
  MAX_POLES: number;
  MAX_SOS: number;
  MAX_TRANSFER_FUNCTION: number;
  MAX_FILTER_DESCRIPTIONS: number;

  FilterBandType: IFilterBandType;
  FilterComputationType: IFilterComputationType;
  FilterDescriptionType: IFilterDescriptionType;
  FilterDesignModel: IFilterDesignModel;

  _free(wasmObj: unknown): void;

  _malloc(ref: number): number;

  _iirFilterApply(
    descriptionPtr: number,
    inputPtr: number,
    dataSize: number,
    taper: number,
    removeGroupDelay: boolean,
    indexOffset: number,
    indexInclude: number
  ): void;

  _firFilterApply(
    descriptionPtr: number,
    inputPtr: number,
    dataSize: number,
    taper: number,
    removeGroupDelay: boolean,
    indexOffset: number,
    indexInclude: number
  ): void;

  _cascadedFilterApply(
    descriptionPtr: number,
    inputPtr: number,
    dataSize: number,
    taper: number,
    removeGroupDelay: boolean,
    indexOffset: number,
    indexInclude: number
  ): void;

  iirFilterDesign(description: WasmLinearIIRFilterDescription): WasmLinearIIRFilterDescription;
  firFilterDesign(description: WasmLinearFIRFilterDescription): WasmLinearFIRFilterDescription;
  cascadedFilterDesign(description: WasmCascadedFilterDescription): WasmCascadedFilterDescription;

  FilterDescriptionWrapper: WasmFilterDescriptionWrapper;

  CascadedFilterDescription: WasmCascadedFilterDescriptionModule;
  CascadedFilterParameters: WasmCascadedFilterParametersModule;
  IIRFilterParameters: WasmIIRFilterParametersModule;
  LinearIIRFilterDescription: WasmLinearIIRFilterDescriptionModule;
  FIRFilterParameters: WasmFIRFilterParametersModule;
  LinearFIRFilterDescription: WasmLinearFIRFilterDescriptionModule;

  VectorDouble: WasmVectorDoubleModule;
  VectorFilterDescriptionWrapper: WasmVectorFilterDescriptionWrapperModule;
  VectorString: WasmVectorStringModule;
}

let loadedGmsFiltersModule: GmsFiltersModule;

/**
 * !Helper function to ensure that the module only loads once.
 *
 * @returns a promise to load the GMS filters module
 */
const getGmsFiltersModule = async (): Promise<GmsFiltersModule> => {
  // load the module only once
  if (loadedGmsFiltersModule === undefined) {
    loadedGmsFiltersModule = await (gmsFilters as () => Promise<GmsFiltersModule>)();
    logger.debug('Loaded GMS Filter WASM Module', loadedGmsFiltersModule);
  }
  return loadedGmsFiltersModule;
};

/**
 * GMS filters module promise; used to load the module only once
 */
export const gmsFiltersModulePromise: Promise<GmsFiltersModule> = getGmsFiltersModule();
