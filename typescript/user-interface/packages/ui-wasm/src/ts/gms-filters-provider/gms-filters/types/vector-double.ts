export interface WasmVectorDoubleModule {
  new (): WasmVectorDouble;
}

export interface WasmVectorDouble {
  $$: {
    ptr: number;
  };

  delete: () => void;

  get: (index: number) => number;

  push_back: (value: number) => void;

  set: (index: number, value: number) => void;

  size: () => number;

  resize: (size: number, sizeBytes: number) => void;
}
