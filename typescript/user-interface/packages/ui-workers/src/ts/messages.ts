export const clientConnectedMessage = 'CLIENT_CONNECTED' as const;
export const toggleWorkboxLogs = 'TOGGLE_WORKBOX_LOGS' as const;
export const listenersActiveMessage = 'LISTENERS_ACTIVE' as const;
export const skipWaitingMessage = 'SKIP_WAITING' as const;
export const requestInitiated = 'REQUEST_INITIATED' as const;
export const requestCompleted = 'REQUEST_COMPLETED' as const;

export type ServiceWorkerMessage =
  | typeof clientConnectedMessage
  | typeof listenersActiveMessage
  | typeof skipWaitingMessage;
