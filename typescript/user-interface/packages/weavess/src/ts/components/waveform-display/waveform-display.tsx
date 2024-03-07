/* eslint-disable react/destructuring-assignment */
import { UILogger } from '@gms/ui-util';
import { registerHotKeyMode } from '@gms/ui-util/lib/ui-util/hot-key-util';
import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessConstants, WeavessUtil } from '@gms/weavess-core';
import isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import React from 'react';
import { Slide, ToastContainer } from 'react-toastify';

import { HorizontalDivider } from './components/horizontal-divider';
import { MeasureWindow } from './components/measure-window';
import { memoizedGetConfiguration } from './configuration';
import type { WaveformDisplayProps, WaveformDisplayState } from './types';
import { WaveformPanel } from './waveform-panel';

const logger = UILogger.create('GMS_LOG_WEAVESS', process.env.GMS_LOG_WEAVESS);

/**
 * Update channel based on newStation
 *
 * @param newStation
 * @param id
 * @param prevStation
 */
function buildUpdatedChannel(
  newStation: WeavessTypes.Station,
  channelId: string,
  prevStation: WeavessTypes.MeasureWindowSelection
): WeavessTypes.Channel {
  let updatedChannel: WeavessTypes.Channel;
  if (newStation) {
    if (newStation.defaultChannel.id === channelId) {
      updatedChannel = newStation.defaultChannel;
    } else if (newStation.nonDefaultChannels) {
      updatedChannel = newStation.nonDefaultChannels.find(
        channel => channel.id === prevStation.channel.id
      );
    }
  }
  return updatedChannel;
}
/**
 * Parent container for weavess. Contains a Waveform Panel for the main display
 * and the measure window.
 */
export class WaveformDisplay extends React.PureComponent<
  WaveformDisplayProps,
  WaveformDisplayState
