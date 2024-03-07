/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { WasmFilterBandType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-band-type';
import { WasmFilterDesignModel } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-design-model';
import type { WasmIIRFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/iir-filter-parameters';
import type { WasmLinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-description';

describe('GMS Filters Filter Description Test', () => {
  let MODULE: GmsFiltersModule;

  beforeAll(async () => {
    MODULE = await gmsFiltersModulePromise;
  });

  test('exists', () => {
    expect(MODULE).toBeDefined();
  });

  test('FilterDescription is defined and can be created', () => {
    expect(MODULE.LinearIIRFilterDescription).toBeDefined();

    let iirFilterParameters: WasmIIRFilterParameters;
    let linearIIRFilterDescription: WasmLinearIIRFilterDescription;

    try {
      const sosNumerator = new MODULE.VectorDouble();
      sosNumerator.push_back(1.1);
      sosNumerator.push_back(2.2);
      sosNumerator.push_back(3.3);
      const sosDenominator = new MODULE.VectorDouble();
      sosDenominator.push_back(4.4);
      sosDenominator.push_back(5.5);
      sosDenominator.push_back(6.6);
      const sosCoefficients = new MODULE.VectorDouble();
      sosCoefficients.push_back(7.7);
      sosCoefficients.push_back(8.8);
      sosCoefficients.push_back(9.9);

      iirFilterParameters = new MODULE.IIRFilterParameters(
        1,
        true,
        20,
        5,
        sosNumerator,
        sosDenominator,
        sosCoefficients
      );

      linearIIRFilterDescription = new MODULE.LinearIIRFilterDescription(
        iirFilterParameters,
        false,
        'comment',
        5.0,
        0.5,
        WasmFilterBandType.LOW_PASS,
        WasmFilterDesignModel.BUTTERWORTH,
        10,
        true
      );

      // assigned pointer value on create confirms it exists in WASM
      expect(iirFilterParameters.$$.ptr).not.toEqual(0);
      expect(linearIIRFilterDescription.$$.ptr).not.toEqual(0);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      iirFilterParameters.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(iirFilterParameters);

      linearIIRFilterDescription.delete();
      // eslint-disable-next-line no-underscore-dangle
      MODULE._free(linearIIRFilterDescription);
    }
  });
});
