/* eslint-disable react/destructuring-assignment */
import { FkTypes } from '@gms/common-model';
import { useColorMap } from '@gms/ui-state';
import * as d3 from 'd3';
import React, { useEffect } from 'react';

import { gmsColors } from '~scss-config/color-preferences';

import { createColorScaleImageBitmap } from '../fk-util';

/**
 * FkColorScale Props
 */
export interface FkColorScaleProps {
  minSlow: number;
  maxSlow: number;
  fkUnits: FkTypes.FkUnits;
}

/**
 * The color scale size.
 */
export interface ColorScaleSize {
  width: number;
  height: number;
}

/**
 * FkColorScale Functional Component
 */
export function FkColorScale(props: FkColorScaleProps) {
  const padding = 25;

  /** The color scale size. */
  const colorScaleSize: ColorScaleSize = { width: 80, height: 240 };

  /** Reference to the canvas to draw the color scale. */
  let canvasRef: HTMLCanvasElement | undefined;

  /** The x-axis div container. */
  let xAxisContainerRef: HTMLDivElement | undefined;

  /** Get user preferred color map */
  const [colorMap] = useColorMap();
  /**
   * sets parameters and updates bitmap
   */
  useEffect(() => {
    /**
     * Create and draw the x-axis.
     */
    function createXAxis() {
      if (!xAxisContainerRef) return;
      xAxisContainerRef.innerHTML = '';

      const svg = d3
        .select(xAxisContainerRef)
        .append('svg')
        .attr('width', xAxisContainerRef.clientWidth)
        .attr('height', xAxisContainerRef.clientHeight)
        .style('fill', gmsColors.gmsMain);

      const svgAxis = svg.append('g').attr('class', 'fk-axis');
      const x =
        props.fkUnits === FkTypes.FkUnits.FSTAT
          ? d3
              .scaleLinear()
              .domain([props.minSlow, props.maxSlow])
              .range([padding, xAxisContainerRef.clientWidth - padding])
          : d3
              .scaleLog()
              .domain([props.minSlow, props.maxSlow])
              .range([padding, xAxisContainerRef.clientWidth - padding]);
      const range = props.maxSlow - props.minSlow;
      const tickSize = 7;
      const rangeOfScaleInRealPx = xAxisContainerRef.clientWidth - padding - padding;
      const logarithmicHalfOfScale = rangeOfScaleInRealPx / 2;
      const logarithmicQuarterOfScale = rangeOfScaleInRealPx / 4;
      const logarithmicThreeQuarterOfScale = (rangeOfScaleInRealPx * 3) / 4;

      const xAxis =
        props.fkUnits === FkTypes.FkUnits.FSTAT
          ? d3
              .axisBottom(x)
              .tickSize(tickSize)
              .tickValues([
                props.minSlow,
                props.minSlow + range / 4,
                props.minSlow + range / 2,
                props.minSlow + (range * 3) / 4,
                props.maxSlow
              ])
              .tickFormat(d3.format('.2'))
          : d3
              .axisBottom(x)
              .tickSize(tickSize)
              .tickValues([
                x.invert(padding),
                x.invert(padding + logarithmicQuarterOfScale),
                x.invert(padding + logarithmicHalfOfScale),
                x.invert(padding + logarithmicThreeQuarterOfScale),
                x.invert(xAxisContainerRef.clientWidth - padding)
              ])
              .tickFormat(d3.format('.2'));
      svgAxis.call(xAxis);
    }

    /**
     * Draws the image to the context
     */
    function draw(ctx: CanvasRenderingContext2D, currentImage: ImageBitmap) {
      if (canvasRef) {
        const height = 50;
        canvasRef.width = xAxisContainerRef.clientWidth - padding * 2;
        canvasRef.height = height;
        ctx.drawImage(currentImage, 0, 0, canvasRef.width, height);

        createXAxis();
      }
    }

    async function updateBitmap() {
      /** Canvas rendering context used to draw the color scale. */
      const ctx: CanvasRenderingContext2D = canvasRef.getContext('2d');
      ctx.imageSmoothingEnabled = true;

      /** The current color scale represented as an ImageBitmap. */
      const currentImage: ImageBitmap = await createColorScaleImageBitmap(
        colorScaleSize.width,
        colorScaleSize.height,
        colorMap
      );
      draw(ctx, currentImage);
    }
    if (xAxisContainerRef) {
      // TODO: add a logger
      // eslint-disable-next-line no-console
      updateBitmap().catch(console.error);
    }
  }, [
    canvasRef,
    colorMap,
    colorScaleSize.height,
    colorScaleSize.width,
    props.fkUnits,
    props.maxSlow,
    props.minSlow,
    xAxisContainerRef,
    xAxisContainerRef?.clientWidth
  ]);

  return (
    <div className="fk-color-scale">
      <div
        className="fk-color-scale__xaxis"
        ref={ref => {
          xAxisContainerRef = ref;
        }}
      />
      <canvas
        className="fk-color-scale__canvas"
        ref={ref => {
          canvasRef = ref;
        }}
      />
      {props.fkUnits === FkTypes.FkUnits.POWER ? (
        <div className="fk-color-scale__units">(db)</div>
      ) : null}
    </div>
  );
}
