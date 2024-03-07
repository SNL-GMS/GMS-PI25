import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { isButtonToolbarItem } from '../toolbar-item/button-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a Button specifically in the overflow menu.
 */
export function ButtonOverflowMenuToolbarItem({ item, menuKey }: ToolbarOverflowMenuItemProps) {
  return isButtonToolbarItem(item) ? (
    <MenuItem2
      key={menuKey}
      text={item.menuLabel ?? item.label}
      title={item.tooltip}
      icon={item.icon}
      disabled={item.disabled}
      onClick={e => item.onButtonClick(e)}
    />
  ) : null;
}
