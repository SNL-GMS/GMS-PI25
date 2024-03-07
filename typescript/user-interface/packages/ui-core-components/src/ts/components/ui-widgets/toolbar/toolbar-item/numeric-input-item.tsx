import React from 'react';

import { NumericInput } from '../../numeric-input';
import type { MinMax, ToolbarItemBase, ToolbarItemElement } from '../types';

/**
 * Type guard, for use when rendering overflow menu items.
 */
export function isNumericInputToolbarItem(object: unknown): object is NumericInputToolbarItemProps {
  return (object as NumericInputToolbarItemProps).numericValue !== undefined;
}

/**
 * Properties to pass to the {@link NumericInputToolbarItem}
 *
 * @see {@link ToolbarItemBase} for base properties.
 */
export interface NumericInputToolbarItemProps extends ToolbarItemBase {
  /** initial/final numeric value */
  numericValue: number;

  /** min/max values for the numeric input */
  minMax: MinMax;

  /** step (+1, +2, +5) for the input control */
  step?: number;

  /** callback when the value changes */
  onChange(value: number);

  isInOverflowMenu?: boolean;
}

/**
 * Represents a numeric input spinner used within a toolbar
 *
 * @param numericInputItem the item to display {@link NumericInputItem}
 */
export function NumericInputToolbarItem({
  numericValue,
  minMax,
  step,
  onChange,
  style,
  label,
  labelRight,
  disabled,
  widthPx,
  tooltip,
  cyData,
  isInOverflowMenu
}: NumericInputToolbarItemProps): ToolbarItemElement {
  return (
    <div
      style={style ?? {}}
      className={isInOverflowMenu ? 'numeric-overflow-menu-toolbar-item' : null}
    >
      {!labelRight && label ? (
        <span className="toolbar-numeric__label toolbar-numeric__label-left">{label}</span>
      ) : null}
      <NumericInput
        value={numericValue}
        minMax={minMax}
        disabled={disabled}
        onChange={onChange}
        widthPx={widthPx}
        step={step}
        tooltip={tooltip}
        cyData={cyData}
      />
      {labelRight ? <span className="toolbar-numeric__label">{labelRight}</span> : null}
    </div>
  );
}
