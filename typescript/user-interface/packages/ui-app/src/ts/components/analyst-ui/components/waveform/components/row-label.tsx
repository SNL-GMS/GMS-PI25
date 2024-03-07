import type { SignalDetectionTypes } from '@gms/common-model';
import { Tooltip2Wrapper } from '@gms/ui-core-components';
import { UILogger } from '@gms/ui-util';
import React from 'react';

import { getChannelLabelAndToolTipFromSignalDetections } from '../utils';

const logger = UILogger.create('GMS_ROW_LABEL', process.env.GMS_ROW_LABEL);

/**
 * The type of the props for the {@link RowLabel} component
 */
export interface RowLabelProps {
  stationName: string;
  channelLabel?: string;
  signalDetections?: SignalDetectionTypes.SignalDetection[];
}

/**
 * Creates a station or channel label. If given a channelLabel, will not try to generate
 * a tooltip. If not given a channelLabel, it will try to generate one using the provided
 * signal detections, and in the process, generates a tooltip if appropriate.
 */
export function RowLabel({
  channelLabel: channelName,
  stationName,
  signalDetections
}: RowLabelProps) {
  let channelLabel = channelName;
  let channelLabelTooltip;
  if (!channelLabel) {
    try {
      const res = getChannelLabelAndToolTipFromSignalDetections(signalDetections);
      channelLabel = res.channelLabel;
      channelLabelTooltip = res.tooltip;
    } catch (error) {
      logger.warn(`Error generating station label for ${stationName} msg: ${error}`);
    }
  }
  return (
    <span className="station-name" data-cy="station-name">
      {stationName}
      {channelLabelTooltip ? (
        <Tooltip2Wrapper className="station-name__channel-name" content={channelLabelTooltip}>
          <>&nbsp;{channelLabel}</>
        </Tooltip2Wrapper>
      ) : (
        <span className="station-name__channel-name">&nbsp;{channelLabel}</span>
      )}
    </span>
  );
}
