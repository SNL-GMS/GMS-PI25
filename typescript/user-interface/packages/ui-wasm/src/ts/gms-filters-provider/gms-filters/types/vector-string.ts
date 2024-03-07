export interface WasmVectorStringModule {
  new (): WasmVectorString;
}
export interface WasmVectorString {
  get: (index: number) => string;

  push_back: (index: string) => void;

  set: (index: number, value: string) => void;

  size: () => number;

  delete: () => void;
}
