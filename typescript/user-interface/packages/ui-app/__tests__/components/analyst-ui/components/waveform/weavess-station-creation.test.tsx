/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-param-reassign */
import { Colors } from '@blueprintjs/core';
import { ConfigurationTypes } from '@gms/common-model';
import {
  defaultStations,
  eventData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import type { AnalystWaveformTypes } from '@gms/ui-state';
import { AnalystWorkspaceTypes } from '@gms/ui-state';
import { predictFeaturesForEventLocationResponseData } from '@gms/ui-state/__tests__/__data__';
import { testFilterList } from '@gms/ui-state/__tests__/filter-list-data';

import type { CreateWeavessStationsParameters } from '../../../../../src/ts/components/analyst-ui/components/waveform/weavess-stations-util';
import { createWeavessStations } from '../../../../../src/ts/components/analyst-ui/components/waveform/weavess-stations-util';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

describe('Weavess Station Creation unit tests', () => {
  const currentOpenEvent = eventData[0];
  const stationDefinitions = defaultStations;
  const events = [eventData];
  const measurementMode: AnalystWorkspaceTypes.MeasurementMode = {
    mode: AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT,
    entries: {}
  };
  const defaultMode: AnalystWorkspaceTypes.MeasurementMode = {
    mode: AnalystWorkspaceTypes.WaveformDisplayMode.DEFAULT,
    entries: {}
  };
  const signalDetections = signalDetectionsData;

  // Create the station visibility map
  const stationVisibilityDictionary: AnalystWaveformTypes.StationVisibilityChangesDictionary = {};
  stationDefinitions.forEach(station => {
    stationVisibilityDictionary[station.name] = {
      stationName: station.name,
      visibility: true,
      isStationExpanded: true,
      hiddenChannels: undefined
    };
  });

  const openIntervalName = 'AL1';

  const channelFilters = {};
  const waveformUtilParams: CreateWeavessStationsParameters = {
    openIntervalName,
    channelFilters,
    filterList: testFilterList,
    channelHeight: 24.8,
    currentOpenEvent,
    defaultStations: stationDefinitions,
    endTimeSecs: 1274400000,
    events,
    featurePredictions: predictFeaturesForEventLocationResponseData.receiverLocationsByName,
    measurementMode: defaultMode,
    offsets: {},
    showPredictedPhases: false,
    showSignalDetectionUncertainty: true,
    signalDetections,
    sdIdsInConflict: [],
    selectedSdIds: [],
    startTimeSecs: 1274392801,
    zoomInterval: { startTimeSecs: 1274392801, endTimeSecs: 1274400000 },
    distances: [],
    signalDetectionActionTargets: [],
    uiChannelSegments: {},
    stationVisibilityDictionary,
    stations: stationDefinitions,
    processingAnalystConfiguration: {
      uiThemes: [
        {
          name: 'GMS Default (dark)',
          isDarkMode: true,
          colors: {
            waveformRaw: Colors.COBALT4,
            waveformFilterLabel: Colors.LIGHT_GRAY5
          }
        }
      ]
    } as ConfigurationTypes.ProcessingAnalystConfiguration,
    uiTheme: {
      name: 'mockTheme',
      isDarkMode: true,
      colors: ConfigurationTypes.defaultColorTheme,
      display: {
        edgeEventOpacity: 0.5,
        edgeSDOpacity: 0.2,
        predictionSDOpacity: 0.1
      }
    },
    eventStatuses: {},
    qcSegmentsByChannelName: {},
    processingMask: null,
    maskVisibility: {},
    displayedSignalDetectionConfiguration: {
      signalDetectionBeforeInterval: true,
      signalDetectionAfterInterval: true,
      signalDetectionAssociatedToOpenEvent: true,
      signalDetectionAssociatedToCompletedEvent: true,
      signalDetectionAssociatedToOtherEvent: true,
      signalDetectionConflicts: true,
      signalDetectionUnassociated: true,
      signalDetectionDeleted: false
    }
  };

  let result = createWeavessStations(
    waveformUtilParams,
    AnalystWorkspaceTypes.WaveformSortType.stationNameAZ,
    []
  );
  result.forEach(station => {
    delete station.defaultChannel.waveform.channelSegmentsRecord;
    station.nonDefaultChannels.forEach(channel => delete channel.waveform.channelSegmentsRecord);
  });

  it('When switching to measurement mode, should show only waveforms/channels with associated SD', () => {
    expect(result).toMatchSnapshot();

    waveformUtilParams.measurementMode = measurementMode;

    result = createWeavessStations(
      waveformUtilParams,
      AnalystWorkspaceTypes.WaveformSortType.stationNameAZ,
      []
    );
    result.forEach(station => {
      delete station.defaultChannel.waveform.channelSegmentsRecord;
      station.nonDefaultChannels.forEach(channel => delete channel.waveform.channelSegmentsRecord);
    });
    expect(result).toMatchSnapshot();
  });
});
