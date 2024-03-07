import type {
  CascadedFilterDescription,
  CascadedFilterParameters,
  LinearFilterDescription,
  LinearFilterParameters
} from '@gms/common-model/lib/filter/types';
import { BandType, FilterType } from '@gms/common-model/lib/filter/types';
import { UILogger } from '@gms/ui-util';

import { gmsFiltersModulePromise } from './gms-filters-module';
import type { WasmCascadedFilterParameters } from './types/cascade-filter-parameters';
import type { WasmCascadedFilterDescription } from './types/cascaded-filter-description';
import { WasmFilterBandType } from './types/filter-band-type';
import { WasmFilterDescriptionType } from './types/filter-description-types';
import type { WasmFilterDescriptionWrapper } from './types/filter-description-wrapper';
import { WasmFilterDesignModel } from './types/filter-design-model';
import type { WasmIIRFilterParameters } from './types/iir-filter-parameters';
import type { WasmLinearIIRFilterDescription } from './types/linear-iir-filter-description';
import type { WasmVectorDouble } from './types/vector-double';
import type { WasmVectorFilterDescriptionWrapper } from './types/vector-filter-description-wrapper';
import {
  areCoefficientsPopulated,
  isCascadedFilterDescriptionDesigned,
  isLinearFilterParametersDesigned
} from './util';
import { validateCascadedFilterDescription } from './validators';

const logger = UILogger.create('GMS_FILTERS_CONVERTER', process.env.GMS_FILTERS);

/**
 * Converts from WASM parameters to TS parameters
 *
 * @param parameters WASM parameters
 * @returns LinearFilterParameters
 */
function convertWasmIIRFilterParameters(
  parameters: WasmIIRFilterParameters
): LinearFilterParameters {
  return {
    sampleRateHz: parameters.sampleRateHz,
    sampleRateToleranceHz: parameters.sampleRateToleranceHz,
    groupDelaySec: parameters.groupDelaySec,
    aCoefficients: [...new Float64Array(parameters.getSosDenominatorAsTypedArray())],
    bCoefficients: [...new Float64Array(parameters.getSosNumeratorAsTypedArray())]
  };
}

/**
 * Converts the WASM LinearIIRFilterDescription  to the  UI LinearFilterDefinition
 *
 * @param filterDescription the WASM filter LinearIIRFilterDescription
 * @returns UI LinearFilterDescription
 */
export function convertWasmLinearIIRFilterDescription(
  filterDescription: WasmLinearIIRFilterDescription
): LinearFilterDescription {
  const uiParams = convertWasmIIRFilterParameters(filterDescription.parameters);
  return {
    comments: filterDescription.comments,
    causal: filterDescription.causal,
    filterType: FilterType.IIR_BUTTERWORTH,
    lowFrequency: filterDescription.lowFrequency,
    highFrequency: filterDescription.highFrequency,
    order: filterDescription.order,
    zeroPhase: !!filterDescription.zeroPhase,
    passBandType: Object.values(BandType)[filterDescription.passBandType],
    parameters: uiParams
  };
}

/**
 * Converts to WASM vector
 *
 * @param vec VectorFilterDescriptionWrapper to convert
 * @returns LinearFilterDescription[]
 */
function convertWasmVectorFilterDescriptionWrapper(
  vec: WasmVectorFilterDescriptionWrapper
): LinearFilterDescription[] {
  const clone: LinearFilterDescription[] = [];
  for (let i = 0; i < vec.size(); i += 1) {
    const desc: WasmFilterDescriptionWrapper = vec.get(i);
    if (desc.getFilterTypeValue() === WasmFilterDescriptionType.IIR_FILTER_DESCRIPTION) {
      const uiDesc = convertWasmLinearIIRFilterDescription(desc.getWasmIIRDescription());
      clone.push(uiDesc);
    }
  }
  return clone;
}

/**
 * Converts from WASM type to TS
 *
 * @param params WasmCascadedFilterParameters
 * @returns CascadedFilterParameters
 */
function convertWasmCascadedFilterParameters(
  params: WasmCascadedFilterParameters
): CascadedFilterParameters {
  return {
    groupDelaySec: params.groupDelaySec,
    sampleRateHz: params.sampleRateHz,
    sampleRateToleranceHz: params.sampleRateToleranceHz
  };
}

