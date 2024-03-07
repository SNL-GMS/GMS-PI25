// TODO fix file scoped eslint disable
/* eslint-disable class-methods-use-this */
/* eslint-disable react/no-this-in-sfc */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/destructuring-assignment */
import type { CommonTypes, EventTypes, StationTypes } from '@gms/common-model';
import { SignalDetectionTypes, WaveformTypes, WorkflowTypes } from '@gms/common-model';
import { findPreferredEventHypothesisByStage } from '@gms/common-model/lib/event/util';
import {
  findPhaseFeatureMeasurement,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import { recordLength, Timer } from '@gms/common-util';
import { AnalystWaveformTypes, AnalystWorkspaceTypes } from '@gms/ui-state';
import { AlignWaveformsOn } from '@gms/ui-state/lib/app/state/analyst/types';
import { addGlUpdateOnResize, addGlUpdateOnShow, HotkeyListener, UILogger } from '@gms/ui-util';
import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessConfiguration, WeavessUtil } from '@gms/weavess-core';
import produce from 'immer';
import debounce from 'lodash/debounce';
import defer from 'lodash/defer';
import includes from 'lodash/includes';
import isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import { toast } from 'react-toastify';
import ResizeObserver from 'resize-observer-polyfill';

import { CreateEventDialog } from '~analyst-ui/common/dialogs/create-event/create-event-dialog';
import { PhaseSelectorDialog } from '~analyst-ui/common/dialogs/phase-selector/phase-selector-dialog';
import { WaveformHotkeys } from '~analyst-ui/common/hotkey-configs/waveform-hotkey-configs';
import { sortAndOrderSignalDetections } from '~analyst-ui/common/utils/signal-detection-util';
import { systemConfig } from '~analyst-ui/config/system-config';

import { WaveformControls } from './components/waveform-controls';
import type { FixedScaleValue } from './components/waveform-controls/scaling-options';
import { AmplitudeScalingOptions } from './components/waveform-controls/scaling-options';
import type { WaveformDisplayProps, WaveformDisplayState } from './types';
import { getStationContainingChannel } from './utils';
import type {
  WaveformLabelContextMenuCallback,
  WaveformLabelGetOpenCallbackFunc
} from './waveform-label-context-menu';
import { WaveformLabelContextMenu } from './waveform-label-context-menu';
import type { WeavessContextData } from './weavess-context';
import { WeavessContext } from './weavess-context';
import { WeavessDisplay } from './weavess-display';
import * as WaveformUtil from './weavess-stations-util';

const logger = UILogger.create('GMS_LOG_WAVEFORM', process.env.GMS_LOG_WAVEFORM);

/**
 * Primary waveform display component.
 */
export class WaveformPanel extends React.PureComponent<WaveformDisplayProps, WaveformDisplayState> {
  /** The type of the Weavess context, so this component knows how it's typed */
  public static readonly contextType: React.Context<WeavessContextData> = WeavessContext;

  /** The Weavess context. We store a ref to our Weavess instance in here. */
  public declare readonly context: React.ContextType<typeof WeavessContext>;

  private globalHotkeyListenerId: string;

  /** A Ref to the waveform display div */
  private waveformDisplayRef: HTMLDivElement | undefined;

  private readonly weavessConfiguration: WeavessTypes.Configuration;

  /** Last channel height set in weavess channels */
  private lastChannelHeight;

  /**
   * The custom callback functions that we want to pass down to weavess.
   */
  private readonly weavessEventHandlers: WeavessTypes.Events;

  private readonly memoizedGetSelections: (
    selectedChannels: string[]
  ) => {
    channels: string[];
  };

  private readonly resizeObserver: ResizeObserver;

  private isShuttingDown = false;

  /**
   * The callback function for opening the Waveform Label context menu (popups).
   */
  private waveformLabelContextMenuCb: WaveformLabelContextMenuCallback;

