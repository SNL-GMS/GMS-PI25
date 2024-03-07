import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AxiosResponse } from 'axios';
import Axios from 'axios';

import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from '../../../src/ts/app';
import type { FetchDefaultFilterDefinitionsForSignalDetectionHypothesesResponse } from '../../../src/ts/workers/waveform-worker/operations/fetch-default-filter-definitions-for-signal-detection-hypotheses';
import { fetchDefaultFilterDefinitionsForSignalDetectionHypotheses } from '../../../src/ts/workers/waveform-worker/operations/fetch-default-filter-definitions-for-signal-detection-hypotheses';

describe('Default filter definitions for signal detections hypothesis query', () => {
  it('has defined exports', () => {
    expect(fetchDefaultFilterDefinitionsForSignalDetectionHypotheses).toBeDefined();
  });
  it('fetchDefaultFilterDefinitionsForSignalDetectionHypotheses returns response', async () => {
    const response: AxiosResponse<FetchDefaultFilterDefinitionsForSignalDetectionHypothesesResponse> = {
      status: 200,
      config: {},
      headers: {},
      statusText: '',
      data: {
        filterDefinitionByUsageBySignalDetectionHypothesis: [
          {
            signalDetectionHypothesis: { id: { id: 'a', signalDetectionId: 'b' } },
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
    const queryArgs: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
      stageId: {
        name: 'AL1'
      },
      signalDetectionsHypotheses: [
        {
          id: {
            id: 'a',
            signalDetectionId: 'b'
          }
        }
      ]
    };
    const params = { baseURL: '/baseURL', data: queryArgs };
    const result = await fetchDefaultFilterDefinitionsForSignalDetectionHypotheses(params);
    expect(result).toMatchObject({
      a: {
        ONSET: linearFilterDefinition,
        FK: linearFilterDefinition,
        DETECTION: linearFilterDefinition
      }
    });
  });

  it('fetchDefaultFilterDefinitionsForSignalDetectionHypotheses returns error if there is a major config issue', async () => {
    const params = { baseURL: undefined };
    await expect(fetchDefaultFilterDefinitionsForSignalDetectionHypotheses(params)).rejects.toThrow(
      'Cannot make a request on the worker without a baseUrl in the config'
    );
  });
});
