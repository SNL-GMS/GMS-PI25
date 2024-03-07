import classNames from 'classnames';
import * as React from 'react';

import type { HotkeyTooltipProps } from './types';
/**
 * common component for hotkey tooltip info
 */
// eslint-disable-next-line react/function-component-definition
export const HotkeyTooltip: React.FC<HotkeyTooltipProps> = ({
  info,
  hotkey
}: HotkeyTooltipProps) => {
  return (
    <div className="hotkey-tooltip">
      <div
        className={classNames({
          'hotkey-tooltip__info': true
        })}
      >{`${info}`}</div>
      <div
        className={classNames({
          'hotkey-tooltip__hotkey': true
        })}
      >{`${hotkey}`}</div>
    </div>
  );
};
