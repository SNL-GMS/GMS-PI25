import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { WasmFilterBandType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-band-type';
import { WasmFilterComputationType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-computation-type';
import { WasmFilterDescriptionType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-description-types';
import { WasmFilterDesignModel } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-design-model';

describe('GMSFilters: WASM enum parity tests', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('WasmFilterBandType', () => {
    expect(WasmFilterBandType.BAND_PASS as number).toEqual(MODULE.FilterBandType.BAND_PASS.value);
    expect(WasmFilterBandType.BAND_REJECT as number).toEqual(
      MODULE.FilterBandType.BAND_REJECT.value
    );
    expect(WasmFilterBandType.HIGH_PASS as number).toEqual(MODULE.FilterBandType.HIGH_PASS.value);
    expect(WasmFilterBandType.LOW_PASS as number).toEqual(MODULE.FilterBandType.LOW_PASS.value);
  });

  test('WasmFilterComputationType', () => {
    expect(WasmFilterComputationType.AR as number).toEqual(MODULE.FilterComputationType.AR.value);
    expect(WasmFilterComputationType.FIR as number).toEqual(MODULE.FilterComputationType.FIR.value);
    expect(WasmFilterComputationType.IIR as number).toEqual(MODULE.FilterComputationType.IIR.value);
    expect(WasmFilterComputationType.PM as number).toEqual(MODULE.FilterComputationType.PM.value);
  });

  test('WasmFilterDescriptionType', () => {
    expect(WasmFilterDescriptionType.FIR_FILTER_DESCRIPTION as number).toEqual(
      MODULE.FilterDescriptionType.FIR_FILTER_DESCRIPTION.value
    );
    expect(WasmFilterDescriptionType.IIR_FILTER_DESCRIPTION as number).toEqual(
      MODULE.FilterDescriptionType.IIR_FILTER_DESCRIPTION.value
    );
  });

  test('WasmFilterDesignModel', () => {
    expect(WasmFilterDesignModel.BUTTERWORTH as number).toEqual(
      MODULE.FilterDesignModel.BUTTERWORTH.value
    );
    expect(WasmFilterDesignModel.CHEBYSHEV_I as number).toEqual(
      MODULE.FilterDesignModel.CHEBYSHEV_I.value
    );
    expect(WasmFilterDesignModel.CHEBYSHEV_II as number).toEqual(
      MODULE.FilterDesignModel.CHEBYSHEV_II.value
    );
    expect(WasmFilterDesignModel.ELLIPTIC as number).toEqual(
      MODULE.FilterDesignModel.ELLIPTIC.value
    );
  });
});