/**
 * Converts from WASM to TS
 *
 * @param desc WasmCascadedFilterDescription
 * @returns CascadedFilterDescription
 */
export function convertWasmCascadedFilterDescription(
  desc: WasmCascadedFilterDescription
): CascadedFilterDescription {
  const descriptions: LinearFilterDescription[] = convertWasmVectorFilterDescriptionWrapper(
    desc.filterDescriptions
  );
  return {
    filterType: FilterType.CASCADE,
    parameters: convertWasmCascadedFilterParameters(desc.parameters),
    filterDescriptions: descriptions,
    comments: desc.comments,
    causal: desc.causal
  };
}

/**
 * Converts the UI LinearFilterParameters to the WASM Boundary model
 *
 *  ! This creates an object in WASM memory. It must be deleted and freed.
 *
 * @param uiParameters the UI filter parameters
 * @returns WASM boundary IIRFilterParameters
 */
async function convertIIRLinearFilterParameters(
  uiParameters: LinearFilterParameters
): Promise<WasmIIRFilterParameters> {
  const gmsFiltersModule = await gmsFiltersModulePromise;

  const sosNums: WasmVectorDouble = new gmsFiltersModule.VectorDouble();
  const sosDenoms: WasmVectorDouble = new gmsFiltersModule.VectorDouble();
  const sosCoeffs: WasmVectorDouble = new gmsFiltersModule.VectorDouble();
  const isDesigned = isLinearFilterParametersDesigned(uiParameters);

  if (isDesigned) {
    uiParameters.aCoefficients.forEach(element => {
      sosDenoms.push_back(element);
    });
    uiParameters.bCoefficients.forEach(element => {
      sosNums.push_back(element);
    });
  }
  const result = new gmsFiltersModule.IIRFilterParameters(
    uiParameters.groupDelaySec,
    isDesigned,
    uiParameters.sampleRateHz,
    uiParameters.sampleRateToleranceHz,
    sosNums,
    sosDenoms,
    sosCoeffs
  );
  return result;
}

/**
 * Converts the UI LinearFilterDescription to the WASM LinearIIRFilterDescription
 *
 *  ! This creates an object on the WASM heap. It must be deleted and freed
 *
 * @param filterDescription the UI filter Description
 * @returns WASM boundary LinearIIRFilterDescription
 */
export async function convertIIRLinearFilterDescription(
  filterDescription: LinearFilterDescription
): Promise<WasmLinearIIRFilterDescription> {
  const gmsFiltersModule = await gmsFiltersModulePromise;
  const wasmParams = await convertIIRLinearFilterParameters(filterDescription.parameters);

  let filterBandType: WasmFilterBandType;
  if (filterDescription.passBandType === BandType.BAND_PASS) {
    filterBandType = WasmFilterBandType.BAND_PASS;
  } else if (filterDescription.passBandType === BandType.BAND_REJECT) {
    filterBandType = WasmFilterBandType.BAND_REJECT;
  } else if (filterDescription.passBandType === BandType.HIGH_PASS) {
    filterBandType = WasmFilterBandType.HIGH_PASS;
  } else {
    filterBandType = WasmFilterBandType.LOW_PASS;
  }

  // TODO: LinearFilterDescription should allow for more than Butterworth
  const filterDesignModel: WasmFilterDesignModel = WasmFilterDesignModel.BUTTERWORTH;

  return new gmsFiltersModule.LinearIIRFilterDescription(
    wasmParams,
    filterDescription.causal,
    filterDescription.comments,
    filterDescription.highFrequency,
    filterDescription.lowFrequency,
    filterBandType,
    filterDesignModel,
    filterDescription.order,
    filterDescription.zeroPhase
  );
}

function convertToWasmBandType(bandType: BandType): WasmFilterBandType {
  if (bandType === BandType.BAND_PASS) {
    return WasmFilterBandType.BAND_PASS;
  }
  if (bandType === BandType.BAND_REJECT) {
    return WasmFilterBandType.BAND_REJECT;
  }
  if (bandType === BandType.HIGH_PASS) {
    return WasmFilterBandType.HIGH_PASS;
  }
  return WasmFilterBandType.LOW_PASS;
}

