import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AxiosResponse } from 'axios';
import Axios from 'axios';

import type { GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } from '../../../src/ts/app/api/data/signal-enhancement/types';
import type { FetchDefaultFilterDefinitionByUsageForChannelSegmentsResponse } from '../../../src/ts/workers/waveform-worker/operations/fetch-default-filter-definition-by-usage-for-channel-segments';
import { fetchDefaultFilterDefinitionByUsageForChannelSegments } from '../../../src/ts/workers/waveform-worker/operations/fetch-default-filter-definition-by-usage-for-channel-segments';

describe('Filter definitions for signal detections query', () => {
  it('has defined exports', () => {
    expect(fetchDefaultFilterDefinitionByUsageForChannelSegments).toBeDefined();
  });
  it('fetchDefaultFilterDefinitionByUsageForChannelSegments returns record', async () => {
    const response: AxiosResponse<FetchDefaultFilterDefinitionByUsageForChannelSegmentsResponse> = {
      status: 200,
      config: {},
      headers: {},
      statusText: '',
      data: {
        filterDefinitionByUsageByChannelSegment: [
          {
            channelSegment: {
              id: {
                channel: { name: 'AAA', effectiveAt: 1 },
                creationTime: 100,
                endTime: 200,
                startTime: 100
              }
            },
            filterDefinitionByFilterDefinitionUsage: {
              ONSET: linearFilterDefinition,
              FK: linearFilterDefinition,
              DETECTION: linearFilterDefinition
            }
          }
        ]
      }
    };
    Axios.request = jest.fn().mockImplementation(async () => Promise.resolve(response));
    const queryArgs: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs = {
      interval: {
        startTimeSecs: 100,
        endTimeSecs: 200
      },
      channelSegments: [
        {
          id: {
            channel: { name: 'AAA', effectiveAt: 1 },
            creationTime: 100,
            endTime: 200,
            startTime: 100
          }
        }
      ]
    };
    const params = { baseURL: '/baseURL', data: queryArgs };
    const result = await fetchDefaultFilterDefinitionByUsageForChannelSegments(params);
    expect(result).toMatchObject({
      'AAA.1.100.100.200': {
        ONSET: linearFilterDefinition,
        FK: linearFilterDefinition,
        DETECTION: linearFilterDefinition
      }
    });
  });

  it('fetchDefaultFilterDefinitionByUsageForChannelSegments returns error if there is a major config issue', async () => {
    const params = { baseURL: undefined };
    await expect(fetchDefaultFilterDefinitionByUsageForChannelSegments(params)).rejects.toThrow(
      'Cannot make a request on the worker without a baseUrl in the config'
    );
  });
});
