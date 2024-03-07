import { Colors } from '@blueprintjs/core';
import type { ColorTypes, EventTypes } from '@gms/common-model';
import { FkTypes, SignalDetectionTypes } from '@gms/common-model';
import { DEFAULT_COLOR_MAP } from '@gms/common-model/lib/color/types';
import { isNumericMeasurementValue } from '@gms/common-model/lib/signal-detection/util';
import type { FkChannelSegmentRecord } from '@gms/ui-state';
import { AnalystWorkspaceTypes, getBoundaries } from '@gms/ui-state';
import type { Point } from '@gms/ui-util';
import { interpolateJet, UILogger } from '@gms/ui-util';
import type { WeavessTypes } from '@gms/weavess-core';
import * as d3 from 'd3';
import {
  interpolateCividis,
  interpolateCool,
  interpolateCubehelixDefault,
  interpolateInferno,
  interpolateMagma,
  interpolatePlasma,
  interpolateTurbo,
  interpolateViridis,
  interpolateWarm
} from 'd3-scale-chromatic';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';

import { getFkData } from '~analyst-ui/common/utils/fk-utils';
import { gmsColors } from '~scss-config/color-preferences';

import { FilterType } from './fk-thumbnail-list/fk-thumbnails-controls';

const logger = UILogger.create('GMS_LOG_FK', process.env.GMS_LOG_FK);

export const markerRadiusSize = 5;
export const digitPrecision = 1;
const CONSTANT_360 = 360;
const CONSTANT_180 = CONSTANT_360 / 2;
const CONSTANT_90 = CONSTANT_180 / 2;

/**
 * Values and labels for FK Velocity Rings
 * The smaller value is a Pn to P transition at 180 degrees, the
 * large is a Pn to Pg transition at 2degrees
 * reverting back to previous values
 * Use 6, 8, 10 km/s for the slowness rings.
 * Show the labels on the plot as km/s, but plot the circles based on the slowness values.
 * Use the following slowness values: 18.5 s/deg, 13.875 s/deg, and 11.1 s/deg.
 */
const RING1 = 18.5;
const RING2 = 13.875;
const RING3 = 11.1;
const FK_VELOCITY_RADII = [RING1, RING2, RING3];
const FK_VELOCITY_RADII_LABELS = ['6 km/s', '8 km/s', '10 km/s'];

/**
 * Miscellaneous functions for rendering and processing fk data
 */

/**
 * Gets the predicted point values from the incoming signal detection
 *
 * @param sd to get point from
 */
export const getPredictedPoint = (
  featurePredictions: EventTypes.FeaturePrediction[]
): FkTypes.AzimuthSlowness => {
  const predictedAzimuth = featurePredictions.find(
    fp =>
      fp.predictionType ===
        SignalDetectionTypes.FeatureMeasurementType.RECEIVER_TO_SOURCE_AZIMUTH ||
      fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.SOURCE_TO_RECEIVER_AZIMUTH
  );
  const azValue =
    predictedAzimuth && isNumericMeasurementValue(predictedAzimuth.predictionValue?.predictedValue)
      ? predictedAzimuth.predictionValue.predictedValue
      : undefined;

  const predictedSlowness = featurePredictions.find(
    fp => fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.SLOWNESS
  );

  const slowValue =
    predictedSlowness &&
    isNumericMeasurementValue(predictedSlowness.predictionValue?.predictedValue)
      ? predictedSlowness.predictionValue.predictedValue
      : undefined;

  if (azValue && slowValue) {
    return {
      slowness: slowValue.measuredValue.value,
      slownessUncertainty: slowValue.measuredValue.standardDeviation,
      azimuth: azValue.measuredValue.value,
      azimuthUncertainty: azValue.measuredValue.standardDeviation
    };
  }
  return undefined;
};

/**
 * Returns an array of [min, max] values for the y axis of a spectra
 *
 * @param fkPowerSpectra the spectra to get scales from
 */
export const getYAxisForFkSpectra = (fkPowerSpectra: FkTypes.FkPowerSpectra): number[] => [
  fkPowerSpectra.metadata.slowStartY,
  -fkPowerSpectra.metadata.slowStartY
];

