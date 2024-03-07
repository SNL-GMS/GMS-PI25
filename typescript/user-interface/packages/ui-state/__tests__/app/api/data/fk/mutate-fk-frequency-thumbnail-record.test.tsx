import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';

import { mutateFkThumbnailRecord } from '../../../../../src/ts/app/api/data/fk/mutate-fk-channel-segment-record';
import type { FkFrequencyThumbnailRecord } from '../../../../../src/ts/types';
import { fkInput } from '../../../../__data__';
import { getTestFkChannelSegment } from '../../../../__data__/fk/fk-channel-segment-data';

const fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra> = getTestFkChannelSegment(
  signalDetectionsData[0]
);
const fkFrequencyThumbnail: FkTypes.FkFrequencyThumbnail = {
  fkSpectra: fkChannelSegment.timeseries[0],
  frequencyBand: {
    maxFrequencyHz: fkInput.fkComputeInput.highFrequency,
    minFrequencyHz: fkInput.fkComputeInput.lowFrequency
  }
};
describe('Fk Frequency Thumbnail Record', () => {
  it('can handle undefined fkChannelSegment', () => {
    const fkThumbnailRecord: FkFrequencyThumbnailRecord = {};
    expect(() => mutateFkThumbnailRecord(fkInput, fkThumbnailRecord, undefined)).not.toThrow();
  });

  it('adds a fk channel segment', () => {
    const fkThumbnailRecord: FkFrequencyThumbnailRecord = {};

    mutateFkThumbnailRecord(fkInput, fkThumbnailRecord, fkChannelSegment);
    expect(fkThumbnailRecord[fkInput.signalDetectionId]).toEqual([fkFrequencyThumbnail]);
  });

  it('will not add duplicate fk channel segments', () => {
    const fkThumbnailRecord: FkFrequencyThumbnailRecord = {};
    mutateFkThumbnailRecord(fkInput, fkThumbnailRecord, fkChannelSegment);
    mutateFkThumbnailRecord(fkInput, fkThumbnailRecord, fkChannelSegment);

    expect(Object.keys(fkThumbnailRecord)).toHaveLength(1);
    expect(fkThumbnailRecord[fkInput.signalDetectionId]).toHaveLength(1);
  });
});
