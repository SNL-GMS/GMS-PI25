import type { CommonTypes, FilterTypes } from '@gms/common-model';
import { ConfigurationTypes } from '@gms/common-model';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { ChannelFilterRecord } from '../../../types';
import type {
  StationVisibilityChangesDictionary,
  WaveformDisplayedSignalDetectionConfigurationEnum,
  WaveformLoadingState,
  WaveformState
} from './types';

/**
 * The flag used for toggling the visibility of all mask types to on or off.
 */
let maskToggleVisibility = true;

// The default and initial waveform loading state
export const DEFAULT_INITIAL_WAVEFORM_LOADING_STATE: WaveformLoadingState = {
  isLoading: false,
  total: 0,
  completed: 0,
  percent: 0,
  description: 'Loading waveforms'
};

/**
 * the initial state for the waveform slice
 */
export const waveformInitialState: WaveformState = {
  channelFilters: {},
  loadingState: DEFAULT_INITIAL_WAVEFORM_LOADING_STATE,
  stationsVisibility: {},
  shouldShowTimeUncertainty: false,
  shouldShowPredictedPhases: true,
  zoomInterval: null,
  viewableInterval: null,
  minimumOffset: 0,
  maximumOffset: 0,
  baseStationTime: 0,
  maskVisibility: {},
  currentStationGroupStationNames: [],
  displayedSignalDetectionConfiguration: {
    signalDetectionBeforeInterval: true,
    signalDetectionAfterInterval: true,
    signalDetectionAssociatedToOpenEvent: true,
    signalDetectionAssociatedToCompletedEvent: true,
    signalDetectionAssociatedToOtherEvent: true,
    signalDetectionConflicts: true,
    signalDetectionUnassociated: true,
    signalDetectionDeleted: null // overridden by analyst config setting
  },
  viewportVisibleStations: []
};

/**
 * the waveform reducer slice
 */
export const waveformSlice = createSlice({
  name: 'waveform',
  initialState: waveformInitialState,
  reducers: {
    /**
     * Sets the stationsVisibility which tracks the changes to the default visibility
     */
    setStationsVisibility(state, action: PayloadAction<StationVisibilityChangesDictionary>) {
      state.stationsVisibility = action.payload;
    },
    /**
     * Sets the viewable interval, which is the interval of time that can be viewed in the waveform display
     * without loading more data from the server. This interval changes if the user pans out of the previous
     * viewable interval.
     */
    setViewableInterval(state, action: PayloadAction<CommonTypes.TimeRange>) {
      state.viewableInterval = action.payload;
    },
    /**
     * Sets the zoom interval, which is the interval of time currently displayed on the waveform display. This
     * amount of time is changed when the user zooms in or out, and when they pan.
     */
    setZoomInterval(state, action: PayloadAction<CommonTypes.TimeRange>) {
      state.zoomInterval = action.payload;
    },
    /**
     * Sets the minimum offset when not aligned by time
     */
    setMinimumOffset(state, action: PayloadAction<number>) {
      state.minimumOffset = action.payload;
    },
    /**
     * Sets the maximum offset when not aligned by time
     */
    setMaximumOffset(state, action: PayloadAction<number>) {
      state.maximumOffset = action.payload;
    },
    /**
     * Sets the base station time for offset calculations when not aligned by time
     */
    setBaseStationTime(state, action: PayloadAction<number>) {
      state.baseStationTime = action.payload;
    },
    /**
     * Sets the waveform client loading state, which is used to update the waveform loading spinner.
     */
    setWaveformClientLoadingState(state, action: PayloadAction<WaveformLoadingState>) {
      state.loadingState = action.payload;
    },
    /**
     * Sets whether or not to show the time uncertainty
     */
    setShouldShowTimeUncertainty(state, action: PayloadAction<boolean>) {
      state.shouldShowTimeUncertainty = action.payload;
    },

    /**
     * Sets whether or not to show the predicted phases
     */
    setShouldShowPredictedPhases(state, action: PayloadAction<boolean>) {
      state.shouldShowPredictedPhases = action.payload;
    },

    /**
     * Overwrites the record mapping channel/sd names to filters with the provided payload
     */
    setChannelFilters(state, action: PayloadAction<ChannelFilterRecord>) {
      state.channelFilters = action.payload;
    },

    /**
     * Creates/overwrites the filter for the provided channel/sd name. Use to set a single filter.
     */
    setFilterForChannel(
      state,
      action: PayloadAction<{
        channelOrSdName: string;
        filter: FilterTypes.Filter;
      }>
    ) {
      state.channelFilters[action.payload.channelOrSdName] = action.payload.filter;
    },

    /**
     * Resets the record mapping channel/sd names to filters
     */
    clearChannelFilters(state) {
      state.channelFilters = {};
    },

    /**
     * Sets the mask visibility for the provided QC Mask Type
     */
    setMaskVisibility: (
      state,
      action: PayloadAction<Record<ConfigurationTypes.QCMaskTypes, boolean>>
    ) => {
      state.maskVisibility = action.payload;
    },

    /**
     * Toggles the mask visibility for for all of the provided QC Mask Types
     */
    toggleQcMaskVisibility: state => {
      maskToggleVisibility = !maskToggleVisibility;
      Object.values(ConfigurationTypes.QCMaskTypes).forEach(key => {
        state.maskVisibility[key] = maskToggleVisibility;
      });
    },

    /**
     * Sets the stations with SDs in the open interval
     */
    setCurrentStationGroupStationNames(state, action: PayloadAction<string[]>) {
      state.currentStationGroupStationNames = action.payload;
    },

    updateDisplayedSignalDetectionConfiguration(
      state,
      action: PayloadAction<Record<WaveformDisplayedSignalDetectionConfigurationEnum, boolean>>
    ) {
      state.displayedSignalDetectionConfiguration = action.payload;
    },

    setViewportVisibleStations(state, action: PayloadAction<string[]>) {
      state.viewportVisibleStations = action.payload;
    }
  }
});

/**
 * The waveform Redux actions from the waveform slice.
 */
export const waveformActions = waveformSlice.actions;
