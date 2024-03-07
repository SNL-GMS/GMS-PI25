import type { BeamSummation, InterpolationMethod } from '../beamforming-templates/types';
import type { StationType } from '../common/types';
import type { FrequencyBand } from '../fk';
import type { WaveformFilter } from '../waveform/types';

/**
 * A visual theme for the UI (including colors, typography, spacing, etc...).
 * These are loaded in from processing config, and the user profile defines the active theme.
 */
export interface UITheme {
  /**
   * Theme name must be unique, and is what is used to indicate which theme
   * a user is configured to use.
   */
  name: string;
  /**
   * The colors for this theme.
   */
  colors: ColorTheme;
  /**
   * Visual configurations for opacity and brightness
   */
  display: {
    // Determines the much less visible edge events are shown
    edgeEventOpacity: number;
    edgeSDOpacity: number;
    predictionSDOpacity: number;
  };
  /**
   * Used to determine if we're in a dark mode or a light mode. This indicates if we should
   * tell our component library (Blueprint) to be in dark or light mode.
   */
  isDarkMode?: boolean;
}

/**
 * A definition of configurable colors for a @interface UITheme.
 * Color strings may be any valid css color.
 */
export interface ColorTheme {
  gmsMain: string;
  gmsMainInverted: string;
  gmsBackground: string;
  gmsSelection: string;
  gmsTableSelection: string;
  mapStationDefault: string;
  mapVisibleStation: string;
  unassociatedSDColor: string;
  openEventSDColor: string;
  completeEventSDColor: string;
  completeEventSDHoverColor: string;
  conflict: string;
  otherEventSDColor: string;
  deletedEventColor: string;
  fkNeedsReview: string;
  fkSelection: string;
  rejectedEventColor: string;
  deletedSdColor: string;
  predictionSDColor: string;
  waveformDimPercent: number;
  waveformRaw: string;
  waveformFilterLabel: string;
  waveformMaskLabel: string;
  // This partial as not all menu options have colors
  qcMaskColors: Partial<Record<QCMaskTypes, string>>;
  weavessOutOfBounds: string;
  popover: PopoverColorTheme;
  gmsActionTarget: string;
}

/**
 * A definition of configurable colors for the popover element in @interface ColorTheme
 * Color strings may be any valid css color.
 */
export interface PopoverColorTheme {
  background: string;
  header: string;
  input: string;
  invalidInput: string;
  gridBackground: string;
}

/**
 * The configuration for a single keyboard shortcut, including information
 * for display in the keyboards shortcuts dialog, as well as the actual hotkeys themselves.
 */
export interface HotkeyConfiguration {
  /** Human readable, short description of what the keyboard shortcut does */
  description: string;

  /** If provided, gets displayed in an info popover */
  helpText?: string;

  /** The actual hotkey combo(s) that trigger this event */
  combos: string[];

  /** A list of search terms that should be considered matches */
  tags?: string[];

  /** Groups like hotkeys. If it is scoped to a display, use the display name */
  categories?: string[];
}

/**
 * All possible click events
 */
type ClickEventDefinitions =
  | 'createSignalDetectionWithCurrentPhase'
  | 'createSignalDetectionWithDefaultPhase'
  | 'createSignalDetectionNotAssociatedWithWaveformCurrentPhase'
  | 'createSignalDetectionNotAssociatedWithWaveformDefaultPhase'
  | 'viewQcSegmentDetails'
  | 'showEventDetails'
  | 'showSignalDetectionDetails'
  | 'showStationDetails'
  | 'selectParentChild'
  | 'selectParentChildRange';

/**
 * All possible middle click events
 */
type MiddleClickDefinitions = undefined;

/**
 * All possible right click events
 */
type RightClickDefinitions = undefined;

/**
 * All possible double click events
 */
type DoubleClickDefinitions =
  | 'associateSelectedSignalDetections'
  | 'unassociateSelectedSignalDetections';

/**
 * All possible drag events
 */
type DragEventDefinitions =
  | 'zoomToRange'
  | 'drawMeasureWindow'
  | 'scaleWaveformAmplitude'
  | 'createQcSegments'
  | 'showRuler';

/**
 * All possible scroll events
 */
type ScrollEventDefinitions = 'zoomMouseWheel';

/**
 * All possible hotkey events
 */
