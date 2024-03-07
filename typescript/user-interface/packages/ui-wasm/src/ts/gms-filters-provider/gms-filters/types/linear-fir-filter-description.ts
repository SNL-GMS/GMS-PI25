import type { WasmFilterComputationType } from './filter-computation-type';
import type { WasmFIRFilterParameters } from './fir-filter-parameters';
import type { WasmLinearFilterDescription } from './linear-filter-description';

export interface WasmLinearFIRFilterDescriptionModule {
  new (
    parameters: WasmFIRFilterParameters,
    causal: boolean,
    comments: string,
    cutoffHigh: number,
    cutoffLow: number,
    filterBandType: number,
    filterDesignModel: number,
    filterOrder: number,
    zeroPhase: boolean
  ): WasmLinearFIRFilterDescription;
}
export interface WasmLinearFIRFilterDescription extends WasmLinearFilterDescription {
  $$: {
    ptr: number;
  };
  delete: () => void;
  filterType: WasmFilterComputationType.FIR;
  firFilterParameters: WasmFIRFilterParameters;
}
