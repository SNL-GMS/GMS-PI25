/* eslint-disable react/destructuring-assignment */
import { NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type {
  ColorTypes,
  ConfigurationTypes,
  EventTypes,
  SignalDetectionTypes,
  StationTypes
} from '@gms/common-model';
import { FkTypes } from '@gms/common-model';
import { DeprecatedToolbar, DeprecatedToolbarTypes } from '@gms/ui-core-components';
import type { EventStatus, UIChannelSegmentRecord } from '@gms/ui-state';
import type { Point } from '@gms/ui-util';
import isEqual from 'lodash/isEqual';
import React from 'react';

import { convertLegacyFkConfiguration, getFkParams } from '~analyst-ui/common/utils/fk-utils';

import { FkRendering } from '../fk-rendering/fk-rendering';
import { FilterType, FkThumbnailSize } from '../fk-thumbnail-list/fk-thumbnails-controls';
import { FkPlots } from './fk-plots';
import { FkProperties } from './fk-properties';

const ADDITIONAL_MARGINS_FOR_TOOLBAR_PX = 0;

// Width of fk properties, used to calculate size allocation for fk rendering
const MAX_WIDTH_OF_FK_PROPERTIES_PX = 493;

// Height of fk plots, used to calculate size allocation for fk rendering
const MAX_HEIGHT_OF_FK_PLOTS_PX = 424;

// Minimum height and width of fk rendering
const MIN_FK_LENGTH_PX = 265;
// Maximum height and width of fk rendering
const MAX_FK_LENGTH_PX = 500;
/**
 * Azimuth Slowness Redux Props
 */
export interface FkDisplayProps {
  defaultStations: StationTypes.Station[];
  eventsInTimeRange: EventTypes.Event[];
  eventStatuses: Record<string, EventStatus>;
  currentOpenEvent: EventTypes.Event;
  signalDetectionsByStation: SignalDetectionTypes.SignalDetection[];
  channelSegments: UIChannelSegmentRecord;
  signalDetection: SignalDetectionTypes.SignalDetection;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  widthPx: number;
  heightPx: number;
  multipleSelected: boolean;
  numberOfOutstandingComputeFkMutations: number;
  fkUnit: FkTypes.FkUnits;
  fkFrequencyThumbnails: FkTypes.FkFrequencyThumbnail[];
  currentMovieSpectrumIndex: number;
  selectedFk: FkTypes.FkPowerSpectra;
  uiTheme: ConfigurationTypes.UITheme;
  openIntervalName: string;
  colorMap: ColorTypes.ColorMapName;
  onNewFkParams(fkParams: FkTypes.FkParams, fkConfiguration: FkTypes.FkDialogConfiguration): void;
  updateCurrentMovieTimeIndex(time: number): void;
  setFkUnitForSdId(fkId: string, fkUnit: FkTypes.FkUnits);
}

/**
 * Azimuth Slowness State
 */
export interface FkDisplayState {
  fkThumbnailSizePx: FkThumbnailSize;
  filterType: FilterType;
  analystSelectedPoint: Point;
  fkParams: FkTypes.FkParams;
  fkConfiguration: FkTypes.FkDialogConfiguration;
}

/**
 * Azimuth Slowness primary component
 * Displays the FK plot and details of selected fk
 */
export class FkDisplay extends React.Component<FkDisplayProps, FkDisplayState> {
  /** The precision of displayed lead/lag pair */
  private readonly digitPrecision: number = 1;

  /** FK plots container reference */
  private fkPlotsContainerRef: HTMLElement | null;

  // Reference so we can calculate width
  public constructor(props: FkDisplayProps) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      fkThumbnailSizePx: FkThumbnailSize.MEDIUM,
      // eslint-disable-next-line react/no-unused-state
      filterType: FilterType.firstP,
      analystSelectedPoint: undefined,
      // TODO: update to remove concept of legacy configuration once we have the established data model
      fkConfiguration: convertLegacyFkConfiguration(
        props.selectedFk ? props.selectedFk.configuration : FkTypes.Util.defaultFkConfiguration,
        this.getSelectedStation(),
        this.props.selectedFk
      ),
      fkParams: props.selectedFk ? getFkParams(props.selectedFk) : FkTypes.Util.getDefaultFkParams()
    };
  }

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * React component lifecycle
   */
  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    const { signalDetection, multipleSelected } = this.props;
    if (this.props.multipleSelected || !signalDetection || !this.props.selectedFk) {
      let message = 'No Signal Detection selected';
      if (multipleSelected) {
        message = 'Multiple FKs Selected';
      } else if (!this.props.selectedFk) {
        message = 'No FK data for selected SD';
      }
      const icon = multipleSelected ? IconNames.MULTI_SELECT : IconNames.HEAT_GRID;
      return <NonIdealState icon={icon} title={message} />;
    }

    const selectedSd = signalDetection;
    const customLL = this.isCustomLeadLength(
      this.state.fkParams.windowParams.leadSeconds,
      this.state.fkParams.windowParams.lengthSeconds
    );
    const toolbarItems: DeprecatedToolbarTypes.ToolbarItem[] = [];
    const fkWindow: DeprecatedToolbarTypes.LabelValueItem = {
      type: DeprecatedToolbarTypes.ToolbarItemType.LabelValue,
      rank: 1,
      tooltip: 'FK Window Parameters',
      label: 'FK Window',
      value: ''
    };
    toolbarItems.push(fkWindow);
    const computeButton: DeprecatedToolbarTypes.ButtonItem = {
      rank: 2,
      label: 'Compute',
      tooltip: 'Compute FK using parameters',
      type: DeprecatedToolbarTypes.ToolbarItemType.Button,
      onClick: this.computeFk,
      disabled: this.fkParameterChanges(),
      widthPx: 70
    };
    toolbarItems.push(computeButton);
    const presetWindowDropdown: DeprecatedToolbarTypes.DropdownItem = {
      type: DeprecatedToolbarTypes.ToolbarItemType.Dropdown,
      rank: 3,
      tooltip: 'Choose a preset FK Window',
      label: 'FK Window',
      widthPx: 140,
      dropdownOptions: customLL ? FkTypes.LeadLagPairsAndCustom : FkTypes.LeadLagPairs,
      value: customLL
        ? FkTypes.LeadLagPairsAndCustom.CUSTOM
        : this.getLeadLengthPairByValue(
            this.state.fkParams.windowParams.leadSeconds,
            this.state.fkParams.windowParams.lengthSeconds
          ).leadLagPairs,
      onChange: value => {
        this.onNewLeadLagPreset(value);
      }
    };
    toolbarItems.push(presetWindowDropdown);
    const leadInput: DeprecatedToolbarTypes.NumericInputItem = {
      type: DeprecatedToolbarTypes.ToolbarItemType.NumericInput,
      rank: 4,
      tooltip: 'Sets new lead for FK Window',
      label: 'Lead (s): ',
      value: parseFloat(this.state.fkParams.windowParams.leadSeconds.toFixed(this.digitPrecision)),
      step: 0.5,
      minMax: {
        // do not allow the lead time to be before signal detection arrival time
        min: 0,
        max: 600
      },
      onChange: value => {
        this.onLeadTimeChanged(value);
      }
    };
    toolbarItems.push(leadInput);

    const durationInput: DeprecatedToolbarTypes.NumericInputItem = {
      type: DeprecatedToolbarTypes.ToolbarItemType.NumericInput,
      rank: 5,
      tooltip: 'Sets new duration for FK Window',
      label: 'Duration (s): ',
      value: parseFloat(
        this.state.fkParams.windowParams.lengthSeconds.toFixed(this.digitPrecision)
      ),
      step: 0.5,
      minMax: {
        min: this.state.fkParams.windowParams.leadSeconds,
        // TODO: Get SD Arrival time and calculate the lead position in time; then determine the max duration
        max: 9999
      },
      // requireEnterForOnChange: true,
      onChange: value => {
        this.onLengthChanged(value);
      }
    };
    toolbarItems.push(durationInput);
    const stepInput: DeprecatedToolbarTypes.NumericInputItem = {
      type: DeprecatedToolbarTypes.ToolbarItemType.NumericInput,
      rank: 6,
      tooltip: 'Sets new step size for continuous FK',
      label: 'Step Size (s): ',
      value: parseFloat(this.state.fkParams.windowParams.stepSize.toFixed(this.digitPrecision)),
      step: 0.5,
      minMax: {
        min: 0.1,
        // TODO: Get SD Arrival time and calculate the lead position in time; then determine the max duration
        max: 1000
      },
      // requireEnterForOnChange: true,
      onChange: value => {
        this.onStepSizeChanged(value);
      }
    };
    toolbarItems.push(stepInput);

    const toolbarLeftItems: DeprecatedToolbarTypes.ToolbarItem[] = [];
    const fkLoadingSpinner: DeprecatedToolbarTypes.LoadingSpinnerItem = {
      tooltip: 'Number of compute of fk calls sent out that have not returned',
      label: 'pending fk request(s)',
      type: DeprecatedToolbarTypes.ToolbarItemType.LoadingSpinner,
      rank: 1,
      itemsToLoad: this.props.numberOfOutstandingComputeFkMutations,
      hideTheWordLoading: true,
      widthPx: 30
    };
    toolbarLeftItems.push(fkLoadingSpinner);
    const fkRenderingLengthPx = this.getFkRenderingLengthPx();
    return (
      <div className="azimuth-slowness-data-display">
        <div className="azimuth-slowness-data-display__wrapper">
          <div className="fk-image-and-details-container">
            <FkRendering
              signalDetectionFeaturePredictions={this.props.signalDetectionFeaturePredictions}
              updateCurrentFk={this.updateCurrentFk}
              fkUnitDisplayed={this.props.fkUnit}
              renderingHeightPx={fkRenderingLengthPx}
              renderingWidthPx={fkRenderingLengthPx}
              currentMovieSpectrumIndex={this.props.currentMovieSpectrumIndex}
              selectedFk={this.props.selectedFk}
              analystSelectedPoint={this.state.analystSelectedPoint}
              colorMap={this.props.colorMap}
            />
            <FkProperties
              defaultStations={this.props.defaultStations}
              signalDetection={signalDetection}
              signalDetectionFeaturePredictions={this.props.signalDetectionFeaturePredictions}
              analystCurrentFk={this.state.analystSelectedPoint}
              userInputFkFrequency={this.state.fkParams.frequencyPair}
              windowParams={this.state.fkParams.windowParams}
              updateFrequencyPair={this.updateFrequencyPair}
              fkUnitDisplayed={this.props.fkUnit}
              fkFrequencyThumbnails={this.props.fkFrequencyThumbnails}
              onFkConfigurationChange={this.onFkConfigurationChange}
              currentMovieSpectrumIndex={this.props.currentMovieSpectrumIndex}
              selectedFk={this.props.selectedFk}
              fkConfiguration={this.state.fkConfiguration}
              presets={{
                window: Object.values(FkTypes.LeadLagPairs) as string[]
              }}
            />
          </div>
        </div>
        <div className="fk-plots__toolbar">
          <DeprecatedToolbar
            toolbarWidthPx={
              this.fkPlotsContainerRef
                ? this.fkPlotsContainerRef.clientWidth - ADDITIONAL_MARGINS_FOR_TOOLBAR_PX
                : ADDITIONAL_MARGINS_FOR_TOOLBAR_PX
            }
            itemsRight={toolbarItems}
            itemsLeft={toolbarLeftItems}
          />
        </div>
        {!signalDetection ? (
          <div />
        ) : (
          <div
            ref={ref => {
              this.fkPlotsContainerRef = ref;
            }}
          >
            <FkPlots
              eventsInTimeRange={this.props.eventsInTimeRange}
              eventStatuses={this.props.eventStatuses}
              currentOpenEvent={this.props.currentOpenEvent}
              uiTheme={this.props.uiTheme}
              openIntervalName={this.props.openIntervalName}
              signalDetection={selectedSd}
              signalDetectionsByStation={this.props.signalDetectionsByStation}
              channelSegments={this.props.channelSegments}
              signalDetectionFeaturePredictions={this.props.signalDetectionFeaturePredictions}
              selectedFk={this.props.selectedFk}
              windowParams={this.state.fkParams.windowParams}
              setWindowParams={this.setWindowParams}
              updateCurrentMovieTimeIndex={this.props.updateCurrentMovieTimeIndex}
              currentMovieSpectrumIndex={this.props.currentMovieSpectrumIndex}
            />
          </div>
        )}
      </div>
    );
  }

  public componentDidUpdate(prevProps: FkDisplayProps): void {
    if (!this.props.signalDetection) {
      return;
    }
    // If the selected SD changed then set the configuration and fkParams
    // also the reset the analyst selected point
    if (
      this.props.signalDetection &&
      this.props.signalDetection.id !== prevProps.signalDetection?.id
    ) {
      if (this.props.selectedFk) {
        const currentFkParams = getFkParams(this.props.selectedFk);
        const { configuration } = this.props.selectedFk;
        this.setState({
          fkConfiguration: convertLegacyFkConfiguration(
            configuration,
            this.getSelectedStation(),
            this.props.selectedFk
          ),
          fkParams: currentFkParams,
          analystSelectedPoint: undefined
        });
      }
    }
  }

  private getSelectedStation() {
    return this.props.defaultStations.find(
      station => station.name === this.props.signalDetection?.station?.name
    );
  }

  /**
   * Update the current fk point
   *
   * @param point The X,Y location to draw the black fk dot
   */
  private readonly updateCurrentFk = (point: Point) => {
    this.setState({
      analystSelectedPoint: point
    });
  };

  private readonly fkParameterChanges = (): boolean => {
    if (!this.props.selectedFk) {
      return true;
    }
    return (
      isEqual(getFkParams(this.props.selectedFk), this.state.fkParams) &&
      isEqual(this.props.selectedFk.configuration, this.state.fkConfiguration)
    );
  };

  /**
   * Updates the FkParams frequency band
   *
   * @param newFrequency
   */
  private readonly updateFrequencyPair = (newFrequency: FkTypes.FrequencyBand) => {
    this.setState(prevState => ({
      fkParams: {
        ...prevState.fkParams,
        frequencyPair: newFrequency
      }
    }));
  };

  /**
   * Updates the FkParams window params
   *
   * @param newFrequency
   */
  private readonly setWindowParams = (windowParams: FkTypes.WindowParameters) => {
    this.setState(prevState => ({
      fkParams: {
        ...prevState.fkParams,
        windowParams
      }
    }));
  };

  /**
   * Call to compute Fk with new FK params and FK configuration
   */
  private readonly computeFk = () => {
    this.props.onNewFkParams(this.state.fkParams, this.state.fkConfiguration);
  };

  /**
   * Handles change on Lead time control
   *
   * @param newLeadSeconds New time for the Lead in the plots
   */
  private readonly onLeadTimeChanged = (newLeadSeconds: number) => {
    this.setState(prevState => ({
      fkParams: {
        ...prevState.fkParams,
        windowParams: {
          ...prevState.fkParams.windowParams,
          leadSeconds: newLeadSeconds
        }
      }
    }));
  };

  /**
   * Handles change on lag time control
   *
   * @param newLagTime New time for the Lag in the plots
   */
  private readonly onLengthChanged = (length: number) => {
    this.setState(prevState => ({
      fkParams: {
        ...prevState.fkParams,
        windowParams: {
          ...prevState.fkParams.windowParams,
          lengthSeconds: length
        }
      }
    }));
  };

  /**
   * Handles change on step size control
   *
   * @param stepSize seconds between Spectrums calculated
   */
  private readonly onStepSizeChanged = (stepSize: number) => {
    this.setState(prevState => ({
      fkParams: {
        ...prevState.fkParams,
        windowParams: {
          ...prevState.fkParams.windowParams,
          stepSize
        }
      }
    }));
  };

  /**
   * Calculates the dimensions of the fk rendering
   *
   * @returns Length of side of fk rendering
   */
  private readonly getFkRenderingLengthPx = (): number => {
    // If the rendering has extra horizontal and vertical room, allocate it space!
    const extraWidthPx =
      this.props.widthPx -
      MIN_FK_LENGTH_PX -
      MAX_WIDTH_OF_FK_PROPERTIES_PX -
      FkTypes.Util.SIZE_OF_FK_RENDERING_AXIS_PX;
    const extraHeightPx =
      this.props.heightPx -
      MIN_FK_LENGTH_PX -
      MAX_HEIGHT_OF_FK_PLOTS_PX -
      FkTypes.Util.SIZE_OF_FK_RENDERING_AXIS_PX;
    if (extraWidthPx > 0 && extraHeightPx > 0) {
      // Because the FK rendering is a square, we can't make it longer than it is tall (or vice versa)
      const min = Math.min(extraWidthPx, extraHeightPx);
      if (min > 0) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        const potentialLength = min + MIN_FK_LENGTH_PX;
        if (potentialLength > MAX_FK_LENGTH_PX) {
          return MAX_FK_LENGTH_PX;
        }
        return potentialLength;
      }
    }
    return MIN_FK_LENGTH_PX;
  };

  /**
   * Gets an object containing the enum value for the lead/length pair
   *
   * @param lead Lead for the fk
   * @param length Length for the fk
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly getLeadLengthPairByValue = (
    lead: number,
    length: number
  ): FkTypes.LeadLagPairAndString =>
    FkTypes.Util.LeadLagValuesAndDisplayString.find(
      llpv => llpv.windowParams.leadSeconds === lead && llpv.windowParams.lengthSeconds === length
    );

  /**
   * Gets a lead/length pair by the enum
   *
   * @param enumVal Name of the preset pair
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly getLeadLengthPairByName = (enumVal: any): FkTypes.LeadLagPairAndString =>
    FkTypes.Util.LeadLagValuesAndDisplayString.find(llpv => llpv.leadLagPairs === enumVal);

  /**
   * Determines if the selected Lead Length is one of the presets
   *
   * @param lead Lead for the fk
   * @param length Length for the fk
   */
  private readonly isCustomLeadLength = (lead: number, length: number): boolean => {
    const maybeValues = this.getLeadLengthPairByValue(lead, length);
    return maybeValues === undefined;
  };

  /**
   * Handles the change in the drop down menu
   *
   * @param value new leadLag from drop down
   */
  private readonly onNewLeadLagPreset = (value: any): void => {
    const newPair = this.getLeadLengthPairByName(value);
    if (newPair) {
      this.setState(prevState => ({
        fkParams: {
          ...prevState.fkParams,
          windowParams: {
            ...prevState.fkParams.windowParams,
            lengthSeconds: newPair.windowParams.lengthSeconds,
            leadSeconds: newPair.windowParams.leadSeconds
          }
        }
      }));
    }
  };

  /**
   * Reconfigures display and/or calls gateway when new fk configuration is entered
   *
   * @param fkConfigurationWithUnits as FkConfigurationWithUnits
   */
  private readonly onFkConfigurationChange = (
    newFkConfiguration: FkTypes.FkDialogConfiguration
  ) => {
    this.setState({
      fkConfiguration: newFkConfiguration
    });
  };
}
