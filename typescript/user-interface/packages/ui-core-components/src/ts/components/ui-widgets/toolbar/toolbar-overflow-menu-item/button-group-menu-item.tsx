import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { isButtonGroupToolbarItem } from '../toolbar-item/button-group-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a ButtonGroup specifically in the overflow menu.
 */
export function ButtonGroupOverflowMenuToolbarItem({
  item,
  menuKey
}: ToolbarOverflowMenuItemProps) {
  return isButtonGroupToolbarItem(item) ? (
    <MenuItem2 text={item.menuLabel ?? item.label} icon={item.icon} key={menuKey}>
      {item.buttons.map(button => (
        <MenuItem2
          key={button.buttonKey}
          text={button.menuLabel ?? button.label}
          icon={button.icon}
          disabled={button.disabled}
          onClick={e => button.onButtonClick(e)}
        />
      ))}
    </MenuItem2>
  ) : null;
}
