import type { WasmLinearFIRFilterDescription } from './linear-fir-filter-description';
import type { WasmLinearIIRFilterDescription } from './linear-iir-filter-description';

export interface WasmFilterDescriptionWrapper {
  $$: {
    ptr: number;
  };
  delete: () => void;
  getFilterTypeValue: () => number;
  buildIIR(description: WasmLinearIIRFilterDescription);
  buildFIR(description: WasmLinearFIRFilterDescription);
  getWasmIIRDescription: () => WasmLinearIIRFilterDescription;
  getWasmFIRDescription: () => WasmLinearFIRFilterDescription;
}
