import type { FilterDefinitionByFilterDefinitionUsage } from '@gms/common-model/lib/filter/types';
import type { SignalDetectionHypothesisFaceted } from '@gms/common-model/lib/signal-detection/types';
import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { AxiosRequestConfig } from 'axios';

import type { FilterDefinitionsForSignalDetectionsRecord } from '../../../types';
import { addController, removeController } from './cancel-worker-requests';

const logger = UILogger.create(
  'GMS_LOG_FETCH_FILTER_DEFINITIONS_BY_USAGE',
  process.env.GMS_LOG_FETCH_FILTER_DEFINITIONS_BY_USAGE
);

interface FacetedFilterDefinitionByUsageBySignalDetectionHypothesis {
  signalDetectionHypothesis: SignalDetectionHypothesisFaceted;
  filterDefinitionByFilterDefinitionUsage: FilterDefinitionByFilterDefinitionUsage;
}
export interface FetchFilterDefinitionsForSignalDetectionsResponse {
  filterDefinitionByUsageBySignalDetectionHypothesis: FacetedFilterDefinitionByUsageBySignalDetectionHypothesis[];
}

export interface FetchFilterDefinitionsForSignalDetectionsResult {
  filterDefinitionsForSignalDetectionRecords: FilterDefinitionsForSignalDetectionsRecord;
  missingSignalDetectionsHypothesesForFilterDefinitions: SignalDetectionHypothesisFaceted[];
}

/**
 * Convert a filterDefinitionByUsageBySignalDetectionHypothesis array to a
 * FilterDefinitionsForSignalDetectionsRecord.
 *
 * @param filterDefinitionByUsageBySignalDetectionHypothesis an array of FacetedFilterDefinitionByUsageBySignalDetectionHypothesis
 * @returns filter definitions for signal detection hypothesis
 */
export const resultToFilterDefinitionsForSignalDetectionRecord = (
  filterDefinitionByUsageBySignalDetectionHypothesis: FacetedFilterDefinitionByUsageBySignalDetectionHypothesis[]
): FilterDefinitionsForSignalDetectionsRecord => {
  return filterDefinitionByUsageBySignalDetectionHypothesis.reduce((record, data) => {
    return {
      ...record,
      [data.signalDetectionHypothesis.id.id]: data.filterDefinitionByFilterDefinitionUsage
    };
  }, {});
};

/**
 * Sends a request to the server using the provided request configuration.
 *
 * @param requestConfig the request configuration
 * @throws {@link Error} any exceptions
 * @throws {@link Error} any Axios request/response failures
 *
 * @returns a promise containing a record of filter definitions
 */
export const fetchFilterDefinitionsForSignalDetections = async (
  requestConfig: AxiosRequestConfig
): Promise<FetchFilterDefinitionsForSignalDetectionsResult> => {
  if (!requestConfig.baseURL) {
    return Promise.reject(
      new Error('Cannot make a request on the worker without a baseUrl in the config')
    );
  }

  const controller = new AbortController();
  try {
    const queryFn = axiosBaseQuery<FetchFilterDefinitionsForSignalDetectionsResponse>({
      baseUrl: requestConfig.baseURL
    });

    addController(controller);

    const signalDetectionIds = requestConfig.data.signalDetectionsHypotheses.map(
      signalDetectionsHypothesis => signalDetectionsHypothesis.id.signalDetectionId
    );

    // Get unique signal detections
    const signalDetections = Array.from(new Set(signalDetectionIds)).map(id => ({ id }));

    // ! pass undefined as the second and third args because our axios request doesn't use the api or extra options
    const result = await queryFn(
      {
        requestConfig: {
          ...requestConfig,
          data: {
            stageId: requestConfig.data.stageId,
            signalDetections
          },
          signal: controller.signal
        }
      },
      undefined,
      undefined
    );
    removeController(controller);

    const filterDefinitionByUsageBySignalDetectionHypothesis =
      result?.data?.filterDefinitionByUsageBySignalDetectionHypothesis || [];

    const signalDetectionsHypothesesThatRequireDefault: SignalDetectionHypothesisFaceted[] = requestConfig.data.signalDetectionsHypotheses.filter(
      ({ id }) =>
        !filterDefinitionByUsageBySignalDetectionHypothesis.find(
          ({ signalDetectionHypothesis }) => signalDetectionHypothesis.id.id === id.id
        )
    );
    return {
      filterDefinitionsForSignalDetectionRecords: resultToFilterDefinitionsForSignalDetectionRecord(
        [...filterDefinitionByUsageBySignalDetectionHypothesis]
      ),
      missingSignalDetectionsHypothesesForFilterDefinitions: signalDetectionsHypothesesThatRequireDefault
    };
  } catch (error) {
    if (error.message !== 'canceled') {
      logger.error(`[Worker] Error fetching/loading filter definitions`, error);
      removeController(controller);
    }
    return Promise.reject(error);
  }
};
