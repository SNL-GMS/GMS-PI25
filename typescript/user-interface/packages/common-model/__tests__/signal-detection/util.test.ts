import { Units } from '../../src/ts/common/types';
import type { SignalDetection } from '../../src/ts/signal-detection';
import { FeatureMeasurementType } from '../../src/ts/signal-detection';
import {
  findAmplitudeFeatureMeasurement,
  findAmplitudeFeatureMeasurementValue,
  findArrivalTimeFeatureMeasurement,
  findArrivalTimeFeatureMeasurementUsingSignalDetection,
  findArrivalTimeFeatureMeasurementValue,
  findAzimuthFeatureMeasurement,
  findAzimuthFeatureMeasurementValue,
  findEmergenceAngleFeatureMeasurementValue,
  findFeatureMeasurementChannelName,
  findLongPeriodFirstMotionFeatureMeasurementValue,
  findPhaseFeatureMeasurement,
  findPhaseFeatureMeasurementValue,
  findRectilinearityFeatureMeasurementValue,
  findShortPeriodFirstMotionFeatureMeasurementValue,
  findSlownessFeatureMeasurement,
  findSlownessFeatureMeasurementValue,
  getCurrentHypothesis
} from '../../src/ts/signal-detection/util';
import { signalDetectionsData } from '../__data__';

const signalDetection: SignalDetection = {
  id: '012de1b9-8ae3-3fd4-800d-58665c3152cc',
  monitoringOrganization: 'GMS',
  signalDetectionHypotheses: [
    {
      id: {
        id: '20cc9505-efe3-3068-b7d5-59196f37992c',
        signalDetectionId: '012de1b9-8ae3-3fd4-800d-58665c3152cc'
      },
      parentSignalDetectionHypothesis: null,
      deleted: false,
      station: {
        name: 'ASAR',
        effectiveAt: null
      },
      monitoringOrganization: 'GMS',
      featureMeasurements: [
        {
          channel: {
            name:
              'ASAR.beam.SHZ/beam,fk,coherent/steer,az_90.142deg,slow_7.122s_per_deg/06c0cb24-ab8f-3853-941d-bdf5e73a51b4',
            effectiveAt: 1636503404
          },
          measuredChannelSegment: {
            id: {
              channel: {
                name:
                  'ASAR.beam.SHZ/beam,fk,coherent/steer,az_90.142deg,slow_7.122s_per_deg/06c0cb24-ab8f-3853-941d-bdf5e73a51b4',
                effectiveAt: 1636503404
              },
              startTime: 1636503404,
              endTime: 1636503704,
              creationTime: 1636503404
            }
          },
          measurementValue: {
            arrivalTime: {
              value: 1636503404,
              standardDeviation: 1.162
            },
            travelTime: null
          },
          snr: {
            value: 8.9939442,
            standardDeviation: null,
            units: Units.DECIBELS
          },
          featureMeasurementType: FeatureMeasurementType.ARRIVAL_TIME
        }
      ]
    }
  ],
  station: {
    name: 'ASAR'
  }
};
const signalDetectionNoHypotheses = {
  id: '012de1b9-8ae3-3fd4-800d-58665c3152cc',
  monitoringOrganization: 'GMS',
  signalDetectionHypotheses: undefined,
  station: {
    name: 'ASAR',
    effectiveAt: null
  }
};
describe('Common Model Signal Detection Utils Tests', () => {
  it('findArrivalTimeFeatureMeasurementUsingSignalDetection is defined', () => {
    expect(findArrivalTimeFeatureMeasurementUsingSignalDetection).toBeDefined();
  });

  it('findArrivalTimeFeatureMeasurementUsingSignalDetection return ArrivalTime FM', () => {
    expect(findArrivalTimeFeatureMeasurementUsingSignalDetection(undefined)).toBeUndefined();
    expect(
      findArrivalTimeFeatureMeasurementUsingSignalDetection(signalDetectionNoHypotheses)
    ).toBeUndefined();
    expect(findArrivalTimeFeatureMeasurementUsingSignalDetection(signalDetection)).toBeDefined();
  });
});

