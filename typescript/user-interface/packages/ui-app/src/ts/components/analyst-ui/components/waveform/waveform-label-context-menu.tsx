import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import { recordLength } from '@gms/common-util';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import type { UiChannelSegment } from '@gms/ui-state';
import { useKeyboardShortcutConfigurations } from '@gms/ui-state';
import type { WaveformLoadingState } from '@gms/ui-state/lib/app/state/waveform/types';
import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessUtil } from '@gms/weavess-core';
import React from 'react';

import { HideStationMenuItem } from '~analyst-ui/common/menus';
import { WaveformChannelExportMenuItem } from '~analyst-ui/common/menus/waveform-channel-export-menu-item';
import { formatHotkeyString } from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import { AmplitudeScalingOptions } from './components/waveform-controls/scaling-options';

export interface WaveformLabelContextMenuProps {
  readonly isDefaultChannel: boolean;
  readonly isMeasureWindow: boolean;
  readonly channelId: string;
  readonly selectedStationIds: string[];
  readonly channelSegments: Record<string, Record<string, UiChannelSegment[]>>;
  readonly waveformClientState: WaveformLoadingState;
  readonly weavessStations: WeavessTypes.Station[];
  readonly amplitudeScaleOption: AmplitudeScalingOptions;
  readonly amplitudeMinValue: number;
  readonly amplitudeMaxValue: number;
  readonly showAllChannels: (stationName: string) => void;
  readonly hideStationOrChannel: (stationOrChannelName: string) => void;
  readonly scaleAllAmplitudes: (
    channelName: string,
    amplitudeMinValue: number,
    amplitudeMaxValue: number
  ) => void;
  readonly resetAmplitudeSelectedChannels: (channelIds: string[], isMeasureWindow: boolean) => void;
}

export type WaveformLabelContextMenuCallback = ImperativeContextMenuOpenFunc<
  WaveformLabelContextMenuProps
>;

export type WaveformLabelGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  WaveformLabelContextMenuProps
>;

