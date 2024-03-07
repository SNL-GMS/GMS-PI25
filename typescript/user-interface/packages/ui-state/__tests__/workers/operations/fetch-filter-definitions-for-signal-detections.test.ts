import { linearFilterDefinition } from '@gms/common-model/__tests__/__data__';
import type { AxiosResponse } from 'axios';
import Axios from 'axios';

import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from '../../../src/ts/app';
import type {
  FetchFilterDefinitionsForSignalDetectionsResponse,
  FetchFilterDefinitionsForSignalDetectionsResult
} from '../../../src/ts/workers/waveform-worker/operations/fetch-filter-definitions-for-signal-detections';
import { fetchFilterDefinitionsForSignalDetections } from '../../../src/ts/workers/waveform-worker/operations/fetch-filter-definitions-for-signal-detections';

describe('Filter definitions for signal detections query', () => {
  it('has defined exports', () => {
    expect(fetchFilterDefinitionsForSignalDetections).toBeDefined();
  });
  it('fetchFilterDefinitionsForSignalDetections returns record', async () => {
    const response: AxiosResponse<FetchFilterDefinitionsForSignalDetectionsResponse> = {
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
    const params = {
      baseURL: '/baseURL',
      data: queryArgs
    };
    const result = await fetchFilterDefinitionsForSignalDetections(params);
    const expectedResult: FetchFilterDefinitionsForSignalDetectionsResult = {
      missingSignalDetectionsHypothesesForFilterDefinitions: [],
      filterDefinitionsForSignalDetectionRecords: {
        a: {
          ONSET: linearFilterDefinition,
          FK: linearFilterDefinition,
          DETECTION: linearFilterDefinition
        }
      }
    };
    expect(result).toMatchObject(expectedResult);
  });

  it('fetchFilterDefinitionsForSignalDetections patches missing filter definitions with defaults', async () => {
    const response1: AxiosResponse<FetchFilterDefinitionsForSignalDetectionsResponse> = {
      status: 200,
      config: {},
      headers: {},
      statusText: '',
      data: {
        filterDefinitionByUsageBySignalDetectionHypothesis: []
      }
    };
    const response2: AxiosResponse<FetchFilterDefinitionsForSignalDetectionsResponse> = {
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
    Axios.request = jest
      .fn()
      .mockImplementationOnce(async () => Promise.resolve(response1))
      .mockImplementationOnce(async () => Promise.resolve(response2));
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
    const params = {
      baseURL: '/baseURL',
      data: queryArgs
    };
    const result = await fetchFilterDefinitionsForSignalDetections(params);
    const expectedResult: FetchFilterDefinitionsForSignalDetectionsResult = {
      missingSignalDetectionsHypothesesForFilterDefinitions: [
        {
          id: {
            id: 'a',
            signalDetectionId: 'b'
          }
        }
      ],
      filterDefinitionsForSignalDetectionRecords: {}
    };
    expect(result).toMatchObject(expectedResult);
  });

  it('fetchFilterDefinitionsForSignalDetections returns error if there is a major config issue', async () => {
    const params = { baseURL: undefined };
    await expect(fetchFilterDefinitionsForSignalDetections(params)).rejects.toThrow(
      'Cannot make a request on the worker without a baseUrl in the config'
    );
  });
});