describe('find FeatureMeasurement and Values', () => {
  const sdHypo = getCurrentHypothesis(signalDetectionsData[0].signalDetectionHypotheses);

  it('find ArrivalTime feature measurement and value', () => {
    expect(findArrivalTimeFeatureMeasurement(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findArrivalTimeFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
  });

  it('find Azimuth feature measurement and value', () => {
    expect(findAzimuthFeatureMeasurement(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findAzimuthFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
  });

  it('find Slowness feature measurement and value', () => {
    expect(findSlownessFeatureMeasurement(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findSlownessFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
  });

  it('find Amplitude feature measurement and value', () => {
    expect(
      findAmplitudeFeatureMeasurement(
        sdHypo.featureMeasurements,
        FeatureMeasurementType.AMPLITUDE_A5_OVER_2
      )
    ).toMatchSnapshot();

    expect(
      findAmplitudeFeatureMeasurementValue(
        sdHypo.featureMeasurements,
        FeatureMeasurementType.AMPLITUDE_A5_OVER_2
      )
    ).toMatchSnapshot();
  });

  it('find Phase feature measurement and value', () => {
    expect(findPhaseFeatureMeasurement(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findPhaseFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
  });

  it('find Rectilinearity feature measurementvalue', () => {
    expect(findRectilinearityFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findRectilinearityFeatureMeasurementValue([])).toBeUndefined();
  });

  it('find Emergence Angle feature measurementvalue', () => {
    expect(findEmergenceAngleFeatureMeasurementValue(sdHypo.featureMeasurements)).toMatchSnapshot();
    expect(findEmergenceAngleFeatureMeasurementValue([])).toBeUndefined();
  });

  it('find LongPeriodFirstMotionFeatureMeasurementValue', () => {
    expect(
      findLongPeriodFirstMotionFeatureMeasurementValue(sdHypo.featureMeasurements)
    ).toMatchSnapshot();
    expect(findLongPeriodFirstMotionFeatureMeasurementValue([])).toBeUndefined();
  });
  it('find ShortPeriodFirstMotionFeatureMeasurementValue', () => {
    expect(
      findShortPeriodFirstMotionFeatureMeasurementValue(sdHypo.featureMeasurements)
    ).toMatchSnapshot();
    expect(findShortPeriodFirstMotionFeatureMeasurementValue([])).toBeUndefined();
  });
});

describe('Find feature measurement channel name', () => {
  const expectedChannelName = 'ASAR.beam.SHZ';
  const expectedUndefinedChannelName = undefined;
  const { featureMeasurements } = signalDetectionsData[0].signalDetectionHypotheses[0];
  const featureMeasurement = featureMeasurements[0];
  const {
    measuredChannelSegment,
    measurementValue,
    featureMeasurementType,
    snr
  } = featureMeasurements[0];

  test('return channel name', () => {
    const result = findFeatureMeasurementChannelName(featureMeasurements);
    expect(result).toEqual(expectedChannelName);
  });
  test('return undefined, valid channel name and invalid channel name', () => {
    const featureMeasurementCopy = {
      channel: { name: '', effectiveAt: undefined },
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurement, featureMeasurementCopy]);
    expect(result).toEqual(expectedChannelName);
  });
  test('return undefined, empty feature measurement collection', () => {
    const result = findFeatureMeasurementChannelName([]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, undefined feature measurement collection', () => {
    const result = findFeatureMeasurementChannelName(undefined);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, undefined channel', () => {
    const featureMeasurementCopy = {
      channel: undefined,
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurementCopy]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, null channel', () => {
    const featureMeasurementCopy = {
      channel: null,
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurementCopy]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, null channel name', () => {
    const featureMeasurementCopy = {
      channel: { name: null, effectiveAt: undefined },
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurementCopy]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, undefined channel name', () => {
    const featureMeasurementCopy = {
      channel: { name: undefined, effectiveAt: undefined },
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurementCopy]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
  test('return undefined, zero length channel name', () => {
    const featureMeasurementCopy = {
      channel: { name: '', effectiveAt: undefined },
      measuredChannelSegment,
      measurementValue,
      featureMeasurementType,
      snr
    };
    const result = findFeatureMeasurementChannelName([featureMeasurementCopy]);
    expect(result).toEqual(expectedUndefinedChannelName);
  });
});
