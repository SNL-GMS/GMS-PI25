import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Station definition request config definition
 */
export interface StationDefinitionRequestConfig extends RequestConfig {
  readonly stationDefinition: {
    readonly baseUrl: string;
    readonly services: {
      readonly getChannelsByNamesTimeRange: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.StationDefinitionUrls.baseUrl}`;

/**
 * The station definition request config for all services.
 */
export const config: StationDefinitionRequestConfig = {
  stationDefinition: {
    baseUrl,
    services: prioritizeRequests({
      getChannelsByNamesTimeRange: {
        friendlyName: Endpoints.StationDefinitionUrls.getChannelsByNamesTimeRange.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getChannelsByNamesTimeRange.url,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          // TODO: can we reduce this?
          timeout: 180000
        }
      }
    })
  }
};

export type StationManagerServices = keyof typeof config.stationDefinition.services;
