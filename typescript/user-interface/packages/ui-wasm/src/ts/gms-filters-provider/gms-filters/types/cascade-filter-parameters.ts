export interface WasmCascadedFilterParametersModule {
  new (
    groupDelaySec: number,
    isDesigned: boolean,
    sampleRateHz: number,
    sampleRateToleranceHz: number
  ): WasmCascadedFilterParameters;
}

export interface WasmCascadedFilterParameters {
  $$: {
    ptr: number;
  };
  groupDelaySec: number;
  isDesigned: boolean;
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  delete: () => void;
}
