import { IconNames } from '@blueprintjs/icons';
import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { isDropdownToolbarItem } from '../toolbar-item/dropdown-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a Dropdown specifically in the overflow menu.
 */
export function DropdownOverflowMenuToolbarItem({ item, menuKey }: ToolbarOverflowMenuItemProps) {
  if (isDropdownToolbarItem(item)) {
    return (
      <MenuItem2
        text={item.menuLabel ?? item.label}
        icon={item.icon}
        key={menuKey}
        disabled={item.disabled}
      >
        {item.dropdownOptions
          ? Object.keys(item.dropdownOptions).map(ekey => (
              <MenuItem2
                text={item.dropdownOptions[ekey]}
                disabled={
                  item.disabledDropdownOptions
                    ? item.disabledDropdownOptions.indexOf(item.dropdownOptions[ekey]) > -1
                    : false
                }
                key={ekey}
                onClick={() => item.onChange(item.dropdownOptions[ekey])}
                icon={item.value === item.dropdownOptions[ekey] ? IconNames.TICK : undefined}
              />
            ))
          : null}
      </MenuItem2>
    );
  }
  return null;
}
