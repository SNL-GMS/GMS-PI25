import type {
  ChannelSegmentTypes,
  ColorTypes,
  CommonTypes,
  ConfigurationTypes,
  EventTypes,
  FkTypes,
  SignalDetectionTypes,
  StationTypes,
  WorkflowTypes
} from '@gms/common-model';
import type GoldenLayout from '@gms/golden-layout';
import type {
  AnalystWorkspaceTypes,
  AppDispatch,
  ChannelSegmentFetchResult,
  EventsFetchResult,
  EventStatus,
  FindEventStatusInfoByStageIdAndEventIdsQuery,
  FkChannelSegmentRecord,
  FkFrequencyThumbnailRecord,
  SignalDetectionFetchResult,
  StationQueryProps,
  UIChannelSegmentRecord
} from '@gms/ui-state';
import type Immutable from 'immutable';

import type {
  FilterType,
  FkThumbnailSize
} from './components/fk-thumbnail-list/fk-thumbnails-controls';

/**
 * Used to return a super set of the fk configuration from the fk config popover
 */
export type FkConfigurationWithUnits = FkTypes.FkConfiguration & {
  fkUnitToDisplay: FkTypes.FkUnits;
};

/**
 * Azimuth Slowness Redux Props
 */
export interface AzimuthSlownessReduxProps {
  // passed in from golden-layout
  glContainer?: GoldenLayout.Container;
  viewableInterval: CommonTypes.TimeRange;
  openEventId: string;
  sdIdsToShowFk: string[];
  analysisMode: WorkflowTypes.AnalysisMode;
  location: AnalystWorkspaceTypes.LocationSolutionState;
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType;
  setSdIdsToShowFk(signalDetectionIds: string[]): void;
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
  signalDetectionResults: SignalDetectionFetchResult;
  channelSegmentResults: ChannelSegmentFetchResult;
  fkChannelSegments: FkChannelSegmentRecord;
  fkFrequencyThumbnails: FkFrequencyThumbnailRecord;
  eventResults: EventsFetchResult;
  eventStatusQuery: FindEventStatusInfoByStageIdAndEventIdsQuery;
  openIntervalName: string;
  uiTheme: ConfigurationTypes.UITheme;
  colorMap: ColorTypes.ColorMapName;
  dispatch: AppDispatch;
}

export interface SubscriptionAction {
  (
    list: SignalDetectionTypes.SignalDetection[],
    index: number,
    prev: SignalDetectionTypes.SignalDetection[],
    currentIteree: SignalDetectionTypes.SignalDetection
  ): void;
}

/**
 * Azimuth Slowness State
 */
export interface AzimuthSlownessState {
  fkThumbnailSizePx: FkThumbnailSize;
  fkThumbnailColumnSizePx: number;
  filterType: FilterType;
  numberOfOutstandingComputeFkMutations: number;
  fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>;
  fkInnerContainerWidthPx: number;
  displayedSignalDetectionId: string;
}

/**
 * Mutations used by the Az Slow display
 */
export interface AzimuthSlownessMutations {
  computeFks: (fkInput: FkTypes.FkInputWithConfiguration[]) => Promise<void>;
  setWindowLead: (args: any) => Promise<void>;
  markFkReviewed(channelSegmentDescriptor: ChannelSegmentTypes.ChannelSegmentDescriptor): void;
}

/**
 * Consolidated props for Azimuth Slowness
 */
export type AzimuthSlownessProps = AzimuthSlownessReduxProps &
  AzimuthSlownessMutations &
  StationQueryProps &
  SignalDetectionFetchResult &
  ChannelSegmentFetchResult &
  EventsFetchResult &
  FindEventStatusInfoByStageIdAndEventIdsQuery;

/**
 * State of the az slow panel
 */
export interface AzimuthSlownessPanelState {
  currentMovieSpectrumIndex: number;
  selectedSdIds: string[];
}

export interface AzimuthSlownessPanelProps {
  // Data
  defaultStations: StationTypes.Station[];
  eventsInTimeRange: EventTypes.Event[];
  eventStatuses: Record<string, EventStatus>;
  displayedSignalDetection: SignalDetectionTypes.SignalDetection | undefined;
  openEvent: EventTypes.Event | undefined;
  associatedSignalDetections: SignalDetectionTypes.SignalDetection[];
  unassociatedSignalDetections: SignalDetectionTypes.SignalDetection[];
  signalDetectionsToDraw: SignalDetectionTypes.SignalDetection[];
  signalDetectionsIdToFeaturePredictions: Immutable.Map<string, EventTypes.FeaturePrediction[]>;
  signalDetectionsByStation: SignalDetectionTypes.SignalDetection[];
  channelSegments: UIChannelSegmentRecord;
  selectedFk: FkTypes.FkPowerSpectra;
  fkChannelSegments: FkChannelSegmentRecord;
  fkFrequencyThumbnails: FkTypes.FkFrequencyThumbnail[];
  featurePredictionsForDisplayedSignalDetection: EventTypes.FeaturePrediction[];
  distances: EventTypes.LocationDistance[];
  location: AnalystWorkspaceTypes.LocationSolutionState;
  // Azimuth display state as props
  fkThumbnailColumnSizePx: number;
  fkDisplayWidthPx: number;
  fkDisplayHeightPx: number;
  filterType: FilterType;
  fkThumbnailSizePx: FkThumbnailSize;
  fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>;
  numberOfOutstandingComputeFkMutations: number;
  fkUnitForDisplayedSignalDetection: FkTypes.FkUnits;
  fkInnerContainerWidthPx: number;
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType;
  uiTheme: ConfigurationTypes.UITheme;
  openIntervalName: string;
  colorMap: ColorTypes.ColorMapName;
  // Prop functions
  adjustFkInnerContainerWidth(
    fkThumbnailsContainer: HTMLDivElement,
    fkThumbnailsInnerContainer: HTMLDivElement
  ): void;
  updateFkThumbnailSize(size: FkThumbnailSize): void;
  updateFkFilter(filterType: FilterType): void;
  setFkThumbnailColumnSizePx(newSizePx: number): void;
  computeFkAndUpdateState(
    fkParams: FkTypes.FkParams,
    configuration: FkTypes.FkDialogConfiguration
  ): void;
  setFkUnitForSdId(sdId: string, fkUnit: FkTypes.FkUnits): void;
  setSdIdsToShowFk(signalDetectionIds: string[]): void;
  setDisplayedSignalDetection(sd: SignalDetectionTypes.SignalDetection): void;
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
}
