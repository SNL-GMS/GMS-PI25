import type { ReferenceStationTypes, SohTypes } from '@gms/common-model';
import { Displays } from '@gms/common-model';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import cloneDeep from 'lodash/cloneDeep';

import type { Columns, DataAcquisitionState, SetSohFilterAction, SohStatus } from './types';
import {
  initialFiltersToDisplay,
  initialFiltersToDisplayDrillDown,
  initialStationStatisticsColumnsToDisplay
} from './types';

/**
 * The initial state for the data acquisition state.
 */
export const dataAcquisitionInitialState: DataAcquisitionState = {
  selectedAceiType: null,
  selectedProcessingStation: null,
  unmodifiedProcessingStation: null,
  data: {
    sohStatus: {
      lastUpdated: 0,
      isStale: true,
      loading: true,
      stationAndStationGroupSoh: {
        stationSoh: [],
        stationGroups: [],
        isUpdateResponse: false
      }
    }
  },
  stationStatisticsGroup: undefined,
  stationStatisticsColumns: cloneDeep(initialStationStatisticsColumnsToDisplay),
  filtersToDisplay: {
    [Displays.SohDisplays.STATION_STATISTICS]: cloneDeep(initialFiltersToDisplay),
    [Displays.SohDisplays.SOH_OVERVIEW]: cloneDeep(initialFiltersToDisplay),
    'soh-environment-channel-statuses': cloneDeep(initialFiltersToDisplay),
    'soh-environment-monitor-statuses': cloneDeep(initialFiltersToDisplayDrillDown),
    [Displays.SohDisplays.SOH_LAG]: cloneDeep(initialFiltersToDisplayDrillDown),
    [Displays.SohDisplays.SOH_MISSING]: cloneDeep(initialFiltersToDisplayDrillDown),
    [Displays.SohDisplays.SOH_TIMELINESS]: cloneDeep(initialFiltersToDisplayDrillDown)
  }
};

/**
 * The data acquisition reducer slice.
 */
export const dataAcquisitionSlice = createSlice({
  name: 'dataAcquisition',
  initialState: dataAcquisitionInitialState,
  reducers: {
    /**
     * ! NOT USED, selected stations is being updated by common setSelectedStationIds
     * Sets the selected processing station
     *
     * @param state the state
     * @param action the action
     */
    setSelectedProcessingStation(
      state,
      action: PayloadAction<ReferenceStationTypes.ReferenceStation>
    ) {
      state.selectedProcessingStation = action.payload;
    },

    /**
     * Sets the unmodified processing station
     *
     * @param state the state
     * @param action the action
     */
    setUnmodifiedProcessingStation(
      state,
      action: PayloadAction<ReferenceStationTypes.ReferenceStation>
    ) {
      state.unmodifiedProcessingStation = action.payload;
    },

    /**
     * Sets the soh status
     *
     * @param state the state
     * @param action the action
     */
    setSohStatus(state, action: PayloadAction<SohStatus>) {
      state.data.sohStatus = action.payload;
    },

    /**
     * Sets the selected ACEI type
     *
     * @param state the state
     * @param action the action
     */
    setSelectedAceiType(state, action: PayloadAction<SohTypes.AceiType>) {
      state.selectedAceiType = action.payload;
    },

    /**
     * Sets the filter state for the provided display
     */
    setFiltersToDisplay(state, action: PayloadAction<SetSohFilterAction>) {
      state.filtersToDisplay[action.payload.list] = action.payload.filters;
    },

    /**
     * Sets the selected group in the station statistics display. If undefined, shows all.
     */
    setStationStatisticsGroup(state, action: PayloadAction<string>) {
      state.stationStatisticsGroup = action.payload;
    },

    /**
     * Sets the selected columns in the station statistics display.
     */
    setStationStatisticsColumns(state, action: PayloadAction<Record<Columns, boolean>>) {
      state.stationStatisticsColumns = action.payload;
    },

    /**
     * Resets all drill down displays filters to default
     */
    resetDrillDownsFiltersToDefault(state) {
      state.filtersToDisplay['soh-environment-channel-statuses'] = cloneDeep(
        initialFiltersToDisplay
      );
      state.filtersToDisplay['soh-environment-monitor-statuses'] = cloneDeep(
        initialFiltersToDisplayDrillDown
      );
      state.filtersToDisplay[Displays.SohDisplays.SOH_LAG] = cloneDeep(
        initialFiltersToDisplayDrillDown
      );
      state.filtersToDisplay[Displays.SohDisplays.SOH_MISSING] = cloneDeep(
        initialFiltersToDisplayDrillDown
      );
      state.filtersToDisplay[Displays.SohDisplays.SOH_TIMELINESS] = cloneDeep(
        initialFiltersToDisplayDrillDown
      );
    }
  }
});

/**
 * The data acquisition actions.
 */
export const dataAcquisitionActions = dataAcquisitionSlice.actions;
