import type { ChannelSegmentTypes, FilterTypes } from '@gms/common-model';
import { UILogger } from '@gms/ui-util';
import { axiosBaseQuery } from '@gms/ui-workers';
import type { AxiosRequestConfig } from 'axios';

import type { FilterDefinitionsForChannelSegmentsRecord } from '../../../types';
import { createChannelSegmentString } from '../util/channel-segment-util';
import { addController, removeController } from './cancel-worker-requests';

const logger = UILogger.create(
  'GMS_LOG_FETCH_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS',
  process.env.GMS_LOG_FETCH_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS
);

interface FacetedDefaultFilterDefinitionByUsageForChannelSegment {
  channelSegment: ChannelSegmentTypes.ChannelSegmentFaceted;
  filterDefinitionByFilterDefinitionUsage: FilterTypes.FilterDefinitionByFilterDefinitionUsage;
}
export interface FetchDefaultFilterDefinitionByUsageForChannelSegmentsResponse {
  filterDefinitionByUsageByChannelSegment: FacetedDefaultFilterDefinitionByUsageForChannelSegment[];
}

/**
 * Convert a defaultFilterDefinitionByUsageForChannelSegment array to a
 * defaultFilterDefinitionByUsageForChannelSegmentRecord.
 *
 * @param filterDefinitionByUsageBySignalDetectionHypothesis an array of FacetedFilterDefinitionByUsageBySignalDetectionHypothesis
 * @returns filter definitions for signal detection hypothesis
 */
const resultToFilterDefinitionsForSignalDetectionRecord = (
  filterDefinitionByUsageBySignalDetectionHypothesis: FacetedDefaultFilterDefinitionByUsageForChannelSegment[]
): FilterDefinitionsForChannelSegmentsRecord => {
  return filterDefinitionByUsageBySignalDetectionHypothesis.reduce((record, data) => {
    return {
      ...record,
      [createChannelSegmentString(
        data.channelSegment.id
      )]: data.filterDefinitionByFilterDefinitionUsage
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
export const fetchDefaultFilterDefinitionByUsageForChannelSegments = async (
  requestConfig: AxiosRequestConfig
): Promise<FilterDefinitionsForChannelSegmentsRecord> => {
  if (!requestConfig.baseURL) {
    return Promise.reject(
      new Error('Cannot make a request on the worker without a baseUrl in the config')
    );
  }

  const controller = new AbortController();
  try {
    const queryFn = axiosBaseQuery<FetchDefaultFilterDefinitionByUsageForChannelSegmentsResponse>({
      baseUrl: requestConfig.baseURL
    });

    addController(controller);

    // ! pass undefined as the second and third args because our axios request doesn't use the api or extra options
    const result = await queryFn(
      {
        requestConfig: {
          ...requestConfig,
          data: requestConfig.data,
          signal: controller.signal
        }
      },
      undefined,
      undefined
    );

    removeController(controller);

    const defaultFilterDefinitionByUsageForChannelSegments: FacetedDefaultFilterDefinitionByUsageForChannelSegment[] =
      result?.data?.filterDefinitionByUsageByChannelSegment || [];

    return resultToFilterDefinitionsForSignalDetectionRecord([
      ...defaultFilterDefinitionByUsageForChannelSegments
    ]);
  } catch (error) {
    if (error.message !== 'canceled') {
      logger.error(`[Worker] Error fetching/loading filter definitions`, error);
      removeController(controller);
    }
    return Promise.reject(error);
  }
};
