/* eslint-disable react/destructuring-assignment */
import { PopoverInteractionKind, Position } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import type { ColorTypes, EventTypes } from '@gms/common-model';
import { FkTypes } from '@gms/common-model';
import type { Point } from '@gms/ui-util';
import isEqual from 'lodash/isEqual';
import React from 'react';

import * as fkUtil from '../fk-util';
import { FkColorScale } from './fk-color-scale';
import { FkLegend } from './fk-legend';
/**
 * FkRendering Props
 */
export interface FkRenderingProps {
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  analystSelectedPoint: Point; // Scaled selected point
  fkUnitDisplayed: FkTypes.FkUnits;
  renderingHeightPx: number;
  renderingWidthPx: number;
  currentMovieSpectrumIndex: number;
  selectedFk: FkTypes.FkPowerSpectra;
  colorMap: ColorTypes.ColorMapName;
  updateCurrentFk(point: Point): void;
}

/**
 * FkRendering State
 */
export interface FkRenderingState {
  // the min/max value in the fk data
  minFkValue: number;
  maxFkValue: number;
  currentFkDisplayData: number[][];
  selectedPoint: Point; // actual (not scaled x,y position)
}

// The height of the rendering needs to be 8 pixels smaller than the width
export const FK_RENDERING_HEIGHT_OFFSET = 8;

/**
 * FkRendering Component
 */
export class FkRendering extends React.Component<FkRenderingProps, FkRenderingState> {
  /** Reference to the canvas to draw the fk. */
  private canvasRef: HTMLCanvasElement | undefined;

  /** The current fk represented as an ImageBitmap. */
  private currentImage: ImageBitmap | undefined;

  /** The y-axis div container. */
  private yAxisContainerRef: HTMLDivElement | undefined;

  /** The x-axis div container. */
  private xAxisContainerRef: HTMLDivElement | undefined;

