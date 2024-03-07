import type { CommonTypes } from '@gms/common-model';
import { EventTypes, FkTypes, WorkflowTypes } from '@gms/common-model';
import {
  defaultStations,
  eventData,
  eventList,
  locationSolution,
  processingAnalystConfigurationData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { Logger } from '@gms/common-util';
import type {
  ChannelSegmentFetchResult,
  EventsFetchResult,
  SignalDetectionFetchResult,
  UseQueryStateResult
} from '@gms/ui-state';
import { AnalystWorkspaceTypes } from '@gms/ui-state';
import {
  getTestFkChannelSegmentRecord,
  getTestFkData,
  getTestFkFrequencyThumbnailRecord,
  uiChannelSegmentRecord
} from '@gms/ui-state/__tests__/__data__';
import type { Point } from '@gms/ui-util';
import * as Immutable from 'immutable';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';

import {
  FilterType,
  FkThumbnailSize
} from '../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnails-controls';
import type {
  AzimuthSlownessPanelProps,
  AzimuthSlownessProps
} from '../../src/ts/components/analyst-ui/components/azimuth-slowness/types';

const logger = Logger.create('GMS_LOG_JEST', process.env.GMS_LOG_JEST);

// 11:59:59 05/19/2010
export const startTimeSeconds = 1274313599;

// 02:00:01 05/20/2010
export const endTimeSeconds = 1274320801;

// time block 2 hours = 7200 seconds
export const timeBlock = 7200;

export const timeInterval: CommonTypes.TimeRange = {
  startTimeSecs: startTimeSeconds,
  endTimeSecs: endTimeSeconds
};

export const currentProcStageIntId = '3';

export const analystCurrentFk: Point = {
  x: 10,
  y: 11
};

const sdIdsFullMap: string[] = signalDetectionsData.map(sd => sd.id);

export const signalDetectionsIds = uniq(sdIdsFullMap);
export const eventId = eventData.id;

export const selectedSignalDetectionID = signalDetectionsIds[0];
export const testMagTypes: AnalystWorkspaceTypes.DisplayedMagnitudeTypes = {};
testMagTypes[EventTypes.MagnitudeType.MB] = true;
testMagTypes[EventTypes.MagnitudeType.MB_MLE] = true;
testMagTypes[EventTypes.MagnitudeType.MS] = true;
testMagTypes[EventTypes.MagnitudeType.MS_MLE] = true;

export const useQueryStateResult: UseQueryStateResult<any> = {
  isError: false,
  isFetching: false,
  isLoading: false,
  isSuccess: true,
  isUninitialized: true,
  currentData: undefined,
  data: undefined,
  endpointName: undefined,
  error: undefined,
  fulfilledTimeStamp: undefined,
  originalArgs: undefined,
  requestId: undefined,
  startedTimeStamp: undefined,
  status: undefined
};
const processingAnalystConfigurationQuery = cloneDeep(useQueryStateResult);
processingAnalystConfigurationQuery.data = {
  defaultNetwork: 'demo',
  defaultInteractiveAnalysisStationGroup: 'ALL_1',
  defaultFilters: []
};
export const eventResults: EventsFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: [eventData]
};

const signalDetectionResults: SignalDetectionFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: signalDetectionsData
};

const channelSegmentResults: ChannelSegmentFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: uiChannelSegmentRecord
};

const stationsQuery = cloneDeep(useQueryStateResult);
stationsQuery.data = defaultStations;

const eventStatusQuery = cloneDeep(useQueryStateResult);
eventStatusQuery.data = {};

const fkChannelSegmentRecord = getTestFkChannelSegmentRecord(signalDetectionsData[0]);
const fkFrequencyThumbnailsRecord = getTestFkFrequencyThumbnailRecord(signalDetectionsData[0]);

const location: AnalystWorkspaceTypes.LocationSolutionState = {
  selectedPreferredLocationSolutionId: locationSolution.id,
  selectedLocationSolutionId: locationSolution.id,
  selectedLocationSolutionSetId: 'testSelectedLocationSolutionSetId',
  selectedPreferredLocationSolutionSetId: 'testSelectedPreferredLocationSolutionSetId'
};

export const azSlowProps: Partial<AzimuthSlownessProps> = {
  location,
  viewableInterval: timeInterval,
  openEventId: eventList[0].id,
  analysisMode: WorkflowTypes.AnalysisMode.EVENT_REVIEW,
  sdIdsToShowFk: [signalDetectionsData[1].id],
  setSdIdsToShowFk: () => {
    logger.debug('azSlowProps - setSdIdsToShowFk');
  },
  selectedSortType: undefined,
  setMeasurementModeEntries: jest.fn(),
  markFkReviewed: jest.fn(),
  uiTheme: processingAnalystConfigurationData.uiThemes[0],
  openIntervalName: 'AL1',
  signalDetectionResults,
  channelSegmentResults,
  eventResults,
  eventStatusQuery,
  stationsQuery,
  dispatch: jest.fn(),
  fkChannelSegments: fkChannelSegmentRecord,
  fkFrequencyThumbnails: fkFrequencyThumbnailsRecord
};

const locationToStationDistances: EventTypes.LocationDistance[] = [
  {
    distance: {
      degrees: 10,
      km: 10
    },
    azimuth: 1,
    id: '3308666b-f9d8-3bff-a59e-928730ffa797'
  }
];

export const azSlowPanelProps: Partial<AzimuthSlownessPanelProps> = {
  location,
  uiTheme: processingAnalystConfigurationData.uiThemes[0],
  openIntervalName: 'AL1',
  signalDetectionsByStation: signalDetectionsData,
  associatedSignalDetections: [signalDetectionsData[0]],
  unassociatedSignalDetections: [signalDetectionsData[1]],
  signalDetectionsToDraw: signalDetectionsData,
  displayedSignalDetection: signalDetectionsData[1],
  featurePredictionsForDisplayedSignalDetection: [],
  channelSegments: channelSegmentResults.data,
  openEvent: eventList[0],
  eventStatuses: eventStatusQuery.data,
  defaultStations: stationsQuery.data,
  fkChannelSegments: fkChannelSegmentRecord,
  distances: locationToStationDistances,
  fkThumbnailColumnSizePx: 110,
  fkDisplayWidthPx: 200,
  fkDisplayHeightPx: 200,
  filterType: FilterType.all,
  fkThumbnailSizePx: FkThumbnailSize.MEDIUM,
  fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>(),
  signalDetectionsIdToFeaturePredictions: Immutable.Map<string, EventTypes.FeaturePrediction[]>(),
  numberOfOutstandingComputeFkMutations: 1,
  fkUnitForDisplayedSignalDetection: FkTypes.FkUnits.FSTAT,
  fkInnerContainerWidthPx: 500,
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType.stationNameAZ,
  selectedFk: getTestFkData(timeInterval.startTimeSecs),
  colorMap: 'turbo',
  adjustFkInnerContainerWidth: jest.fn(),
  updateFkThumbnailSize: jest.fn(),
  setFkThumbnailColumnSizePx: jest.fn(),
  computeFkAndUpdateState: jest.fn(),
  setFkUnitForSdId: jest.fn(),
  setSdIdsToShowFk: jest.fn(),
  setDisplayedSignalDetection: jest.fn(),
  setMeasurementModeEntries: jest.fn()
};
