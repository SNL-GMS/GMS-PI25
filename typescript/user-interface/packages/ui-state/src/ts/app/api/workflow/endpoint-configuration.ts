import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Workflow request config definition
 */
export interface WorkflowRequestConfig extends RequestConfig {
  readonly workflow: {
    readonly baseUrl: string;
    readonly services: {
      readonly workflow: ServiceDefinition;
      readonly stageIntervalsByIdAndTime: ServiceDefinition;
      readonly updateActivityIntervalStatus: ServiceDefinition;
      readonly updateStageIntervalStatus: ServiceDefinition;
    };
  };
}

/**
 * The workflow request config for all services.
 */
export const config: WorkflowRequestConfig = {
  workflow: {
    baseUrl: `${UI_URL}${Endpoints.WorkflowManagerServiceUrls.baseUrl}`,
    services: prioritizeRequests({
      workflow: {
        friendlyName: Endpoints.WorkflowManagerServiceUrls.workflow.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.WorkflowManagerServiceUrls.workflow.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'text/plain'
          },
          timeout: 180000,
          data: `"PlaceHolder"`
        }
      },
      stageIntervalsByIdAndTime: {
        friendlyName: Endpoints.WorkflowManagerServiceUrls.stageIntervalsByIdAndTime.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.WorkflowManagerServiceUrls.stageIntervalsByIdAndTime.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 180000
        }
      },
      updateActivityIntervalStatus: {
        friendlyName:
          Endpoints.WorkflowManagerServiceUrls.updateActivityIntervalStatus.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.WorkflowManagerServiceUrls.updateActivityIntervalStatus.url,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      },
      updateStageIntervalStatus: {
        friendlyName: Endpoints.WorkflowManagerServiceUrls.updateStageIntervalStatus.friendlyName,
        requestConfig: {
          method: 'post',
          url: Endpoints.WorkflowManagerServiceUrls.updateStageIntervalStatus.url,
          responseType: 'json',
          proxy: false,
          headers: {
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      }
    })
  }
};

export type WorkflowServices = keyof typeof config.workflow.services;
