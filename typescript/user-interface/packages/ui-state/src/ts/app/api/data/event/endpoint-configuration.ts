import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Event request config definition
 */
export interface EventRequestConfig extends RequestConfig {
  readonly event: {
    readonly baseUrl: string;
    readonly services: {
      readonly getEventsWithDetectionsAndSegmentsByTime: ServiceDefinition;
      readonly findEventsByAssociatedSignalDetectionHypotheses: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.EventManagerUrls.baseUrl}`;

/**
 * The event request config for all services.
 */
export const config: EventRequestConfig = {
  event: {
    baseUrl,
    // Service endpoints for this component
    services: prioritizeRequests({
      getEventsWithDetectionsAndSegmentsByTime: {
        friendlyName:
          Endpoints.EventManagerUrls.getEventsWithDetectionsAndSegmentsByTime.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.EventManagerUrls.getEventsWithDetectionsAndSegmentsByTime.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      findEventsByAssociatedSignalDetectionHypotheses: {
        friendlyName:
          Endpoints.EventManagerUrls.findEventsByAssociatedSignalDetectionHypotheses.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.EventManagerUrls.findEventsByAssociatedSignalDetectionHypotheses.url,
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

export type EventServices = keyof typeof config.event.services;