  // Used to debounce the update calls to prevent thread locking
  private readonly MAX_UPDATE_INTERVAL = 100;

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: WaveformDisplayProps) {
    super(props);
    this.resizeObserver = new ResizeObserver(() => {
      this.updateStationHeights();
      if (this.context.weavessRef) {
        this.context.weavessRef.refresh();
      }
    });
    this.lastChannelHeight = -1;

    this.memoizedGetSelections = memoizeOne(this.getSelections);
    this.weavessEventHandlers = this.buildWeavessEvents();

    this.weavessConfiguration = {
      shouldRenderWaveforms: true,
      shouldRenderSpectrograms: false,
      hotKeys: this.props.weavessHotkeyDefinitions,
      backgroundColor: this.props.uiTheme.colors.gmsBackground,
      outOfBoundsColor: this.props.uiTheme.colors.weavessOutOfBounds,
      waveformDimPercent: this.props.uiTheme.colors.waveformDimPercent,
      defaultChannel: {
        disableMeasureWindow: false,
        disableMaskModification: true
      },
      nonDefaultChannel: {
        disableMeasureWindow: false,
        disableMaskModification: false
      },
      sdUncertainty: WeavessConfiguration.defaultConfiguration.sdUncertainty
    };
    this.state = {
      weavessStations: [],
      loadingWaveforms: false,
      loadingWaveformsPercentComplete: 0,
      analystNumberOfWaveforms:
        this.props.analysisMode === WorkflowTypes.AnalysisMode.EVENT_REVIEW
          ? systemConfig.eventRefinement.numberOfWaveforms
          : systemConfig.eventGlobalScan.numberOfWaveforms,
      // the range of waveform data displayed initially
      currentTimeInterval: props.currentTimeInterval,
      isMeasureWindowVisible: false,
      amplitudeScaleOption: AmplitudeScalingOptions.AUTO,
      currentOpenEventId: undefined,
      fixedScaleVal: 0,
      scaleAmplitudeChannelName: undefined,
      scaledAmplitudeChannelMinValue: -1,
      scaledAmplitudeChannelMaxValue: 1
    };
  }

  /**
   * Updates the derived state from the next props.
   *
   * @param nextProps The next (new) props
   * @param prevState The previous state
   */
  public static getDerivedStateFromProps(
    nextProps: WaveformDisplayProps,
    prevState: WaveformDisplayState
  ): Partial<WaveformDisplayState> {
    const hasTimeIntervalChanged = !isEqual(
      nextProps.currentTimeInterval,
      prevState.currentTimeInterval
    );

    if (hasTimeIntervalChanged || nextProps.currentOpenEventId !== prevState.currentOpenEventId) {
      return {
        weavessStations: hasTimeIntervalChanged ? [] : prevState.weavessStations,
        currentTimeInterval: nextProps.currentTimeInterval,
        currentOpenEventId: nextProps.currentOpenEventId
      };
    }

    // return null to indicate no change to state.
    return null;
  }

  /**
   * Invoked when the component mounted.
   */
  public componentDidMount() {
    if (this.isShuttingDown) {
      return;
    }
    const callback = () => {
      this.forceUpdate();
      if (this.context.weavessRef) {
        this.context.weavessRef.refresh();
      }
    };
    addGlUpdateOnShow(this.props.glContainer, callback);
    addGlUpdateOnResize(this.props.glContainer, callback);
    this.globalHotkeyListenerId = HotkeyListener.subscribeToGlobalHotkeyListener();
    this.updateWeavessStations();
    if (this.waveformDisplayRef) {
      this.resizeObserver.observe(this.waveformDisplayRef);
    }
  }

  /**
   * Invoked when the component has rendered.
   *
   * @param prevProps The previous props
   */
  public componentDidUpdate(prevProps: WaveformDisplayProps) {
    this.maybeUpdateNumWaveforms(prevProps);

    this.maybeUpdatePredictedPhases(prevProps);

    this.maybeUpdateBaseStationTime();
    if (
      prevProps.featurePredictionQuery !== this.props.featurePredictionQuery &&
      !this.props.featurePredictionQuery.data?.isRequestingDefault &&
      this.props.phaseToAlignOn === prevProps.phaseToAlignOn
    ) {
      this.zoomAlignSort();
    }

    if (this.shouldUpdateWeavessStations(prevProps)) {
      this.updateWeavessStations();
    }
  }

  /**
   * Cleanup and stop any in progress Waveform queries
   */
  public componentWillUnmount(): void {
    this.resizeObserver.unobserve(this.waveformDisplayRef);
    HotkeyListener.unsubscribeFromGlobalHotkeyListener(this.globalHotkeyListenerId);
    this.isShuttingDown = true;
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Checks the analysis mode, and sets waveforms display amount based on result
   */
  private readonly maybeUpdateNumWaveforms = (prevProps: WaveformDisplayProps) => {
    if (this.props.analysisMode !== prevProps.analysisMode) {
      const numWaveforms =
        this.props.analysisMode === WorkflowTypes.AnalysisMode.EVENT_REVIEW
          ? systemConfig.eventRefinement.numberOfWaveforms
          : systemConfig.eventGlobalScan.numberOfWaveforms;
      this.setAnalystNumberOfWaveforms(numWaveforms);
    }
  };

  /**
   * If predicted phases have changed, force update weavess stations
   */
  private readonly maybeUpdatePredictedPhases = (prevProps: WaveformDisplayProps) => {
    if (
      this.props.shouldShowPredictedPhases &&
      prevProps.featurePredictionQuery.data?.receiverLocationsByName !==
        this.props.featurePredictionQuery.data?.receiverLocationsByName
    ) {
      this.updateWeavessStations();
    }
  };

  /**
   * If offsets have changed, force update viewableRange
   */
  private readonly maybeUpdateOffset = () => {
    if (this.state.weavessStations.length > 0) {
      const maxOffset = Math.max(
        ...this.state.weavessStations.map(station =>
          Math.max(
            station.defaultChannel.timeOffsetSeconds,
            ...(station.areChannelsShowing
              ? station.nonDefaultChannels.map(c => c.timeOffsetSeconds)
              : [])
          )
        )
      );

      const minOffset = Math.min(
        ...this.state.weavessStations.map(station =>
          Math.min(
            station.defaultChannel.timeOffsetSeconds,
            ...(station.areChannelsShowing
              ? station.nonDefaultChannels.map(c => c.timeOffsetSeconds)
              : [])
          )
        )
      );

      if (this.props.minimumOffset !== minOffset) {
        this.props.setMinimumOffset(minOffset);
      }
      if (this.props.maximumOffset !== maxOffset) {
        this.props.setMaximumOffset(maxOffset);
      }
    }
  };

  private readonly maybeUpdateBaseStationTime = () => {
    if (this.state.weavessStations.length > 0) {
      const { baseStationTime } = this.state.weavessStations[0].defaultChannel;
      if (this.props.baseStationTime !== baseStationTime) {
        this.props.setBaseStationTime(baseStationTime);
      }
    }
  };

  /**
   * @returns the list of stations from the station definition query. This result is memoized
   * so that the list is referentially stable between renders if the result of the query has
   * not changed. Note that this list can be empty.
   */
  private readonly getStations = (): StationTypes.Station[] => this.props.stationsQuery.data;

  /**
   * @returns a list of all of the weavess stations that are visible (should be rendered,
   * not necessarily on screen).
   */
  private readonly getAllVisibleWeavessStations = () =>
    this.state.weavessStations.filter(weavessStation =>
      this.props.isStationVisible(weavessStation.name)
    );

  private readonly getSelections = (channels: string[]) => ({
    channels
  });

  /**
   * ! Legacy Code
   * Returns the current open event.
   */
  private readonly currentOpenEvent = (): EventTypes.Event =>
    this.props.events ?? []
      ? this.props.events.find(e => e.id === this.props.currentOpenEventId)
      : undefined;

  /**
   * Returns the associated SD hypothesis IDs based on the current open event and stage
   */
  private readonly getAssociatedSignalDetectionHypothesesIds = (): string[] => {
    const eventHypo = findPreferredEventHypothesisByStage(
      this.currentOpenEvent(),
      this.props.currentStageName
    );
    return eventHypo.associatedSignalDetectionHypotheses.map(hypothesis => hypothesis.id.id);
  };

  /**
   * ! Legacy Code
   * Returns the weavess event handler configuration.
   *
   * @returns the events
   */
  private readonly buildWeavessEvents = (): WeavessTypes.Events => {
    const channelEvents: WeavessTypes.ChannelEvents = {
      labelEvents: {
        onChannelExpanded: this.onStationExpanded,
        onChannelCollapsed: this.onStationCollapse,
        onContextMenu: this.onLabelContextMenu
      },
      events: {
        onMeasureWindowUpdated: this.onMeasureWindowUpdated
      },
      onKeyPress: this.onChannelKeyPress
    };

    return {
      onZoomChange: this.onZoomChange,
      stationEvents: {
        defaultChannelEvents: channelEvents,
        nonDefaultChannelEvents: channelEvents
      },
      onMeasureWindowResize: this.onMeasureWindowResize,
      onResetAmplitude: this.resetChannelScaledAmplitude,
      onMount: this.props.onWeavessMount
    };
  };

  /**
   * ! Legacy Code
   * Sets the mode.
   *
   * @param mode the mode configuration to set
   */
  private readonly setMode = (mode: AnalystWorkspaceTypes.WaveformDisplayMode) => {
    this.props.setMode(mode);

    // auto select the first signal detection if switching to MEASUREMENT mode
    if (mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT) {
      const currentOpenEvent = this.currentOpenEvent();

      if (currentOpenEvent) {
        const associatedSignalDetectionHypothesisIds = this.getAssociatedSignalDetectionHypothesesIds();

        const signalDetections = this.getSignalDetections().filter(sd =>
          this.checkIfSdIsFmPhaseAndAssociated(sd, associatedSignalDetectionHypothesisIds)
        );

        let signalDetectionToSelect: SignalDetectionTypes.SignalDetection;
        // Broken legacy code data types have changed
        const distances = [];
        if (signalDetections.length > 0) {
          // sort the signal detections
          const sortedEntries = sortAndOrderSignalDetections(
            signalDetections,
            this.props.selectedSortType,
            distances
          );
          signalDetectionToSelect = sortedEntries.shift();
          this.props.setSelectedSdIds([signalDetectionToSelect.id]);
        } else {
          this.props.setSelectedSdIds([]);
        }

        // mark the measure window as being visible; measurement mode auto shows the measure window
        this.setState({ isMeasureWindowVisible: true });
        // auto set the waveform alignment to align on the default phase
        this.setWaveformAlignment(
          AlignWaveformsOn.PREDICTED_PHASE,
          this.props.defaultSignalDetectionPhase,
          this.props.shouldShowPredictedPhases
        );

        // auto zoom the waveform display to match the zoom of the measure window
        if (signalDetectionToSelect) {
          const arrivalTime: number = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
            SignalDetectionTypes.Util.getCurrentHypothesis(
              signalDetectionToSelect.signalDetectionHypotheses
            ).featureMeasurements
          ).arrivalTime.value;
          const {
            startTimeOffsetFromSignalDetection
          } = systemConfig.measurementMode.displayTimeRange;
          const {
            endTimeOffsetFromSignalDetection
          } = systemConfig.measurementMode.displayTimeRange;
          const startTimeSecs = arrivalTime + startTimeOffsetFromSignalDetection;
          const endTimeSecs = arrivalTime + endTimeOffsetFromSignalDetection;

          // adjust the zoom time window for the selected alignment
          this.onZoomChange({ startTimeSecs, endTimeSecs });
        }
      }
    } else {
      // leaving measurement mode; mark the measurement window as not visible
      this.setState({ isMeasureWindowVisible: false });
    }
  };

  /**
   * ! Legacy Code
   * Check if the signal detection is FM Phase and Associated.
   *
   * @param sd the signal detection
   * @param associatedSignalDetectionHypothesisIds string ids
   * @returns a boolean determining if sd is associated and a measurement phase
   */
  private readonly checkIfSdIsFmPhaseAndAssociated = (
    sd: SignalDetectionTypes.SignalDetection,
    associatedSignalDetectionHypothesisIds: string[]
  ): boolean => {
    const phase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
        .featureMeasurements
    ).value;
    // return if associated and a measurement phase
    return (
      includes(
        associatedSignalDetectionHypothesisIds,
        SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).id.id
      ) && includes(systemConfig.measurementMode.phases, phase)
    );
  };

  /**
   * Updates the weavess stations based on the current state and props.
   * ! This is an expensive operation so use this function sparingly
   */
  // eslint-disable-next-line react/sort-comp
  private readonly updateWeavessStations = debounce(
    () => {
      if (
        !this.props.currentTimeInterval ||
        !this.props.stationsQuery.data ||
        !this.props.processingAnalystConfigurationQuery?.data
      ) {
        return;
      }

      Timer.start('[waveform] update weavess stations and build params');

      const stationHeight = this.calculateStationHeight();
      const createWeavessStationsParameters = WaveformUtil.populateCreateWeavessStationsParameters(
        this.props,
        this.state,
        stationHeight
      );
      // Set the height used to create weavess stations
      this.lastChannelHeight = stationHeight;

      // Set the newly created Weavess Stations on the state
      this.setState(
        prevState => ({
          weavessStations: WaveformUtil.createWeavessStations(
            createWeavessStationsParameters,
            this.props.selectedSortType,
            prevState.weavessStations
          )
        }),
        () => {
          this.maybeUpdateOffset();
        }
      );

      Timer.end('[waveform] update weavess stations and build params');
    },
    this.MAX_UPDATE_INTERVAL,
    { leading: true }
  );

  /**
   * Splits the given station
   *
   * @param stationId the station id
   * @param timeSecs the time to split the station at
   */
  private readonly splitWeavessStation = (stationId: string, timeSecs: number, phase: string) => {
    const stationHeight = this.calculateStationHeight();
    const createWeavessStationsParameters = WaveformUtil.populateCreateWeavessStationsParameters(
      this.props,
      this.state,
      stationHeight
    );

    this.setState(prevState => {
      return {
        weavessStations: WaveformUtil.splitWeavessStations(
          stationId,
          timeSecs,
          createWeavessStationsParameters,
          this.props.selectedSortType,
          prevState.weavessStations,
          phase
        )
      };
    });
  };

  /**
   * Closes any split stations
   */
  private readonly closeSplitWeavessStations = () => {
    this.setState(prevState => {
      return {
        weavessStations: WaveformUtil.clearSplitWeavessStations(prevState.weavessStations)
      };
    });
  };

  /**
   *
   * Create a signal detection or split the stations if that is not possible due to
   * multiple channel segments
   */
  private readonly createSignalDetection = async (
    stationId: string,
    channelName: string,
    timeSecs: number,
    phase?: string,
    isTemporary?: boolean
  ): Promise<void> => {
    const stationHeight = this.calculateStationHeight();
    const createWeavessStationsParameters = WaveformUtil.populateCreateWeavessStationsParameters(
      this.props,
      this.state,
      stationHeight
    );
    if (
      !isTemporary &&
      WaveformUtil.determineSplitWeavessStations(
        stationId,
        timeSecs,
        createWeavessStationsParameters,
        this.state.weavessStations
      )
    ) {
      // split the stations but do not create a detection
      return this.splitWeavessStation(stationId, timeSecs, phase);
    }
    // createSignalDetection returns a promise which is used downstream
    return this.props.createSignalDetection(stationId, channelName, timeSecs, phase, isTemporary);
  };

  /**
   * Toggle the measure window visibility within weavess.
   */
  private readonly toggleMeasureWindowVisibility = () => {
    if (this.context && this.context.weavessRef) {
      this.context.weavessRef.toggleMeasureWindowVisibility();
      // we use defer to ensure that the weavess state updates have occurred before we
      // make any changes to our station height, which will be different with the measure
      // window open vs closed.
      defer(this.updateWeavessStations);
    }
  };

  /**
   * Assigns the Waveform Label Context Menu callback; which can be used to imperatively show the context menu.
   *
   * @param callback the context menu open callback
   */
  private readonly setWaveformLabelContextMenuCb: WaveformLabelGetOpenCallbackFunc = callback => {
    this.waveformLabelContextMenuCb = callback;
  };

  /**
   * The function for injecting a right click context menu for labels into weavess
   *
   * @param e the mouse click event, used to determine menu position
   * @param channelId
   * @param amplitudeMinValue
   * @param amplitudeMaxValue
   * @param isDefaultChannel describes weather a weavess top-level channel (station) has been clicked or a weavess sub-channel (channel) has been clicked
   * @param isMeasureWindow
   */
  private readonly onLabelContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    channelId: string,
    amplitudeMinValue: number,
    amplitudeMaxValue: number,
    isDefaultChannel: boolean,
    isMeasureWindow: boolean
  ) => {
    this.waveformLabelContextMenuCb(e, {
      isDefaultChannel,
      isMeasureWindow,
      channelId,
      selectedStationIds: this.props.selectedStationIds,
      channelSegments: this.props.channelSegments,
      waveformClientState: this.props.waveformClientState,
      weavessStations: this.state.weavessStations,
      amplitudeScaleOption: this.state.amplitudeScaleOption,
      amplitudeMinValue,
      amplitudeMaxValue,
      showAllChannels: this.showAllChannels,
      hideStationOrChannel: this.hideStationOrChannel,
      scaleAllAmplitudes: this.scaleAllAmplitudes,
      resetAmplitudeSelectedChannels: this.resetSelectedWaveformAmplitudeScaling
    });
  };

  /**
   * Event handler for station expansion. Will set the areChannelsShowing flag as true
   * then it calls load waveforms for all the station's channels.
   *
   * @param stationName the name of the expanded station
   */
  private readonly onStationExpanded = (stationName: string) => {
    this.props.setStationExpanded(stationName);
  };

  /**
   * Event handler for station collapsing. Sets the station visibility changes object
   * to be collapsed.
   *
   * @param stationName the name of the collapsed station
   */
  private readonly onStationCollapse = (stationName: string) => {
    this.props.setStationExpanded(stationName, false);
  };

  /**
   * Event handler that is invoked and handled when the Measure Window is updated.
   *
   * @param isVisible true if the measure window is updated
   */
  private readonly onMeasureWindowUpdated = (isVisible: boolean) => {
    this.setState({
      isMeasureWindowVisible: isVisible
    });
  };

  /**
   * Callback passed to Weavess for when the measure window is resized.
   *
   * @param heightPx the height of the new measure window. This is unused in this, but is
   * provided by Weavess
   */
  private readonly onMeasureWindowResize = (heightPx: number) => {
    this.updateWeavessStations();
  };

  /**
   * Event handler for when a key is pressed within a channel
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param clientX x location of where the key was pressed
   * @param clientY y location of where the key was pressed
   */
  private readonly onChannelKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    clientX?: number,
    clientY?: number
  ) => {
    /* No Op for Now */
  };

  /**
   * @returns true if the event includes a panning key (a or d, or shift a or shift d).
   */
  private readonly isPanningKey = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey) return false;
    return (
      (e.shiftKey && e.key.toLowerCase() === 'a') ||
      (e.shiftKey && e.key.toLowerCase() === 'd') ||
      e.key.toLowerCase() === 'a' ||
      e.key.toLowerCase() === 'd'
    );
  };

  /**
   * Pans left or right and load data but only if we are not in split mode
   */
  private readonly handlePanHardKey = (e: React.KeyboardEvent) => {
    const isSplitChannelOverlayOpen = !!this.state.weavessStations.find(
      station => station?.splitChannels?.length > 0
    );
    if (e.shiftKey && e.key.toLowerCase() === 'a' && !isSplitChannelOverlayOpen) {
      this.panHard(WaveformTypes.PanType.Left, true);
    } else if (e.shiftKey && e.key.toLowerCase() === 'd' && !isSplitChannelOverlayOpen) {
      this.panHard(WaveformTypes.PanType.Right, true);
    }
  };

  /** // TODO this should be a proper hotkey not a listener
   * Event handler for when a key is pressed
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param clientX x location of where the key was pressed
   * @param clientY y location of where the key was pressed
   */
  private readonly onKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    clientX?: number,
    clientY?: number
  ) => {
    if (this.isPanningKey(e)) {
      this.handlePanHardKey(e);
    }
  };

  /**
   *
   * Toggle alignment.  Keypress has already been validated so no params needed
   *
   */
  private readonly toggleAlignment = () => {
    const defaultPhaseAlignment =
      this.props.processingAnalystConfigurationQuery.data.zasDefaultAlignmentPhase ?? 'P';
    if (this.props.currentOpenEventId) {
      if (
        this.props.alignWaveformsOn === AlignWaveformsOn.TIME ||
        this.props.alignWaveformsOn === AlignWaveformsOn.OBSERVED_PHASE ||
        this.props.phaseToAlignOn !== defaultPhaseAlignment
      ) {
        this.setWaveformAlignment(AlignWaveformsOn.PREDICTED_PHASE, defaultPhaseAlignment, true);
      } else {
        this.setWaveformAlignment(
          AlignWaveformsOn.TIME,
          undefined,
          this.props.shouldShowPredictedPhases
        );
      }
    } else {
      toast.info('Open an event to change waveform alignment', {
        toastId: 'Open an event to change waveform alignment'
      });
    }
  };

  /**
   * Display the number of waveforms chosen by the analyst
   * Also updates the state variable containing the Weavess stations
   */
  private readonly updateStationHeights = (): void => {
    this.setState(
      produce<WaveformDisplayState>(draft => {
        const height = this.calculateStationHeight();

        if (this.lastChannelHeight !== height) {
          this.lastChannelHeight = height;

          draft.weavessStations.forEach((station, stationIndex) => {
            draft.weavessStations[stationIndex].defaultChannel.height = height;

            if (station.nonDefaultChannels && station.nonDefaultChannels.length > 0) {
              draft.weavessStations[stationIndex].nonDefaultChannels.forEach(
                (nonDefaultChannel, index) => {
                  draft.weavessStations[stationIndex].nonDefaultChannels[index].height = height;
                }
              );
            }
          });
        }
      })
    );
  };

  /**
   * Calculate height for the station based of number of display
   */
  private readonly calculateStationHeight = (): number => {
    const canvasBoundingRect = this.context.weavessRef?.waveformPanelRef?.getCanvasBoundingClientRect();
    let height;
    if (canvasBoundingRect?.height) {
      height = canvasBoundingRect.height / this.state.analystNumberOfWaveforms - 1; // account for 1 pixel border
    } else if (this.lastChannelHeight > 0) {
      height = this.lastChannelHeight;
    } else {
      logger.warn(`Failed to calculate station heights falling back to system default`);
      height = systemConfig.defaultWeavessConfiguration.stationHeightPx;
    }
    return Math.round(height);
  };

  /**
   *
   * Sets the waveform alignment and adjust the sort type if necessary.
   *
   * @param alignWaveformsOn the waveform alignment setting
   * @param phaseToAlignOn the phase to align on
   * @param shouldShowPredictedPhases true if predicted phases should be displayed
   */
  private readonly setWaveformAlignment = (
    alignWaveformsOn: AlignWaveformsOn,
    phaseToAlignOn: string,
    shouldShowPredictedPhases: boolean
  ) => {
    this.props.setAlignWaveformsOn(alignWaveformsOn);
    this.props.setPhaseToAlignOn(phaseToAlignOn);
    this.props.setShouldShowPredictedPhases(shouldShowPredictedPhases);
  };

  /**
   * Sets the number of waveforms to be displayed.
   *
   * @param value the number of waveforms to display (number)
   * @param valueAsString the number of waveforms to display (string)
   */
  public readonly setAnalystNumberOfWaveforms = (value: number): void => {
    let analystNumberOfWaveforms = value;
    // Minimum number of waveforms must be 1
    if (analystNumberOfWaveforms < 1) {
      analystNumberOfWaveforms = 1;
    }
    if (this.state.analystNumberOfWaveforms !== analystNumberOfWaveforms) {
      this.setState(
        {
          analystNumberOfWaveforms
        },
        () => {
          this.updateStationHeights();
        }
      );
    }
  };

  /**
   * Toasts a notification when the user hits the panning boundary.
   */
  private readonly toastPanningBoundaryReached = () =>
    toast.info(`Panning boundary reached`, { toastId: 'panningBoundaryReached' });

  /**
   * Pan the waveform display if more data is needed the pan method
   * call will dispatch the new viewable interval. The returned zoom interval
   * is commanded in the Weavess' waveform panel.
   *
   * @param panDirection the pan direction
   */
  private readonly panHard = (
    panDirection: WaveformTypes.PanType,
    shouldLoadAdditionalData: boolean
  ) => {
    if (this.context.weavessRef?.waveformPanelRef) {
      const zoomInterval = this.props.pan(panDirection, {
        shouldLoadAdditionalData,
        onPanningBoundaryReached: this.toastPanningBoundaryReached
      });
      this.context.weavessRef?.waveformPanelRef.zoomToTimeWindow(zoomInterval);
    }
  };

  /**
   * Called when ZAS button is clicked.
   * This sets the sort type to distance, sets the default alignment phase, aligns waveforms on predicted phase,
   * ensure show predicted phases, ensures stations with signal detections associated to current open event are
   * visible. Dispatch these changes first and then set state that will trigger the actual zooming. This is done
   * to get the waveform display into the right state before zoom because the state was not being dispatched before
   * the needed zoom calculations were made.
   */
  private readonly zoomAlignSort = () => {
    const defaultPhaseAlignment =
      this.props.processingAnalystConfigurationQuery.data.zasDefaultAlignmentPhase ?? 'P';

    // Sort
    if (
      this.props.selectedSortType !== AnalystWorkspaceTypes.WaveformSortType.distance &&
      this.props.currentOpenEventId
    ) {
      this.props.setSelectedSortType(AnalystWorkspaceTypes.WaveformSortType.distance);
    }
    // Align
    if (this.props.alignWaveformsOn !== AnalystWorkspaceTypes.AlignWaveformsOn.PREDICTED_PHASE) {
      this.props.setAlignWaveformsOn(AnalystWorkspaceTypes.AlignWaveformsOn.PREDICTED_PHASE);
    }
    if (this.props.phaseToAlignOn !== defaultPhaseAlignment) {
      this.props.setPhaseToAlignOn(defaultPhaseAlignment);
    }
    if (!this.props.shouldShowPredictedPhases) {
      this.props.setShouldShowPredictedPhases(true);
    }

    // Zoom
    if (this.props.currentOpenEventId === null || this.props.currentOpenEventId === undefined) {
      this.context.weavessRef?.waveformPanelRef.zoomToTimeWindow(this.props.viewableInterval);
    } else {
      const calculatedZoomInterval = WaveformUtil.calculateZoomIntervalForCurrentOpenEvent(
        this.props,
        true
      );
      if (calculatedZoomInterval) {
        this.context.weavessRef?.waveformPanelRef.zoomToTimeWindow(calculatedZoomInterval);
      } else if (!this.props.featurePredictionQuery.isFetching) {
        this.context.weavessRef?.waveformPanelRef.zoomToTimeWindow(this.props.viewableInterval);
        toast.info(
          `Unable to calculate zoom interval, check feature prediction data and station data has loaded`,
          { toastId: 'zasUnableToCalculateInterval' }
        );
      }
    }
  };

  /**
   * Handle when the zoom changes within weavess. Catches errors that result from asynchronously updating
   * zoom interval—which can result in errors if the user changes intervals before this function
   * gets called.
   *
   * @param timeRange
   */
  private readonly onZoomChange = (timeRange: CommonTypes.TimeRange): void => {
    try {
      this.props.setZoomInterval(timeRange);
    } catch (error) {
      // this is an expected case when switching intervals while zoom updates are pending.
      // We should handle this gracefully. Throw all other errors.
      if (error.message !== AnalystWaveformTypes.ZOOM_INTERVAL_TOO_LARGE_ERROR_MESSAGE) throw error;
    }
  };

  /**
   * Remove scaled amplitude of all channels if set
   */
  private readonly resetChannelScaledAmplitude = (): void => {
    // If scaled to channel is set unset it
    if (this.state.scaleAmplitudeChannelName !== undefined) {
      this.setState({
        scaleAmplitudeChannelName: undefined,
        scaledAmplitudeChannelMinValue: -1,
        scaledAmplitudeChannelMaxValue: 1
      });
    }
  };

  /**
   * Set amplitude scaling option called by Waveform Control's Scaling Option
   *
   * @param option AmplitudeScalingOptions (fixed or auto)
   */
  private readonly setAmplitudeScaleOption = (option: AmplitudeScalingOptions) => {
    this.setState({
      amplitudeScaleOption: option,
      scaleAmplitudeChannelName: undefined,
      scaledAmplitudeChannelMinValue: -1,
      scaledAmplitudeChannelMaxValue: 1
    });

    this.resetAmplitudes();
  };

  /**
   * Set fixed scale value when scaling option is set to Fixed
   *
   * @param val FixedScaleValue (number or current)
   */
  private readonly setFixedScaleVal = (val: FixedScaleValue) => {
    if (this.isShuttingDown) {
      return;
    }
    this.setState({
      fixedScaleVal: val,
      scaleAmplitudeChannelName: undefined,
      scaledAmplitudeChannelMinValue: -1,
      scaledAmplitudeChannelMaxValue: 1
    });
    this.resetAmplitudes();
  };

  /**
   * Reset amplitude in the waveform panels
   *
   * @param force Reset amplitudes no matter the scaling conditions
   */
  private readonly resetAmplitudes = (force = false): void => {
    if (this.context.weavessRef) {
      if (
        force ||
        (this.state.amplitudeScaleOption !== AmplitudeScalingOptions.FIXED &&
          this.state.fixedScaleVal !== 'Current')
      ) {
        this.context.weavessRef.resetWaveformPanelAmplitudes();
      }
    }
  };

  /**
   * Reset amplitude in the waveform panels
   *
   * @param channelIds channel names to reset amplitude scaling
   * @param isMeasureWindow which waveform panel (main or measure window)
   */
  private readonly resetSelectedWaveformAmplitudeScaling = (
    channelIds: string[],
    isMeasureWindow = false
  ): void => {
    if (this.context.weavessRef) {
      this.context.weavessRef.resetSelectedWaveformAmplitudeScaling(channelIds, isMeasureWindow);
    }
  };

  /**
   * Simply gets the signal detections out of the query, for ease of use.
   */
  private readonly getSignalDetections = () => this.props.signalDetections;

  /**
   * For stations, sets the visibility for provided station to false (not visible)
   * For channels, sets the visibility for provided channel to false (not to show even if parent station is expanded)
   *
   * @param stationOrChannelName the name of the station or channel
   */
  private readonly hideStationOrChannel = (stationOrChannelName: string): void => {
    const parentStation = getStationContainingChannel(stationOrChannelName, this.getStations());
    if (parentStation) {
      this.props.setChannelVisibility(parentStation, stationOrChannelName, false);
    } else {
      this.props.setStationVisibility(stationOrChannelName, false);
    }
  };

  /**
   * Sets the visibility for all channels belonging to the named station to true
   *
   * @param stationName the name of the station for which to show all of its channels
   */
  private readonly showAllChannels = (stationName: string): void => {
    this.props.showAllChannels(stationName);
  };

  /**
   * Call to scale all amplitudes using the selected channel if one is selected, if not
   * warns User and returns
   */
  private readonly scaleAllAmplitudesUsingSelectedChannel = (): void => {
    // Only perform scale all channels operation if 1 channel is selected.
    // If no channel is selected ignore the key sequence
    if (this.props.selectedStationIds.length === 0) {
      toast.info('Please select a channel to scale');
      return;
    }
    if (this.props.selectedStationIds.length > 1) {
      toast.warn('Cannot scale to channel when more than one channel is selected');
      return;
    }

    if (this.context.weavessRef?.waveformPanelRef) {
      const channelName = this.props.selectedStationIds[0];
      /** Find the WeavessChannel to check if a waveform is loaded */
      const weavessChannel: WeavessTypes.Channel = WeavessUtil.findChannelInStations(
        this.state.weavessStations,
        channelName
      );

      // Check to see if there is a waveform loaded
      if (recordLength(weavessChannel?.waveform?.channelSegmentsRecord) === 0) {
        toast.warn(`${channelName} has no waveform loaded to scale from`);
        return;
      }

      // Look up the channel amplitudes from Weaves (in case the channel has been manually scaled)
      const yBounds: WeavessTypes.YAxisBounds = this.context.weavessRef.waveformPanelRef.getChannelWaveformYAxisBounds(
        channelName
      );
      if (yBounds) {
        this.scaleAllAmplitudes(channelName, yBounds.minAmplitude, yBounds.maxAmplitude);
      } else {
        logger.warn(`Failed to find Amplitude for channel ${channelName}`);
      }
    }
  };

  /**
   * Sets all other channel's amplitudes to this channel's amplitudes. It does this by
   * setting the state that is then passed to the WeavessStations
   *
   * @param name Name of channel from which the amplitudes values are referenced
   * @param amplitudeMinValue Min value from reference channel
   * @param amplitudeMaxValue Max value from reference channel
   * @param isDefaultChannel Is this a station are a child channel
   */
  private readonly scaleAllAmplitudes = (
    channelName: string,
    amplitudeMinValue: number,
    amplitudeMaxValue: number
  ): void => {
    // Reset any manual scaling before setting amplitude values of selected channel
    this.resetAmplitudes();
    this.setState({
      scaleAmplitudeChannelName: channelName,
      scaledAmplitudeChannelMinValue: amplitudeMinValue,
      scaledAmplitudeChannelMaxValue: amplitudeMaxValue
    });
  };

  /**
   * Shorthand function to check if weavess stations should be updated.
   *
   * @return true if weavess stations should be updated.
   */
  private readonly shouldUpdateWeavessStations = (prevProps: WaveformDisplayProps) => {
    return (
      prevProps.shouldShowTimeUncertainty !== this.props.shouldShowTimeUncertainty ||
      prevProps.shouldShowPredictedPhases !== this.props.shouldShowPredictedPhases ||
      prevProps.stationsVisibility !== this.props.stationsVisibility ||
      prevProps.channelSegments !== this.props.channelSegments ||
      prevProps.signalDetections !== this.props.signalDetections ||
      prevProps.displayedSignalDetectionConfiguration !==
        this.props.displayedSignalDetectionConfiguration ||
      prevProps.selectedSortType !== this.props.selectedSortType ||
      prevProps.currentOpenEventId !== this.props.currentOpenEventId ||
      prevProps.selectedSdIds !== this.props.selectedSdIds ||
      prevProps.signalDetectionActionTargets !== this.props.signalDetectionActionTargets ||
      prevProps.phaseToAlignOn !== this.props.phaseToAlignOn ||
      prevProps.alignWaveformsOn !== this.props.alignWaveformsOn ||
      prevProps.baseStationTime !== this.props.baseStationTime ||
      prevProps.channelFilters !== this.props.channelFilters ||
      prevProps.eventStatuses !== this.props.eventStatuses ||
      prevProps.maskVisibility !== this.props.maskVisibility ||
      prevProps.zoomInterval !== this.props.zoomInterval ||
      prevProps.qcSegments !== this.props.qcSegments ||
      prevProps.events !== this.props.events ||
      prevProps.sdIdsInConflict !== this.props.sdIdsInConflict
    );
  };

  private readonly phaseSelectorCallback = (phases: string[]) => {
    // if provided && not already selected, set the current selection to just the context-menu'd detection
    const detectionIds =
      this.props.clickedSdId && this.props.selectedSdIds.indexOf(this.props.clickedSdId) === -1
        ? [this.props.clickedSdId]
        : this.props.selectedSdIds;

    this.props.signalDetectionPhaseUpdate(detectionIds, phases[0]);
  };

  /**
   * Stable call for closing the create event dialog
   */
  private readonly closeCreateEventDialog = () => {
    this.props.setCreateEventMenuVisibility(false);
  };

  /**
   * Stable call for closing the current phase menu
   */
  private readonly closeCurrentPhaseMenu = () => {
    this.props.setCurrentPhaseMenuVisibility(false);
  };

  /**
   * Stable call for closing the current phase menu
   */
  private readonly closePhaseMenu = () => {
    this.props.setPhaseMenuVisibility(false);
  };

  private readonly buildInfoBar = memoizeOne(
    (alignWaveformsOn: AlignWaveformsOn, phaseToAlignOn: string): JSX.Element => {
      if (this.props.alignWaveformsOn === AlignWaveformsOn.TIME)
        return <span>Aligned on: Time</span>;
      return <span>{`Aligned on: ${alignWaveformsOn}: ${phaseToAlignOn}`}</span>;
    }
  );

  /**
   * Renders the component.
   */
  // eslint-disable-next-line react/sort-comp, complexity
  public render(): JSX.Element {
    Timer.start('[ui waveform panel] render');
    const stations = this.getAllVisibleWeavessStations();

    Timer.end('[ui waveform panel] render');

    const selectedPhases = [];

    // if provided && not already selected, set the current selection to just the context-menu'd detection
    const detectionIds =
      this.props.clickedSdId && this.props.selectedSdIds.indexOf(this.props.clickedSdId) === -1
        ? [this.props.clickedSdId]
        : this.props.selectedSdIds;

    detectionIds.forEach(id => {
      const signalDetection = this.props.signalDetections.find(sd => sd.id === id);
      if (signalDetection) {
        const currentHypothesis = getCurrentHypothesis(signalDetection.signalDetectionHypotheses);
        selectedPhases.push(
          findPhaseFeatureMeasurement(currentHypothesis.featureMeasurements).measurementValue.value
        );
      }
    });

    const isSplitChannelOverlayOpen = !!stations.find(
      station => station?.splitChannels?.length > 0
    );

    return (
      <WaveformHotkeys
        zoomAlignSort={this.zoomAlignSort}
        createEventBeam={() =>
          console.dir(
            `(b) pressed to create event beam for selected station(s) ${this.props.selectedStationIds}`
          )
        }
        selectedSignalDetectionsIds={this.props.selectedSdIds}
        featurePredictionQueryDataUnavailable={
          (this.props.featurePredictionQuery.data === null ||
            this.props.featurePredictionQuery.data === undefined ||
            this.props.featurePredictionQuery.data?.receiverLocationsByName === null ||
            this.props.featurePredictionQuery.data?.receiverLocationsByName === undefined) &&
          !this.props.featurePredictionQuery.isFetching
        }
        setPhaseMenuVisibility={this.props.setPhaseMenuVisibility}
        setCreateEventVisibility={this.props.setCreateEventMenuVisibility}
        setCurrentPhaseMenuVisibility={this.props.setCurrentPhaseMenuVisibility}
        toggleAlignment={this.toggleAlignment}
        isMeasureWindowVisible={this.state.isMeasureWindowVisible}
        toggleMeasureWindowVisibility={this.toggleMeasureWindowVisibility}
        setAnalystNumberOfWaveforms={this.setAnalystNumberOfWaveforms}
        analystNumberOfWaveforms={this.state.analystNumberOfWaveforms}
        closeSignalDetectionOverlay={this.closeSplitWeavessStations}
        scaleAllWaveformAmplitude={this.scaleAllAmplitudesUsingSelectedChannel}
        toggleUncertainty={this.props.setShouldShowTimeUncertainty}
        shouldShowTimeUncertainty={this.props.shouldShowTimeUncertainty}
        selectedStationIds={this.props.selectedStationIds}
        resetAllWaveformAmplitudeScaling={this.resetAmplitudes}
        resetSelectedWaveformAmplitudeScaling={this.resetSelectedWaveformAmplitudeScaling}
        isSplitMode={isSplitChannelOverlayOpen}
      >
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className="waveform-display-container"
          data-cy="waveform-display-container"
          tabIndex={-1}
          onKeyDown={e => {
            this.onKeyPress(e);
          }}
          ref={ref => {
            if (ref) {
              this.waveformDisplayRef = ref;
            }
          }}
        >
          <WaveformLabelContextMenu getOpenCallback={this.setWaveformLabelContextMenuCb} />
          <CreateEventDialog
            isOpen={this.props.createEventMenuVisibility}
            onClose={this.closeCreateEventDialog}
          />
          <PhaseSelectorDialog
            isOpen={this.props.phaseMenuVisibility}
            title="Set Phase"
            selectedPhases={selectedPhases}
            phaseSelectorCallback={this.phaseSelectorCallback}
            closeCallback={this.closePhaseMenu}
            hotkeyCombo={this.props.keyboardShortcuts?.hotkeys?.toggleSetPhaseMenu?.combos[0]}
          />
          <PhaseSelectorDialog
            isOpen={this.props.currentPhaseMenuVisibility}
            title="Current Phase"
            hotkeyCombo={this.props.keyboardShortcuts?.hotkeys?.toggleCurrentPhaseMenu?.combos[0]}
            phaseHotkeys={this.props.phaseHotkeys}
            selectedPhases={[this.props.currentPhase]}
            phaseSelectorCallback={this.props.setCurrentPhase}
            closeCallback={this.closeCurrentPhaseMenu}
          />
          <WaveformControls
            currentSortType={this.props.selectedSortType}
            currentTimeInterval={this.state.currentTimeInterval}
            viewableTimeInterval={this.props.viewableInterval}
            currentOpenEventId={this.props.currentOpenEventId}
            analystNumberOfWaveforms={this.state.analystNumberOfWaveforms}
            showPredictedPhases={this.props.shouldShowPredictedPhases}
            alignWaveformsOn={this.props.alignWaveformsOn}
            phaseToAlignOn={this.props.phaseToAlignOn}
            alignablePhases={this.props.alignablePhases}
            selectedStationIds={this.props.selectedStationIds}
            defaultPhaseAlignment={
              this.props.processingAnalystConfigurationQuery.data.zasDefaultAlignmentPhase ?? 'P'
            }
            measurementMode={this.props.measurementMode}
            defaultSignalDetectionPhase={this.props.defaultSignalDetectionPhase}
            setCreateEventMenuVisibility={this.props.setCreateEventMenuVisibility}
            setCurrentPhaseMenuVisibility={this.props.setCurrentPhaseMenuVisibility}
            setDefaultSignalDetectionPhase={this.props.setDefaultSignalDetectionPhase}
            setWaveformAlignment={this.setWaveformAlignment}
            setAlignWaveformsOn={this.props.setAlignWaveformsOn}
            setSelectedSortType={this.props.setSelectedSortType}
            setAnalystNumberOfWaveforms={this.setAnalystNumberOfWaveforms}
            setMode={this.setMode}
            toggleMeasureWindow={this.toggleMeasureWindowVisibility}
            pan={this.panHard}
            zoomAlignSort={this.zoomAlignSort}
            onKeyPress={this.onKeyPress}
            isMeasureWindowVisible={this.state.isMeasureWindowVisible}
            amplitudeScaleOption={this.state.amplitudeScaleOption}
            fixedScaleVal={this.state.fixedScaleVal}
            setAmplitudeScaleOption={this.setAmplitudeScaleOption}
            setFixedScaleVal={this.setFixedScaleVal}
            featurePredictionQueryDataUnavailable={
              (this.props.featurePredictionQuery.data === null ||
                this.props.featurePredictionQuery.data === undefined ||
                this.props.featurePredictionQuery.data?.receiverLocationsByName === null ||
                this.props.featurePredictionQuery.data?.receiverLocationsByName === undefined) &&
              !this.props.featurePredictionQuery.isFetching
            }
            qcMaskDefaultVisibility={
              this.props.processingAnalystConfigurationQuery.data.qcMaskTypeVisibilities
            }
            uiTheme={this.props.uiTheme}
          />
          <WeavessDisplay
            weavessProps={{
              viewableInterval: this.props.viewableInterval,
              currentInterval: this.props.currentTimeInterval,
              minimumOffset: this.props.minimumOffset,
              maximumOffset: this.props.maximumOffset,
              baseStationTime: this.props.baseStationTime,
              unassociatedSDColor: this.props.uiTheme?.colors?.unassociatedSDColor,
              showMeasureWindow:
                this.props.measurementMode.mode ===
                AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT,
              stations,
              events: this.weavessEventHandlers,
              selections: this.memoizedGetSelections(this.props.selectedStationIds),
              initialConfiguration: this.weavessConfiguration,
              flex: false,
              panRatio: this.props.processingAnalystConfigurationQuery.data?.waveformPanRatio,
              extraInfoBar: this.buildInfoBar(
                this.props.alignWaveformsOn,
                this.props.phaseToAlignOn
              )
            }}
            closeSignalDetectionOverlayCallback={this.closeSplitWeavessStations}
            defaultWaveformFilters={
              this.props.processingAnalystConfigurationQuery?.data?.defaultFilters ?? []
            }
            defaultStations={this.props.stationsQuery.data ?? []}
            events={this.props.events ?? []}
            openIntervalName={this.props.currentStageName}
            qcSegmentsByChannelName={this.props.qcSegments}
            processingMask={this.props.processingMask}
            maskVisibility={this.props.maskVisibility}
            measurementMode={this.props.measurementMode}
            currentPhase={this.props.currentPhase}
            defaultSignalDetectionPhase={this.props.defaultSignalDetectionPhase}
            setMeasurementModeEntries={this.props.setMeasurementModeEntries}
            amplitudeScaleOption={this.state.amplitudeScaleOption}
            fixedScaleVal={this.state.fixedScaleVal}
            scaleAmplitudeChannelName={this.state.scaleAmplitudeChannelName}
            scaledAmplitudeChannelMinValue={this.state.scaledAmplitudeChannelMinValue}
            scaledAmplitudeChannelMaxValue={this.state.scaledAmplitudeChannelMaxValue}
            selectedSdIds={this.props.selectedSdIds}
            signalDetections={this.getSignalDetections()}
            signalDetectionActionTargets={this.props.signalDetectionActionTargets}
            setSelectedSdIds={this.props.setSelectedSdIds}
            associateSignalDetections={this.props.associateSignalDetections}
            unassociateSignalDetections={this.props.unassociateSignalDetections}
            setSelectedStationIds={this.props.setSelectedStationIds}
            currentTimeInterval={this.props.currentTimeInterval}
            currentOpenEventId={this.props.currentOpenEventId}
            analysisMode={this.props.analysisMode}
            selectedStationIds={this.props.selectedStationIds}
            sdIdsToShowFk={this.props.sdIdsToShowFk}
            setSdIdsToShowFk={this.props.setSdIdsToShowFk}
            eventStatuses={this.props.eventStatuses}
            uiTheme={this.props.uiTheme}
            updateSignalDetection={this.props.updateSignalDetection}
            phaseMenuVisibility={this.props.phaseMenuVisibility}
            createSignalDetection={this.createSignalDetection}
            setViewportVisibleStations={this.props.setViewportVisibleStations}
            setPhaseMenuVisibility={this.props.setPhaseMenuVisibility}
            setClickedSdId={this.props.setClickedSdId}
            setSignalDetectionActionTargets={this.props.setSignalDetectionActionTargets}
            channelFilters={this.props.channelFilters}
          />
        </div>
      </WaveformHotkeys>
    );
  }
}
