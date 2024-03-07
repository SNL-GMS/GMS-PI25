export enum WasmFilterComputationType {
  FIR = 0,
  IIR = 1,
  AR = 2,
  PM = 3
}
export interface IFilterComputationType {
  FIR: {
    value: WasmFilterComputationType.FIR;
  };

  IIR: {
    value: WasmFilterComputationType.IIR;
  };

  AR: {
    value: WasmFilterComputationType.AR;
  };

  PM: {
    value: WasmFilterComputationType.PM;
  };
}
