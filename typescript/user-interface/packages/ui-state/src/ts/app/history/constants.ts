import type { AppStateKeys } from '../store';
import type { EventAndSignalDetectionKeys } from './history-slice';

/** the maximum number of history entires undo/redo */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const maxHistory = 500 as const;

/** the unique key for the app state */
export const appKey: AppStateKeys = 'app' as const;

/** the unique key for the events state for the data slice */
export const eventsKey: EventAndSignalDetectionKeys = 'events' as const;

/** the unique key for the signal detections state for the data slice */
export const signalDetectionsKey: EventAndSignalDetectionKeys = 'signalDetections' as const;
