import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { isCustomToolbarItem } from '../toolbar-item/custom-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a CustomItem specifically in the overflow menu.
 */
export function CustomOverflowMenuToolbarItem({ item, menuKey }: ToolbarOverflowMenuItemProps) {
  return isCustomToolbarItem(item) ? (
    <MenuItem2
      key={menuKey}
      text={item.menuLabel ?? item.label}
      disabled={item.disabled}
      icon={item.icon}
    >
      {item.element}
    </MenuItem2>
  ) : null;
}
