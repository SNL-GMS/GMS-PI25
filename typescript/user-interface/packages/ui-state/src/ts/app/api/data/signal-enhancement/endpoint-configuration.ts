import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Station definition request config definition
 */
export interface SignalEnhancementRequestConfig extends RequestConfig {
  readonly signalEnhancementConfiguration: {
    readonly baseUrl: string;
    readonly services: {
      readonly getDefaultFilterDefinitionByUsageForChannelSegments: ServiceDefinition;
      readonly getProcessingMaskDefinitions: ServiceDefinition;
      readonly getBeamformingTemplates: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.SignalEnhancementConfigurationUrls.baseUrl}`;

/**
 * The station definition request config for all services.
 */
export const config: SignalEnhancementRequestConfig = {
  signalEnhancementConfiguration: {
    baseUrl,
    services: prioritizeRequests({
      getDefaultFilterDefinitionByUsageForChannelSegments: {
        friendlyName:
          Endpoints.SignalEnhancementConfigurationUrls
            .getDefaultFilterDefinitionByUsageForChannelSegments.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'POST',
          url:
            Endpoints.SignalEnhancementConfigurationUrls
              .getDefaultFilterDefinitionByUsageForChannelSegments.url,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getProcessingMaskDefinitions: {
        friendlyName:
          Endpoints.SignalEnhancementConfigurationUrls.getProcessingMaskDefinitions.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'POST',
          url: Endpoints.SignalEnhancementConfigurationUrls.getProcessingMaskDefinitions.url,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getBeamformingTemplates: {
        friendlyName:
          Endpoints.SignalEnhancementConfigurationUrls.getBeamformingTemplates.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'POST',
          url: Endpoints.SignalEnhancementConfigurationUrls.getBeamformingTemplates.url,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      }
    })
  }
};

export type SignalEnhancementConfigurationServices = keyof typeof config;