/**
 * Converts a GMS UI Filter Description to a GMS WASM Cascaded Filter Description
 *  BOTH SHOULD PROPERLY REPRESENT COI
 * ! Must properly free/delete the memory of the returned object
 *
 * @param filterDescription a GMS COI Filter Description to convert
 * @returns a converted GMS Filters Filter Description
 */
export async function convertCascadedFilterDescription(
  filterDescription: CascadedFilterDescription
): Promise<WasmCascadedFilterDescription> {
  validateCascadedFilterDescription(filterDescription);
  const gmsFiltersModule = await gmsFiltersModulePromise;

  let wasmCascadedFilterDesc: WasmCascadedFilterDescription;
  let cascadedFilterParameters: WasmCascadedFilterParameters;
  let vectorFilterDescriptionWrapper: WasmVectorFilterDescriptionWrapper;

  try {
    // map GMS Filter Definition to GMS Filter Algorithm Definition

    vectorFilterDescriptionWrapper = new gmsFiltersModule.VectorFilterDescriptionWrapper();

    filterDescription.filterDescriptions.forEach(desc => {
      if (desc.filterType === FilterType.FIR_HAMMING) {
        throw new Error('FIR Hamming not implemented');
      }

      const { aCoefficients, bCoefficients } = desc.parameters;
      const sosCoefficients = new gmsFiltersModule.VectorDouble();
      const sosDenominator = new gmsFiltersModule.VectorDouble();
      const sosNumerator = new gmsFiltersModule.VectorDouble();

      const isDesigned = areCoefficientsPopulated(aCoefficients, bCoefficients);

      // bCoefficients => sosNumerator
      if (isDesigned) {
        bCoefficients.forEach(val => {
          sosNumerator.push_back(val);
        });

        aCoefficients.forEach(val => {
          sosDenominator.push_back(val);
        });
      }

      const iirFilterParameters: WasmIIRFilterParameters = new gmsFiltersModule.IIRFilterParameters(
        desc.parameters.groupDelaySec,
        isDesigned,
        desc.parameters.sampleRateHz,
        desc.parameters.sampleRateToleranceHz,
        sosNumerator,
        sosDenominator,
        sosCoefficients
      );

      const filterBandType: WasmFilterBandType = convertToWasmBandType(desc.passBandType);

      // TODO: LinearFilterDescription should allow for more than Butterworth
      const filterDesignModel: WasmFilterDesignModel = WasmFilterDesignModel.BUTTERWORTH;

      const linearIIRFilterDescription: WasmLinearIIRFilterDescription = new gmsFiltersModule.LinearIIRFilterDescription(
        iirFilterParameters,
        desc.causal,
        desc.comments,
        desc.highFrequency,
        desc.lowFrequency,
        filterBandType,
        filterDesignModel,
        desc.order,
        desc.zeroPhase
      );
      vectorFilterDescriptionWrapper.push_back(
        gmsFiltersModule.FilterDescriptionWrapper.buildIIR(linearIIRFilterDescription)
      );
    });

    const isDesigned = isCascadedFilterDescriptionDesigned(
      filterDescription,
      filterDescription.parameters.sampleRateHz
    );

    cascadedFilterParameters = new gmsFiltersModule.CascadedFilterParameters(
      filterDescription.parameters.groupDelaySec,
      isDesigned,
      filterDescription.parameters.sampleRateHz,
      filterDescription.parameters.sampleRateToleranceHz
    );

    wasmCascadedFilterDesc = new gmsFiltersModule.CascadedFilterDescription(
      filterDescription.causal,
      filterDescription.comments,
      vectorFilterDescriptionWrapper,
      cascadedFilterParameters
    );
  } catch (e) {
    logger.error('Failed to design filter using GMS cascade filter design', e);

    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    if (cascadedFilterParameters !== undefined) cascadedFilterParameters.delete();
    gmsFiltersModule._free(cascadedFilterParameters);
    if (wasmCascadedFilterDesc !== undefined) wasmCascadedFilterDesc.delete();
    gmsFiltersModule._free(wasmCascadedFilterDesc);
    if (vectorFilterDescriptionWrapper !== undefined) vectorFilterDescriptionWrapper.delete();
    gmsFiltersModule._free(vectorFilterDescriptionWrapper);
    /* eslint-enable no-underscore-dangle */
    throw e;
  }

  return wasmCascadedFilterDesc;
}
