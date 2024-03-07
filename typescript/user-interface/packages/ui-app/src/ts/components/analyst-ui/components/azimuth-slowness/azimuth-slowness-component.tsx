/* eslint-disable react/destructuring-assignment */
import { Intent, NonIdealState, Spinner } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { EventTypes, FkTypes, SignalDetectionTypes, WorkflowTypes } from '@gms/common-model';
import { addGlForceUpdateOnResize, addGlForceUpdateOnShow, UILogger } from '@gms/ui-util';
import Immutable from 'immutable';
import isEqual from 'lodash/isEqual';
import React from 'react';

import {
  getAssociatedDetections,
  getDistanceToStationsForPreferredLocationSolutionId,
  getOpenEvent
} from '~analyst-ui/common/utils/event-util';
import {
  computeFk,
  createComputeFkInput,
  getDefaultFkConfigurationForSignalDetection,
  getFkChannelSegment,
  getFkData,
  getFkUnitForSdId
} from '~analyst-ui/common/utils/fk-utils';

import { AzimuthSlownessPanel } from './azimuth-slowness-panel';
import { FilterType, FkThumbnailSize } from './components/fk-thumbnail-list/fk-thumbnails-controls';
import * as fkUtil from './components/fk-util';
import type { AzimuthSlownessProps, AzimuthSlownessState } from './types';

const logger = UILogger.create('GMS_LOG_AZIMUTH_SLOWNESS', process.env.GMS_LOG_AZIMUTH_SLOWNESS);

/**
 * Default width for the fk thumbnail list
 * Was previously in css, but moved here to enable persistent resizing
 */
const DEFAULT_FK_THUMBNAIL_LIST_SIZE_PX = 255;

/**
 * Azimuth Slowness primary component
 */
