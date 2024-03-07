export enum WasmFilterDesignModel {
  BUTTERWORTH = 0,
  CHEBYSHEV_I = 1,
  CHEBYSHEV_II = 2,
  ELLIPTIC = 3
}
export interface IFilterDesignModel {
  BUTTERWORTH: {
    value: WasmFilterDesignModel.BUTTERWORTH;
  };

  CHEBYSHEV_I: {
    value: WasmFilterDesignModel.CHEBYSHEV_I;
  };

  CHEBYSHEV_II: {
    value: WasmFilterDesignModel.CHEBYSHEV_II;
  };

  ELLIPTIC: {
    value: WasmFilterDesignModel.ELLIPTIC;
  };
}
