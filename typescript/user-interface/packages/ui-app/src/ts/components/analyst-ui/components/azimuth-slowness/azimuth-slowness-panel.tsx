/* eslint-disable react/destructuring-assignment */
import type { FkTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { findAzimuthFeatureMeasurement } from '@gms/common-model/lib/signal-detection/util';
import React from 'react';

import { getFkParams } from '../../common/utils/fk-utils';
import type {
  FkThumbnailContextMenuCb,
  FkThumbnailContextMenuGetOpenCallbackFunc
} from './components/context-menus/fk-context-menu';
import { FkThumbnailContextMenu } from './components/context-menus/fk-context-menu';
import { FkDisplay } from './components/fk-display/fk-display';
import { FkThumbnailList } from './components/fk-thumbnail-list/fk-thumbnail-list';
import { FkThumbnailsControls } from './components/fk-thumbnail-list/fk-thumbnails-controls';
import { fksNeedReview, getSortedSignalDetections } from './components/fk-util';
import type { AzimuthSlownessPanelProps, AzimuthSlownessPanelState } from './types';

/**
 * An intermediary between AzimuthSlownessComponent and the other components so that event handling is simpler
 */
export class AzimuthSlownessPanel extends React.Component<
  AzimuthSlownessPanelProps,
  AzimuthSlownessPanelState
> {
  /** Used to constrain the max width of the thumbnail drag resize */
  private azimuthSlownessContainer: HTMLDivElement;

  /** Used to drag & resize this element */
  private fkThumbnailsContainer: HTMLDivElement;

  /** The inner container for the thumbnail */
  private fkThumbnailsInnerContainer: HTMLDivElement;

  /**
   * The callback functions for opening the FK Thumbnails context menus (popups).
   */
  private fkThumbnailsContextMenuCb: FkThumbnailContextMenuCb;

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: AzimuthSlownessPanelProps) {
    super(props);
    this.state = {
      currentMovieSpectrumIndex: 0,
      selectedSdIds: []
    };
  }

  /**
   * Invoked when the component mounted.
   */
  public componentDidMount(): void {
    this.props.adjustFkInnerContainerWidth(
      this.fkThumbnailsContainer,
      this.fkThumbnailsInnerContainer
    );
  }

  public componentDidUpdate(prevProps: AzimuthSlownessPanelProps): void {
    // If the open event id changed then select next SD ready for review
    if (this.props.openEvent && this.props.openEvent.id !== prevProps.openEvent?.id) {
      this.nextFk();
    }

    if (
      this.props.displayedSignalDetection &&
      this.props.displayedSignalDetection.id !== prevProps.displayedSignalDetection?.id
    ) {
      this.setArrivalTimeMovieSpectrumIndex(this.props.displayedSignalDetection);
    }
    if (this.props.fkThumbnailColumnSizePx !== prevProps.fkThumbnailColumnSizePx) {
      this.props.adjustFkInnerContainerWidth(
        this.fkThumbnailsContainer,
        this.fkThumbnailsInnerContainer
      );
    }
  }

  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={ref => {
          this.azimuthSlownessContainer = ref;
        }}
        key={`azimuth-slowness-panel--${this.props.colorMap}`}
        className="azimuth-slowness-container"
        data-cy="azimuth-slowness"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={this.onKeyDown}
      >
        <div
          ref={ref => {
            this.fkThumbnailsContainer = ref;
          }}
          className="azimuth-slowness-thumbnails"
          style={{ width: `${this.props.fkThumbnailColumnSizePx}px` }}
        >
          <div className="azimuth-slowness-thumbnails__control-container">
            <FkThumbnailsControls
              updateFkThumbnail={this.props.updateFkThumbnailSize}
              updateFkFilter={this.props.updateFkFilter}
              anyDisplayedFksNeedReview={this.getReviewableSds().length > 0}
              onlyOneFkIsSelected={this.state.selectedSdIds?.length === 1}
              widthPx={this.props.fkThumbnailColumnSizePx}
              nextFk={() => {
                this.nextFk();
              }}
              currentFilter={this.props.filterType}
              anyUnassociatedSelected={
                this.state.selectedSdIds.filter(
                  sdId =>
                    !this.props.associatedSignalDetections.find(assocSd => assocSd.id === sdId)
                )?.length > 0
              }
              clearSelectedUnassociatedFks={this.clearSelectedUnassociatedFks}
            />
          </div>
          <div className="azimuth-slowness-thumbnails__wrapper-1">
            <div
              ref={ref => {
                this.fkThumbnailsInnerContainer = ref;
              }}
              className="azimuth-slowness-thumbnails__wrapper-2"
            >
              <FkThumbnailContextMenu
                getOpenCallback={this.setFkThumbnailContextMenusOpenCallback}
              />
              <FkThumbnailList
                thumbnailSizePx={this.props.fkThumbnailSizePx}
                sortedSignalDetections={this.props.signalDetectionsToDraw}
                unassociatedSignalDetections={this.props.unassociatedSignalDetections}
                signalDetectionIdsToFeaturePrediction={
                  this.props.signalDetectionsIdToFeaturePredictions
                }
                displayedSignalDetection={this.props.displayedSignalDetection}
                fkUnitsForEachSdId={this.props.fkUnitsForEachSdId}
                showFkThumbnailContextMenu={this.showFkThumbnailMenu}
                arrivalTimeMovieSpectrumIndex={this.state.currentMovieSpectrumIndex}
                selectedSdIds={this.state.selectedSdIds}
                setSelectedSdIds={this.setSelectedSdIds}
                setDisplayedSignalDetection={this.props.setDisplayedSignalDetection}
              />
            </div>
          </div>
        </div>
        {/* drag handle divider */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="azimuth-slowness-divider" onMouseDown={this.onThumbnailDividerDrag}>
          <div className="azimuth-slowness-divider__spacer" />
        </div>
        <FkDisplay
          defaultStations={this.props.defaultStations}
          eventsInTimeRange={this.props.eventsInTimeRange}
          eventStatuses={this.props.eventStatuses}
          currentOpenEvent={this.props.openEvent}
          uiTheme={this.props.uiTheme}
          openIntervalName={this.props.openIntervalName}
          signalDetection={this.props.displayedSignalDetection}
          signalDetectionsByStation={this.props.signalDetectionsByStation}
          channelSegments={this.props.channelSegments}
          signalDetectionFeaturePredictions={
            this.props.featurePredictionsForDisplayedSignalDetection
          }
          widthPx={this.props.fkDisplayWidthPx}
          numberOfOutstandingComputeFkMutations={this.props.numberOfOutstandingComputeFkMutations}
          heightPx={this.props.fkDisplayHeightPx}
          multipleSelected={this.state.selectedSdIds.length > 1}
          fkUnit={this.props.fkUnitForDisplayedSignalDetection}
          onNewFkParams={this.onNewFkParams}
          setFkUnitForSdId={this.props.setFkUnitForSdId}
          updateCurrentMovieTimeIndex={this.updateCurrentMovieTimeIndex}
          fkFrequencyThumbnails={this.props.fkFrequencyThumbnails}
          currentMovieSpectrumIndex={this.state.currentMovieSpectrumIndex}
          selectedFk={this.props.selectedFk}
          colorMap={this.props.colorMap}
        />
      </div>
    );
  }

  /**
   * Assigns the FK Thumbnail Context Menu callback; which can be used to imperatively show the context menus.
   *
   * @param callback the context menu open callback
   */
  private readonly setFkThumbnailContextMenusOpenCallback: FkThumbnailContextMenuGetOpenCallbackFunc = callback => {
    this.fkThumbnailsContextMenuCb = callback;
  };

  /**
   * Set arrival time movie spectrum index for initial load and update current displayed state
   *
   * @param signalDetection current signal detection
   */
  private readonly setArrivalTimeMovieSpectrumIndex = (
    signalDetection: SignalDetectionTypes.SignalDetection
  ): void => {
    const arrivalTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(signalDetection.signalDetectionHypotheses)
        .featureMeasurements
    ).arrivalTime.value;
    this.updateCurrentMovieTimeIndex(arrivalTime);
  };

  /**
   * Selects the next fk that needs review
   */
  private readonly nextFk = () => {
    let nextSdForReview = this.props.displayedSignalDetection;
    const reviewableSds = this.getReviewableSds();
    if (reviewableSds.length > 0) {
      const needsReviewSds = reviewableSds.filter(
        sd => sd.id !== this.props.displayedSignalDetection?.id
      );
      const sortedNeedsReviewSds =
        this.props.distances && this.props.distances.length > 0
          ? getSortedSignalDetections(
              needsReviewSds,
              this.props.selectedSortType,
              this.props.distances
            )
          : needsReviewSds;

      if (sortedNeedsReviewSds.length > 0) {
        // Select first in the list
        [nextSdForReview] = sortedNeedsReviewSds;
        this.props.setDisplayedSignalDetection(nextSdForReview);
        this.setState({ selectedSdIds: [nextSdForReview.id] });
      }
    }
  };

  /**
   * Update state with list of selected signal detection ids
   *
   * @param sdIds list of Signal Detections ids
   */
  private readonly setSelectedSdIds = (sdIds: string[]): void => {
    this.setState({ selectedSdIds: sdIds });
  };

  /**
   * Handles key presses on az slow
   *
   * @param e keyboard event
   */
  private readonly onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.code === 'KeyN' && (e.metaKey || e.ctrlKey)) {
      if (this.getReviewableSds().length > 0) {
        this.nextFk();
      }
    }
  };

  /**
   * Clear selected UnassociatedFks
   */
  private readonly clearSelectedUnassociatedFks = (): void => {
    const selectedAndUnassociatedSdIds = this.state.selectedSdIds.filter(
      sdId => !this.props.associatedSignalDetections.find(assocSd => assocSd.id === sdId)
    );

    // Set selected SD ids then set FK SD id list
    this.setState(
      prevState => ({
        selectedSdIds: prevState.selectedSdIds.filter(sdId =>
          this.props.associatedSignalDetections.find(assocSd => assocSd.id === sdId)
        )
      }),
      () => {
        const filteredSds = this.props.unassociatedSignalDetections.filter(
          sd => !selectedAndUnassociatedSdIds.find(unSdId => unSdId === sd.id)
        );
        this.props.setSdIdsToShowFk(filteredSds.map(sd => sd.id));
      }
    );
  };

  /**
   * Shows the fk thumbnail menu.
   */
  private readonly showFkThumbnailMenu = (event: React.MouseEvent) => {
    const selectedAndUnassociatedSdIds = this.props.unassociatedSignalDetections.filter(
      sd => !this.props.associatedSignalDetections.find(assocSd => assocSd.id === sd.id)
    );

    this.fkThumbnailsContextMenuCb(event, {
      action: this.clearSelectedUnassociatedFks,
      fksCanBeCleared: selectedAndUnassociatedSdIds.length > 0
    });
  };

  /**
   * Start a drag on mouse down on the divider
   */
  private readonly onThumbnailDividerDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    let prevPosition = e.clientX;
    let currentPos = e.clientX;
    let diff = 0;
    const maxWidthPct = 0.8;
    const maxWidthPx = this.azimuthSlownessContainer.clientWidth * maxWidthPct;

    const onMouseMove = (e2: MouseEvent) => {
      currentPos = e2.clientX;
      diff = currentPos - prevPosition;
      prevPosition = currentPos;
      const widthPx = Number(this.fkThumbnailsContainer.clientWidth) + Number(diff);
      if (widthPx < maxWidthPx) {
        this.props.setFkThumbnailColumnSizePx(widthPx);
      }
    };

    const onMouseUp = () => {
      document.body.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('mouseup', onMouseUp);
    };

    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp);
  };

  /**
   * Handles new FK Request when frequency and/or window params change
   */
  private readonly onNewFkParams = (
    fkParams: FkTypes.FkParams,
    fkConfiguration: FkTypes.FkDialogConfiguration
  ): void => {
    this.props.computeFkAndUpdateState(fkParams, fkConfiguration);
  };

  /**
   * Calculates the index of the spectrum to display
   *
   * @param time the time in epoch seconds
   * @returns a index
   */
  private readonly calculateMovieIndex = (time: number): number => {
    const { featureMeasurements } = SignalDetectionTypes.Util.getCurrentHypothesis(
      this.props.displayedSignalDetection.signalDetectionHypotheses
    );
    let startTime = 0;
    const azimuthTimeFm = findAzimuthFeatureMeasurement(featureMeasurements);
    if (azimuthTimeFm?.analysisWaveform?.waveform?.id?.startTime) {
      startTime = azimuthTimeFm.analysisWaveform.waveform.id.startTime;
    }
    const fkParams = getFkParams(this.props.selectedFk);
    if (!fkParams) {
      return 0;
    }
    return Math.round(Math.max((time - startTime) / fkParams.windowParams.stepSize, 0));
  };

  /**
   * Updates the state of the current movie index
   *
   * @param time start time in seconds of the fk movie
   */
  private readonly updateCurrentMovieTimeIndex = (time: number): void => {
    this.setState({ currentMovieSpectrumIndex: this.calculateMovieIndex(time) });
  };

  /**
   * Gets the list of fks that need review and are associated to the currently open event
   */
  private readonly getReviewableSds = () =>
    fksNeedReview(this.props.associatedSignalDetections, this.props.fkChannelSegments);
}