  public constructor(props: FkRenderingProps) {
    super(props);
    this.state = {
      minFkValue: 0,
      maxFkValue: 1,
      currentFkDisplayData: [], // Init empty (double array)
      selectedPoint: undefined
    };
  }

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    return (
      <div
        className="fk"
        style={{
          height: `${this.props.renderingHeightPx + FkTypes.Util.SIZE_OF_FK_RENDERING_AXIS_PX}px`,
          width: `${this.props.renderingWidthPx + FkTypes.Util.SIZE_OF_FK_RENDERING_AXIS_PX}px`
        }}
      >
        <div className="fk-rendering">
          <div
            ref={ref => {
              this.yAxisContainerRef = ref;
            }}
            className="fk-rendering__y-axis"
          />
          <div
            ref={ref => {
              this.xAxisContainerRef = ref;
            }}
            className="fk-rendering__x-axis"
          />
          <div className="fk-rendering__slowness">
            <Popover2
              interactionKind={PopoverInteractionKind.CLICK}
              position={Position.BOTTOM}
              content={
                <div className="fk-rendering__slowness-label">
                  <FkLegend />
                  <FkColorScale
                    minSlow={this.state.minFkValue}
                    maxSlow={this.state.maxFkValue}
                    fkUnits={this.props.fkUnitDisplayed}
                  />
                </div>
              }
            >
              <div className="fk-color-scale__button">slowness (s/°)</div>
            </Popover2>
          </div>
          <canvas
            className="fk-rendering__canvas"
            data-cy="primary-fk-rendering"
            width={this.props.renderingWidthPx}
            height={this.props.renderingHeightPx - FK_RENDERING_HEIGHT_OFFSET}
            ref={ref => {
              this.canvasRef = ref;
            }}
            onClick={this.onPrimaryFkClick}
          />
        </div>
      </div>
    );
  }

  /**
   * React component lifecycle
   */
  public async componentDidMount(): Promise<void> {
    const predictedPoint = fkUtil.getPredictedPoint(this.props.signalDetectionFeaturePredictions);
    const fkDisplaySpectrum = this.props.selectedFk?.values[this.props.currentMovieSpectrumIndex];
    const fkDisplayData = fkUtil.getFkHeatmapArrayFromFkSpectra(
      fkDisplaySpectrum,
      this.props.fkUnitDisplayed
    );
    const [min, max] = fkUtil.computeMinMaxFkValues(fkDisplayData);
    this.currentImage = await fkUtil.createFkImageBitmap(
      fkDisplayData,
      min,
      max,
      this.props.colorMap
    );
    // Guard against canvas ref is not yet set (happens in render)
    if (this.canvasRef && this.props.selectedFk) {
      this.drawAllComponents(predictedPoint);
      this.setState({
        maxFkValue: max,
        minFkValue: min,
        currentFkDisplayData: fkDisplayData
      });
    }
  }

  /**
   * React component lifecycle
   */
  public async componentDidUpdate(prevProps: FkRenderingProps): Promise<void> {
    if (this.state.selectedPoint && !this.props.analystSelectedPoint) {
      this.setState({
        selectedPoint: undefined
      });
    }
    if (!this.props.selectedFk) {
      return;
    }
    const predictedPoint = fkUtil.getPredictedPoint(this.props.signalDetectionFeaturePredictions);
    const newFkDisplayData = fkUtil.getFkHeatmapArrayFromFkSpectra(
      this.props.selectedFk.values[this.props.currentMovieSpectrumIndex],
      this.props.fkUnitDisplayed
    );

    if (!isEqual(this.state.currentFkDisplayData, newFkDisplayData)) {
      const [min, max] = fkUtil.computeMinMaxFkValues(newFkDisplayData);
      this.currentImage = await fkUtil.createFkImageBitmap(
        newFkDisplayData,
        min,
        max,
        this.props.colorMap
      );
      this.drawAllComponents(predictedPoint);
      this.setState({
        maxFkValue: max,
        minFkValue: min,
        currentFkDisplayData: newFkDisplayData
      });
    } else if (
      this.props.renderingHeightPx !== prevProps.renderingHeightPx ||
      this.props.renderingWidthPx !== prevProps.renderingWidthPx
    ) {
      this.drawAllComponents(predictedPoint);
    }
  }

  /**
   *
   * @param predictedPoint
   */
  private readonly drawAllComponents = (predictedPoint: FkTypes.AzimuthSlowness) => {
    fkUtil.drawImage(this.canvasRef, this.currentImage);
    fkUtil.draw(
      this.canvasRef,
      this.props.selectedFk,
      predictedPoint,
      this.props.currentMovieSpectrumIndex,
      false,
      false,
      this.state.selectedPoint
    );
    // Draw the x and y axis
    fkUtil.createXAxis(this.props.selectedFk, this.xAxisContainerRef);
    fkUtil.createYAxis(this.props.selectedFk, this.yAxisContainerRef);
  };

  /**
   * When primary fk is clicked, will draw black circle
   */
  private readonly onPrimaryFkClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!this.props.selectedFk) {
      return;
    }
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const selectedPoint = { x, y };
    const predictedPoint = fkUtil.getPredictedPoint(this.props.signalDetectionFeaturePredictions);

    const { currentFkDisplayData } = this.state;
    const [min, max] = fkUtil.computeMinMaxFkValues(currentFkDisplayData);
    this.currentImage = await fkUtil.createFkImageBitmap(
      currentFkDisplayData,
      min,
      max,
      this.props.colorMap
    );

    if (this.props.updateCurrentFk) {
      // Converting x y point from graphics space to coordinate space
      const scaledXY = fkUtil.convertGraphicsXYtoCoordinate(
        x,
        y,
        this.props.selectedFk,
        this.canvasRef.width,
        this.canvasRef.height
      );
      this.props.updateCurrentFk({ x: scaledXY.x, y: scaledXY.y });
    }
    this.setState(
      {
        selectedPoint
      },
      () => this.drawAllComponents(predictedPoint)
    );
  };
}
