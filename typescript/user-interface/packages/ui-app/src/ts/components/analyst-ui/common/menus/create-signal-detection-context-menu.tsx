/* eslint-disable react/destructuring-assignment */
import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import { ImperativeContextMenu, useImperativeContextMenuCallback } from '@gms/ui-core-components';
import { useKeyboardShortcutConfigurations } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import React from 'react';

import {
  formatHotkeyString,
  getKeyboardShortcutCombos
} from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

const logger = UILogger.create(
  'GMS_LOG_SIGNAL_DETECTION_CONTEXT_MENU',
  process.env.GMS_LOG_WORKFLOW_COMMANDS
);

export interface CreateSignalDetectionContextMenuCallbacks {
  readonly createSignalDetectionCb: ImperativeContextMenuOpenFunc<
    CreateSignalDetectionContextMenuProps
  >;
}

export type CreateSignalDetectionContextMenuGetOpenCallbackFunc = (
  callbacks: CreateSignalDetectionContextMenuCallbacks
) => void;

export interface CreateSignalDetectionContextMenuProps {
  channelId: string;
  timeSecs: number;
  currentPhase?: string;
  defaultSignalDetectionPhase?: string;
  createSignalDetection: (
    stationId: string,
    channelName: string,
    timeSecs: number,
    phase?: string,
    isTemporary?: boolean
  ) => void;
}

/**
 * Props are passed in by the createSignalDetectionCb call when it gets triggered.
 * This is a render prop of the imperative context menu, which will pass the props set
 * by that callback.
 * Note, unlike for normal components, props may be undefined, so we have to guard against that
 *  */
export function CreateSignalDetectionMenuContent(props: CreateSignalDetectionContextMenuProps) {
  const keyboardShortcutConfig = useKeyboardShortcutConfigurations();

  return (
    <Menu className="create-sd-menu">
      <MenuItem2
        text="Create signal detection associated to a waveform with current phase"
        label={
          keyboardShortcutConfig?.clickEvents?.createSignalDetectionWithCurrentPhase
            ? formatHotkeyString(
                `${keyboardShortcutConfig.clickEvents.createSignalDetectionWithCurrentPhase?.combos[0]}+click`
              )
            : ''
        }
        onClick={() => {
          logger.info(
            'Create signal detection associated to a waveform with current phase (e + click)'
          );
          try {
            props?.createSignalDetection(
              props?.channelId,
              undefined,
              props?.timeSecs,
              props?.currentPhase
            );
          } catch (e) {
            logger.error(e);
          }
        }}
      />
      <MenuItem2
        text="Create signal detection associated to a waveform with default phase"
        label={
          keyboardShortcutConfig?.clickEvents?.createSignalDetectionWithDefaultPhase
            ? formatHotkeyString(
                `${keyboardShortcutConfig.clickEvents.createSignalDetectionWithDefaultPhase?.combos[0]}+click`
              )
            : ''
        }
        onClick={() => {
          logger.info(
            'Create signal detection associated to a waveform with default phase (alt + e + click)'
          );
          try {
            props?.createSignalDetection(
              props?.channelId,
              undefined,
              props?.timeSecs,
              props?.defaultSignalDetectionPhase
            );
          } catch (e) {
            logger.error(e);
          }
        }}
      />
      <MenuItem2
        text="Create signal detection not associated to a waveform with current phase"
        label={
          keyboardShortcutConfig?.clickEvents
            ?.createSignalDetectionNotAssociatedWithWaveformCurrentPhase
            ? formatHotkeyString(
                getKeyboardShortcutCombos(
                  keyboardShortcutConfig?.clickEvents
                    ?.createSignalDetectionNotAssociatedWithWaveformCurrentPhase,
                  keyboardShortcutConfig
                )[0]
              )
            : ''
        }
        onClick={() => {
          logger.info(
            'Create signal detection not associated to a waveform with current phase (shift + e + click)'
          );
          try {
            props?.createSignalDetection(
              props?.channelId,
              undefined,
              props?.timeSecs,
              props?.currentPhase,
              true
            );
          } catch (e) {
            logger.error(e);
          }
        }}
      />
      <MenuItem2
        text="Create signal detection not associated to a waveform with default phase"
        label={
          keyboardShortcutConfig?.clickEvents
            ?.createSignalDetectionNotAssociatedWithWaveformDefaultPhase
            ? formatHotkeyString(
                `${keyboardShortcutConfig.clickEvents.createSignalDetectionNotAssociatedWithWaveformDefaultPhase?.combos[0]}+click`
              )
            : ''
        }
        onClick={() => {
          logger.info(
            'Create signal detection not associated to a waveform with default phase (shift + alt + e + click)'
          );
          try {
            props?.createSignalDetection(
              props?.channelId,
              undefined,
              props?.timeSecs,
              props?.defaultSignalDetectionPhase,
              true
            );
          } catch (e) {
            logger.error(e);
          }
        }}
      />
    </Menu>
  );
}

export function CreateSignalDetectionMenu(props: {
  getOpenCallback: CreateSignalDetectionContextMenuGetOpenCallbackFunc;
}) {
  const { getOpenCallback } = props;

  const [createSignalDetectionCb, setCreateSignalDetectionCb] = useImperativeContextMenuCallback<
    CreateSignalDetectionContextMenuProps
  >();

  React.useEffect(() => {
    getOpenCallback({
      createSignalDetectionCb
    });
  }, [getOpenCallback, createSignalDetectionCb]);

  return (
    <ImperativeContextMenu<CreateSignalDetectionContextMenuProps>
      getOpenCallback={setCreateSignalDetectionCb}
      content={CreateSignalDetectionMenuContent} // Props are passed in by the createSignalDetectionCb call when it gets triggered
    />
  );
}
