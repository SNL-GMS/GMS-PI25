import type { FilterDefinitionByFilterDefinitionUsage } from '@gms/common-model/lib/filter/types';
import type { SignalDetectionHypothesisFaceted } from '@gms/common-model/lib/signal-detection/types';
import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { AxiosRequestConfig } from 'axios';

import { config } from '../../../app/api/signal-enhancement-configuration/endpoint-configuration';
import type { FilterDefinitionsForSignalDetectionsRecord } from '../../../types';
import { addController, removeController } from './cancel-worker-requests';
import { resultToFilterDefinitionsForSignalDetectionRecord } from './fetch-filter-definitions-for-signal-detections';

const logger = UILogger.create(
  'GMS_LOG_FETCH_FILTER_DEFINITIONS_BY_USAGE',
  process.env.GMS_LOG_FETCH_FILTER_DEFINITIONS_BY_USAGE
);

interface FacetedFilterDefinitionByUsageBySignalDetectionHypothesis {
  signalDetectionHypothesis: SignalDetectionHypothesisFaceted;
  filterDefinitionByFilterDefinitionUsage: FilterDefinitionByFilterDefinitionUsage;
}
export interface FetchDefaultFilterDefinitionsForSignalDetectionHypothesesResponse {
  filterDefinitionByUsageBySignalDetectionHypothesis: FacetedFilterDefinitionByUsageBySignalDetectionHypothesis[];
}

/**
 * Sends a request to the server using the provided request configuration.
 *
 * @param requestConfig the request configuration
 * @throws {@link Error} any exceptions
 * @throws {@link Error} any Axios request/response failures
 *
 * @returns a promise containing filter definitions
 */
export const fetchDefaultFilterDefinitionsForSignalDetectionHypotheses = async (
  requestConfig: AxiosRequestConfig
): Promise<FilterDefinitionsForSignalDetectionsRecord> => {
  if (!requestConfig.baseURL) {
    return Promise.reject(
      new Error('Cannot make a request on the worker without a baseUrl in the config')
    );
  }

  const controller = new AbortController();
  try {
    const queryFn = axiosBaseQuery<
      FetchDefaultFilterDefinitionsForSignalDetectionHypothesesResponse
    >({
      // need to use requestConfig.baseURL because this knows what window is
      baseUrl: requestConfig.baseURL
    });

    addController(controller);

    // build request
    const requestConfigFilterDefinitionForSignalDetectionHypotheses = {
      ...config.signalEnhancementConfiguration.services
        .getDefaultFilterDefinitionsForSignalDetectionHypotheses.requestConfig,
      data: {
        signalDetectionsHypotheses: requestConfig.data.signalDetectionsHypotheses,
        eventHypothesis: {}
      },
      signal: controller.signal
    };
    // check for the event Hypothesis
    if (requestConfig.data.eventHypothesis) {
      requestConfigFilterDefinitionForSignalDetectionHypotheses.data.eventHypothesis =
        requestConfig.data.eventHypothesis;
    } else {
      // not found lets remove it
      delete requestConfigFilterDefinitionForSignalDetectionHypotheses.data.eventHypothesis;
    }
    // ! pass undefined as the second and third args because our axios request doesn't use the api or extra options
    const result = await queryFn(
      { requestConfig: requestConfigFilterDefinitionForSignalDetectionHypotheses },
      undefined,
      undefined
    );

    removeController(controller);
    const defaultFilterDefinitionByUsageBySignalDetectionHypothesis =
      result?.data?.filterDefinitionByUsageBySignalDetectionHypothesis || [];
    return resultToFilterDefinitionsForSignalDetectionRecord(
      defaultFilterDefinitionByUsageBySignalDetectionHypothesis
    );
  } catch (error) {
    if (error.message !== 'canceled') {
      logger.error(`[Worker] Error fetching/loading filter definitions by usage`, error);
      removeController(controller);
    }
    return Promise.reject(error);
  }
};
