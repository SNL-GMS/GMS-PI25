import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import {
  findAzimuthFeatureMeasurement,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';

import { mutateSignalDetectionRecord } from '../../../../../src/ts/app/api/data/fk/mutate-fk-channel-segment-record';
import type { SignalDetectionsRecord } from '../../../../../src/ts/types';
import { getTestFkChannelSegment } from '../../../../__data__/fk/fk-channel-segment-data';

const fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = getTestFkChannelSegment(
  signalDetectionsData[0]
);

const signalDetectionRecord: SignalDetectionsRecord = {};
// eslint-disable-next-line prefer-destructuring
signalDetectionRecord[signalDetectionsData[0].id] = signalDetectionsData[0];

describe('Update Signal Detection Record', () => {
  it('safe when Signal Detection Record', () => {
    expect(() =>
      mutateSignalDetectionRecord({}, signalDetectionsData[0].id, fkChannelSegment)
    ).not.toThrow();
  });

  it('modify the Signal Detection Azimuth FM ChannelSegmentDescriptor', () => {
    mutateSignalDetectionRecord(
      signalDetectionRecord,
      signalDetectionsData[0].id,
      fkChannelSegment
    );
    const sdHypo = getCurrentHypothesis(signalDetectionsData[0].signalDetectionHypotheses);
    const azFeatureMeasurement = findAzimuthFeatureMeasurement(sdHypo.featureMeasurements);
    expect(azFeatureMeasurement.measuredChannelSegment.id).toEqual(fkChannelSegment.id);
  });
});
