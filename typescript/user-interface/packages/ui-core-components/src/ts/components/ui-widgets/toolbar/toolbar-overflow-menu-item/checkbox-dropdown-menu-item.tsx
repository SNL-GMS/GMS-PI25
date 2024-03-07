import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import { CheckboxList } from '../../checkbox-list';
import { isCheckboxDropdownToolbarItem } from '../toolbar-item/checkbox-dropdown-item';
import type { ToolbarOverflowMenuItemProps } from './types';

/**
 * ToolbarItem component for a CheckboxDropdown specifically in the overflow menu.
 */
export function CheckboxDropdownOverflowMenuToolbarItem({
  item,
  menuKey
}: ToolbarOverflowMenuItemProps) {
  return isCheckboxDropdownToolbarItem(item) ? (
    <MenuItem2
      text={item.menuLabel ?? item.label}
      icon={item.icon}
      key={menuKey}
      disabled={item.disabled}
    >
      <CheckboxList
        enumToCheckedMap={item.values}
        enumToColorMap={item.colors}
        enumKeysToDisplayStrings={item.enumKeysToDisplayStrings}
        checkboxEnum={item.enumOfKeys}
        onChange={value => item.onChange(value)}
      />
    </MenuItem2>
  ) : null;
}
