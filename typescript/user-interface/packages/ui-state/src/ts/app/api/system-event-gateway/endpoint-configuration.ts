import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

/**
 * System event gateway request config definition
 */
export interface SystemEventGatewayRequestConfig extends RequestConfig {
  readonly gateway: {
    readonly baseUrl: string;
    readonly services: {
      readonly sendClientLogs: ServiceDefinition;
      readonly acknowledgeSohStatus: ServiceDefinition;
      readonly quietSohStatus: ServiceDefinition;
      readonly publishDerivedChannels: ServiceDefinition;
    };
  };
}

/**
 * The system event gateway request config for all services.
 */
export const config: SystemEventGatewayRequestConfig = {
  gateway: {
    baseUrl: `${UI_URL}${Endpoints.SystemEventGatewayUrls.baseUrl}`,
    services: {
      sendClientLogs: {
        friendlyName: Endpoints.SystemEventGatewayUrls.sendClientLogs.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.SystemEventGatewayUrls.sendClientLogs.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      },
      acknowledgeSohStatus: {
        friendlyName: Endpoints.SystemEventGatewayUrls.acknowledgeSohStatus.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.SystemEventGatewayUrls.acknowledgeSohStatus.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      },
      quietSohStatus: {
        friendlyName: Endpoints.SystemEventGatewayUrls.quietSohStatus.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.SystemEventGatewayUrls.quietSohStatus.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      },
      publishDerivedChannels: {
        friendlyName: Endpoints.SystemEventGatewayUrls.publishDerivedChannels.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.SystemEventGatewayUrls.publishDerivedChannels.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      }
    }
  }
};