export const WaveformLabelContextMenuContent = React.memo(function WaveformLabelContextMenuContent(
  props: WaveformLabelContextMenuProps
): JSX.Element {
  const {
    isDefaultChannel,
    isMeasureWindow,
    channelId,
    selectedStationIds,
    channelSegments,
    weavessStations,
    waveformClientState,
    amplitudeScaleOption,
    amplitudeMinValue,
    amplitudeMaxValue,
    showAllChannels,
    hideStationOrChannel,
    scaleAllAmplitudes,
    resetAmplitudeSelectedChannels
  } = props;

  const keyboardShortcuts = useKeyboardShortcutConfigurations();
  const scaleAllWaveformAmplitudeHotkey =
    keyboardShortcuts.hotkeys?.scaleAllWaveformAmplitude.combos[0];
  const resetSelectedWaveformAmplitudeScalingHotkey =
    keyboardShortcuts.hotkeys?.resetSelectedWaveformAmplitudeScaling.combos[0];

  // Target channels is the channel id if not in selected station ids
  // unless channel id is in the list of selected station ids
  const targetChannels = selectedStationIds.includes(channelId) ? selectedStationIds : [channelId];
  const showHideMenuItem = (
    <HideStationMenuItem
      stationName={channelId}
      hideStationCallback={() => {
        hideStationOrChannel(channelId);
      }}
    />
  );

  const hideSelectedStationMenuItem = (
    <MenuItem2
      disabled={!selectedStationIds?.length}
      data-cy="hide-selected"
      className="hide-selected-stations-menu-item"
      onClick={() => {
        selectedStationIds.forEach(sta => {
          hideStationOrChannel(sta);
        });
      }}
      text="Hide selected stations/channels"
    />
  );

  /** Find the WeavessChannel to check if a waveform is loaded */
  const weavessChannel: WeavessTypes.Channel = WeavessUtil.findChannelInStations(
    weavessStations,
    channelId
  );

  // Check to see if there is a waveform loaded
  let disabledScaleAllChannel = true;
  if (weavessChannel) {
    disabledScaleAllChannel = recordLength(weavessChannel?.waveform?.channelSegmentsRecord) === 0;
  }

  const scaleAmplitudeChannelMenuItem = (
    <MenuItem2
      data-cy="scale-all-channels"
      text="Scale all channels to match this one"
      // Only show the first hotkey
      labelElement={formatHotkeyString(scaleAllWaveformAmplitudeHotkey)}
      disabled={disabledScaleAllChannel}
      onClick={() => {
        scaleAllAmplitudes(channelId, amplitudeMinValue, amplitudeMaxValue);
      }}
    />
  );

  const numChannelText =
    targetChannels.length === 1 || isMeasureWindow
      ? `this channel`
      : `${targetChannels.length} selected channels`;
  const resetSelectedText = `Reset manual amplitude scaling for ${numChannelText}`;
  const resetAmplitudeSelectedChannelsMenuItem = (
    <MenuItem2
      data-cy="reset-amplitude-selected-channels"
      text={resetSelectedText}
      // Show first hot key if not measure window or more than one target channels
      labelElement={
        targetChannels.length === 1 || isMeasureWindow
          ? ''
          : formatHotkeyString(resetSelectedWaveformAmplitudeScalingHotkey)
      }
      disabled={amplitudeScaleOption === AmplitudeScalingOptions.FIXED}
      onClick={() => resetAmplitudeSelectedChannels(targetChannels, isMeasureWindow)}
    />
  );

  const exportMenuItem = (
    <WaveformChannelExportMenuItem
      channelId={channelId}
      selectedStationIds={targetChannels}
      channelSegmentsRecord={channelSegments}
      disabled={waveformClientState.isLoading}
    />
  );

  const hideChannelMenuItem = (
    <MenuItem2
      data-cy={`hide-${channelId}`}
      text={`Hide ${channelId}`}
      onClick={() => {
        hideStationOrChannel(channelId);
      }}
    />
  );

  const showAllHiddenChannelsMenuItem = (
    <MenuItem2
      data-cy="show-hidden-channels"
      text="Show all hidden channels"
      onClick={() => {
        // Only show all hidden channels from a default channel (station)
        if (!isDefaultChannel) {
          throw new Error(
            `Show all channels context menu should not be used on a child channel ${channelId}`
          );
        }
        showAllChannels(channelId);
      }}
    />
  );

  if (isMeasureWindow) {
    return (
      <Menu>
        {scaleAmplitudeChannelMenuItem}
        {resetAmplitudeSelectedChannelsMenuItem}
        {exportMenuItem}
      </Menu>
    );
  }
  if (isDefaultChannel) {
    return (
      <Menu>
        {showHideMenuItem}
        {hideSelectedStationMenuItem}
        {showAllHiddenChannelsMenuItem}
        {scaleAmplitudeChannelMenuItem}
        {resetAmplitudeSelectedChannelsMenuItem}
        {exportMenuItem}
      </Menu>
    );
  }
  return (
    <Menu>
      {hideChannelMenuItem}
      {hideSelectedStationMenuItem}
      {scaleAmplitudeChannelMenuItem}
      {resetAmplitudeSelectedChannelsMenuItem}
      {exportMenuItem}
    </Menu>
  );
});

/**
 * Displays the Waveform LabelContext Menu.
 *
 * @params props @see {@link WaveformLabelGetOpenCallbackFunc}
 */
export const WaveformLabelContextMenu = React.memo(function WaveformLabelContextMenu(props: {
  getOpenCallback: WaveformLabelGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  const content = React.useCallback(
    // eslint-disable-next-line react/jsx-props-no-spreading
    (p: WaveformLabelContextMenuProps) => <WaveformLabelContextMenuContent {...p} />,
    []
  );

  return (
    <ImperativeContextMenu<WaveformLabelContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