type HotkeyDefinitions =
  | 'zoomInOneStep'
  | 'zoomOutOneStep'
  | 'zoomOutFully'
  | 'zas'
  | 'createEventBeam'
  | 'panRight'
  | 'panLeft'
  | 'pageDown'
  | 'pageUp'
  | 'panRightHard'
  | 'panLeftHard'
  | 'scaleAllWaveformAmplitude'
  | 'resetSelectedWaveformAmplitudeScaling'
  | 'resetAllWaveformAmplitudeScaling'
  | 'toggleUncertainty'
  | 'editSignalDetectionUncertainty'
  | 'toggleQcMaskVisibility'
  | 'toggleAlignment'
  | 'workflowRightOneDay'
  | 'workflowLeftOneDay'
  | 'workflowRightOneWeek'
  | 'workflowLeftOneWeek'
  | 'showKeyboardShortcuts'
  | 'toggleSetPhaseMenu'
  | 'selectNextFilter'
  | 'selectPreviousFilter'
  | 'selectUnfiltered'
  | 'createNewEvent'
  | 'associateSelectedSignalDetections'
  | 'unassociateSelectedSignalDetections'
  | 'currentPhaseLabel'
  | 'defaultPhaseLabel'
  | 'historyEventMode'
  | 'undo'
  | 'redo'
  | 'eventUndo'
  | 'eventRedo'
  | 'toggleCurrentPhaseMenu'
  | 'toggleCommandPalette'
  | 'hideMeasureWindow'
  | 'increaseVisibleWaveforms'
  | 'decreaseVisibleWaveforms'
  | 'closeCreateSignalDetectionOverlay';

type PreventDefaultDefinitions = 'chromeMenu';

/**
 * The configuration object describing the 'click' keyboard shortcuts.
 */
