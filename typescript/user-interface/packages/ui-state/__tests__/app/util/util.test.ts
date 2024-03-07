import { eventHypothesis, signalDetectionsData } from '@gms/common-model/__tests__/__data__';

import {
  determineAllAssociableSignalDetections,
  determineAllDeletableSignalDetections,
  determineAllNonAssociableSignalDetections
} from '../../../src/ts/app/util/util';

describe('State Utils', () => {
  it('determineAllAssociableSignalDetections exists', () => {
    expect(determineAllAssociableSignalDetections).toBeDefined();
  });

  it('determineAllNonAssociableSignalDetections exists', () => {
    expect(determineAllNonAssociableSignalDetections).toBeDefined();
  });

  it('determineAllAssociableSignalDetections finds all associable detections', () => {
    const result = determineAllAssociableSignalDetections(
      eventHypothesis,
      signalDetectionsData[0].signalDetectionHypotheses
    );
    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('determineAllNonAssociableSignalDetections finds all non associable detections', () => {
    const result = determineAllNonAssociableSignalDetections(
      eventHypothesis,
      signalDetectionsData[0].signalDetectionHypotheses
    );
    expect(result).toBeDefined();
    expect(result).toEqual(['012de1b9-8ae3-3fd4-800d-58665c3152cc']);
  });

  it('determineAllDeletableSignalDetections finds all deletable detections', () => {
    const result = determineAllDeletableSignalDetections(
      signalDetectionsData[0].signalDetectionHypotheses
    );
    expect(result).toBeDefined();
    expect(result).toEqual(['012de1b9-8ae3-3fd4-800d-58665c3152cc']);
  });
});
