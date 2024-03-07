import type { WasmFilterBandType } from './filter-band-type';
import type { WasmFilterComputationType } from './filter-computation-type';
import type { WasmFilterDesignModel } from './filter-design-model';

export interface WasmLinearFilterDescription {
  filterType: WasmFilterComputationType;
  filterDesignModel: WasmFilterDesignModel;
  passBandType: WasmFilterBandType;
  lowFrequency: number;
  highFrequency: number;
  order: number;
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  zeroPhase: boolean;
}
