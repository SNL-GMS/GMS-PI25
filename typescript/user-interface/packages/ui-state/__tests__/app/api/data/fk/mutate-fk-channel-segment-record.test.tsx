import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';

import { mutateFkChannelSegmentsRecord } from '../../../../../src/ts/app/api/data/fk/mutate-fk-channel-segment-record';
import type { FkChannelSegmentRecord } from '../../../../../src/ts/types';
import { createChannelSegmentString } from '../../../../../src/ts/workers/waveform-worker/util/channel-segment-util';
import { getTestFkChannelSegment } from '../../../../__data__/fk/fk-channel-segment-data';

const fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = getTestFkChannelSegment(
  signalDetectionsData[0]
);
describe('Fk Channel Segment Record', () => {
  it('can handle undefined fkChannelSegment', () => {
    const fkChannelSegmentRecord: FkChannelSegmentRecord = {};
    expect(() => mutateFkChannelSegmentsRecord(fkChannelSegmentRecord, undefined)).not.toThrow();
  });

  it('adds a fk channel segment', () => {
    const fkChannelSegmentRecord: FkChannelSegmentRecord = {};

    mutateFkChannelSegmentsRecord(fkChannelSegmentRecord, fkChannelSegment);
    const sdHypo = SignalDetectionTypes.Util.getCurrentHypothesis(
      signalDetectionsData[0].signalDetectionHypotheses
    );
    expect(sdHypo).toBeDefined();
    const azimuthFm = SignalDetectionTypes.Util.findAzimuthFeatureMeasurement(
      sdHypo.featureMeasurements
    );
    const csDescriptorString = createChannelSegmentString(azimuthFm.measuredChannelSegment.id);
    expect(fkChannelSegmentRecord[csDescriptorString]).toEqual(fkChannelSegment);
  });

  it('will not add duplicate fk channel segments', () => {
    const fkChannelSegmentRecord: FkChannelSegmentRecord = {};
    mutateFkChannelSegmentsRecord(fkChannelSegmentRecord, fkChannelSegment);
    mutateFkChannelSegmentsRecord(fkChannelSegmentRecord, fkChannelSegment);

    expect(Object.keys(fkChannelSegmentRecord)).toHaveLength(1);
  });
});