/**
 * Returns an array of [min, max] values for the x axis of a spectra
 *
 * @param fkPowerSpectra the spectra to get scales from
 */
export const getXAxisForFkSpectra = (fkPowerSpectra: FkTypes.FkPowerSpectra): number[] => [
  fkPowerSpectra.metadata.slowStartX,
  -fkPowerSpectra.metadata.slowStartX
];

export const getChannelSegmentBoundaries = async (
  channelName: string,
  channelSegment: WeavessTypes.ChannelSegment,
  timeRange?: WeavessTypes.TimeRange
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
  return getBoundaries(channelSegment, timeRange?.startTimeSecs, timeRange?.endTimeSecs);
};

/**
 * Draws a circle
 *
 * @param ctx The canvas context to draw in
 * @param x The x coordinate to start drawing
 * @param y The y coordinate to start drawing at
 * @param strokeColor The circle's color, defaults to RED
 * @param isFilled If true, fills the circle
 */
export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radii: number[],
  strokeColor: string = gmsColors.gmsStrongWarning,
  isFilled = false
): void => {
  ctx.strokeStyle = strokeColor;
  radii.forEach(radius => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (isFilled) {
      ctx.fillStyle = strokeColor;
      ctx.fill();
    } else {
      ctx.stroke();
    }
  });
};

/**
 * Draw the crosshairs.
 *
 * @param canvasRef the canvas to draw on
 * @param ctx the canvas' drawing context
 */
export function drawFkCrossHairs(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): void {
  ctx.strokeStyle = gmsColors.gmsMain;
  ctx.beginPath();

  ctx.moveTo(canvasRef.width / 2, 0);
  ctx.lineTo(canvasRef.width / 2, canvasRef.height);
  ctx.stroke();

  ctx.moveTo(0, canvasRef.height / 2);
  ctx.lineTo(canvasRef.width, canvasRef.height / 2);
  ctx.stroke();
}

/**
 * Draw velocity radius indicators
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 * @param hideRingLabels if true, hides the ring's labels
 */
export function drawVelocityRings(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  hideRingLabels = false
): void {
  const scale = d3
    .scaleLinear()
    .domain([0, -fkData.metadata.slowStartY])
    .range([0, canvasRef.height / 2]);
  FK_VELOCITY_RADII.sort((a, b) => b - a);
  const radii = FK_VELOCITY_RADII;
  const scaledRadii: number[] = radii.map(scale);

  const center: any = {
    x: canvasRef.width / 2,
    y: canvasRef.height / 2
  };

  // add labels for each ring
  if (!hideRingLabels) {
    scaledRadii.forEach((value: number, index) => {
      ctx.fillStyle = gmsColors.gmsMain;
      const label = `${FK_VELOCITY_RADII_LABELS[index]}`;
      ctx.fillText(label, Number(center.x) + 3, Number(center.y) - (value + 3));
    });
  }
  drawCircle(ctx, center.x, center.y, scaledRadii, gmsColors.gmsMain);
}

/**
 * Create and draw the x-axis.
 *
 * @param fkData Fk data to create axis
 * @param xAxisContainer HTML element
 */
export function createXAxis(fkData: FkTypes.FkPowerSpectra, xAxisContainer: HTMLDivElement): void {
  if (!xAxisContainer) return;
  // eslint-disable-next-line no-param-reassign
  xAxisContainer.innerHTML = '';

  const svg = d3
    .select(xAxisContainer)
    .append('svg')
    .attr('width', xAxisContainer.clientWidth)
    .attr('height', xAxisContainer.clientHeight)
    .style('fill', Colors.LIGHT_GRAY5);

  const svgAxis = svg.append('g').attr('class', 'fk-axis');

  const padding = 10;
  const x = d3
    .scaleLinear()
    .domain(getXAxisForFkSpectra(fkData))
    .range([padding, xAxisContainer.clientWidth - padding - 1]);

  const tickSize = 7;
  const xAxis = d3.axisBottom(x).tickSize(tickSize);
  svgAxis.call(xAxis);
}