export class AzimuthSlowness extends React.Component<AzimuthSlownessProps, AzimuthSlownessState> {
  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: AzimuthSlownessProps) {
    super(props);
    this.state = {
      fkThumbnailSizePx: FkThumbnailSize.MEDIUM,
      filterType: FilterType.all,
      fkThumbnailColumnSizePx: DEFAULT_FK_THUMBNAIL_LIST_SIZE_PX,
      fkInnerContainerWidthPx: 0,
      numberOfOutstandingComputeFkMutations: 0,
      fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>(),
      displayedSignalDetectionId: undefined
    };
  }

  /**
   * Invoked when the component mounted.
   */
  public componentDidMount(): void {
    addGlForceUpdateOnShow(this.props.glContainer, this);
    addGlForceUpdateOnResize(this.props.glContainer, this);
  }

  /**
   * Invoked when the component mounted.
   *
   * @param prevProps The previous props
   * @param prevState The previous state
   */
  public componentDidUpdate(prevProps: AzimuthSlownessProps): void {
    const associatedSds = this.getAssociatedDetections();
    const unassociatedSds = this.getUnassociatedDetections(associatedSds);
    const allSignalDetections = [...unassociatedSds, ...associatedSds];

    // Confirm the display SD is in the unassociated/associated list
    if (this.state.displayedSignalDetectionId) {
      const resultsSd = allSignalDetections.find(
        sd => sd.id === this.state.displayedSignalDetectionId
      );

      if (!resultsSd) {
        this.setDisplayedSignalDetection(undefined);
      }
    }

    // If the event id changed changed or the unassociated list changed
    if (
      !isEqual(this.props.sdIdsToShowFk, prevProps.sdIdsToShowFk) ||
      (this.props.openEventId && this.props.openEventId !== prevProps.openEventId)
    ) {
      if (allSignalDetections.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.showOrGenerateSignalDetectionFk(allSignalDetections).catch(error =>
          logger.error(`Failed to show or generate Signal Detection DK: ${error}`)
        );
      }
    }

    // Set filter based on Analysis Mode
    const { analysisMode } = this.props;
    const prevPropsAnalysisMode = prevProps.analysisMode;
    if (analysisMode && analysisMode !== prevPropsAnalysisMode) {
      if (analysisMode === WorkflowTypes.AnalysisMode.EVENT_REVIEW) {
        this.setState({
          filterType: FilterType.firstP
        });
      } else if (analysisMode === WorkflowTypes.AnalysisMode.SCAN) {
        this.setState({
          filterType: FilterType.all
        });
      }
    }
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************
  /**
   * Returns an immutable map of signal detection ids to an array of feature predictions.
   *
   * @param signalDetections the signal detections
   * @returns an immutable map of signal detections ids to feature predictions
   */
  private readonly getSignalDetectionsWithFeaturePredictions = (
    signalDetections: SignalDetectionTypes.SignalDetection[]
  ): Immutable.Map<string, EventTypes.FeaturePrediction[]> => {
    const signalDetectionsIdToFeaturePredictions: Map<
      string,
      EventTypes.FeaturePrediction[]
    > = new Map<string, EventTypes.FeaturePrediction[]>();

    const openEvent = getOpenEvent(
      this.props.openEventId,
      this.props.eventResults.data ? this.props.eventResults.data : undefined
    );

    const preferredHypothesis = EventTypes.findPreferredEventHypothesisByStage(
      openEvent,
      this.props.openIntervalName
    );

    const locationSolution = preferredHypothesis
      ? EventTypes.findPreferredLocationSolution(
          preferredHypothesis.id.hypothesisId,
          openEvent.eventHypotheses
        )
      : undefined;
    const featurePredictions: EventTypes.FeaturePrediction[] = locationSolution
      ? locationSolution.featurePredictions.featurePredictions
      : [];

    signalDetections.forEach(sd => {
      const signalDetectionFeaturePredictions = featurePredictions.filter(featurePrediction => {
        const signalDetectionPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
            .featureMeasurements
        ).value;
        // TODO need a reverse lookup for derived channel to station
        return (
          featurePrediction.channel.name.includes(sd.station.name) &&
          featurePrediction.phase === signalDetectionPhase
        );
      });
      signalDetectionsIdToFeaturePredictions.set(sd.id, signalDetectionFeaturePredictions);
    });
    return Immutable.Map(signalDetectionsIdToFeaturePredictions);
  };

  /**
   * Update the FK thumbnail pixel size.
   *
   * @param size The pixel width of the fk thumbnails
   */
  private readonly updateFkThumbnailSize = (size: FkThumbnailSize) => {
    this.setState({
      fkThumbnailSizePx: size
    });
  };

  /**
   * Update the filter
   *
   * @param filterType Filter to apply to fk display
   */
  private readonly updateFkFilter = (filterType: FilterType) => {
    this.setState({
      filterType
    });
  };

  /**
   * Adjusts the inner container width of the FK thumbnails to ensure that it
   * is always centered properly.
   */
  private readonly adjustFkInnerContainerWidth = (
    fkThumbnailsContainer: HTMLDivElement,
    fkThumbnailsInnerContainer: HTMLDivElement
  ) => {
    const scrollbarWidth = 15;
    if (fkThumbnailsContainer && fkThumbnailsInnerContainer) {
      // calculate the inner container to allow the container to be centered
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const outerContainerWidth: number = fkThumbnailsContainer.clientWidth + 2;
      const thumbnailSize: number = this.state.fkThumbnailSizePx;
      const innerContainerWidth: number =
        outerContainerWidth - (outerContainerWidth % (thumbnailSize + scrollbarWidth));
      // eslint-disable-next-line no-param-reassign
      fkThumbnailsInnerContainer.style.width = `${innerContainerWidth}px`;
      this.setState({ fkInnerContainerWidthPx: innerContainerWidth });
    }
  };

  private readonly setFkThumbnailColumnSizePx = (newSizePx: number) =>
    this.setState({ fkThumbnailColumnSizePx: newSizePx });

  /**
   * Calls computeFk, adds a loading indicator, and handles the return
   *
   * @params fkInput Input to the computeFk resolver
   */
  private readonly computeFkAndUpdateState = async (
    fkParams: FkTypes.FkParams,
    fkConfiguration: FkTypes.FkDialogConfiguration
  ): Promise<void> => {
    if (!fkParams || !fkParams.windowParams || !fkConfiguration) {
      return;
    }

    this.setState(prevState => ({
      numberOfOutstandingComputeFkMutations: prevState.numberOfOutstandingComputeFkMutations + 1
    }));

    const osdFkInput = createComputeFkInput(
      this.getDisplayedSignalDetection(),
      fkParams,
      fkConfiguration,
      false,
      this.props.fkChannelSegments
    );

    if (!osdFkInput) {
      logger.warn(
        `Failed to create Fk Request for Signal Detection ${this.state.displayedSignalDetectionId}`
      );
      return;
    }
    computeFk(osdFkInput, this.props.dispatch);
    this.setState(prevState => ({
      numberOfOutstandingComputeFkMutations: prevState.numberOfOutstandingComputeFkMutations - 1
    }));

    // Create thumbnail request
    const thumbnailFkInput = createComputeFkInput(
      this.getDisplayedSignalDetection(),
      fkParams,
      fkConfiguration,
      true,
      this.props.fkChannelSegments
    );

    if (!this.props.fkFrequencyThumbnails[this.state.displayedSignalDetectionId]) {
      await this.queryFkFrequencyThumbnails(thumbnailFkInput);
    }
  };

  /**
   * Call create Fks for the list of unassociated signal detections
   */
  private readonly showOrGenerateSignalDetectionFk = async (
    signalDetections: SignalDetectionTypes.SignalDetection[]
    // eslint-disable-next-line @typescript-eslint/require-await
  ): Promise<void> => {
    // If SD ids or SD query results are empty nothing to do
    if (
      !signalDetections ||
      signalDetections.length === 0 ||
      !this.props.signalDetectionResults.data
    ) {
      return;
    }

    // Build list of signal detections needing FKs
    const signalDetectionsToRequest = signalDetections
      .map(signalDetection => {
        // no need to compute an FK if we already have an fk in SignalDetection
        if (
          !getFkData(
            this.props.signalDetectionResults.data.find(sd => sd.id === signalDetection.id),
            this.props.fkChannelSegments
          )
        ) {
          return signalDetection;
        }
        return undefined;
      })
      .filter(sd => sd !== undefined);

    // Build a list of potential FkInputs to call computeFk on
    const fkInputs: FkTypes.FkInputWithConfiguration[] = signalDetectionsToRequest.map(
      signalDetection => {
        // Find the station for this SD to get get the contributing channels
        const station = this.props.stationsQuery.data.find(
          sta => sta.name === signalDetection.station.name
        );
        const configuration = getDefaultFkConfigurationForSignalDetection(
          signalDetection,
          station,
          this.getSelectedFk()
        );
        return createComputeFkInput(
          signalDetection,
          FkTypes.Util.getDefaultFkParams(),
          configuration,
          false,
          this.props.fkChannelSegments
        );
      }
    );

    if (fkInputs && fkInputs.length > 0) {
      fkInputs.forEach(fkInput => {
        computeFk(fkInput, this.props.dispatch);
      });
    }

    // Build a list of thumbnail FkInputs to call computeFk on
    const thumbnailInputs: FkTypes.FkInputWithConfiguration[] = signalDetectionsToRequest
      .map(signalDetection => {
        // Find the station for this SD to get get the contributing channels
        const station = this.props.stationsQuery.data.find(
          sta => sta.name === signalDetection.station.name
        );
        const configuration = getDefaultFkConfigurationForSignalDetection(
          signalDetection,
          station,
          this.getSelectedFk()
        );

        if (!this.props.fkFrequencyThumbnails[signalDetection.id]) {
          return createComputeFkInput(
            signalDetection,
            FkTypes.Util.getDefaultFkParams(),
            configuration,
            true,
            this.props.fkChannelSegments
          );
        }
        return undefined;
      })
      .filter(input => input !== undefined);
    if (thumbnailInputs && thumbnailInputs.length > 0) {
      thumbnailInputs.forEach(async input => {
        await this.queryFkFrequencyThumbnails(input).catch(err =>
          logger.error(`Failed to compute FK thumbnails: ${err.message}`)
        );
      });
    }
  };

  /**
   * Queries for fk frequency thumbnail list
   *
   * @param fkInput input variables for requesting frequency thumbnails
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private readonly queryFkFrequencyThumbnails = async (
    fkInput: FkTypes.FkInputWithConfiguration
  ): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/require-await
    const promises = FkTypes.Util.FrequencyBands.map(async fb => {
      const input: FkTypes.FkInputWithConfiguration = {
        ...fkInput,
        fkComputeInput: {
          ...fkInput.fkComputeInput,
          lowFrequency: fb.minFrequencyHz,
          highFrequency: fb.maxFrequencyHz
        }
      };
      return computeFk(input, this.props.dispatch);
    });
    await Promise.all(promises);
  };

  /**
   * Set the user-set fk unit for a given fk id
   *
   * @param fkId the id of the fk
   * @param fkUnit the new unit
   */
  private readonly setFkUnitForSdId = (sdId: string, fkUnit: FkTypes.FkUnits) => {
    this.setState(prevState => ({
      fkUnitsForEachSdId: prevState.fkUnitsForEachSdId.set(sdId, fkUnit)
    }));
  };

  /**
   * Generate non-ideal state if glContainer is hidden or various queries have not finished
   *
   * @returns JSK.Element if non ideal state exists or undefine
   */
  private readonly getNonIdealState = (): JSX.Element => {
    // if the golden-layout container is not visible, do not attempt to render
    // the component, this is to prevent JS errors that may occur when trying to
    // render the component while the golden-layout container is hidden
    if (this.props.glContainer && this.props.glContainer.isHidden) {
      return <NonIdealState />;
    }

    // If Events, SignalDetections or Stations have not
    // loaded then return Loading state
    if (
      this.props.eventResults?.isLoading ||
      this.props.signalDetectionResults?.isLoading ||
      this.props.stationsQuery?.isLoading
    ) {
      let type = 'Unknown';
      if (this.props.stationsQuery?.isLoading) {
        type = 'Station';
      } else if (this.props.signalDetectionResults?.isLoading) {
        type = 'Signal Detection';
      } else if (this.props.eventResults?.isLoading) {
        type = 'Event';
      }
      return (
        <NonIdealState
          action={<Spinner intent={Intent.PRIMARY} />}
          icon={IconNames.HEAT_GRID}
          title="Loading:"
          description={`${type} data for current event`}
        />
      );
    }
    return undefined;
  };

  /**
   * Set selected SD in state from which to select Fk to display
   *
   * @param sd SignalDetection
   */
  private readonly setDisplayedSignalDetection = (sd: SignalDetectionTypes.SignalDetection) => {
    if (!sd) {
      this.setState({ displayedSignalDetectionId: undefined });
      return;
    }
    this.setState({ displayedSignalDetectionId: sd.id });
    // mark as reviewed if Fk is needs review and is associated to open event
    const associatedSignalDetections = this.getAssociatedDetections();
    if (
      associatedSignalDetections.find(aSd => aSd.id === sd.id) &&
      fkUtil.fkNeedsReview(sd, getFkData(sd, this.props.fkChannelSegments))
    ) {
      const fkChannelSegment = getFkChannelSegment(sd, this.props.fkChannelSegments);
      this.props.markFkReviewed(fkChannelSegment.id);
    }
  };

  /**
   * Set selected SD in state from which to select Fk to display
   *
   * @param sd SignalDetection
   */
  private readonly getDisplayedSignalDetection = (): SignalDetectionTypes.SignalDetection => {
    if (!this.state.displayedSignalDetectionId) {
      return undefined;
    }
    const signalDetectionsByStation = this.props.signalDetectionResults.data ?? [];
    return signalDetectionsByStation.find(sd => sd.id === this.state.displayedSignalDetectionId);
  };

  /**
   * List of associated Signal Detections to Open Event
   *
   * @returns Signal Detections
   */
  private readonly getAssociatedDetections = (): SignalDetectionTypes.SignalDetection[] => {
    const events = this.props.eventResults.data ? this.props.eventResults.data : [];
    const openEvent = getOpenEvent(this.props.openEventId, events);
    if (!openEvent) {
      return [];
    }
    const signalDetectionsByStation = this.props.signalDetectionResults.data ?? [];
    // All associated SDs
    return getAssociatedDetections(
      openEvent,
      signalDetectionsByStation,
      this.props.openIntervalName
    );
  };

  /**
   * List of unassociated Signal Detections to Open Event
   *
   * @param associated Signal Detections for Open Event
   * @returns Signal Detections
   */
  private readonly getUnassociatedDetections = (
    associatedSignalDetections: SignalDetectionTypes.SignalDetection[]
  ): SignalDetectionTypes.SignalDetection[] => {
    // All unassociated SDs (if in associated SDs then exclude)
    const signalDetectionsByStation = this.props.signalDetectionResults.data ?? [];
    return this.props.sdIdsToShowFk
      .map(sdId => {
        const unassociatedSD = signalDetectionsByStation.find(sd => sd.id === sdId);
        if (
          !associatedSignalDetections.find(associatedSD => associatedSD.id === unassociatedSD.id)
        ) {
          return unassociatedSD;
        }
        return undefined;
      })
      .filter(s => s !== undefined);
  };

  /**
   * Finds Fk from selected Fk from displayed SD and fk channel records
   *
   * @returns Fk or undefined
   */
  private readonly getSelectedFk = (): FkTypes.FkPowerSpectra => {
    return getFkData(this.getDisplayedSignalDetection(), this.props.fkChannelSegments);
  };

  /**
   * Renders the component.
   */
  public render(): JSX.Element {
    const nonIdealState = this.getNonIdealState();
    if (nonIdealState) {
      return nonIdealState;
    }

    // Filter down to signal detection associations with valid FK data
    const events = this.props.eventResults.data ? this.props.eventResults.data : [];
    const openEvent = getOpenEvent(this.props.openEventId, events);
    const signalDetectionsByStation = this.props.signalDetectionResults.data ?? [];
    // All associated SDs
    const associatedSignalDetections = this.getAssociatedDetections();

    // All unassociated SDs (if in associated SDs then exclude)
    const unassociatedSignalDetections = this.getUnassociatedDetections(associatedSignalDetections);

    if (unassociatedSignalDetections.length === 0 && associatedSignalDetections.length === 0) {
      return <NonIdealState icon={IconNames.HEAT_GRID} title="No Signal Detections Selected" />;
    }

    // Filter signal detections based on filter type
    const filteredSds = fkUtil.filterSignalDetections(
      associatedSignalDetections,
      unassociatedSignalDetections,
      this.state.filterType,
      this.props.fkChannelSegments
    );

    const signalDetectionsIdToFeaturePredictions: Immutable.Map<
      string,
      EventTypes.FeaturePrediction[]
    > = this.getSignalDetectionsWithFeaturePredictions(filteredSds);

    const featurePredictionsForSignalDetection = signalDetectionsIdToFeaturePredictions.has(
      this.state.displayedSignalDetectionId
    )
      ? signalDetectionsIdToFeaturePredictions.get(this.state.displayedSignalDetectionId)
      : [];

    const distances = getDistanceToStationsForPreferredLocationSolutionId(
      openEvent,
      this.props.stationsQuery.data,
      this.props.openIntervalName,
      undefined
    );

    const sortedSignalDetections =
      distances && distances.length > 0
        ? fkUtil.getSortedSignalDetections(filteredSds, this.props.selectedSortType, distances)
        : filteredSds;

    let fkDisplayWidthPx = 0;
    let fkDisplayHeightPx = 0;
    if (this.props.glContainer) {
      fkDisplayWidthPx = this.props.glContainer.width - this.state.fkThumbnailColumnSizePx;
      fkDisplayHeightPx = this.props.glContainer.height;
    }
    const fkUnitForDisplayedSignalDetection = getFkUnitForSdId(
      this.state.displayedSignalDetectionId,
      this.state.fkUnitsForEachSdId
    );

    return (
      <AzimuthSlownessPanel
        colorMap={this.props.colorMap}
        defaultStations={this.props.stationsQuery.data ? this.props.stationsQuery.data : []}
        eventsInTimeRange={events}
        eventStatuses={this.props.eventStatusQuery.data ? this.props.eventStatusQuery.data : {}}
        openEvent={openEvent}
        featurePredictionsForDisplayedSignalDetection={featurePredictionsForSignalDetection}
        distances={distances}
        location={this.props.location}
        displayedSignalDetection={this.getDisplayedSignalDetection()}
        associatedSignalDetections={associatedSignalDetections}
        unassociatedSignalDetections={unassociatedSignalDetections}
        signalDetectionsToDraw={sortedSignalDetections}
        signalDetectionsByStation={signalDetectionsByStation}
        signalDetectionsIdToFeaturePredictions={signalDetectionsIdToFeaturePredictions}
        channelSegments={this.props.channelSegmentResults.data ?? {}}
        selectedFk={this.getSelectedFk()}
        fkChannelSegments={this.props.fkChannelSegments}
        fkFrequencyThumbnails={
          this.state.displayedSignalDetectionId &&
          this.props.fkFrequencyThumbnails[this.state.displayedSignalDetectionId]
            ? this.props.fkFrequencyThumbnails[this.state.displayedSignalDetectionId]
            : []
        }
        fkThumbnailColumnSizePx={this.state.fkThumbnailColumnSizePx}
        fkDisplayWidthPx={fkDisplayWidthPx - this.state.fkThumbnailColumnSizePx}
        fkDisplayHeightPx={fkDisplayHeightPx}
        selectedSortType={this.props.selectedSortType}
        filterType={this.state.filterType}
        fkThumbnailSizePx={this.state.fkThumbnailSizePx}
        fkUnitsForEachSdId={this.state.fkUnitsForEachSdId}
        numberOfOutstandingComputeFkMutations={this.state.numberOfOutstandingComputeFkMutations}
        fkUnitForDisplayedSignalDetection={fkUnitForDisplayedSignalDetection}
        fkInnerContainerWidthPx={this.state.fkInnerContainerWidthPx}
        uiTheme={this.props.uiTheme}
        openIntervalName={this.props.openIntervalName}
        adjustFkInnerContainerWidth={this.adjustFkInnerContainerWidth}
        updateFkThumbnailSize={this.updateFkThumbnailSize}
        updateFkFilter={this.updateFkFilter}
        setFkThumbnailColumnSizePx={this.setFkThumbnailColumnSizePx}
        computeFkAndUpdateState={this.computeFkAndUpdateState}
        setFkUnitForSdId={this.setFkUnitForSdId}
        setSdIdsToShowFk={this.props.setSdIdsToShowFk}
        setDisplayedSignalDetection={this.setDisplayedSignalDetection}
        setMeasurementModeEntries={this.props.setMeasurementModeEntries}
      />
    );
  }
}
