import { UILogger } from '@gms/ui-util';
import { createSlice } from '@reduxjs/toolkit';

import { clearWaveforms } from '../../../workers/api/clear-waveforms';
import { undoRedoDataState } from '../../history/actions';
import { createReplaceEntityReducer } from '../create-replace-entity-reducer';
import { addChannelReducers } from './channel';
import { addEventReducers } from './event/event-reducer';
import { addComputeFkSpectraReducers } from './fk/compute-fk-spectra';
import { addFkReducers } from './fk/fk-reducer';
import { addSignalDetectionReducers } from './signal-detection/signal-detection-reducer';
import { addBeamformingTemplatesReducers } from './signal-enhancement/get-beamforming-templates';
import type { DataState } from './types';
import { addChannelSegmentReducers, addFilterDefinitionReducers, addQcReducers } from './waveform';

const logger = UILogger.create('GMS_DATA_SLICE', process.env.GMS_DATA_SLICE);

/**
 * The initial state for the data state.
 * This is the starting state for the {@link dataSlice}
 */
export const dataInitialState: DataState = {
  uiChannelSegments: {},
  fkChannelSegments: {},
  fkFrequencyThumbnails: {},
  signalDetections: {},
  events: {},
  associationConflict: {},
  filterDefinitions: {},
  filterDefinitionsForSignalDetections: {},
  filterDefinitionsForSignalDetectionHypothesesEventOpen: {},
  filterDefinitionsForSignalDetectionHypotheses: {},
  missingSignalDetectionsHypothesesForFilterDefinitions: [],
  // RAW channel segments only keyed on createChannelSegmentString(id)
  defaultFilterDefinitionByUsageForChannelSegments: {},
  defaultFilterDefinitionByUsageForChannelSegmentsEventOpen: {},
  channels: {
    raw: {},
    beamed: {},
    filtered: {}
  },
  qcSegments: {},
  queries: {
    computeFkSpectra: {},
    getFilterDefinitionsForSignalDetectionHypotheses: {},
    getSignalDetectionWithSegmentsByStationAndTime: {},
    getChannelSegmentsByChannel: {},
    findQCSegmentsByChannelAndTimeRange: {},
    getEventsWithDetectionsAndSegmentsByTime: {},
    findEventsByAssociatedSignalDetectionHypotheses: {},
    getChannelsByNamesTimeRange: {},
    getFilterDefinitionsForSignalDetections: {},
    getDefaultFilterDefinitionByUsageForChannelSegments: {},
    getProcessingMaskDefinitions: {},
    getBeamformingTemplates: {}
  },
  processingMaskDefinitions: {},
  beamformingTemplates: {}
};

/**
 * Defines a Redux slice that contains various data that is fetched using async thunk requests.
 */
export const dataSlice = createSlice({
  name: 'data',
  initialState: dataInitialState,
  reducers: {
    /**
     * clears all data and history from the state
     */
    clearAll(state) {
      Object.keys(state).forEach(key => {
        state[key] = dataInitialState[key];
      });
      clearWaveforms().catch(e => {
        logger.error(`Failed to clear out waveform cache`, e);
      });
    }
  },

  // add any extra reducers at the data slice level
  extraReducers: builder => {
    builder.addCase(undoRedoDataState, createReplaceEntityReducer());
    addChannelReducers(builder);
    addChannelSegmentReducers(builder);
    addComputeFkSpectraReducers(builder);
    addFilterDefinitionReducers(builder);
    addSignalDetectionReducers(builder);
    addEventReducers(builder);
    addFkReducers(builder);
    addQcReducers(builder);
    addBeamformingTemplatesReducers(builder);
  }
});
