import type { WasmFilterComputationType } from './filter-computation-type';
import type { WasmIIRFilterParameters } from './iir-filter-parameters';
import type { WasmLinearFilterDescription } from './linear-filter-description';

export interface WasmLinearIIRFilterDescriptionModule {
  new (
    parameters: WasmIIRFilterParameters,
    causal: boolean,
    comments: string,
    highFrequency: number,
    lowFrequency: number,
    passBandType: number,
    filterDesignModel: number,
    order: number,
    zeroPhase: boolean
  ): WasmLinearIIRFilterDescription;
}

export interface WasmLinearIIRFilterDescription extends WasmLinearFilterDescription {
  $$: {
    ptr: number;
  };
  delete: () => void;

  causal: boolean;
  comments: string;
  filterType: WasmFilterComputationType.IIR;
  parameters: WasmIIRFilterParameters;
}
