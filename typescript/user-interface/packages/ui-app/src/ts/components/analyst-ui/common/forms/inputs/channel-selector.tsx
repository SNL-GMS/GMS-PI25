import type { Intent } from '@blueprintjs/core';
import type { ChannelTypes } from '@gms/common-model';
import React from 'react';

import { StringMultiSelect } from './string-multi-select';

const defaultBuildChannelTag = (channel: ChannelTypes.Channel) => channel.name;

/**
 * The type of the props for the {@link ChannelSelector} component
 */
export interface ChannelSelectorProps {
  buildChannelTag?: (channel: ChannelTypes.Channel) => string;
  validChannels: ChannelTypes.Channel[];
  selectedChannels: ChannelTypes.Channel[];
  disabled?: boolean;
  placeholder?: string;
  intent?: Intent | ((value: ChannelTypes.Channel, index: number) => Intent);
  onChange: (selection: ChannelTypes.Channel[]) => void;
}

/**
 * A multi-select input for channels
 */
export function ChannelSelector({
  buildChannelTag = defaultBuildChannelTag,
  selectedChannels,
  validChannels,
  disabled,
  placeholder,
  intent,
  onChange
}: ChannelSelectorProps) {
  const handleIntent = React.useCallback(
    (value: string, index: number): Intent => {
      return typeof intent === 'function'
        ? intent(
            validChannels.find(chan => chan.name === value),
            index
          )
        : intent;
    },
    [intent, validChannels]
  );
  return (
    <StringMultiSelect
      disabled={disabled}
      intent={handleIntent}
      placeholder={placeholder ?? 'No channels selected'}
      values={React.useMemo(() => validChannels.map(buildChannelTag), [
        buildChannelTag,
        validChannels
      ])}
      selected={React.useMemo(() => selectedChannels.map(buildChannelTag), [
        buildChannelTag,
        selectedChannels
      ])}
      onChange={React.useCallback(
        selection => {
          onChange(
            validChannels.filter(c => selection.find(selected => selected.includes(c.name)))
          );
        },
        [onChange, validChannels]
      )}
    />
  );
}