/**
 * Create and draw the y-axis.
 *
 * @param fkData Fk data to create axis
 * @param yAxisContainer HTML element
 */
export function createYAxis(fkData: FkTypes.FkPowerSpectra, yAxisContainer: HTMLDivElement): void {
  if (!yAxisContainer) return;
  // eslint-disable-next-line no-param-reassign
  yAxisContainer.innerHTML = '';

  const svg = d3
    .select(yAxisContainer)
    .append('svg')
    .attr('width', yAxisContainer.clientWidth)
    .attr('height', yAxisContainer.clientHeight)
    .style('fill', Colors.LIGHT_GRAY5);

  const svgAxis = svg.append('g').attr('class', 'fk-axis').attr('transform', 'translate(34, 0)');

  const padding = 10;
  const y = d3
    .scaleLinear()
    .domain(getYAxisForFkSpectra(fkData))
    .range([yAxisContainer.clientHeight - padding - 1, padding]);

  const tickSize = 7;
  const yAxis = d3.axisLeft(y).tickSize(tickSize);
  svgAxis.call(yAxis);
}

/**
 * Converts polar point to X,Y point
 *
 * @param slowness Radius in polar coordinates
 * @param azimuth Theta in polar coordinates
 */
export const convertPolarToXY = (
  slowness: number,
  azimuth: number
): {
  x: number;
  y: number;
} => {
  // converts polar - adjusted to have 0 degrees be North
  const radians = (azimuth - CONSTANT_90) * (Math.PI / CONSTANT_180);
  const x = slowness * Math.cos(radians);
  const y = slowness * Math.sin(radians);

  return { x, y };
};

/**
 * Converts the incoming X,Y point to polar coordinates represented by
 * Azimuth Degrees and Radial Slowness
 *
 * @param x x coordinate
 * @param y y coordinate
 */
export const convertXYtoPolar = (
  x: number,
  y: number
): {
  azimuthDeg: number;
  radialSlowness: number;
} => {
  if (x && y) {
    // converts xy to theta in degree - adjusted to have 0 degrees be North
    const adjustmentDegrees = 270;
    const theta =
      CONSTANT_360 -
      ((Math.atan2(y, x) * (CONSTANT_180 / Math.PI) + adjustmentDegrees) % CONSTANT_360);

    // Calculate radius from center
    const radius = Math.sqrt(x ** 2 + y ** 2);

    return {
      azimuthDeg: theta,
      radialSlowness: radius
    };
  }
  return {
    azimuthDeg: undefined,
    radialSlowness: undefined
  };
};

/**
 * Takes azimuth slowness polar point and converts to x,y coordinate space
 * It then scales x,y for the canvas size
 *
 * @param fkData
 * @param azimuth
 * @param slowness
 * @param canvasSize
 * @returns Point on the canvas
 */
export function getScaledAzimuthSlownessPoint(
  fkData: FkTypes.FkPowerSpectra,
  slowness: number,
  azimuth: number,
  canvasSize: number
): Point {
  const scale = d3.scaleLinear().domain(getYAxisForFkSpectra(fkData)).range([0, canvasSize]);
  const point = convertPolarToXY(slowness, azimuth);
  return { x: scale(point.x), y: scale(point.y) };
}
/**
 * Draw the Max FK marker.
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 * @param arrivalTime the arrival time
 */
export function drawMaxFk(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  currentMovieSpectrumIndex: number
): void {
  const currentSpectrum = fkData.values[currentMovieSpectrumIndex];
  if (!currentSpectrum) {
    logger.warn(`Undefined spectrum - index set to ${currentMovieSpectrumIndex}`);
  }

  // Get the scaled point
  const scaledPoint = getScaledAzimuthSlownessPoint(
    fkData,
    currentSpectrum.attributes[0].slowness,
    currentSpectrum.attributes[0].azimuth,
    canvasRef.height
  );
  drawCircle(
    ctx,
    scaledPoint.x as number,
    scaledPoint.y,
    [markerRadiusSize - 1],
    gmsColors.gmsMain,
    true
  );
}

