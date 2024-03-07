import type { WasmFilterDescriptionWrapper } from './filter-description-wrapper';

export interface WasmVectorFilterDescriptionWrapperModule {
  new (): WasmVectorFilterDescriptionWrapper;
}

export interface WasmVectorFilterDescriptionWrapper {
  $$: {
    ptr: number;
  };

  delete: () => void;

  get: (index: number) => WasmFilterDescriptionWrapper;

  push_back: (index: WasmFilterDescriptionWrapper) => void;

  set: (index: number, value: WasmFilterDescriptionWrapper) => void;

  size: () => number;
}
