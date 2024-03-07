import type { VectorDouble } from '../../../types/vector-double';
import type { WasmVectorDouble } from './vector-double';

export interface WasmIIRFilterParametersModule {
  new (
    groupDelaySec: number,
    isDesigned: boolean,
    sampleRateHz: number,
    sampleRateToleranceHz: number,
    sosNumerator: WasmVectorDouble,
    sosDenominator: WasmVectorDouble,
    sosCoefficients: WasmVectorDouble
  ): WasmIIRFilterParameters;
}

export interface WasmIIRFilterParameters {
  $$: {
    ptr: number;
  };
  delete: () => void;
  isDesigned: boolean;
  groupDelaySec: number;
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  sosNumerator: VectorDouble;
  sosDenominator: VectorDouble;
  sosCoefficients: VectorDouble;
  getSosNumeratorAsTypedArray: () => number[];
  getSosDenominatorAsTypedArray: () => number[];
  getSosCoefficientsAsTypedArray: () => number[];
}
