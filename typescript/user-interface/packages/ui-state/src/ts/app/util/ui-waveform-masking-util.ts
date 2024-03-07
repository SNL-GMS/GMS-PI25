import type {
  ProcessingMask,
  ProcessingOperation
} from '@gms/common-model/lib/channel-segment/types';
import { convertToEntityReference } from '@gms/common-model/lib/faceted';
import type { ProcessingMaskDefinition } from '@gms/common-model/lib/processing-mask-definitions/types';
import type { QCSegmentVersion } from '@gms/common-model/lib/qc-segment';
import { uuid4 } from '@gms/common-util';
import React from 'react';

import type { UiChannelSegment } from '../../types';
import { useAppSelector } from '../hooks';
import { createMasked } from './channel-factory';

/**
 * helper interface containing the array of qcSegmentVersions, the earliest start time, latest end time, and associated channel
 */
interface QcVersionGroup {
  qcSegmentVersions: QCSegmentVersion[];
  startTime: number;
  endTime: number;
}

/**
 * Helper function to sort qcVersions into groups.
 * Filters the array based on the definition and groups based on the merge threshold
 *
 * @param qcSegmentVersions array of qc segment versions
 * @param processingMaskDefinition a mask defintion used to determine the merge threshold and QcSegment type and category
 * @returns QcVersionGroup[]
 */
function groupQcSegmentVersions(
  qcSegmentVersions: QCSegmentVersion[],
  processingMaskDefinition: ProcessingMaskDefinition
): QcVersionGroup[] {
  const filteredSegmentVersions = qcSegmentVersions
    .filter(
      qcVersion =>
        processingMaskDefinition.appliedQcSegmentCategoryAndTypes.type === qcVersion.type &&
        processingMaskDefinition.appliedQcSegmentCategoryAndTypes.category === qcVersion.category
    )
    .sort((a, b) => a.startTime - b.startTime);

  const versionGroups: QcVersionGroup[] = [];
  const { maskedSegmentMergeThreshold } = processingMaskDefinition;
  let currentGroup: QcVersionGroup;

  // Loop through all versions, adding to the existing group if they connect
  // Starting a new group if they do not
  filteredSegmentVersions.forEach(qcVersion => {
    // If the start time falls within the merge threshold of the current group add it.
    // Do not need to check end time because the qcSegmentVersions are sorted by start time
    if (
      currentGroup &&
      qcVersion.startTime > currentGroup.startTime - maskedSegmentMergeThreshold &&
      qcVersion.startTime < currentGroup.endTime + maskedSegmentMergeThreshold
    ) {
      currentGroup.qcSegmentVersions.push(qcVersion);
      // If the new versions end time is later then update the groups end time
      if (qcVersion.endTime > currentGroup.endTime) currentGroup.endTime = qcVersion.endTime;
    } else {
      // If the start time is not within the merge threshold start a new group
      // Because the data is sorted by start date, no future versions will have a start or end date that falls in the threshold

      // Push the previous group.  It is now complete
      if (currentGroup) {
        versionGroups.push(currentGroup);
      }

      // reset the current group to be based on the current version.  This will be the basis for the new group
      currentGroup = {
        qcSegmentVersions: [qcVersion],
        startTime: qcVersion.startTime,
        endTime: qcVersion.endTime
      };
    }
  });
  // push the last group
  if (currentGroup) versionGroups.push(currentGroup);

  return versionGroups;
}

/**
 * Operation to build the processing masks from an array of qc segment versions based on a processing mask definition
 *
 * @param qcSegmentVersions array of qc segment versions
 * @param processingMaskDefinition a mask definition used to determine the merge threshold and QcSegment type and category
 * @returns QcVersionGroup[]
 */
export function createProcessingMasksFromQCSegmentVersions(
  qcSegmentVersions: QCSegmentVersion[],
  processingMaskDefinition: ProcessingMaskDefinition
): ProcessingMask[] {
  return groupQcSegmentVersions(qcSegmentVersions, processingMaskDefinition).map(versionGroup => {
    return {
      id: uuid4(),
      effectiveAt: Date.now(),
      startTime: versionGroup.startTime,
      endTime: versionGroup.endTime,
      appliedToRawChannel: convertToEntityReference(qcSegmentVersions[0].channels[0], 'name'),
      processingOperation: processingMaskDefinition.processingOperation,
      maskedQcSegmentVersions: versionGroup.qcSegmentVersions
    };
  });
}

/**
 * A hook to build a function that creates processing masks
 * Requests the qcSegments, processingMaskDefinitions, and channels from redux state that are needed for the function
 *
 * @returns an async function createProcessingMasks that takes a uiChannelSegment, a processingOperation, and a phaseType
 */
export function useCreateProcessingMasks() {
  const { qcSegments, processingMaskDefinitions, channels } = useAppSelector(state => state.data);

  return React.useCallback(
    async (
      uiChannelSegment: UiChannelSegment,
      processingOperation: ProcessingOperation,
      phaseType: string
    ) => {
      const channel = channels.raw[uiChannelSegment.channelSegmentDescriptor.channel.name];
      const processingMaskDefinition = processingMaskDefinitions[channel.name]
        .find(pmd => pmd.channel.effectiveAt === channel.effectiveAt)
        .processingMaskDefinitionByPhase[phaseType].find(
          pmd => pmd.processingOperation === processingOperation
        );
      const channelQcSegments = qcSegments[channel.name];
      const qcSegmentVersions = Object.values(channelQcSegments)
        .map(qcSegment => qcSegment.versionHistory[qcSegment.versionHistory.length - 1])
        .filter(
          qcv =>
            (qcv.startTime >= uiChannelSegment.domainTimeRange.startTimeSecs &&
              qcv.startTime <= uiChannelSegment.domainTimeRange.endTimeSecs) ||
            (qcv.endTime >= uiChannelSegment.domainTimeRange.startTimeSecs &&
              qcv.endTime <= uiChannelSegment.domainTimeRange.endTimeSecs)
        );

      const maskedChannel = await createMasked(channel, processingMaskDefinition);
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        qcSegmentVersions,
        processingMaskDefinition
      );

      return { processingMasks, channel: maskedChannel };
    },
    [channels.raw, processingMaskDefinitions, qcSegments]
  );
}
