import type { SignalDetectionHypothesis } from '../signal-detection';
import type { WorkflowDefinitionId } from '../workflow/types';

export interface FilterListsDefinition {
  preferredFilterListByActivity: FilterListActivity[];
  filterLists: FilterList[];
}
export interface FilterListActivity {
  name: string;
  workflowDefinitionId: WorkflowDefinitionId;
}
export interface FilterList {
  name: string;
  defaultFilterIndex: number;
  filters: Filter[];
}

/**
 * Filter definition usage processing configuration enums. These correspond to the names of the named filters.
 */
export enum FilterDefinitionUsage {
  /**
   * Named filter that corresponds to the filter definition that was used when this signal detection was initially created
   */
  DETECTION = 'DETECTION',

  /**
   * Named filter that corresponds to the filter definition that was used when the FK peak was chosen, resulting in the creation of the FK beam
   */
  FK = 'FK',

  /**
   * Named filter that corresponds to the filter definition that was used when this signal detection was last modified
   */
  ONSET = 'ONSET'
}

export interface Filter {
  withinHotKeyCycle: boolean | null;
  unfiltered: boolean | null;
  namedFilter: FilterDefinitionUsage | null;
  filterDefinition: FilterDefinition | null;

  /** indicates that the description should be formatted as an error state */
  _uiIsError?: boolean;
}

export enum FilterType {
  // format: `FilterComputationType_FilterDesignModel`
  CASCADE = 'CASCADE', // ! TODO Not the correct format
  IIR_BUTTERWORTH = 'IIR_BUTTERWORTH',
  FIR_HAMMING = 'FIR_HAMMING'
}

export enum BandType {
  LOW_PASS = 'LOW_PASS',
  HIGH_PASS = 'HIGH_PASS',
  BAND_PASS = 'BAND_PASS',
  BAND_REJECT = 'BAND_REJECT'
}

export interface FilterDefinition {
  name: string;
  comments: string;
  filterDescription: LinearFilterDescription | CascadedFilterDescription;
}

export interface LinearFilterDefinition extends FilterDefinition {
  filterDescription: LinearFilterDescription;
}

export interface CascadedFilterDefinition extends FilterDefinition {
  filterDescription: CascadedFilterDescription;
}

export interface FilterDescription {
  filterType: FilterType;
  comments: string;
  causal: boolean;
}

export interface LinearFilterParameters {
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  groupDelaySec: number;
  // if not defined, then the filter definition has not been designed
  aCoefficients?: number[];
  bCoefficients?: number[];
}

export interface CascadedFilterParameters {
  sampleRateHz: number;
  sampleRateToleranceHz: number;
  groupDelaySec: number;
}

export interface LinearFilterDescription extends FilterDescription {
  filterType: FilterType.IIR_BUTTERWORTH | FilterType.FIR_HAMMING;
  lowFrequency: number;
  highFrequency: number;
  order: number;
  zeroPhase: boolean;
  passBandType: BandType;
  parameters: LinearFilterParameters;
}

export interface CascadedFilterDescription extends FilterDescription {
  filterType: FilterType.CASCADE;
  parameters: CascadedFilterParameters;
  filterDescriptions: LinearFilterDescription[];
}

export function isLinearFilterDefinition(
  object: FilterDefinition
): object is LinearFilterDefinition {
  return object != null && object.filterDescription.filterType !== FilterType.CASCADE;
}

export function isCascadedFilterDefinition(
  object: FilterDefinition
): object is CascadedFilterDefinition {
  return object != null && object.filterDescription.filterType === FilterType.CASCADE;
}

export function isFilterDefinition(
  object: FilterDefinition | Record<string, any> | undefined
): object is FilterDefinition {
  if (
    object?.filterDescription?.filterType &&
    Object.values(FilterType).includes(object?.filterDescription?.filterType) &&
    object?.name &&
    object?.comments
  ) {
    return true;
  }
  return false;
}

export function isLinearFilterDescription(
  object: FilterDescription
): object is LinearFilterDescription {
  return object?.filterType !== FilterType.CASCADE;
}

export function isCascadedFilterDescription(
  object: FilterDescription
): object is CascadedFilterDescription {
  return object?.filterType === FilterType.CASCADE;
}

/** A string identifying the `unfiltered` filter */
export const UNFILTERED = 'Unfiltered';

/**
 * A filter definition for an unfiltered filter, which is used as a default/fallback
 */
export const UNFILTERED_FILTER: Filter = {
  withinHotKeyCycle: true,
  unfiltered: true,
  namedFilter: null,
  filterDefinition: null
};

/**
 * A Record mapping {@link FilterDefinitionUsage} literals (ie, names of named filters, such as 'ONSET', 'FK', 'DETECTION')
 * to {@link FilterDefinition} objects.
 */
export type FilterDefinitionByFilterDefinitionUsage = Record<
  FilterDefinitionUsage,
  FilterDefinition
>;

/**
 * The FilterDefinitionByUsageBySignalDetectionHypothesis interface represents the objects returned by
 * SignalEnhancementConfigurationService's getDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(...)
 * operation.
 *
 * It is a JSON serialized version of a map containing keys which are {@link SignalDetectionHypothesis}
 * objects and values which are {@link FilterDefinitionByFilterDefinitionUsage} objects. Because JSON serialization
 * does not support complex objects as keys in a map, this is an object containing the signalDetectionHypothesis
 * parameter, which is the key in the map, and the filterDefinitionByFilterDefinitionUsage parameter, which
 * is the value.
 */
export interface FilterDefinitionByUsageBySignalDetectionHypothesis {
  signalDetectionHypothesis: SignalDetectionHypothesis;
  filterDefinitionByFilterDefinitionUsage: FilterDefinitionByFilterDefinitionUsage;
}

/**
 * Extends a basic Error so that we may attach metadata about the filter operation that failed.
 * This allows for more fine-grained error handling than a generic Error.
 */
export class FilterError extends Error {
  /** Always set to true, makes for simple error type checking */
  public readonly isFilterError: boolean = true;

  /** The name of the filter definition that failed */
  public filterNames: string[];

  /** The name of the channel/station on which this error was thrown */
  public channelName: string;

  /** Zero or more serialized identifiers for a channel segment */
  public channelSegmentDescriptorIds: string[] | undefined;

  public constructor(
    message: string,
    filterNames: string | string[],
    channelName: string,
    channelSegmentDescriptorId?: string | string[]
  ) {
    super(message);
    this.channelSegmentDescriptorIds =
      typeof channelSegmentDescriptorId === 'string'
        ? [channelSegmentDescriptorId]
        : channelSegmentDescriptorId;
    this.filterNames = typeof filterNames === 'string' ? [filterNames] : filterNames;
    this.channelName = channelName;
  }
}
