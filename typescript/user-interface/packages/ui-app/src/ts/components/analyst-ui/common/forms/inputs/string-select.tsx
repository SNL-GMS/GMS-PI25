import { Button } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type { ItemPredicate, ItemRenderer } from '@blueprintjs/select';
import { Select2 } from '@blueprintjs/select';
import React from 'react';

const filterString: ItemPredicate<string> = (query, str, _index, exactMatch) => {
  const normalizedStr = str.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedStr === normalizedQuery;
  }
  return `${str}`.indexOf(normalizedQuery) >= 0;
};

const renderString: ItemRenderer<string> = (str, { handleClick, handleFocus, modifiers }) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem2
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={str}
      onClick={handleClick}
      onFocus={handleFocus}
      roleStructure="listoption"
      text={str}
    />
  );
};

export interface StringSelectProps {
  readonly items: string[];
  selected: string;
  placeholder?: string;
  setSelected: (val: string) => void;
  fill?: boolean;
  matchTargetWidth?: boolean;
}

/**
 * A dropdown select component for choosing from a list of strings
 */
export function StringSelect({
  items,
  setSelected,
  selected,
  placeholder = 'Select one',
  fill = true,
  matchTargetWidth = true
}: StringSelectProps) {
  return (
    <Select2<string>
      items={items}
      itemPredicate={filterString}
      itemRenderer={renderString}
      noResults={<MenuItem2 disabled text="No results." roleStructure="listoption" />}
      onItemSelect={setSelected}
      popoverProps={{ matchTargetWidth }}
    >
      <Button
        text={selected}
        rightIcon="double-caret-vertical"
        placeholder={placeholder}
        fill={fill}
        alignText="left"
      />
    </Select2>
  );
}
