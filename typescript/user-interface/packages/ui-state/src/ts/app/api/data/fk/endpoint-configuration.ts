import { FkControlUrls } from '@gms/common-model/lib/endpoints/types';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Compute Fk request config definition
 */
export interface FkControlRequestConfig extends RequestConfig {
  readonly computeFkSpectra: {
    readonly baseUrl: string;
    readonly services: {
      readonly computeFkSpectra: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${FkControlUrls.baseUrl}`;

/**
 * The Waveform request config for all services.
 */
export const config: FkControlRequestConfig = {
  computeFkSpectra: {
    baseUrl,
    // Service endpoints for this component
    services: prioritizeRequests({
      computeFkSpectra: {
        friendlyName: FkControlUrls.computeFkSpectra.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: FkControlUrls.computeFkSpectra.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      }
    })
  }
};

export type FkComputeServices = keyof typeof config.computeFkSpectra.services;
