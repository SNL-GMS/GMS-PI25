/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Icon, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Tooltip2 } from '@blueprintjs/popover2';
import classNames from 'classnames';
import React, { useLayoutEffect, useRef, useState } from 'react';

import type { PhaseHotkey } from '~analyst-ui/components/waveform/types';

/**
 * The type of the props for the {@link PhaseListEntry} component
 */
export interface PhaseListEntryProps {
  /**
   * The name of the phase
   */
  name: string;

  /**
   * phase that get shadowed hotkey label and tooltip
   */
  phaseHotkey?: PhaseHotkey;

  /**
   * is this phase selected?
   */
  isSelected?: boolean;

  /**
   * Is this phase a favorite?
   */
  isFavorite?: boolean;

  /**
   * click handler
   */
  handleClick: () => void;

  /**
   * operation to update processing analyst config favorite phases
   */
  updateFavoritesList: (phase: string) => void;
}

const ICON_SIZE = 13;

/**
 * A single phase entry in the list.
 *
 */
export function PhaseListEntry({
  name,
  phaseHotkey,
  isSelected,
  isFavorite,
  handleClick,
  updateFavoritesList
}: PhaseListEntryProps) {
  const ref = useRef(null);
  // width of hokey char
  const hotkeyCharacterWidth = 9;
  // width of phase char
  const phaseCharacterWidth = 9;
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    setWidth(ref?.current?.clientWidth);
  }, [ref?.current?.clientWidth]);
  const hotkeyCharLength = phaseHotkey?.hotkey?.length;
  const phaseCharLength = name?.length;
  const phaseWidth = phaseCharLength > 0 ? phaseCharacterWidth * phaseCharLength : undefined;
  const hotkeyWidth = hotkeyCharLength > 0 ? hotkeyCharacterWidth * hotkeyCharLength : undefined;
  const displayIcon = phaseWidth + hotkeyWidth > width;
  return (
    <li
      className="phase-list-entry"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role="button"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
    >
      <Icon
        icon={isFavorite ? 'star' : 'star-empty'}
        className={classNames('phase-list-entry__icon', 'phase-list-entry__button', {
          'phase-list-entry__button--hidden': !isFavorite
        })}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          updateFavoritesList(name);
        }}
        size={12}
      />
      <Tooltip2
        content={phaseHotkey?.tooltip ?? ''}
        className={classNames({
          'phase-list-entry__name': true,
          'phase-list-entry__tooltip': true
        })}
        hoverOpenDelay={350}
        position={Position.LEFT}
        disabled={phaseHotkey === undefined}
      >
        <div
          ref={ref}
          className={classNames({
            'phase-list-entry__title': true,
            'phase-list-entry__title--selected': !!isSelected,
            'phase-list-entry__title--favorite': !!isFavorite
          })}
        >
          {name}
          <span
            className={classNames({
              'phase-list-entry__hotkey': true
            })}
          >
            {displayIcon ? (
              <Icon size={ICON_SIZE} icon={IconNames.InfoSign} />
            ) : (
              `${phaseHotkey?.hotkey ?? ''}`
            )}
          </span>
        </div>
      </Tooltip2>
    </li>
  );
}
