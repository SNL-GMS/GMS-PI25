import { Tooltip2 } from '@blueprintjs/popover2';
import type { DistanceUnits } from '@gms/weavess-core/lib/types';
import React from 'react';

import { DistanceAzimuth } from './distance-azimuth';

export interface ChooseWaveformRowProps {
  isDefaultChannel: boolean;
  isSplitChannel: boolean;
}

export interface ChannelNameRowProps {
  isSplitChannel: boolean;
  channelName: string | JSX.Element;
  phaseLabel: string;
  phaseColor: string;
  isDefaultChannel: boolean;
  tooltipText?: string;
}
export interface PhaseLabelProps {
  phaseLabel: string;
  phaseColor: string;
  tooltipText?: string;
}

export interface AzimuthMaskRowProps {
  maskIndicator: string;
  azimuth: number;
  distance: number;
  distanceUnits: DistanceUnits;
}

function PhaseLabel({ tooltipText, phaseLabel, phaseColor }: PhaseLabelProps) {
  const phaseColorStyle = {
    color: phaseColor
  };
  return tooltipText ? (
    <Tooltip2 content={tooltipText}>
      <span className="station-name__phase-name" style={phaseColorStyle}>
        {`/${phaseLabel}`}
      </span>
    </Tooltip2>
  ) : (
    <span className="station-name__phase-name" style={phaseColorStyle}>
      {`/${phaseLabel}`}
    </span>
  );
}

/**
 * Exists only when split channel mode expansion is active, and only for Default Channels
 *
 * @param isDefaultChannel
 * @param isSplitChannel
 * @returns null when not a default channel in split channel expanded mode
 */
export function ChooseWaveformRow(props: ChooseWaveformRowProps) {
  const { isDefaultChannel, isSplitChannel } = props;
  return isSplitChannel && isDefaultChannel ? <span>CHOOSE WAVEFORM</span> : null;
}

/**
 * Includes the channel name.
 * For split non-default channels, also contains Signal Detection phase colored to match event association
 *
 * @param props
 * @returns a row for weavess channel labels
 */
export function ChannelNameRow(props: ChannelNameRowProps) {
  const {
    isSplitChannel,
    channelName,
    phaseColor,
    phaseLabel,
    isDefaultChannel,
    tooltipText
  } = props;
  return (
    <div className="label-channel-name-row">
      {channelName}
      {isSplitChannel && !isDefaultChannel && phaseLabel ? (
        <PhaseLabel tooltipText={tooltipText} phaseLabel={phaseLabel} phaseColor={phaseColor} />
      ) : null}
    </div>
  );
}

/**
 *
 * @param props Includes the Azimuth and Distance when an event is open, as well as an indicator if a mask is applied
 * @returns a row for weavess channel labels
 */
export function AzimuthMaskRow(props: AzimuthMaskRowProps) {
  const { maskIndicator, azimuth, distance, distanceUnits } = props;
  return (
    <div className="distance-azimuth">
      <p>
        <DistanceAzimuth azimuth={azimuth} distance={distance} distanceUnits={distanceUnits} />
        <span className="label-container-content-mask-indicator">{maskIndicator}</span>
      </p>
    </div>
  );
}
