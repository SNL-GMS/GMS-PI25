import type { WasmCascadedFilterDescription } from './cascaded-filter-description';
import type { WasmLinearFIRFilterDescription } from './linear-fir-filter-description';
import type { WasmLinearIIRFilterDescription } from './linear-iir-filter-description';

export interface WasmFilterDesigner {
  cascadedFilterDesign(filterDescriptionPtr: number): WasmCascadedFilterDescription;
  firFilterDesign(filterDescriptionPtr: number): WasmLinearFIRFilterDescription;
  iirFilterDesign(filterDescriptionPtr: number): WasmLinearIIRFilterDescription;
}