/**
 * Draw the predicted FK marker crosshair dot.
 *
 * @param ctx The canvas' context
 * @param x x coordinate
 * @param y y coordinate
 * @param strokeColor the color of the cross hair dot
 * @param size (OPTIONAL) radius size uses class defined radius by default
 */
export function drawCrosshairDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  strokeColor: string,
  size = markerRadiusSize
): void {
  const length = markerRadiusSize - 1;

  ctx.strokeStyle = gmsColors.gmsRecessed;

  ctx.beginPath();
  ctx.moveTo(x - length, y - length);
  ctx.lineTo(x + length, y + length);

  ctx.moveTo(x + length, y - length);
  ctx.lineTo(x - length, y + length);
  ctx.stroke();

  drawCircle(ctx, x, y, [size], strokeColor, false);
}

/**
 * Draw the predicted FK marker.
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 */
export function drawPredictedFk(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  predictedPoint: FkTypes.AzimuthSlowness,
  strokeColor: string = gmsColors.gmsRecessed
): void {
  if (!fkData || !predictedPoint || !canvasRef) {
    return;
  }
  // Get the scaled point
  const scaledPoint = getScaledAzimuthSlownessPoint(
    fkData,
    predictedPoint.slowness,
    predictedPoint.azimuth,
    canvasRef.height
  );
  drawCrosshairDot(ctx, scaledPoint.x as number, scaledPoint.y, strokeColor);
}

/**
 * Draws a single dot on the canvas.
 *
 * @param ctx the 2d rendering context
 * @param coordinates the coordinates
 */
function drawDot(ctx: CanvasRenderingContext2D, coordinates: Point) {
  drawCircle(
    ctx,
    coordinates.x as number,
    coordinates.y,
    [markerRadiusSize - 1],
    gmsColors.gmsRecessed,
    true
  );
}

/**
 * Main draw method for creating fk and dots
 *
 * @param canvasRef The canvas element to draw on
 * @param imageBitmap the bitmap to draw on the canvas
 * @param reduceOpacity optional, if true the drawing is set to 40% opacity
 */
export function drawImage(
  canvasRef: HTMLCanvasElement,
  imageBitmap: ImageBitmap,
  reduceOpacity?: boolean
): void {
  if (!canvasRef) {
    return;
  }
  const ctx = canvasRef.getContext('2d');
  ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  const transparencyPower = 0.4;
  if (reduceOpacity) {
    ctx.globalAlpha = transparencyPower;
  }
  ctx.drawImage(imageBitmap, 0, 0, canvasRef.width, canvasRef.height);
}

/**
 * Main draw method for creating fk and dots
 *
 * @param canvasRef The canvas element to draw on
 * @param fkData the fk data to be rendered
 * @param predictedPoint predictedPoint as AzimuthSlowness
 * @param currentMovieSpectrumIndex FkSpectrum index to draw image from
 * @param hideRingLabels  optional, if true, hides the labels for the rings
 * @param reduceOpacity optional, if true the drawing is set to 40% opacity
 * @param dotLocation optional, where to draw a black dot
 */
export function draw(
  canvasRef: HTMLCanvasElement,
  fkData: FkTypes.FkPowerSpectra,
  predictedPoint: FkTypes.AzimuthSlowness,
  currentMovieSpectrumIndex: number,
  hideRingLabels?: boolean,
  reduceOpacity?: boolean,
  dotLocation?: Point
): void {
  if (!canvasRef) {
    return;
  }
  const ctx = canvasRef.getContext('2d');
  drawFkCrossHairs(canvasRef, ctx);
  drawVelocityRings(canvasRef, ctx, fkData, hideRingLabels);
  drawMaxFk(canvasRef, ctx, fkData, currentMovieSpectrumIndex);
  drawPredictedFk(canvasRef, ctx, fkData, predictedPoint);
  if (dotLocation) {
    drawDot(ctx, dotLocation);
  }
  if (reduceOpacity) {
    ctx.globalAlpha = 1;
  }
}

