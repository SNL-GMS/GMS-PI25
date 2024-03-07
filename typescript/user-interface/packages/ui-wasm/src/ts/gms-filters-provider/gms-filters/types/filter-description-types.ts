export enum WasmFilterDescriptionType {
  BASE_FILTER_DESCRIPTION = 0,
  BASE_LINEAR_FILTER_DESCRIPTION = 1,
  FIR_FILTER_DESCRIPTION = 2,
  IIR_FILTER_DESCRIPTION = 3
}

export interface IFilterDescriptionType {
  BASE_FILTER_DESCRIPTION: {
    value: WasmFilterDescriptionType.BASE_FILTER_DESCRIPTION;
  };

  BASE_LINEAR_FILTER_DESCRIPTION: {
    value: WasmFilterDescriptionType.BASE_LINEAR_FILTER_DESCRIPTION;
  };

  FIR_FILTER_DESCRIPTION: {
    value: WasmFilterDescriptionType.FIR_FILTER_DESCRIPTION;
  };

  IIR_FILTER_DESCRIPTION: {
    value: WasmFilterDescriptionType.IIR_FILTER_DESCRIPTION;
  };
}
