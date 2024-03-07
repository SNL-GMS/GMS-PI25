import type {
  ChannelSegmentTypes,
  CommonTypes,
  ConfigurationTypes,
  EventTypes,
  SignalDetectionTypes,
  StationTypes,
  WaveformTypes,
  WorkflowTypes
} from '@gms/common-model';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type GoldenLayout from '@gms/golden-layout';
import type {
  AnalystWorkspaceTypes,
  ChannelFilterRecord,
  EventStatus,
  UpdateSignalDetectionArgs
} from '@gms/ui-state';
import type { WaveformDisplayProps as WeavessProps } from '@gms/weavess/lib/components/waveform-display/types';
import type { WeavessTypes } from '@gms/weavess-core';

import type {
  AmplitudeScalingOptions,
  FixedScaleValue
} from '../components/waveform-controls/scaling-options';

export interface WeavessDisplayState {
  qcSegmentModifyInterval?: CommonTypes.TimeRange;
  selectedQcSegment?: QcSegment;
  /**
   * The anchor for the channel selection range: this defines the starting point for a range selection.
   */
  selectionRangeAnchor: string;
}

interface WeavessDisplayReduxProps {
  // passed in from golden-layout
  glContainer?: GoldenLayout.Container;

  // callbacks
  createQcMask(args: any): Promise<void>;
  updateQcMask(args: any): Promise<void>;
  rejectQcMask(args: any): Promise<void>;
  createEvent(args: any): Promise<void>;
}

export interface WeavessDisplayComponentProps {
  weavessProps: WeavessProps;
  closeSignalDetectionOverlayCallback?: () => void;
  defaultWaveformFilters: WaveformTypes.WaveformFilter[];
  defaultStations: StationTypes.Station[];
  currentPhase?: string;
  defaultSignalDetectionPhase?: string;
  events: EventTypes.Event[];
  qcSegmentsByChannelName: Record<string, Record<string, QcSegment>>;
  processingMask: ChannelSegmentTypes.ProcessingMask;
  maskVisibility: Record<string, boolean>;
  measurementMode: AnalystWorkspaceTypes.MeasurementMode;
  signalDetections: SignalDetectionTypes.SignalDetection[];
  selectedSdIds: string[];
  setSelectedSdIds(id: string[]): void;
  associateSignalDetections: (selectedSdIds: string[]) => void;
  unassociateSignalDetections: (selectedSdIds: string[], rejectAssociations?: boolean) => void;
  selectedStationIds: string[];
  signalDetectionActionTargets: string[];
  setSelectedStationIds(ids: string[]);
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
  amplitudeScaleOption?: AmplitudeScalingOptions;
  fixedScaleVal?: FixedScaleValue;
  scaleAmplitudeChannelName?: string;
  scaledAmplitudeChannelMinValue?: number;
  scaledAmplitudeChannelMaxValue?: number;
  currentTimeInterval: CommonTypes.TimeRange;
  currentOpenEventId: string;
  openIntervalName: string;
  analysisMode: WorkflowTypes.AnalysisMode;
  sdIdsToShowFk: string[];
  setSdIdsToShowFk(signalDetections: string[]): void;
  eventStatuses: Record<string, EventStatus>;
  uiTheme: ConfigurationTypes.UITheme;
  stationsAssociatedToCurrentOpenEvent?: string[];
  updateSignalDetection(args: UpdateSignalDetectionArgs);
  createSignalDetection(
    stationId: string,
    channelName: string,
    timeSecs: number,
    phase?: string,
    isTemporary?: boolean
  );
  phaseMenuVisibility: boolean;
  setPhaseMenuVisibility(visibility: boolean): void;
  setClickedSdId(clickedSdId: string): void;
  setSignalDetectionActionTargets(signalDetectionIds: string[]): void;
  channelFilters: ChannelFilterRecord;
  setViewportVisibleStations(
    channels: WeavessTypes.Channel[],
    indexStart: number,
    indexEnd: number
  ): void;
}

export type WeavessDisplayProps = WeavessDisplayReduxProps & WeavessDisplayComponentProps;
