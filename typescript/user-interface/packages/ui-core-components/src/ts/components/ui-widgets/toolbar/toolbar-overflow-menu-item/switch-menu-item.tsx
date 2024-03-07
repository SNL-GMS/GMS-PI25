import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { isSwitchToolbarItem } from '../toolbar-item/switch-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a Switch specifically in the overflow menu.
 */
export function SwitchOverflowMenuToolbarItem({ item, menuKey }: ToolbarOverflowMenuItemProps) {
  return isSwitchToolbarItem(item) ? (
    <MenuItem2
      text={item.menuLabel ?? item.label}
      icon={item.icon}
      key={menuKey}
      disabled={item.disabled}
      onClick={() => item.onChange(!item.switchValue)}
    />
  ) : null;
}