export type ClickShortcutConfig = {
  [key in ClickEventDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'middle click' keyboard shortcuts.
 */
export type MiddleClickShortcutConfig = {
  [key in MiddleClickDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'right click' keyboard shortcuts.
 */
export type RightClickShortcutConfig = {
  [key in RightClickDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'double click' keyboard shortcuts.
 */
export type DoubleClickShortcutConfig = {
  [key in DoubleClickDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'drag' keyboard shortcuts.
 */
export type DragShortcutConfig = {
  [key in DragEventDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'scroll' keyboard shortcuts.
 */
export type ScrollShortcutConfig = {
  [key in ScrollEventDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'hotkey' keyboard shortcuts.
 */
export type HotkeyShortcutConfig = {
  [key in HotkeyDefinitions]: HotkeyConfiguration;
};

/**
 * The configuration object describing the 'hotkey' keyboard shortcuts.
 */
export type PreventDefaultConfig = {
  [key in PreventDefaultDefinitions]: HotkeyConfiguration;
};

/**
 * Mapping of all keyboard shortcut types and their corresponding possible fields
 */
export interface KeyboardShortcutConfigurations {
  clickEvents?: ClickShortcutConfig;
  middleClickEvents?: MiddleClickShortcutConfig;
  rightClickEvents?: RightClickShortcutConfig;
  doubleClickEvents?: DoubleClickShortcutConfig;
  dragEvents?: DragShortcutConfig;
  scrollEvents?: ScrollShortcutConfig;
  hotkeys?: HotkeyShortcutConfig;
}

/**
 * Record mapping the keyboard shortcut keys to display strings that are implied by this
 * group of keyboard shortcuts
 */
export const ImpliedUserActions: Record<keyof KeyboardShortcutConfigurations, string> = {
  clickEvents: 'click',
  doubleClickEvents: 'double click',
  dragEvents: 'drag',
  hotkeys: '', // special case, since we don't want to add any other text
  middleClickEvents: 'middle click',
  rightClickEvents: 'right click',
  scrollEvents: 'mouse wheel'
} as const;

/**
 * A list of mask types for the qc mask dropdown
 */
export enum QCMaskTypes {
  ANALYST_DEFINED = 'analystDefined',
  DATA_AUTHENTICATION = 'dataAuthentication',
  REJECTED = 'rejected',
  STATION_SOH = 'stationSOH',
  WAVEFORM = 'waveform',
  LONG_TERM = 'longTerm',
  UNPROCESSED = 'unprocessed',
  PROCESSING_MASKS = 'processingMask',
  QC_SEGMENTS = 'qcSegments'
}

/**
 * Collection of FK configurations belonging to a specific station type
 */
interface FKStationTypeConfiguration {
  constantVelocityRings: number[];
  frequencyBands: FrequencyBand[];
}

type InterpolationMethodsConfig = {
  [K in keyof typeof InterpolationMethod]: string;
};

/**
 * Interface for the UI Processing Configuration
 */
export interface ProcessingAnalystConfiguration {
  readonly defaultNetwork: string;
  readonly defaultInteractiveAnalysisStationGroup: string;
  readonly defaultFilters: WaveformFilter[];
  readonly defaultSDTimeUncertainty: number;
  readonly currentIntervalEndTime: number;
  readonly currentIntervalDuration: number;
  readonly maximumOpenAnythingDuration: number;
  readonly fixedAmplitudeScaleValues: number[];
  readonly qcMaskTypeVisibilities: Record<QCMaskTypes, boolean>;
  readonly leadBufferDuration: number;
  readonly lagBufferDuration: number;
  readonly uiThemes: UITheme[];
  readonly priorityPhases: string[];
  readonly zasDefaultAlignmentPhase: string;
  readonly zasZoomInterval: number;
  /**
   * The configuration values used for the GMS filtering algorithm
   */
  readonly phaseLists: PhaseList[];
  readonly gmsFilters: {
    readonly defaultTaper: number;
    readonly defaultRemoveGroupDelay: boolean;
    readonly defaultSampleRateToleranceHz: number;
    readonly defaultGroupDelaySecs: number;
    readonly defaultDesignedSampleRates: number[];
  };
  readonly unassociatedSignalDetectionLengthMeters: number;
  readonly minimumRequestDuration: number;
  readonly waveformPanningBoundaryDuration: number;
  readonly waveformPanRatio: number;
  readonly workflow: {
    readonly panSingleArrow: number;
    readonly panDoubleArrow: number;
  };
  readonly endpointConfigurations: {
    readonly maxParallelRequests: number;
    readonly getEventsWithDetectionsAndSegmentsByTime: {
      readonly maxTimeRangeRequestInSeconds: number;
    };
    readonly fetchQcSegmentsByChannelsAndTime: {
      readonly maxTimeRangeRequestInSeconds: number;
    };
  };
  readonly defaultDeletedEventVisibility: boolean;
  readonly defaultRejectedEventVisibility: boolean;
  readonly defaultDeletedSignalDetectionVisibility: boolean;
  readonly fkConfigurations: {
    readonly fkStationTypeConfigurations: {
      [StationType.SEISMIC_ARRAY]: FKStationTypeConfiguration;
      [StationType.SEISMIC_3_COMPONENT]: FKStationTypeConfiguration;
      [StationType.HYDROACOUSTIC]: FKStationTypeConfiguration;
      [StationType.HYDROACOUSTIC_ARRAY]: FKStationTypeConfiguration;
      [StationType.INFRASOUND]: FKStationTypeConfiguration;
      [StationType.INFRASOUND_ARRAY]: FKStationTypeConfiguration;
    };
  };
  readonly beamforming: {
    readonly beamChannelThreshold: number;
    readonly createEventBeamsDescription: string;
    readonly beamDuration: number;
    readonly leadDuration: number;
    readonly beamSummationMethods: {
      [BeamSummation.COHERENT]: keyof typeof BeamSummation;
      [BeamSummation.INCOHERENT]: keyof typeof BeamSummation;
      [BeamSummation.RMS]: keyof typeof BeamSummation;
    };
    readonly interpolationMethods: InterpolationMethodsConfig;
  };
  readonly keyboardShortcuts: KeyboardShortcutConfigurations;
  readonly preventBrowserDefaults: PreventDefaultConfig;
}

/**
 * Common configuration
 */
export interface ProcessingCommonConfiguration {
  readonly systemMessageLimit: number;
}

/**
 * Interface for the Operational Time Period Configuration
 */
export interface OperationalTimePeriodConfiguration {
  readonly operationalPeriodStart: number;
  readonly operationalPeriodEnd: number;
}

/**
 * Interface for the Station Group Names Configuration
 */
export interface StationGroupNamesConfiguration {
  readonly stationGroupNames: string[];
}

/**
 * Interface for the monitoring organization Configuration
 */
export interface MonitoringOrganizationConfiguration {
  readonly monitoringOrganization: string;
}

/**
 * Soh specific configuration from the Java backend endpoint
 */
export interface SohConfiguration {
  stationSohControlConfiguration: {
    readonly reprocessingPeriod: string;
    readonly displayedStationGroups: string[];
    readonly rollupStationSohTimeTolerance: string;
  };
  stationSohMonitoringDisplayParameters: {
    readonly redisplayPeriod: string;
    readonly acknowledgementQuietDuration: string;
    readonly availableQuietDurations: string[];
    readonly sohStationStaleDuration: string;
    readonly sohHistoricalDurations: string[];
    readonly samplesPerChannel: number;
    readonly maxQueryIntervalSize: number;
  };
}

/**
 * UI Soh specific configuration converted from SohConfiguration
 */
export interface UiSohConfiguration {
  readonly reprocessingPeriodSecs: number;
  readonly displayedStationGroups: string[];
  readonly rollupStationSohTimeToleranceMs: number;
  readonly redisplayPeriodMs: number;
  readonly acknowledgementQuietMs: number;
  readonly availableQuietTimesMs: number[];
  readonly sohStationStaleMs: number;
  readonly sohHistoricalTimesMs: number[];
  readonly historicalSamplesPerChannel: number;
  readonly maxHistoricalQueryIntervalSizeMs: number;
}

/**
 * SOH StationGroup and Priority interface definition
 */
export interface SOHStationGroupNameWithPriority {
  name: string;
  priority: number;
}
/**
 * phase list for ui processing config
 */
export interface PhaseList {
  favorites: string[];
  defaultPhaseLabelAssignment: string;
  listTitle: string;
  categorizedPhases: CategorizedPhase[];
}

export interface CategorizedPhase {
  categoryTitle: string;
  phases: string[];
}

/**
 * Selector interface for config service
 */
export interface Selector {
  criterion: string;
  value: string;
}

/**
 * Analyst configurations loaded from service
 */
export enum AnalystConfigs {
  DEFAULT = 'ui.analyst-settings'
}

/**
 * Common configurations loaded from service
 */
export enum CommonConfigs {
  DEFAULT = 'ui.common-settings'
}

/**
 * Operational time periods loaded from service
 */
export enum OperationalTimePeriodConfigs {
  DEFAULT = 'global.operational-time-period'
}

/**
 * SOH configurations loaded from service
 */
export const SohConfig = 'ui.soh-settings';

/**
 * IAN Station Definition station group names loaded from service
 */
export enum StationGroupNamesConfig {
  DEFAULT = 'station-definition-manager.station-group-names'
}

/**
 * SOH Control station group names loaded from service
 */
export enum SohControlStationGroupNamesConfig {
  DEFAULT = 'soh-control.station-group-names'
}

/**
 * Monitoring organization loaded from service
 */
export enum MonitoringOrganizationConfig {
  DEFAULT = 'global.monitoring-org'
}

/**
 * UI Analyst Processing Configuration Default Values
 */

export const defaultUnassociatedSignalDetectionLengthMeters = 11100000;

/**
 * The default colors for the fallback @interface UITheme (what is loaded if no theme is found).
 */
export const defaultColorTheme: ColorTheme = {
  gmsMain: '#f5f8fa',
  gmsMainInverted: '#10161a',
  gmsBackground: '#182026',
  gmsSelection: '#1589d1',
  gmsTableSelection: '#f5f8fa',
  mapVisibleStation: '#D9822B',
  mapStationDefault: '#6F6E74',
  waveformDimPercent: 0.75,
  waveformFilterLabel: '#f5f8fa',
  waveformMaskLabel: '#EB06C8',
  waveformRaw: '#4580e6',
  unassociatedSDColor: '#C23030',
  openEventSDColor: '#C87619',
  completeEventSDColor: '#62D96B',
  completeEventSDHoverColor: '#BBFFBC',
  conflict: '#FF0000',
  otherEventSDColor: '#FFFFFF',
  predictionSDColor: '#C58C1B',
  qcMaskColors: {
    analystDefined: '#EB06C8',
    dataAuthentication: '#8A57FF',
    longTerm: '#0E9B96',
    processingMask: '#F87C2E',
    rejected: '#FF0000',
    stationSOH: '#B58400',
    unprocessed: '#FFFFFF',
    waveform: '#00E22B'
  },
  deletedEventColor: '#ff6347',
  fkNeedsReview: '#EBFF00',
  fkSelection: '#00FFFF',
  rejectedEventColor: '#ab83f1',
  deletedSdColor: '#ff6347',
  weavessOutOfBounds: '#10161a',
  popover: {
    background: '#30404d',
    header: '#30404d',
    input: '#2d3b44',
    invalidInput: '#1c2127',
    gridBackground: '#3d4b58'
  },
  gmsActionTarget: '#ffffff'
};
