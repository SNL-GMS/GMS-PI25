import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';

import type { AppState } from '../../store';
import type { DataState } from './types';

export const selectUiChannelSegments = (state: AppState): DataState['uiChannelSegments'] =>
  state.data.uiChannelSegments;

export const selectFkChannelSegments = (state: AppState): DataState['fkChannelSegments'] =>
  state.data.fkChannelSegments;

export const selectFkFrequencyThumbnails = (state: AppState): DataState['fkFrequencyThumbnails'] =>
  state.data.fkFrequencyThumbnails;

export const selectFilterDefinitionsForSignalDetections = (
  state: AppState
): DataState['filterDefinitionsForSignalDetections'] =>
  state.data.filterDefinitionsForSignalDetections;

export const selectDefaultFilterDefinitionByUsageForChannelSegments = (
  state: AppState
): DataState['defaultFilterDefinitionByUsageForChannelSegments'] =>
  state.data.defaultFilterDefinitionByUsageForChannelSegments;

export const selectMissingSignalDetectionsHypothesesForFilterDefinitions = (
  state: AppState
): DataState['missingSignalDetectionsHypothesesForFilterDefinitions'] =>
  state.data.missingSignalDetectionsHypothesesForFilterDefinitions;

export const selectSignalDetections = (state: AppState): DataState['signalDetections'] =>
  state.data.signalDetections;

export const selectEvents = (state: AppState): DataState['events'] => state.data.events;

export const selectAssociationConflict = (state: AppState): DataState['associationConflict'] =>
  state.data.associationConflict;

export const selectFilterDefinitions = (state: AppState): DataState['filterDefinitions'] =>
  state.data.filterDefinitions;

export const selectRawChannels = (state: AppState): Record<string, Channel> =>
  state.data.channels.raw;

export const selectBeamedChannels = (state: AppState): Record<string, Channel> =>
  state.data.channels.beamed;

export const selectFilteredChannels = (state: AppState): Record<string, Channel> =>
  state.data.channels.filtered;

export const selectOpenEventId = (state: AppState): string => state.app.analyst.openEventId;
