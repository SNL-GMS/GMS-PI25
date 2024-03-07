import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Station definition request config definition
 */
export interface StationDefinitionRequestConfig extends RequestConfig {
  readonly stationDefinition: {
    readonly baseUrl: string;
    readonly services: {
      readonly getStationGroupsByNames: ServiceDefinition;
      readonly getStations: ServiceDefinition;
      readonly getStationsEffectiveAtTimes: ServiceDefinition;
    };
  };
}

/**
 * The station definition request config for all services.
 */
export const config: StationDefinitionRequestConfig = {
  stationDefinition: {
    baseUrl: `${UI_URL}${Endpoints.StationDefinitionUrls.baseUrl}`,
    services: prioritizeRequests({
      getStationGroupsByNames: {
        friendlyName: Endpoints.StationDefinitionUrls.getStationGroupsByNames.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStationGroupsByNames.url,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getStations: {
        friendlyName: Endpoints.StationDefinitionUrls.getStations.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStations.url,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getStationsEffectiveAtTimes: {
        friendlyName: Endpoints.StationDefinitionUrls.getStationsEffectiveAtTimes.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStationsEffectiveAtTimes.url,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      }
    })
  }
};

export type StationManagerServices = keyof typeof config.stationDefinition.services;
