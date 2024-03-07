import type { Filter, FilterDefinition, FilterError } from './types';
import { UNFILTERED } from './types';

const getFilterNameIfExists = (filter: Filter | undefined): string =>
  filter?.filterDefinition?.name ?? filter?.namedFilter;

/**
 * Gets the unique id for a filter, which is its name, or `unfiltered`.
 *
 * @param filter the filter from which to get the id. If undefined, will return `unfiltered`
 * @param fallbackFilterName the filter name to fallback on if one is not found, falls back
 * to 'unfiltered' which is not necessarily the default filter
 */
export const getFilterName = (
  filter: Filter | undefined,
  fallbackFilterName: string = UNFILTERED
): string => getFilterNameIfExists(filter) ?? fallbackFilterName;

/**
 * Type guard to check and see if an error is a FilterError type
 */
export const isFilterError = (e: Error): e is FilterError => {
  return !!(e as FilterError).isFilterError;
};

/**
 * Gets a combined FilterNameId, used in a ProcessedItemsCacheRecord
 *
 * @param filter the filter to be applied
 * @param filterDefinition the filter definition to be applied (may not be the filter definition of the filter)
 * @returns a combination of the namedFilter name (if it exists) + filter definition name
 */
export const getCombinedFilterId = (filter: Filter, filterDefinition: FilterDefinition): string => {
  return `${filter.namedFilter || ''}${filterDefinition.name}`;
};
