import type { TagProps } from '@blueprintjs/core';
import { Intent } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type { ItemPredicate, ItemRenderer } from '@blueprintjs/select';
import { MultiSelect2 } from '@blueprintjs/select';
import React from 'react';

const stringPredicate: ItemPredicate<string> = (query, value, _index, exactMatch) => {
  const normalizedTitle = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  }
  return `${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
};

/**
 * The type of the props for the {@link StringMultiSelectProps} component
 */
export interface StringMultiSelectProps {
  values: string[];
  intent?: Intent | ((value: string, index: number) => Intent);
  selected: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange?: (values: string[]) => void;
}

/**
 * A multi select component to choose a set of strings
 */
export function StringMultiSelect({
  values,
  intent,
  placeholder,
  disabled,
  onChange,
  selected
}: StringMultiSelectProps) {
  const setSelected = React.useCallback(
    v => {
      if (onChange) onChange(v);
    },
    [onChange]
  );

  const handleClear = React.useCallback(() => {
    setSelected([]);
  }, [setSelected]);

  const handleSelect = React.useCallback(
    chan => {
      setSelected(Array.from(new Set([...selected, chan])));
    },
    [selected, setSelected]
  );

  const deselect = React.useCallback(
    (index: number) => {
      setSelected(selected.slice(0, index).concat(selected.slice(index + 1)));
    },
    [selected, setSelected]
  );

  const renderTag = React.useCallback(val => <span className="multiselect-tag">{val}</span>, []);

  const handleTagRemove = React.useCallback(
    (_tag: React.ReactNode, index: number) => {
      deselect(index);
    },
    [deselect]
  );

  const getTagProps = React.useCallback(
    (_value: React.ReactNode, index: number): TagProps => {
      return {
        minimal: true,
        intent: typeof intent === 'function' ? intent(values[index], index) : intent ?? Intent.NONE,
        disabled: selected.includes(values[index])
      } as TagProps;
    },
    [intent, selected, values]
  );

  const isValueSelected = React.useCallback(
    (value: string) => {
      return selected.includes(value);
    },
    [selected]
  );

  const renderValue: ItemRenderer<string> = React.useCallback(
    function RenderTag(value, { handleClick, handleFocus, modifiers }) {
      if (!modifiers.matchesPredicate) {
        return null;
      }
      return (
        <MenuItem2
          active={modifiers.active}
          disabled={modifiers.disabled}
          key={value}
          onClick={handleClick}
          onFocus={handleFocus}
          roleStructure="listoption"
          selected={isValueSelected(value)}
          text={value}
        />
      );
    },
    [isValueSelected]
  );

  return (
    <MultiSelect2<string>
      disabled={disabled}
      itemPredicate={stringPredicate}
      itemRenderer={renderValue}
      items={values}
      placeholder={placeholder}
      noResults={<MenuItem2 disabled text="No results." roleStructure="listoption" />}
      onClear={handleClear}
      onItemSelect={handleSelect}
      selectedItems={selected}
      tagRenderer={renderTag}
      tagInputProps={{
        onRemove: handleTagRemove,
        tagProps: getTagProps as any
      }}
      popoverProps={{ matchTargetWidth: true, minimal: true }}
    />
  );
}
