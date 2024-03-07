import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Event Manager definition request config definition
 */
export interface EventManagerRequestConfig extends RequestConfig {
  readonly eventManager: {
    readonly baseUrl: string;
    readonly services: {
      readonly predictFeaturesForLocationSolution: ServiceDefinition;
      readonly predictFeaturesForEventLocation: ServiceDefinition;
      readonly findEventStatusInfoByStageIdAndEventIds: ServiceDefinition;
      readonly updateEventStatus: ServiceDefinition;
    };
  };
}

/**
 * The Event Manager definition request config for all services.
 */
export const config: EventManagerRequestConfig = {
  eventManager: {
    baseUrl: `${UI_URL}${Endpoints.EventManagerUrls.baseUrl}`,
    services: prioritizeRequests({
      predictFeaturesForLocationSolution: {
        friendlyName: Endpoints.EventManagerUrls.predict.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.predict.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      predictFeaturesForEventLocation: {
        friendlyName: Endpoints.EventManagerUrls.predictEvent.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.predictEvent.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      findEventStatusInfoByStageIdAndEventIds: {
        friendlyName: Endpoints.EventManagerUrls.status.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.status.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      updateEventStatus: {
        friendlyName: Endpoints.EventManagerUrls.update.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.update.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      }
    })
  }
};

export type EventManagerServices = keyof typeof config.eventManager.services;