/**
 * Converts a clicked x y coordinate and converts to coordinate space
 * and scales based on xy axis
 *
 * @param x x value in graphics space
 * @param y y value in graphics space
 * @param fkData used to retrieve the slowness scale
 * @param width of spectra
 * @param height of spectra
 */
export const convertGraphicsXYtoCoordinate = (
  x: number,
  y: number,
  fkData: FkTypes.FkPowerSpectra,
  width: number,
  height: number
): {
  x: number;
  y: number;
} => {
  if (!fkData) {
    return undefined;
  }
  const xscale = d3.scaleLinear().domain([0, width]).range(getXAxisForFkSpectra(fkData));
  const yscale = d3
    .scaleLinear()
    .domain([0, height])
    // Reversing to properly scale from graphics space to xy space
    .range(getYAxisForFkSpectra(fkData).reverse());

  const scaledX = xscale(x);
  const scaledY = yscale(y);

  // eslint-disable-next-line no-restricted-globals
  if (isNaN(scaledX) || isNaN(scaledY)) {
    return undefined;
  }

  return {
    x: scaledX,
    y: scaledY
  };
};

/**
 * Creates the location needed to draw the analyst selected dot
 *
 * @param x x coordinate
 * @param y y coordinate
 * @returns converted XYPolar
 */
export const getAnalystSelectedPoint = (
  x: number,
  y: number
): { azimuth: number; slowness: number } => {
  const polar = convertXYtoPolar(x, y);
  return {
    azimuth: polar.azimuthDeg,
    slowness: polar.radialSlowness
  };
};

function getColorMapInterpolation(colorMap: ColorTypes.ColorMapName) {
  switch (colorMap) {
    case 'turbo':
      return interpolateTurbo;
    case 'viridis':
      return interpolateViridis;
    case 'inferno':
      return interpolateInferno;
    case 'magma':
      return interpolateMagma;
    case 'plasma':
      return interpolatePlasma;
    case 'cividis':
      return interpolateCividis;
    case 'cool':
      return interpolateCool;
    case 'warm':
      return interpolateWarm;
    case 'cubehelixdefault':
      return interpolateCubehelixDefault;
    case 'jet':
      return interpolateJet;
    default:
      return getColorMapInterpolation(DEFAULT_COLOR_MAP);
  }
}

/**
 * Draws the color scale
 *
 * @param min The minimum frequency value
 * @param max THe maximum frequency value
 * @returns D3 object that turns values into colors d3.ScaleSequential<d3.HSLColor>
 */
export const createColorScale: any = (
  min: number,
  max: number,
  colorMap: ColorTypes.ColorMapName
) => d3.scaleSequential(getColorMapInterpolation(colorMap ?? DEFAULT_COLOR_MAP)).domain([min, max]);

/**
 * Convert fk data to an ImageBitmap
 *
 * @param fkData The data to render
 * @param min The minimum frequency value
 * @param max The maximum frequency value
 * @returns JS Promise that resolves to the FK ImageBitmap
 */
