import type { ServiceWorkerMessages } from '../ui-workers';
import type { PriorityRequestConfig } from './axios';

/**
 * Service definition
 */
export interface ServiceDefinition {
  readonly requestConfig: PriorityRequestConfig;
  readonly friendlyName: string;
}

/**
 * Request config definition
 */
export interface RequestConfig {
  readonly [domain: string]: {
    readonly baseUrl: string;
    readonly services: {
      readonly [serviceName: string]: ServiceDefinition;
    };
  };
}

export interface RequestTrackerMessage {
  message:
    | typeof ServiceWorkerMessages.requestCompleted
    | typeof ServiceWorkerMessages.requestInitiated;
  url: string;
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any; // this is the actual type of the error.
}
