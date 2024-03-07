export enum WasmFilterBandType {
  LOW_PASS = 0,
  HIGH_PASS = 1,
  BAND_PASS = 2,
  BAND_REJECT = 3
}
export interface IFilterBandType {
  LOW_PASS: {
    value: WasmFilterBandType.LOW_PASS;
  };

  HIGH_PASS: {
    value: WasmFilterBandType.HIGH_PASS;
  };

  BAND_PASS: {
    value: WasmFilterBandType.BAND_PASS;
  };

  BAND_REJECT: {
    value: WasmFilterBandType.BAND_REJECT;
  };
}