export const createFkImageBitmap = async (
  fkGrid: number[][],
  min: number,
  max: number,
  colorMap: ColorTypes.ColorMapName
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<ImageBitmap> => {
  const dim = fkGrid.length;
  const size = dim * dim;
  const buffer = new Uint8ClampedArray(size * 4); // r, g, b, a for each point
  const uInt8Max = 255;

  const colorScale = createColorScale(min, max, colorMap);
  for (let row = 0; row < fkGrid.length; row += 1) {
    for (let col = 0; col < fkGrid[0].length; col += 1) {
      const value = fkGrid[row][col];
      const pos = (row * fkGrid.length + col) * 4;
      const color = d3.rgb(colorScale(value));
      buffer[pos] = color.r;
      buffer[pos + 1] = color.g;
      buffer[pos + 2] = color.b;
      buffer[pos + 3] = uInt8Max;
    }
  }

  const imgData = new ImageData(buffer, fkGrid.length, fkGrid.length);
  return window.createImageBitmap(imgData);
};

/**
 * Create heat map color scale.
 *
 * @param heightPx The height in px of the bitmap
 * @param widthPx The width in px of the bitmap
 * @returns JS Promise that resolves to a ColorScale ImageBitmap
 */
export const createColorScaleImageBitmap = async (
  heightPx: number,
  widthPx: number,
  colorMap: ColorTypes.ColorMapName
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<ImageBitmap> => {
  const size = heightPx * widthPx;
  const buffer = new Uint8ClampedArray(size * 4); // r, g, b, a for each point
  const uInt8Max = 255;

  const colorScale = createColorScale(0, heightPx + 1, colorMap);
  for (let row = 0; row < heightPx; row += 1) {
    for (let col = 0; col < widthPx; col += 1) {
      const pos = (row * heightPx + col) * 4;

      const color = d3.rgb(colorScale(col));
      buffer[pos] = color.r;
      buffer[pos + 1] = color.g;
      buffer[pos + 2] = color.b;
      buffer[pos + 3] = uInt8Max;
    }
  }

  const imgData = new ImageData(buffer, heightPx, widthPx);
  return window.createImageBitmap(imgData);
};

/**
 * Finds the min/max frequency of an FK so the heatmap can be drawn.
 *
 * @param fkData the raw fk data to find a min/max for
 * @returns An array where index 0 is a minimum fk freq and an index 1 is a maximum fk freq
 */
export const computeMinMaxFkValues = (fkData: number[][]): [number, number] => {
  let max = -Infinity;
  let min = Infinity;

  // eslint-disable-next-line no-restricted-syntax
  for (const row of fkData) {
    // eslint-disable-next-line no-restricted-syntax
    for (const val of row) {
      if (val > max) max = val;
      if (val < min) min = val;
    }
  }

  return [min, max];
};

/**
 * Does the fk need review
 *
 * @param sd: the signal detection to check
 * @returns boolean
 */
export const fkNeedsReview = (
  sd: SignalDetectionTypes.SignalDetection,
  fk: FkTypes.FkPowerSpectra
): boolean => {
  if (!fk || !sd) {
    return false;
  }
  if (fk.reviewed) {
    return false;
  }
  const phase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  ).value;
  if (
    FkTypes.Util.fkConfigurationDefaults.fkNeedsReviewRuleSet.phasesNeedingReview.indexOf(phase) >
    -1
  ) {
    return true;
  }
  return false;
};

/**
 * * Filter for Fks that MUST be reviewed
 *
 * @param assocSDs SignalDetectionTypes.SignalDetection[]
 * @param fkChannelSegments Fk Channel Segment Record
 * @returns SignalDetectionTypes.SignalDetection[] to be reviewed
 */
export const fksNeedReview = (
  assocSDs: SignalDetectionTypes.SignalDetection[],
  fkChannelSegments: FkChannelSegmentRecord
) => {
  return assocSDs.filter(aSD => {
    const fk = getFkData(aSD, fkChannelSegments);
    return fkNeedsReview(aSD, fk);
  });
};

/**
 * Return the heatmap array from the FK Spectra
 *
 * @param fkPowerSpectra: an fk power spectra
 * @returns number[][]
 */
export const getFkHeatmapArrayFromFkSpectra = (
  fkPowerSpectrum: FkTypes.FkPowerSpectrum,
  unit: FkTypes.FkUnits
): number[][] => {
  if (!fkPowerSpectrum) return [[]];

  return unit === FkTypes.FkUnits.FSTAT ? fkPowerSpectrum.fstat : fkPowerSpectrum.power;
};

/**
 * Calculates the fstat point based on input heatmap and az slow values
 *
 * @param fkData as FkPowerSpectra
 * @param heatMap as number[][]
 * @param azimuth azimuth
 * @param slowness slowness
 * @param units units as FkUnits
 */
export const getPeakValueFromAzSlow = (
  fkData: FkTypes.FkPowerSpectra,
  heatMap: number[][],
  azimuth: number,
  slowness: number
): number | undefined => {
  const xaxis = getXAxisForFkSpectra(fkData);
  const yaxis = getYAxisForFkSpectra(fkData);
  const xscale = d3
    .scaleLinear()
    .domain(xaxis)
    .range([0, xaxis[1] * 2]);
  const yscale = d3
    .scaleLinear()
    .domain(yaxis)
    .range([0, yaxis[1] * 2]);

  const xyPoint = convertPolarToXY(slowness, azimuth);
  const x = Math.floor(xscale(xyPoint.x));
  const y = Math.floor(yscale(xyPoint.y));
  const maybeRow = heatMap ? heatMap[y] : undefined;
  return maybeRow ? maybeRow[x] : undefined;
};

/**
 * Returns sorted signal detections based on sort type (Distance, Alphabetical)
 */
export function getSortedSignalDetections(
  signalDetections: SignalDetectionTypes.SignalDetection[],
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType,
  distanceToSource: EventTypes.LocationDistance[]
): SignalDetectionTypes.SignalDetection[] {
  // apply sort based on sort type
  let data: SignalDetectionTypes.SignalDetection[] = [];
  // Sort by distance
  if (selectedSortType === AnalystWorkspaceTypes.WaveformSortType.distance && distanceToSource) {
    data = sortBy<SignalDetectionTypes.SignalDetection>(signalDetections, [
      (sd: SignalDetectionTypes.SignalDetection) =>
        distanceToSource.find(d => d.id === sd.station.name).distance
    ]);
  } else {
    // apply sort if a sort comparator is passed in
    data = selectedSortType
      ? orderBy<SignalDetectionTypes.SignalDetection>(
          signalDetections,
          [sd => sd.station.name],
          ['asc']
        )
      : signalDetections;
  }
  return data;
}

/**
 * Filter for First P FKs
 */
function firstPfilter(sdsToFilter: SignalDetectionTypes.SignalDetection[]) {
  const seenStations: string[] = [];
  // Sort by arrival time then only take the first p for each station
  sdsToFilter.sort((sd1, sd2) => {
    const sd1Arrival = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(sd1.signalDetectionHypotheses)
        .featureMeasurements
    );
    const sd2Arrival = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(sd2.signalDetectionHypotheses)
        .featureMeasurements
    );
    return sd1Arrival.arrivalTime.value - sd2Arrival.arrivalTime.value;
  });
  return sdsToFilter.filter(sd => {
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
        .featureMeasurements
    );
    const phaseStr = fmPhase.value.toString();
    const stationId = sd.station.name;
    const unseenStation = seenStations.indexOf(stationId) < 0;
    if (
      FkTypes.Util.fkConfigurationDefaults.fkNeedsReviewRuleSet.phasesNeedingReview.indexOf(
        phaseStr
      ) > -1 &&
      unseenStation
    ) {
      seenStations.push(stationId);
      return true;
    }
    return false;
  });
}

/**
 * Filters signal detections based on the selected filter
 *
 * @param sds Signal detections to filter
 */
export function filterSignalDetections(
  associatedSDs: SignalDetectionTypes.SignalDetection[],
  unassociatedSDs: SignalDetectionTypes.SignalDetection[],
  filterType: FilterType,
  fkChannelSegments: FkChannelSegmentRecord
): SignalDetectionTypes.SignalDetection[] {
  // Removing deleted sd hypotheses
  const signalDetectionsToFilter = [...associatedSDs, ...unassociatedSDs].filter(
    sd => !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).deleted
  );
  let sdToDraw = signalDetectionsToFilter;

  switch (filterType) {
    case FilterType.all: {
      // No action needs to be taken
      // Maybe refactor so it is in a method
      break;
    }
    // Further filter down the signal detection associations to first P phases
    // if the display is configured to do so
    case FilterType.firstP: {
      sdToDraw = firstPfilter(sdToDraw);
      break;
    }
    case FilterType.needsReview: {
      sdToDraw = fksNeedReview(associatedSDs, fkChannelSegments);
      break;
    }
    default: {
      sdToDraw = firstPfilter(sdToDraw);
    }
  }
  return sdToDraw;
}
