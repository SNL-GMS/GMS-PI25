import type { FkTypes, StationTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { eventData, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getTestFkChannelSegmentRecord, getTestFkData } from '@gms/ui-state/__tests__/__data__';

import { createChannelSegmentString } from '~analyst-ui/common/utils/signal-detection-util';

import {
  calculateStartTimeForFk,
  computeFk,
  createComputeFkInput,
  frequencyBandToString,
  getAssociatedDetectionsWithFks,
  getDefaultFkConfigurationForSignalDetection,
  getFkChannelSegment,
  getFkData,
  getFkParams
} from '../../../../../src/ts/components/analyst-ui/common/utils/fk-utils';
import { fkInput, newConfiguration } from '../../../../__data__/azimuth-slowness';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const arrivalTimeFm = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
  signalDetectionsData[0].signalDetectionHypotheses[0].featureMeasurements
);
const azFm = SignalDetectionTypes.Util.findAzimuthFeatureMeasurement(
  signalDetectionsData[0].signalDetectionHypotheses[0].featureMeasurements
);
const fk = getTestFkData(arrivalTimeFm.measurementValue.arrivalTime.value);
const fkChannelSegmentRecord = getTestFkChannelSegmentRecord(signalDetectionsData[0]);

/**
 * Tests the ability to check if the peak trough is in warning
 */
describe('frequencyBandToString', () => {
  test('correctly creates frequency band string', () => {
    const band: FkTypes.FrequencyBand = {
      maxFrequencyHz: 5,
      minFrequencyHz: 1
    };
    const testString = '1 - 5 Hz';
    expect(frequencyBandToString(band)).toEqual(testString);
  });
});

describe('Can retrieve FkData', () => {
  test('cs string', () => {
    const csString = createChannelSegmentString(azFm.measuredChannelSegment.id);
    expect(csString).toBeDefined();
  });
  test('getFkData', () => {
    expect(arrivalTimeFm).toBeDefined();
    expect(getFkData(undefined, fkChannelSegmentRecord)).toBeUndefined();
    expect(getFkData(signalDetectionsData[0], fkChannelSegmentRecord)).toBeDefined();
  });

  test('getFkChannelSegment', () => {
    expect(arrivalTimeFm).toBeDefined();
    expect(getFkChannelSegment(undefined, fkChannelSegmentRecord)).toBeUndefined();
    expect(getFkChannelSegment(signalDetectionsData[0], fkChannelSegmentRecord)).toBeDefined();
  });

  test('createComputeFkInput', () => {
    const fkParams = getFkParams(fk);
    expect(
      createComputeFkInput(undefined, fkParams, newConfiguration, false, fkChannelSegmentRecord)
    ).toBeUndefined();
    expect(
      createComputeFkInput(
        signalDetectionsData[0],
        fkParams,
        newConfiguration,
        false,
        fkChannelSegmentRecord
      )
    ).toMatchSnapshot();
  });
  test('computeFk', () => {
    const dispatch = jest.fn();
    expect(computeFk(fkInput, dispatch)).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  test('getFkParamsForSd', () => {
    expect(getFkParams(undefined)).toBeUndefined();
    expect(getFkParams(fk)).toBeDefined();
  });

  describe('General Fk configuration and SD associations', () => {
    test('getAssociatedDetectionsWithFks', () => {
      const openIntervalName = 'AL1';
      const eventHypos = eventData.eventHypotheses;
      const sdHypo = SignalDetectionTypes.Util.getCurrentHypothesis(
        signalDetectionsData[0].signalDetectionHypotheses
      );
      eventHypos[eventHypos.length - 1].associatedSignalDetectionHypotheses.push(sdHypo);
      expect(
        getAssociatedDetectionsWithFks(
          undefined,
          signalDetectionsData,
          fkChannelSegmentRecord,
          openIntervalName
        )
      ).toHaveLength(0);
      expect(
        getAssociatedDetectionsWithFks(
          eventData,
          undefined,
          fkChannelSegmentRecord,
          openIntervalName
        )
      ).toHaveLength(0);
      expect(
        getAssociatedDetectionsWithFks(eventData, [], fkChannelSegmentRecord, openIntervalName)
      ).toHaveLength(0);
      expect(
        getAssociatedDetectionsWithFks(
          eventData,
          signalDetectionsData,
          fkChannelSegmentRecord,
          openIntervalName
        )
      ).toHaveLength(1);
    });
  });

  test('getDefaultFkConfigurationForSignalDetection', () => {
    const station = {
      name: 'ASAR',
      effectiveAt: null
    };
    expect(
      getDefaultFkConfigurationForSignalDetection(
        signalDetectionsData[0],
        station as StationTypes.Station,
        getFkData(signalDetectionsData[0], fkChannelSegmentRecord)
      )
    ).toMatchSnapshot();
  });

  test('calculateStartTimeForFk', () => {
    let startTime = 130;
    const arrivalTime = 120;
    const leadTime = 1;
    const stepSize = 2;
    expect(calculateStartTimeForFk(startTime, arrivalTime, leadTime, undefined)).toBeUndefined();
    expect(calculateStartTimeForFk(startTime, arrivalTime, leadTime, stepSize)).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    startTime = 100;
    expect(
      calculateStartTimeForFk(startTime, arrivalTime, leadTime, stepSize)
    ).toMatchInlineSnapshot(`101`);
  });
});
