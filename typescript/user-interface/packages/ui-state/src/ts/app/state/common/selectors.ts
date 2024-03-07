import type { AppState } from '../../store';
import type { GLDisplayState } from './types';

export const isKeyboardShortcutPopupOpen = (state: AppState): boolean =>
  state.app.common.keyboardShortcutsVisibility;

export const isCommandPaletteOpen = (state: AppState): boolean =>
  state.app.common.commandPaletteIsVisible;

/**
 * Redux selector that returns the selected station and channel ids
 */
export const selectSelectedStationsAndChannelIds = (state: AppState): string[] =>
  state.app.common.selectedStationIds;

/**
 * Redux selector that returns the open golden layout displays
 */
export const selectOpenGoldenLayoutDisplays = (state: AppState): Record<string, GLDisplayState> =>
  state.app.common.glLayoutState;

/**
 * Redux selector that returns the selected event ids
 */
export const selectSelectedEventIds = (state: AppState): string[] =>
  state.app.analyst.selectedEventIds;
