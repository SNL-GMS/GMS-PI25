import type { FilterTypes } from '@gms/common-model';

import { designFilterDefinitions } from '../../../../workers/api/ui-filter-processor';
import type { AppDispatch } from '../../../store';
import { processingConfigurationApiSlice } from '../../processing-configuration';
import { addDesignedFilterDefinitions } from '.';

/**
 * An operation to design filter definitions and add them to
 * the Redux store (cache)
 *
 * @param filterDefinitions the filter definitions
 * @param sampleRates the different sample rates which we should design each filter definition for
 * @param groupDelaySec the group delay seconds config setting
 * @param sampleRateToleranceHz the sample rate tolerance in hertz config setting
 * @param taper the taper config setting
 * @param removeGroupDelay the remove group delay config setting
 */
export const designFilterDefinitionsAndAddToCache = (
  filterDefinitions: FilterTypes.FilterDefinition[],
  sampleRates: number[],
  groupDelaySec: number,
  sampleRateToleranceHz: number,
  taper: number,
  removeGroupDelay: boolean
) => async (dispatch): Promise<void> => {
  const designedFilterDefinitions = await designFilterDefinitions(
    filterDefinitions,
    sampleRates,
    groupDelaySec,
    sampleRateToleranceHz,
    taper,
    removeGroupDelay
  );
  dispatch(
    addDesignedFilterDefinitions(
      designedFilterDefinitions.reduce((filterDefs, fd) => {
        if (fd.status === 'fulfilled') {
          return [...filterDefs, fd.value];
        }
        return filterDefs;
      }, [])
    )
  );
};

/**
 * Processes the retrieved undesigned filter definitions from a service endpoint.
 * This helper function gets the necessary processing configuration settings and for designing
 * all of the provided filter definitions for given configured sample rates. It then dispatches
 * and updates the Redux store to cache the designed filter definitions.
 *
 * @param filterDefinitions the undesigned filter definitions retrieved from a service endpoint
 * @param dispatch the redux dispatch function for dispatching any updates to the state
 */
export const processFilterDefinitions = async (
  filterDefinitions: FilterTypes.FilterDefinition[],
  dispatch: AppDispatch
): Promise<void> => {
  if (filterDefinitions && filterDefinitions.length > 0) {
    // fetch the processing configuration
    const getProcessingAnalystConfigurationQuery = dispatch(
      processingConfigurationApiSlice.endpoints.getProcessingAnalystConfiguration.initiate()
    );

    const processingAnalystConfigurationQuery = await getProcessingAnalystConfigurationQuery;
    const {
      gmsFilters: {
        defaultDesignedSampleRates,
        defaultGroupDelaySecs,
        defaultSampleRateToleranceHz,
        defaultTaper,
        defaultRemoveGroupDelay
      }
    } = processingAnalystConfigurationQuery.data ?? {
      gmsFilters: undefined
    };

    // design filter definitions and add to the cache
    await dispatch(
      designFilterDefinitionsAndAddToCache(
        filterDefinitions,
        defaultDesignedSampleRates,
        defaultGroupDelaySecs,
        defaultSampleRateToleranceHz,
        defaultTaper,
        defaultRemoveGroupDelay
      )
    );

    // remove subscription to the processing configuration query
    getProcessingAnalystConfigurationQuery.unsubscribe();
  }
};
