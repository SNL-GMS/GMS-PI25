import { Button, Classes, NumericInput, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { ChannelTypes, EventTypes, StationTypes } from '@gms/common-model';
import { FkTypes, SignalDetectionTypes } from '@gms/common-model';
import { UNFILTERED_FILTER } from '@gms/common-model/lib/filter';
import type { Row } from '@gms/ui-core-components';
import { DropDown, PopoverButton, Table, Tooltip2Wrapper } from '@gms/ui-core-components';
import type { Point } from '@gms/ui-util';
import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import React from 'react';

import { frequencyBandToString, getFkParams } from '~analyst-ui/common/utils/fk-utils';

import {
  getAnalystSelectedPoint,
  getFkHeatmapArrayFromFkSpectra,
  getPeakValueFromAzSlow,
  getPredictedPoint
} from '../fk-util';
import type { PropertiesRow } from './column-defs';
import { columnDefs } from './column-defs';
import { FkConfigurationDialog } from './fk-configuration-popover/fk-configuration-dialog';
import { FkFrequencyThumbnails } from './fk-frequency-thumbnails';

const dropdownWidthPx = 100;

/**
 * FkProperties Props
 */
export interface FkPropertiesProps {
  defaultStations: StationTypes.Station[];
  signalDetection: SignalDetectionTypes.SignalDetection;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  analystCurrentFk: Point;
  userInputFkFrequency: FkTypes.FrequencyBand;
  windowParams: FkTypes.WindowParameters;
  fkUnitDisplayed: FkTypes.FkUnits;
  fkFrequencyThumbnails: FkTypes.FkFrequencyThumbnail[];
  currentMovieSpectrumIndex: number;
  selectedFk: FkTypes.FkPowerSpectra;
  fkConfiguration: FkTypes.FkDialogConfiguration;
  presets: Partial<Record<keyof FkTypes.FkDialogConfiguration, string[]>>;
  updateFrequencyPair(fkParams: FkTypes.FrequencyBand): void;
  onFkConfigurationChange(fkConfigurationWithUnits: FkTypes.FkDialogConfiguration);
}

/**
 * FkProperties State
 */
export interface FkPropertiesState {
  presetFrequency: boolean;
  configurationOpen: boolean;
}

/**
 * Creates a table of FK properties
 */
export class FkProperties extends React.Component<FkPropertiesProps, FkPropertiesState> {
  private lowFreqControl: NumericInput;

  private highFreqControl: NumericInput;

  /** Memoization function that uses cached results if params haven't changed */
  private readonly memoizedGetFkPropertiesRowData: (
    selectedFk: FkTypes.FkPowerSpectra,
    analystSelectedPoint: Point,
    fkUnitDisplayed: FkTypes.FkUnits,
    currentMovieIndex: number
  ) => Row[];

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: FkPropertiesProps) {
    super(props);
    const { selectedFk } = props;
    this.memoizedGetFkPropertiesRowData = memoizeOne(this.getFkPropertiesRowData, isEqual);
    this.state = {
      configurationOpen: false,
      presetFrequency: FkProperties.isPresetFrequency([
        selectedFk?.lowFrequency,
        selectedFk?.highFrequency
      ])
    };
  }

  /**
   * Updates the derived state from the next props.
   *
   * @param nextProps The next (new) props
   * @param prevState The previous state
   */
  public static getDerivedStateFromProps(
    nextProps: FkPropertiesProps
  ): {
    presetFrequency: boolean;
  } {
    return {
      presetFrequency: FkProperties.isPresetFrequency([
        nextProps.selectedFk?.lowFrequency,
        nextProps.selectedFk?.highFrequency
      ])
    };
  }

  /**
   * Renders the component.
   */
  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    const {
      analystCurrentFk,
      currentMovieSpectrumIndex,
      defaultStations,
      fkConfiguration,
      fkFrequencyThumbnails,
      fkUnitDisplayed,
      onFkConfigurationChange,
      presets,
      selectedFk,
      signalDetection,
      userInputFkFrequency
    } = this.props;

    const { configurationOpen, presetFrequency } = this.state;
    const stationName = signalDetection.station.name;
    // Find the station to get channels for the total trackers
    const station = defaultStations.find(sta => sta.name === signalDetection.station.name);
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(signalDetection.signalDetectionHypotheses)
        .featureMeasurements
    );
    const totalAvailableChannels = station ? station.allRawChannels : [];
    const trackers = this.getChannelConfigTrackers(
      selectedFk?.configuration,
      totalAvailableChannels
    );
    const defaultStepSize = 0.1;
    const minorStepSize = 0.01;
    const frequencyThumbnails = (
      <FkFrequencyThumbnails
        fkFrequencySpectra={fkFrequencyThumbnails || []}
        fkUnit={fkUnitDisplayed}
        onThumbnailClick={this.onThumbnailClick}
        arrivalTimeMovieSpectrumIndex={0}
      />
    );
    const tableData = this.memoizedGetFkPropertiesRowData(
      selectedFk,
      analystCurrentFk,
      fkUnitDisplayed,
      currentMovieSpectrumIndex
    );
    const frequencyBand: FkTypes.FrequencyBand = {
      minFrequencyHz: selectedFk?.lowFrequency,
      maxFrequencyHz: selectedFk?.highFrequency
    };

    return (
      <div className="ag-theme-dark fk-properties">
        <div className="fk-properties__column">
          <div className="fk-properties-label-row">
            <div className="fk-properties-label-row__left">
              <div>
                Station:
                <span className="fk-properties__label">{stationName}</span>
              </div>
              <div>
                Phase:
                <span className="fk-properties__label">{fmPhase.value.toString()}</span>
              </div>
            </div>
            <div className="fk-properties-label-row__right">
              <Tooltip2Wrapper content="Opens FK configuration options">
                <Button
                  icon={IconNames.COG}
                  onClick={() => {
                    this.setState({ configurationOpen: true });
                  }}
                />
              </Tooltip2Wrapper>
              <FkConfigurationDialog
                isOpen={configurationOpen}
                setIsOpen={val => this.setState({ configurationOpen: val })}
                station={station}
                fkConfiguration={{
                  frequencyBand,
                  maximumSlowness: selectedFk?.configuration.maximumSlowness,
                  leadFkSpectrumSeconds: selectedFk?.configuration.leadFkSpectrumSeconds,
                  mediumVelocity: selectedFk?.configuration.mediumVelocity,
                  normalizeWaveforms: selectedFk?.configuration.normalizeWaveforms,
                  numberOfPoints: selectedFk?.configuration.numberOfPoints,
                  prefilter: UNFILTERED_FILTER, // TODO: get this from actual config
                  selectedChannels: station.allRawChannels.filter(
                    channel => trackers.find(ch => ch.name === channel.name).enabled
                  ),
                  useChannelVerticalOffset: selectedFk?.configuration.useChannelVerticalOffset,
                  window: {
                    durationSecs: getFkParams(selectedFk).windowParams.lengthSeconds,
                    leadSecs: getFkParams(selectedFk).windowParams.leadSeconds
                  },
                  fkSpectrumDurationSeconds: fkConfiguration.fkSpectrumDurationSeconds,
                  stepSizeSeconds: selectedFk?.stepSize
                }}
                presets={{
                  ...presets,
                  frequencyBand: this.generateFrequencyBandOptions()
                }}
                onSubmit={newConfig => onFkConfigurationChange(newConfig)}
              />
            </div>
          </div>
          <div className="fk-properties__table">
            <div className="max">
              <Table
                columnDefs={columnDefs}
                rowData={tableData}
                getRowId={node => node.data.id}
                overlayNoRowsTemplate="No data available"
              />
            </div>
          </div>
          <div className="fk-controls">
            <div>
              <div className="grid-container fk-control__grid">
                <div className="grid-item">Frequency:</div>
                <div
                  className="grid-item"
                  style={{
                    display: 'flex'
                  }}
                >
                  <DropDown
                    dropDownItems={this.generateFrequencyBandOptions()}
                    widthPx={dropdownWidthPx}
                    value={presetFrequency ? frequencyBandToString(frequencyBand) : 'Custom'}
                    onMaybeValue={maybeVal => {
                      this.onClickFrequencyMenu(maybeVal);
                    }}
                  />
                  <div style={{ marginLeft: '4px' }}>
                    <PopoverButton
                      label="FK Frequency Thumbnails"
                      onlyShowIcon
                      popupContent={frequencyThumbnails}
                      onPopoverDismissed={() => {
                        // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
                      }}
                      tooltip="Preview thumbnails of the fk for configured frequency sk"
                      icon={IconNames.GRID_VIEW}
                    />
                  </div>
                </div>
                <div className="grid-item">Low:</div>
                <div
                  className={classNames('fk-properties__frequency-low-high-inputs', 'grid-item')}
                >
                  <NumericInput
                    ref={ref => {
                      this.lowFreqControl = ref;
                    }}
                    className={Classes.FILL}
                    allowNumericCharactersOnly
                    buttonPosition={Position.RIGHT}
                    value={userInputFkFrequency.minFrequencyHz}
                    onValueChange={this.onChangeLowFrequency}
                    selectAllOnFocus
                    stepSize={defaultStepSize}
                    minorStepSize={minorStepSize}
                    majorStepSize={1}
                  />
                </div>
                <div className="grid-item">High:</div>
                <div
                  className={classNames('fk-properties__frequency-low-high-inputs', 'grid-item')}
                >
                  <NumericInput
                    ref={ref => {
                      this.highFreqControl = ref;
                    }}
                    className={Classes.FILL}
                    allowNumericCharactersOnly
                    buttonPosition={Position.RIGHT}
                    value={userInputFkFrequency.maxFrequencyHz}
                    onValueChange={this.onChangeHighFrequency}
                    selectAllOnFocus
                    stepSize={defaultStepSize}
                    minorStepSize={minorStepSize}
                    majorStepSize={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Checks if the passed in frequency is in the list of preset filters
   *
   * @param freq frequency to check if it is in the preset list
   */
  // eslint-disable-next-line react/sort-comp
  private static isPresetFrequency(freq: number[]) {
    return (
      FkTypes.Util.FrequencyBands.filter(
        freqs => freqs.minFrequencyHz === freq[0] && freqs.maxFrequencyHz === freq[1]
      ).length > 0
    );
  }

  /**
   * Creates menu options for frequency bands
   */
  private generateFrequencyBandOptions(): string[] {
    const items: string[] = [];
    FkTypes.Util.FrequencyBands.forEach(frequency => {
      items.push(this.frequencyBandToString([frequency.minFrequencyHz, frequency.maxFrequencyHz]));
    });
    return items;
  }

  /**
   * Validates numeric entries in the numeric control
   */
  // eslint-disable-next-line react/sort-comp, class-methods-use-this
  private readonly validNumericEntry = (
    value: string,
    prevValue: number,
    controlReference: NumericInput
  ) => {
    let valueAsString = value;
    if (valueAsString === '') {
      valueAsString = String(prevValue);
    }
    controlReference.setState(() => ({
      value: valueAsString
    }));

    const newValue = Number.isNaN(parseFloat(valueAsString))
      ? prevValue
      : parseFloat(valueAsString);
    return {
      valid:
        !valueAsString.endsWith('.') &&
        !Number.isNaN(parseFloat(valueAsString)) &&
        newValue !== prevValue,
      value: newValue
    };
  };

  /**
   * Changes the high end of the frequency when the input changes
   */
  private readonly onChangeHighFrequency = (highFreq: number, numberAsString: string) => {
    const { selectedFk, updateFrequencyPair } = this.props;
    if (!selectedFk) {
      return;
    }

    const currentHigh = selectedFk.highFrequency;
    const result = this.validNumericEntry(numberAsString, currentHigh, this.highFreqControl);

    if (result.valid) {
      const currentParams = getFkParams(selectedFk);
      const frequencyPair: FkTypes.FrequencyBand = {
        maxFrequencyHz: result.value,
        minFrequencyHz: currentParams.frequencyPair.minFrequencyHz
      };
      updateFrequencyPair(frequencyPair);
    }
  };

  /**
   * Changes the low end of the frequency when the input changes
   */
  private readonly onChangeLowFrequency = (lowFreq: number, numberAsString: string) => {
    const { selectedFk, updateFrequencyPair } = this.props;
    if (!selectedFk) {
      return;
    }

    const currentLow = selectedFk.lowFrequency;
    const result = this.validNumericEntry(numberAsString, currentLow, this.lowFreqControl);
    if (result.valid) {
      const currentParams = getFkParams(selectedFk);
      const frequencyPair: FkTypes.FrequencyBand = {
        maxFrequencyHz: currentParams.frequencyPair.maxFrequencyHz,
        minFrequencyHz: result.value
      };
      updateFrequencyPair(frequencyPair);
    }
  };

  /**
   * Updates frequency bands from their menu
   */
  private readonly onClickFrequencyMenu = (value: any) => {
    const { selectedFk, updateFrequencyPair } = this.props;
    if (!selectedFk) {
      return;
    }
    const newFreq = FkTypes.Util.FrequencyBands.filter(
      pair => this.frequencyBandToString([pair.minFrequencyHz, pair.maxFrequencyHz]) === value
    )[0];
    if (newFreq) {
      const frequencyPair: FkTypes.FrequencyBand = {
        maxFrequencyHz: newFreq.maxFrequencyHz,
        minFrequencyHz: newFreq.minFrequencyHz
      };
      updateFrequencyPair(frequencyPair);
    }
  };

  /**
   * Create Fstat/Power properties row
   *
   * @param fkUnitDisplayed
   * @param peakFkValue
   * @param predictedFkValue
   * @param selectedFkValue
   * @returns PropertiesRow
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly addFstatPowerRow = (
    fkUnitDisplayed: FkTypes.FkUnits,
    peakFkValue: number,
    predictedFkValue: number,
    selectedFkValue: number
  ) => {
    // Fstat or Power Row
    return {
      id: fkUnitDisplayed === FkTypes.FkUnits.FSTAT ? 'Fstat' : 'Power',
      description: fkUnitDisplayed === FkTypes.FkUnits.FSTAT ? 'Fstat' : 'Power (dB)',
      peak: peakFkValue ? { value: peakFkValue, uncertainty: undefined } : undefined,
      predicted: predictedFkValue ? { value: predictedFkValue, uncertainty: undefined } : undefined,
      selected: selectedFkValue ? { value: selectedFkValue, uncertainty: undefined } : undefined,
      residual: { value: undefined, uncertainty: undefined }
    };
  };

  /**
   * Gets the row data for the tables from the props
   */
  private readonly getFkPropertiesRowData = (
    selectedFk: FkTypes.FkPowerSpectra,
    analystCurrentFk: Point,
    fkUnitDisplayed: FkTypes.FkUnits,
    currentMovieIndex: number
  ): Row[] => {
    const { signalDetectionFeaturePredictions } = this.props;
    if (!selectedFk) {
      return [];
    }

    const currentMovieFk = selectedFk.values[currentMovieIndex];
    const heatMap = getFkHeatmapArrayFromFkSpectra(
      selectedFk.values[currentMovieIndex],
      fkUnitDisplayed
    );

    let analystSelectedPoint: { azimuth: number; slowness: number };
    let selectedFkValue;
    // CONVERTS XY TO POLAR - doesn't seem quite right
    const x = analystCurrentFk?.x;
    const y = analystCurrentFk?.y;
    if (x && y) {
      analystSelectedPoint = getAnalystSelectedPoint(x as number, y);
      selectedFkValue = getPeakValueFromAzSlow(
        selectedFk,
        heatMap,
        analystSelectedPoint.azimuth,
        analystSelectedPoint.slowness
      );
    }
    const predictedPoint = getPredictedPoint(signalDetectionFeaturePredictions);
    const dataRows: PropertiesRow[] = [];

    // Azimuth Row
    const predictedAzimuth = predictedPoint?.azimuth;
    const predictedAzimuthUncertainty = predictedPoint?.azimuthUncertainty;

    dataRows.push({
      id: 'Azimuth',
      description: 'Azimuth (°)',
      peak: {
        value: currentMovieFk.attributes[0].azimuth,
        uncertainty: currentMovieFk.attributes[0].azimuthUncertainty
      },
      predicted: predictedPoint
        ? { value: predictedAzimuth, uncertainty: predictedAzimuthUncertainty }
        : undefined,
      selected: analystSelectedPoint
        ? { value: analystSelectedPoint.azimuth, uncertainty: undefined }
        : undefined,
      residual: analystSelectedPoint
        ? { value: analystSelectedPoint.azimuth - predictedAzimuth, uncertainty: undefined }
        : undefined
    });

    // Slowness Row
    const predictedSlowness = predictedPoint?.slowness;
    const predictedSlownessUncertainty = predictedPoint?.slownessUncertainty;

    dataRows.push({
      id: 'Slowness',
      description: 'Slowness (s/°)',
      peak: {
        value: currentMovieFk.attributes[0].slowness,
        uncertainty: currentMovieFk.attributes[0].slownessUncertainty
      },
      predicted: predictedPoint
        ? { value: predictedSlowness, uncertainty: predictedSlownessUncertainty }
        : undefined,
      selected: analystSelectedPoint
        ? { value: analystSelectedPoint.slowness, uncertainty: undefined }
        : undefined,
      residual: analystSelectedPoint
        ? { value: analystSelectedPoint.slowness - predictedSlowness, uncertainty: undefined }
        : undefined
    });

    // Fstat or Power Row
    const peakFkValue = getPeakValueFromAzSlow(
      selectedFk,
      heatMap,
      currentMovieFk.attributes[0].azimuth,
      currentMovieFk.attributes[0].slowness
    );
    let predictedFkValue;
    if (predictedPoint) {
      predictedFkValue = getPeakValueFromAzSlow(
        selectedFk,
        heatMap,
        predictedPoint.azimuth,
        predictedPoint.slowness
      );
    }
    dataRows.push(
      this.addFstatPowerRow(fkUnitDisplayed, peakFkValue, predictedFkValue, selectedFkValue)
    );
    return dataRows;
  };

  /**
   * Formats a frequency band into a string for the drop down
   *
   * @param band Frequency band to format
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly frequencyBandToString = (band: number[]): string => `${band[0]} - ${band[1]} Hz`;

  /**
   * Merges the enabled channel trackers returned by the gateway with the full list of channels
   * From the station's channels in the SD
   *
   * @param fkConfiguration the fk configuration from the gateway
   * @param allAvailableChannels the channels for the SD's station
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly getChannelConfigTrackers = (
    fkConfiguration: FkTypes.FkConfiguration,
    allAvailableChannels: ChannelTypes.Channel[]
  ) => {
    const allChannelsAsTrackers: FkTypes.ContributingChannelsConfiguration[] = allAvailableChannels.map(
      channel => ({
        id: channel.name,
        name: channel.name,
        enabled: false
      })
    );
    return allChannelsAsTrackers.map(channelTracker => {
      const maybeMatchedChannelFromConfig = fkConfiguration.contributingChannelsConfiguration.find(
        ccc => ccc.id === channelTracker.id
      );
      if (maybeMatchedChannelFromConfig) {
        return maybeMatchedChannelFromConfig;
      }
      return channelTracker;
    });
  };

  private readonly onThumbnailClick = (minFrequency: number, maxFrequency: number) => {
    const { updateFrequencyPair } = this.props;
    const frequencyPair: FkTypes.FrequencyBand = {
      maxFrequencyHz: maxFrequency,
      minFrequencyHz: minFrequency
    };
    updateFrequencyPair(frequencyPair);
  };
}
