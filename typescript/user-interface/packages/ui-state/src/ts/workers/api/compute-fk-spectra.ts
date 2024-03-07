import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import type { AxiosRequestConfig } from 'axios';

import { WorkerOperations } from '../waveform-worker/operations';
import { waveformWorkerRpc } from '../worker-rpcs';

/**
 * The Worker API for computing a FK Spectra
 *
 * @param requestConfig the request config
 *
 * @throws {@link Error} any exceptions
 * @throws {@link Error} any Axios request/response failures
 *
 * @returns a promise for a newly compute FK
 */
export const computeFkSpectraWorker = async (
  requestConfig: AxiosRequestConfig
): Promise<ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra>> => {
  return waveformWorkerRpc.rpc(WorkerOperations.COMPUTE_FK_SPECTRA, requestConfig);
};
