import type { AxiosRequestConfig } from 'axios';

import { WorkerOperations } from '../waveform-worker/operations';
import type { FetchFilterDefinitionsForSignalDetectionsResult } from '../waveform-worker/operations/fetch-filter-definitions-for-signal-detections';
import { waveformWorkerRpc } from '../worker-rpcs';

/**
 * The Worker API for fetching filter definitions for signal detection hypothesis
 *
 * @param requestConfig the request config
 *
 * @throws {@link Error} any exceptions
 * @throws {@link Error} any Axios request/response failures
 *
 * @returns filter definitions for signal detection hypothesis
 */
export const fetchFilterDefinitionsForSignalDetections = async (
  requestConfig: AxiosRequestConfig
): Promise<FetchFilterDefinitionsForSignalDetectionsResult> => {
  return waveformWorkerRpc.rpc(
    WorkerOperations.FETCH_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTIONS,
    requestConfig
  );
};
