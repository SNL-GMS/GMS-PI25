import type {
  ChannelSegmentTypes,
  ChannelTypes,
  CommonTypes,
  ConfigurationTypes,
  EventTypes,
  FilterTypes,
  SignalDetectionTypes,
  StationTypes,
  WaveformTypes,
  WorkflowTypes
} from '@gms/common-model';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type { KeyboardShortcutConfigurations } from '@gms/common-model/lib/ui-configuration/types';
import type GoldenLayout from '@gms/golden-layout';
import type {
  AnalystWaveformTypes,
  AnalystWorkspaceTypes,
  EventStatus,
  PredictFeaturesForEventLocationQueryProps,
  ProcessingAnalystConfigurationQueryProps,
  StationQueryProps,
  UiChannelSegment,
  UpdateSignalDetectionArgs
} from '@gms/ui-state';
import type { AlignWaveformsOn } from '@gms/ui-state/lib/app/state/analyst/types';
import type {
  WaveformDisplayedSignalDetectionConfigurationEnum,
  WaveformLoadingState
} from '@gms/ui-state/lib/app/state/waveform/types';
import type { WeavessTypes } from '@gms/weavess-core';

import type {
  AmplitudeScalingOptions,
  FixedScaleValue
} from './components/waveform-controls/scaling-options';

export enum KeyDirection {
  UP = 'Up',
  DOWN = 'Down',
  LEFT = 'Left',
  RIGHT = 'Right'
}

/**
 * Waveform Display display state.
 * keep track of selected channels & signal detections
 */
export interface WaveformDisplayState {
  weavessStations: WeavessTypes.Station[];
  currentTimeInterval: CommonTypes.TimeRange;
  loadingWaveforms: boolean;
  loadingWaveformsPercentComplete: number;
  analystNumberOfWaveforms: number;
  currentOpenEventId: string;
  isMeasureWindowVisible: boolean;
  amplitudeScaleOption: AmplitudeScalingOptions;
  fixedScaleVal: FixedScaleValue;
  scaleAmplitudeChannelName: string;
  scaledAmplitudeChannelMinValue: number;
  scaledAmplitudeChannelMaxValue: number;
}

/**
 * Props mapped in from Redux state
 */