> {
  /** Reference to the waveform panel. */
  public waveformPanelRef: WaveformPanel | null;

  /** Reference to the measure window container. */
  public measureWindowContainerRef: HTMLDivElement | null;

  /** Reference to the measure window panel. */
  public measureWindowPanelRef: WaveformPanel | null;

  /**
   * Method to zoom to/align on a selected phase
   */
  // eslint-disable-next-line react/sort-comp, class-methods-use-this
  private readonly zoomToPhaseAlignment = (): void => {
    const currentZoomInterval = this.waveformPanelRef?.getCurrentZoomInterval();
    const displayInterval = this.memoizedViewableIntervalWithOffset(
      this.props.viewableInterval,
      this.props.minimumOffset,
      this.props.maximumOffset,
      this.props.baseStationTime
    );
    const currentZoomQuotient = Math.round(
      (currentZoomInterval.endTimeSecs - currentZoomInterval.startTimeSecs) / 2
    );
    const displayQuotient = Math.round(
      (displayInterval.endTimeSecs - displayInterval.startTimeSecs) / 2
    );

    if (this.props.baseStationTime) {
      // If display size is smaller than current zoom, we clamp to display size
      const minZoomQuotient = Math.min(currentZoomQuotient, displayQuotient);
      const newZoomInterval: WeavessTypes.TimeRange = {
        startTimeSecs: this.props.baseStationTime - minZoomQuotient,
        endTimeSecs: this.props.baseStationTime + minZoomQuotient
      };
      this.waveformPanelRef?.zoomToTimeWindow(newZoomInterval);
    } else if (currentZoomQuotient < displayQuotient) {
      // Use the center of the zoom interval if base station time is not present
      const baseTime = (currentZoomInterval.endTimeSecs + currentZoomInterval.startTimeSecs) / 2;
      const newZoomInterval: WeavessTypes.TimeRange = {
        startTimeSecs: baseTime - currentZoomQuotient,
        endTimeSecs: baseTime + currentZoomQuotient
      };
      this.waveformPanelRef?.zoomToTimeWindow(newZoomInterval);
    } else {
      this.waveformPanelRef?.zoomToTimeWindow(displayInterval);
    }
  };

  /**
   * Function to add offset to the viewable interval
   *
   * @returns TimeRange
   */
  // eslint-disable-next-line react/sort-comp, class-methods-use-this
  public getViewableIntervalWithOffset = (
    viewableInterval: WeavessTypes.TimeRange,
    minimumOffset: number,
    maximumOffset: number,
    baseStationTime: number
  ): WeavessTypes.TimeRange => {
    let startTimeSecs = viewableInterval.startTimeSecs + minimumOffset;
    let endTimeSecs = viewableInterval.endTimeSecs + maximumOffset;
    if (baseStationTime) {
      const startTimeDiff = baseStationTime - startTimeSecs;
      const endTimeDiff = endTimeSecs - baseStationTime;
      if (startTimeDiff < endTimeDiff) {
        startTimeSecs -= endTimeDiff - startTimeDiff;
      } else {
        endTimeSecs += startTimeDiff - endTimeDiff;
      }
    }

    return {
      startTimeSecs,
      endTimeSecs
    };
  };

  public memoizedViewableIntervalWithOffset = memoizeOne(
    this.getViewableIntervalWithOffset,
    isEqual
  );

  /**
   * Constructor
   *
   * @param props Waveform Display props as WaveformDisplayProps
   */
  public constructor(props: WaveformDisplayProps) {
    super(props);
    this.state = {
      initialConfiguration: memoizedGetConfiguration(props.initialConfiguration),
      measureWindowHeightPx: WeavessConstants.DEFAULT_DIVIDER_TOP_HEIGHT_PX,
      showMeasureWindow: false,
      isMeasureWindowVisible: false,
      measureWindowSelection: undefined,
      prevMeasureWindowSelectionFromProps: undefined,
      shouldRenderWaveforms: this.props.initialConfiguration?.shouldRenderWaveforms ?? false,
      shouldRenderSpectrograms: this.props.initialConfiguration?.shouldRenderSpectrograms ?? false
    };
  }

  // ******************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ******************************************

  /**
   * Invoked right before calling the render method, both on the initial mount
   * and on subsequent updates. It should return an object to update the state,
   * or null to update nothing.
   *
   * @param nextProps the next props
   * @param prevState the previous state
   */
  // eslint-disable-next-line complexity
  public static getDerivedStateFromProps(
    nextProps: WaveformDisplayProps,
    prevState: WaveformDisplayState
  ): Partial<WaveformDisplayState> | null {
    let derivedState: Partial<WaveformDisplayState> = {};
    let hasStateChanged = false;
    const showMeasureWindowChanged = !isEqual(
      nextProps.showMeasureWindow,
      prevState.showMeasureWindow
    );
    // check if the show measure window state has changed; if so update the state
    if (showMeasureWindowChanged) {
      derivedState = {
        ...derivedState,
        showMeasureWindow: nextProps.showMeasureWindow,
        isMeasureWindowVisible: nextProps.showMeasureWindow
      };
    }
    const visibleMeasureWindow =
      prevState.isMeasureWindowVisible && prevState.measureWindowSelection;
    // if the measure window is visible; update the measure window selection with the
    // new props coming into the waveform display component
    if (visibleMeasureWindow) {
      const prevStation = prevState.measureWindowSelection;
      const newStation = nextProps.stations.find(station => station.id === prevStation.stationId);

      const updatedChannel = buildUpdatedChannel(
        newStation,
        prevState.measureWindowSelection.channel.id,
        prevStation
      );
      derivedState = {
        ...derivedState,
        measureWindowSelection: updatedChannel
          ? {
              ...prevState.measureWindowSelection,
              channel: { ...updatedChannel }
            }
          : undefined
      };
      hasStateChanged = true;
    }

    // check if the props specify and define the measure window selection
    const propsSpecifyAndDefineMeasureWindowSelection =
      !isEqual(nextProps.measureWindowSelection, prevState.prevMeasureWindowSelectionFromProps) ||
      isEqual(prevState.measureWindowSelection, prevState.prevMeasureWindowSelectionFromProps);
    if (propsSpecifyAndDefineMeasureWindowSelection) {
      // clear out any existing measure window selection
      if (prevState.measureWindowSelection && prevState.measureWindowSelection.removeSelection) {
        prevState.measureWindowSelection.removeSelection();
      }

      derivedState = {
        ...derivedState,
        measureWindowSelection: nextProps.measureWindowSelection,
        prevMeasureWindowSelectionFromProps: nextProps.measureWindowSelection
      };
    }

    if (hasStateChanged) {
      return derivedState;
    }
    return null; /* no-op */
  }

  public componentDidMount(): void {
    if (this.props.events.onMount) {
      this.props.events.onMount(this);
    }
    this.props.initialConfiguration?.hotKeys?.editSignalDetectionUncertainty?.combos.forEach(
      combo => {
        registerHotKeyMode(combo, 'uncertainty-editing');
      }
    );
  }

  public componentDidUpdate(prevProps) {
    if (
      prevProps.baseStationTime !== this.props.baseStationTime &&
      prevProps.events === this.props.events
    ) {
      this.zoomToPhaseAlignment();
    }
  }

  /**
   * Catches exceptions generated in descendant components.
   * Unhandled exceptions will cause the entire component tree to unmount.
   *
   * @param error the error that was caught
   * @param info the information about the error
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public componentDidCatch(error, info) {
    logger.error(`Waveform Display Error: ${error} : ${info}`);
  }

  // ******************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ******************************************

  /**
   * Exposed primarily for non-react users.
   */
  public refresh = (): void => {
    if (!this.waveformPanelRef) {
      return;
    }
    this.waveformPanelRef.refresh();
    if (this.measureWindowPanelRef) {
      this.measureWindowPanelRef.refresh();
    }
  };

  /**
   * Converts a timestamp in seconds into the WebGL units in clipping space.
   *
   * @param timeSec the time to convert
   * @returns the equivalent GL units (in webGL clipping space)
   */
  public readonly convertTimeToGL = (timeSec: number): number => {
    const scale = WeavessUtil.scaleLinear(
      [
        this.props.currentInterval?.startTimeSecs ?? this.props.viewableInterval.startTimeSecs,
        this.props.currentInterval?.endTimeSecs ?? this.props.viewableInterval.endTimeSecs
      ],
      [0, 100]
    );
    return scale(timeSec);
  };

  /**
   * Returns true if the measure window is visible; false otherwise.
   *
   * @returns true if visible; false otherwise
   */
  public isMeasureWindowVisible = (): boolean => this.state.isMeasureWindowVisible;

  /**
   * Removes the selection div that spans all stations
   */
  public clearBrushStroke = (): void => {
    if (!this.waveformPanelRef) {
      return;
    }
    this.waveformPanelRef.clearBrushStroke();
    if (this.measureWindowPanelRef) {
      this.measureWindowPanelRef.clearBrushStroke();
    }
  };

  /**
   * Toggle the measure window visibility.
   */
  // eslint-disable-next-line complexity
  public toggleMeasureWindowVisibility = (): void => {
    if (this.state.measureWindowSelection) {
      if (this.state.measureWindowSelection.removeSelection) {
        this.state.measureWindowSelection.removeSelection();
      }
    }

    if (this.state.measureWindowSelection && this.state.measureWindowSelection?.isDefaultChannel) {
      if (this.props.events?.stationEvents?.defaultChannelEvents?.events?.onMeasureWindowUpdated) {
        this.props.events.stationEvents.defaultChannelEvents.events.onMeasureWindowUpdated(
          !this.state.isMeasureWindowVisible
        );
      }
    } else if (
      this.props.events?.stationEvents?.nonDefaultChannelEvents?.events?.onMeasureWindowUpdated
    ) {
      this.props.events.stationEvents.nonDefaultChannelEvents.events.onMeasureWindowUpdated(
        !this.state.isMeasureWindowVisible
      );
    }

    this.setState(prevState => ({
      isMeasureWindowVisible: !prevState.isMeasureWindowVisible,
      measureWindowSelection: undefined
    }));
  };

  /**
   * Toggles whether or not waveforms or spectrograms should be rendered
   *
   * Toggle Order (repeat):
   *   * render: waveforms and spectrograms
   *   * render: waveforms
   *   * render: spectrograms
   */
  public toggleRenderingContent = (): void => {
    if (this.state.shouldRenderWaveforms && this.state.shouldRenderSpectrograms) {
      this.setState({
        shouldRenderWaveforms: true,
        shouldRenderSpectrograms: false
      });
    } else if (this.state.shouldRenderWaveforms && !this.state.shouldRenderSpectrograms) {
      this.setState({
        shouldRenderWaveforms: false,
        shouldRenderSpectrograms: true
      });
    } else {
      this.setState({
        shouldRenderWaveforms: true,
        shouldRenderSpectrograms: true
      });
    }
  };

  /** Toggles whether or not waveforms should be rendered */
  public toggleShouldRenderWaveforms = (): void => {
    this.setState(prevState => ({
      shouldRenderWaveforms: !prevState.shouldRenderWaveforms
    }));
  };

  /** Toggles whether or not spectrograms should be rendered */
  public toggleShouldRenderSpectrograms = (): void => {
    this.setState(prevState => ({
      shouldRenderSpectrograms: !prevState.shouldRenderSpectrograms
    }));
  };

  /**
   * Used to reset any Manual Amplitude Scaling override for main waveform panel
   * and measure window panel
   */
  public readonly resetWaveformPanelAmplitudes = (): void => {
    if (this.waveformPanelRef) {
      this.waveformPanelRef.resetAmplitudes();
    }

    if (this.measureWindowPanelRef) {
      this.measureWindowPanelRef.resetAmplitudes();
    }
  };

  /**
   * Used to reset any Manual Amplitude Scaling override for single channel for either
   * main waveform panel or measure window
   */
  // eslint-disable-next-line react/no-unused-class-component-methods
  public readonly resetSelectedWaveformAmplitudeScaling = (
    channelIds: string[],
    isMeasureWindow: boolean
  ): void => {
    if (isMeasureWindow && this.measureWindowPanelRef) {
      this.measureWindowPanelRef.resetAmplitudes();
    } else if (this.waveformPanelRef) {
      this.waveformPanelRef.resetSelectedWaveformAmplitudeScaling(channelIds);
    }
  };

  /** ** ** ** ** ** ** ** ** **
   * Private Functions
   * ** ** ** ** ** ** ** ** ** */

  /**
   * A setter to set the waveform panel ref
   *
   * @param ref the ref returned from the WaveformPanel
   */
  private readonly setWaveformRef = (ref: WaveformPanel | null) => {
    if (ref) {
      this.waveformPanelRef = ref;
    }
  };

  /**
   * A setter to set the measure window ref
   *
   * @param ref the ref returned from the WaveformPanel contained within the MeasureWindow
   */
  private readonly setMeasureWindowRef = (ref: WaveformPanel | null) => {
    this.measureWindowPanelRef = ref;
  };

  /**
   * Update measure window
   *
   * @param stationId
   * @param channel
   * @param startTimeSecs
   * @param endTimeSecs
   * @param isDefaultChannel
   * @param removeSelection
   */
  // eslint-disable-next-line complexity
  private readonly updateMeasureWindow = (
    stationId: string,
    channel: WeavessTypes.Channel,
    startTimeSecs: number,
    endTimeSecs: number,
    isDefaultChannel: boolean,
    waveformAmplitudeScaleFactor: number,
    removeSelection: () => void
  ) => {
    if (
      this.state.measureWindowSelection &&
      this.state.measureWindowSelection.channel?.id !== channel.id
    ) {
      if (this.state.measureWindowSelection.removeSelection) {
        this.state.measureWindowSelection.removeSelection();
      }
    }

    this.setState(
      {
        isMeasureWindowVisible: true,
        measureWindowSelection: {
          stationId,
          channel,
          startTimeSecs,
          endTimeSecs,
          isDefaultChannel,
          waveformAmplitudeScaleFactor,
          removeSelection
        }
      },
      () => {
        if (this.state.isMeasureWindowVisible && this.props.events?.onMeasureWindowResize) {
          this.props.events.onMeasureWindowResize(this.state.measureWindowHeightPx);
        }
        if (isDefaultChannel) {
          if (
            this.props.events?.stationEvents?.defaultChannelEvents?.events?.onMeasureWindowUpdated
          ) {
            this.props.events.stationEvents.defaultChannelEvents.events.onMeasureWindowUpdated(
              true,
              channel.id,
              startTimeSecs,
              endTimeSecs,
              this.state.measureWindowHeightPx
            );
          }
        } else if (
          this.props.events?.stationEvents?.nonDefaultChannelEvents?.events?.onMeasureWindowUpdated
        ) {
          this.props.events.stationEvents.nonDefaultChannelEvents.events.onMeasureWindowUpdated(
            true,
            channel.id,
            startTimeSecs,
            endTimeSecs,
            this.state.measureWindowHeightPx
          );
        }
      }
    );
  };

  /**
   * Handler for when the measure window is resized.
   *
   * @param heightPx the new height of the measure window
   */
  private readonly onMeasureWindowResizeMouseUp = (heightPx: number): void => {
    this.setState(
      {
        measureWindowHeightPx: heightPx
      },
      () => {
        if (this.props.events?.onMeasureWindowResize) {
          this.props.events.onMeasureWindowResize(heightPx);
        }
        if (this.state.measureWindowSelection) {
          if (this.state.measureWindowSelection?.isDefaultChannel) {
            if (
              this.props.events?.stationEvents?.defaultChannelEvents?.events?.onMeasureWindowUpdated
            ) {
              this.props.events.stationEvents.defaultChannelEvents.events.onMeasureWindowUpdated(
                true,
                this.state.measureWindowSelection.channel.id,
                this.state.measureWindowSelection.startTimeSecs,
                this.state.measureWindowSelection.endTimeSecs,
                heightPx
              );
            }
          } else if (
            this.props.events?.stationEvents?.nonDefaultChannelEvents?.events
              ?.onMeasureWindowUpdated
          ) {
            this.props.events.stationEvents.nonDefaultChannelEvents.events.onMeasureWindowUpdated(
              true,
              this.state.measureWindowSelection.channel.id,
              this.state.measureWindowSelection.startTimeSecs,
              this.state.measureWindowSelection.endTimeSecs,
              heightPx
            );
          }
        }
      }
    );
  };

  public render(): JSX.Element {
    // measure window's viewable interval is the selection window
    const msrWindowViewableInterval = {
      startTimeSecs: this.state.measureWindowSelection?.startTimeSecs ?? 0,
      endTimeSecs: this.state.measureWindowSelection?.endTimeSecs ?? 0
    };

    // TODO fix performance (stability)
    /** {@link MeasureWindow} as topComponent */
    const topComponent = (measureWindowHeightPx: number, __, isResizing: boolean) => (
      <MeasureWindow
        key={JSON.stringify(msrWindowViewableInterval)}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...this.props}
        displayInterval={msrWindowViewableInterval}
        convertTimeToGL={this.convertTimeToGL}
        initialConfiguration={this.state.initialConfiguration}
        isControlledComponent={false}
        shouldRenderWaveforms={this.state.shouldRenderWaveforms}
        shouldRenderSpectrograms={this.state.shouldRenderSpectrograms}
        measureWindowHeightPx={measureWindowHeightPx}
        measureWindowSelection={this.state.measureWindowSelection}
        setMeasureWindowRef={this.setMeasureWindowRef}
        isResizing={isResizing}
        resetWaveformPanelAmplitudes={this.resetWaveformPanelAmplitudes}
        scrollBarWidthPx={0}
      />
    );

    // TODO fix performance (stability)
    /** {@link WaveformPanel} as bottomComponent */
    const bottomComponent = (__, ___, isResizing: boolean) => {
      return (
        <WaveformPanel
          ref={this.setWaveformRef}
          unassociatedSDColor={this.props?.unassociatedSDColor}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...this.props}
          closeSignalDetectionOverlayCallback={this.props.closeSignalDetectionOverlayCallback}
          convertTimeToGL={this.convertTimeToGL}
          customLabel={this.props.customLabel}
          initialConfiguration={this.state.initialConfiguration}
          isControlledComponent={this.props.isControlledComponent ?? true}
          updateMeasureWindow={this.updateMeasureWindow}
          displayInterval={this.memoizedViewableIntervalWithOffset(
            this.props.viewableInterval,
            this.props.minimumOffset,
            this.props.maximumOffset,
            this.props.baseStationTime
          )}
          viewableInterval={this.props.viewableInterval}
          shouldRenderWaveforms={this.state.shouldRenderWaveforms}
          shouldRenderSpectrograms={this.state.shouldRenderSpectrograms}
          isResizing={isResizing}
          resetWaveformPanelAmplitudes={this.resetWaveformPanelAmplitudes}
          scrollBarWidthPx={WeavessConstants.SCROLLBAR_WIDTH_PIXELS}
        />
      );
    };

    return (
      <div
        className="weavess"
        data-cy="weavess-container"
        data-start-time={this.props.viewableInterval.startTimeSecs}
        data-end-time={this.props.viewableInterval.endTimeSecs}
        style={
          {
            '--weavess-background-color': this.props.initialConfiguration?.backgroundColor
          } as React.CSSProperties
        }
      >
        <HorizontalDivider
          topComponent={topComponent}
          bottomComponent={bottomComponent}
          topClassName="weavess-measure-window"
          bottomClassName="weavess-waveform-display"
          showTop={this.state.isMeasureWindowVisible}
          onResizeEnd={this.onMeasureWindowResizeMouseUp}
        />
        {!this.props.disableToastContainer && (
          <ToastContainer
            transition={Slide}
            autoClose={4000}
            position="bottom-right"
            containerId="Weavess-Toast-Container"
            theme={this.props.uiTheme?.isLightMode ? 'light' : 'dark'}
          />
        )}
      </div>
    );
  }
}
