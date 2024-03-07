import type { HotkeyConfig } from '@blueprintjs/core';
import { useHotkeys } from '@blueprintjs/core';
import {
  buildHotkeyConfigArray,
  useAppDispatch,
  useFilterCycle,
  useGetChannelsQuery,
  useGetDefaultFilterDefinitionByUsageForChannelSegments,
  useGetFilterDefinitionsForSignalDetections,
  useGetFilterListsDefinitionQuery,
  useKeyboardShortcutConfigurations,
  useViewableInterval,
  waveformSlice
} from '@gms/ui-state';
import React, { useEffect } from 'react';

/**
 * Creates a component that fetches the filter lists and listens for the filter hotkeys.
 */
// eslint-disable-next-line react/function-component-definition
export const FilterManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const [viewableInterval] = useViewableInterval();
  useGetFilterListsDefinitionQuery();
  useGetFilterDefinitionsForSignalDetections();
  useGetChannelsQuery();
  useGetDefaultFilterDefinitionByUsageForChannelSegments();

  const { selectNextFilter, selectPreviousFilter, selectUnfiltered } = useFilterCycle();

  useEffect(() => {
    // reset channel filters if the viewableInterval changes
    dispatch(waveformSlice.actions.clearChannelFilters());
  }, [dispatch, viewableInterval]);

  const keyboardShortcutConfigurations = useKeyboardShortcutConfigurations();

  // Disable hotkeys if there is no viewable interval
  const hotkeys = React.useMemo(() => {
    const configs: HotkeyConfig[] = [];
    // update HotkeyConfig once keyboardShortcutConfig loads
    configs.push(
      ...buildHotkeyConfigArray(
        keyboardShortcutConfigurations?.hotkeys?.selectNextFilter,
        selectNextFilter,
        undefined,
        !viewableInterval,
        true
      )
    );
    configs.push(
      ...buildHotkeyConfigArray(
        keyboardShortcutConfigurations?.hotkeys?.selectPreviousFilter,
        selectPreviousFilter,
        undefined,
        !viewableInterval,
        true
      )
    );
    configs.push(
      ...buildHotkeyConfigArray(
        keyboardShortcutConfigurations?.hotkeys?.selectUnfiltered,
        selectUnfiltered,
        undefined,
        !viewableInterval,
        true
      )
    );

    return configs;
  }, [
    keyboardShortcutConfigurations,
    selectNextFilter,
    selectPreviousFilter,
    selectUnfiltered,
    viewableInterval
  ]);

  useHotkeys(hotkeys);

  return null;
};
