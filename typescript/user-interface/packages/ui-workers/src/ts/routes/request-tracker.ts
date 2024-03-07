import { uuid4 } from '@gms/common-util';
import type { RouteHandlerCallback, RouteHandlerCallbackOptions } from 'workbox-core/types';

import type { RequestTrackerMessage } from '../ui-workers';
import { ServiceWorkerMessages } from '../ui-workers';

declare const self: ServiceWorkerGlobalScope;

export const withRequestTracker = (handler: RouteHandlerCallback): RouteHandlerCallback => {
  return async (options: RouteHandlerCallbackOptions) => {
    const clients = await self.clients.matchAll();
    const win = clients.find(c => c.type === 'window');
    const id = uuid4();
    const requestInitiatedMessage: RequestTrackerMessage = {
      message: ServiceWorkerMessages.requestInitiated,
      url: options.url.toString(),
      id
    };
    win?.postMessage(requestInitiatedMessage);
    try {
      const result = await handler(options);
      const requestCompletedMessage: RequestTrackerMessage = {
        message: ServiceWorkerMessages.requestCompleted,
        url: options.url.toString(),
        id
      };
      win?.postMessage(requestCompletedMessage);
      return result;
    } catch (error) {
      win?.postMessage({
        message: ServiceWorkerMessages.requestCompleted,
        url: options.url.toString(),
        id,
        error
      });
      throw error;
    }
  };
};
