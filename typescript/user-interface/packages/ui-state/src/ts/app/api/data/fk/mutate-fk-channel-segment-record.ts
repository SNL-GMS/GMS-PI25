import type { ChannelSegmentTypes, FkTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import type { WritableDraft } from 'immer/dist/internal';

import type {
  FkChannelSegmentRecord,
  FkFrequencyThumbnailRecord,
  SignalDetectionsRecord
} from '../../../../types';
import { createChannelSegmentString } from '../../../../workers/waveform-worker/util/channel-segment-util';

/**
 * Mutates a writable draft fk channel segment record with new fk channel segment
 * ! Mutates the draft in place
 *
 * @param FkChannelSegmentRecord the  fk channel segments
 * @param fkChannelSegment the fk channel segment
 */
export const mutateFkChannelSegmentsRecord = (
  draft: WritableDraft<FkChannelSegmentRecord>,
  fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra>
): void => {
  if (!fkChannelSegment) return;

  // Update the FkChannelSegmentRecord
  const channelDescriptorString = createChannelSegmentString(fkChannelSegment.id);
  draft[channelDescriptorString] = fkChannelSegment;
};

/**
 * Update FkFrequencyThumbnailRecord in state with frequency thumbnail
 *
 * @param args FkInputWithConfiguration
 * @param draft FkFrequencyThumbnailRecord
 * @param fkChannelSegment fk channel segment returned from computeFk call
 */
export const mutateFkThumbnailRecord = (
  args: FkTypes.FkInputWithConfiguration,
  draft: WritableDraft<FkFrequencyThumbnailRecord>,
  fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra>
): void => {
  if (!fkChannelSegment || !args) return;

  if (!draft[args.signalDetectionId]) {
    draft[args.signalDetectionId] = [];
  }

  // Find the index of thumbnail to replace else add it
  const frequencyBand: FkTypes.FrequencyBand = {
    minFrequencyHz: args.fkComputeInput.lowFrequency,
    maxFrequencyHz: args.fkComputeInput.highFrequency
  };
  const frequencyFk: FkTypes.FkFrequencyThumbnail = {
    fkSpectra: fkChannelSegment.timeseries[0],
    frequencyBand
  };
  const index = draft[args.signalDetectionId].findIndex(
    thumbnail =>
      thumbnail.frequencyBand.minFrequencyHz === frequencyBand.minFrequencyHz &&
      thumbnail.frequencyBand.maxFrequencyHz === frequencyBand.maxFrequencyHz
  );
  // replace
  if (index >= 0) {
    draft[args.signalDetectionId][index] = frequencyFk;
  } else {
    draft[args.signalDetectionId].push(frequencyFk);
  }
};

/**
 * TODO: Need to integrate into SD editing work
 * Update the Azimuth FM channel segment descriptor to fkChannelSegment
 *
 * @param draft
 * @param signalDetectionId
 * @param fkChannelSegment
 * @returns
 */
export const mutateSignalDetectionRecord = (
  draftSdRecord: WritableDraft<SignalDetectionsRecord>,
  signalDetectionId: string,
  fkChannelSegment: ChannelSegmentTypes.ChannelSegment<FkTypes.FkPowerSpectra>
): void => {
  if (!fkChannelSegment || !draftSdRecord || !draftSdRecord[signalDetectionId]) return;

  // Update Signal Detection Azimuth FM with ChannelSegment descriptor from FK
  const draftHypos: WritableDraft<SignalDetectionTypes.SignalDetectionHypothesis> = SignalDetectionTypes.Util.getCurrentHypothesis(
    draftSdRecord[signalDetectionId].signalDetectionHypotheses
  );
  draftHypos.featureMeasurements.forEach(draft => {
    if (
      draft.featureMeasurementType ===
        SignalDetectionTypes.FeatureMeasurementType.RECEIVER_TO_SOURCE_AZIMUTH ||
      draft.featureMeasurementType ===
        SignalDetectionTypes.FeatureMeasurementType.SOURCE_TO_RECEIVER_AZIMUTH
    ) {
      draft.analysisWaveform.waveform.id = fkChannelSegment.id;
    }
  });
};
