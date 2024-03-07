import React from 'react';

import { PopoverButton } from '../../popover-button';
import type { ToolbarItemBase, ToolbarItemElement } from '../types';

/**
 * Type guard, for use when rendering overflow menu items.
 */
export function isPopoverButtonToolbarItem(
  object: unknown
): object is PopoverButtonToolbarItemProps {
  return (object as PopoverButtonToolbarItemProps).popoverContent !== undefined;
}

/**
 * Properties to pass to the {@link PopoverButtonToolbarItem}
 *
 * @see {@link ToolbarItemBase} for base properties.
 */
export interface PopoverButtonToolbarItemProps extends ToolbarItemBase {
  /** content of the popover */
  popoverContent: JSX.Element;

  /** callback when the popover is closed */
  onPopoverDismissed?: () => unknown;
}

/**
 * Represents a Popover(similar to a tooltip) used within a toolbar
 *
 * @param popoverButtonItem the item to display {@link PopoverButtonItem}
 */
export function PopoverButtonToolbarItem({
  popoverContent,
  onPopoverDismissed,
  style,
  label,
  tooltip,
  icon,
  onlyShowIcon,
  disabled,
  widthPx,
  popoverButtonMap,
  cyData
}: PopoverButtonToolbarItemProps): ToolbarItemElement {
  const handleRef = React.useCallback(
    (ref: PopoverButton): void => {
      if (ref && popoverButtonMap) {
        popoverButtonMap.set(1, ref);
      }
    },
    [popoverButtonMap]
  );

  return (
    <div style={style}>
      <PopoverButton
        label={label}
        tooltip={tooltip}
        icon={icon}
        onlyShowIcon={onlyShowIcon}
        disabled={disabled}
        popupContent={popoverContent}
        onPopoverDismissed={onPopoverDismissed}
        widthPx={widthPx}
        ref={handleRef}
        data-cy={cyData}
      />
    </div>
  );
}
