import type { WasmVectorDouble } from './vector-double';

export interface WasmFIRFilterParametersModule {
  new (
    groupDelaySec: number,
    isDesigned: boolean,
    sampleRateHz: number,
    sampleRateToleranceHz: number,
    transferFunctionB: WasmVectorDouble
  ): WasmFIRFilterParameters;
}
export interface WasmFIRFilterParameters {
  isDesigned: boolean;
  groupDelay: number;
  $$: {
    ptr: number;
  };
  delete: () => void;
  getTransferFunctionAsTypedArray: () => number[];
}
