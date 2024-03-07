import type { WasmCascadedFilterParameters } from './cascade-filter-parameters';
import type { WasmVectorFilterDescriptionWrapper } from './vector-filter-description-wrapper';

export interface WasmCascadedFilterDescriptionModule {
  new (
    causal: boolean,
    comments: string,
    filterDescriptions: WasmVectorFilterDescriptionWrapper,
    parameters: WasmCascadedFilterParameters
  ): WasmCascadedFilterDescription;
}

export interface WasmCascadedFilterDescription {
  $$: {
    ptr: number;
  };
  causal: boolean;
  comments: string;
  filterDescriptions: WasmVectorFilterDescriptionWrapper;
  parameters: WasmCascadedFilterParameters;
  delete: () => void;
}