export interface WaveformDisplayReduxProps {
  // passed in from golden-layout
  glContainer?: GoldenLayout.Container;
  currentTimeInterval: CommonTypes.TimeRange;
  currentStageName: string;
  defaultSignalDetectionPhase: string;
  currentOpenEventId: string;
  selectedSdIds: string[];
  signalDetectionActionTargets: string[];
  stationsVisibility: AnalystWaveformTypes.StationVisibilityChangesDictionary;
  selectedStationIds: string[];
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType;
  analysisMode: WorkflowTypes.AnalysisMode;
  measurementMode: AnalystWorkspaceTypes.MeasurementMode;
  sdIdsToShowFk: string[];
  location: AnalystWorkspaceTypes.LocationSolutionState;
  channelFilters: Record<string, FilterTypes.Filter>;
  openEventId: string;
  keyPressActionQueue: Record<string, number>;
  // because the user may load more waveform
  // data than the currently opened time interval
  viewableInterval: WeavessTypes.TimeRange;
  zoomInterval: WeavessTypes.TimeRange;
  minimumOffset: number;
  maximumOffset: number;
  baseStationTime: number;
  shouldShowTimeUncertainty: boolean;
  shouldShowPredictedPhases: boolean;
  qcSegments: Record<string, Record<string, QcSegment>>;
  processingMask: ChannelSegmentTypes.ProcessingMask;
  maskVisibility: Record<string, boolean>;
  alignablePhases: string[];
  phaseToAlignOn: string | undefined;
  alignWaveformsOn: AlignWaveformsOn;
  waveformClientState: WaveformLoadingState;
  filterList: FilterTypes.FilterList;
  createEventMenuVisibility: boolean;
  phaseMenuVisibility: boolean;
  currentPhaseMenuVisibility: boolean;
  currentPhase: string;
  phaseHotkeys: PhaseHotkey[];
  clickedSdId: string;
  displayedSignalDetectionConfiguration: Record<
    WaveformDisplayedSignalDetectionConfigurationEnum,
    boolean
  >;
  // callbacks
  isStationVisible(station: StationTypes.Station | string): boolean;
  isStationExpanded(station: StationTypes.Station | string): boolean;
  getVisibleStationsFromStationList(stations: StationTypes.Station[]): StationTypes.Station[];
  pan(
    panDirection: WaveformTypes.PanType,
    options?: { shouldLoadAdditionalData?: boolean; onPanningBoundaryReached?: () => void }
  ): WeavessTypes.TimeRange;
  setDefaultSignalDetectionPhase(phase: string): void;
  setMode(mode: AnalystWorkspaceTypes.WaveformDisplayMode): void;
  setOpenEventId(eventId: string): void;
  setSelectedSdIds(idx: string[]): void;
  setSelectedStationIds(ids: string[]);
  setSdIdsToShowFk(signalDetections: string[]): void;
  setSelectedSortType(selectedSortType: AnalystWorkspaceTypes.WaveformSortType): void;
  setChannelFilters(filters: Record<string, WaveformTypes.WaveformFilter>);
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
  setKeyPressActionQueue(actions: Record<string, number>): void;
  setStationsVisibility(
    stationsVisibility: AnalystWaveformTypes.StationVisibilityChangesDictionary
  );
  setStationVisibility(station: StationTypes.Station | string, isVisible: boolean): void;
  setStationExpanded(station: StationTypes.Station | string, isExpanded?: boolean): void;
  setChannelVisibility(
    station: StationTypes.Station | string,
    channel: ChannelTypes.Channel | string,
    isVisible: boolean
  ): void;
  setViewableInterval(viewableInterval: CommonTypes.TimeRange): void;
  setMinimumOffset(minimumOffset: number): void;
  setMaximumOffset(maximumOffset: number): void;
  setBaseStationTime(baseStationTime: number): void;
  setZoomInterval(zoomInterval: CommonTypes.TimeRange): void;
  showAllChannels(station: StationTypes.Station | string): void;
  setShouldShowTimeUncertainty(newValue: boolean): void;
  setShouldShowPredictedPhases(newValue: boolean): void;
  markAmplitudeMeasurementReviewed(args: any): Promise<void>;
  onWeavessMount?(weavessInstance: WeavessTypes.WeavessInstance): void;
  setAlignWaveformsOn(alignWaveformsOn: AlignWaveformsOn): void;
  setPhaseToAlignOn(phaseToAlignOn: string): void;
  associateSignalDetections: (selectedSdIds: string[]) => void;
  unassociateSignalDetections: (selectedSdIds: string[], rejectAssociations?: boolean) => void;
  updateSignalDetection(args: UpdateSignalDetectionArgs);
  signalDetectionPhaseUpdate(selectedSdIds: string[], phase: string);
  createSignalDetection: (
    stationId: string,
    channelName: string,
    timeSecs: number,
    phase?: string,
    isTemporary?: boolean
  ) => Promise<void>;
  setPhaseMenuVisibility(newValue: boolean): void;
  setCreateEventMenuVisibility(newValue: boolean): void;
  setCurrentPhaseMenuVisibility(newValue: boolean): void;
  setCurrentPhase: (phase: string[]) => void;
  setClickedSdId(clickedSdId: string): void;
  setSignalDetectionActionTargets(signalDetectionIds: string[]): void;
  setViewportVisibleStations(
    channels: WeavessTypes.Channel[],
    indexStart: number,
    indexEnd: number
  ): void;
}

/**
 * Consolidated props type for waveform display.
 */
export type WaveformDisplayProps = WaveformDisplayReduxProps &
  ProcessingAnalystConfigurationQueryProps &
  PredictFeaturesForEventLocationQueryProps &
  StationQueryProps & {
    events: EventTypes.Event[];
    signalDetections: SignalDetectionTypes.SignalDetection[];
    sdIdsInConflict: string[];
    channelSegments: Record<string, Record<string, UiChannelSegment[]>>;
    uiTheme: ConfigurationTypes.UITheme;
    eventStatuses: Record<string, EventStatus>;
    distances: EventTypes.LocationDistance[];
    offsets: Record<string, number>;
    weavessHotkeyDefinitions: WeavessTypes.HotKeysConfiguration;
    keyboardShortcuts: KeyboardShortcutConfigurations;
  };

/**
 * The props for the {@link WaveformComponent}.
 * We omit the signalDetectionResults and channelSegmentResults and replace them with
 * the modified fetch results type, because the non-ideal state component consumes
 * and removes the metadata (such as isLoading and isError). This is a performance
 * optimization, since it reduces the number of times the {@link WaveformPanel} renders
 */
export type WaveformComponentProps = Omit<
  WaveformDisplayProps,
  'channelSegments' | 'events' | 'signalDetections'
>;

/**
 * Used to build the phase hotkeys for display and their tooltip
 * in the phase selector popup
 */
export interface PhaseHotkey {
  phase: string;
  hotkey: string;
  tooltip: JSX.Element;
}
