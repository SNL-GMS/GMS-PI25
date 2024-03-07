import React, { useEffect } from 'react';

import { gmsColors } from '~scss-config/color-preferences';

import * as fkUtil from '../fk-util';

/**
 * Class that renders the FK Display legend which describes peak, predicted, and analyst
 */
export function FkLegend() {
  /** Reference to the canvas to draw different dots for the legend */
  let canvasRef: HTMLCanvasElement | undefined;

  /**
   * Invoked when the component mounted.
   */
  useEffect(() => {
    /**
     * Draws the fk display legend
     */
    function drawFkLegend(ctx: CanvasRenderingContext2D) {
      const xForDots = 6;
      const yForAnalystDot = 12;
      const yForPredictedDot = 28;
      const yForCrossHairDot = 44;
      const canvasHeight = 80;
      const canvasWidth = 20;

      canvasRef.width = canvasWidth;
      canvasRef.height = canvasHeight;

      fkUtil.drawCircle(
        ctx,
        xForDots,
        yForAnalystDot,
        [fkUtil.markerRadiusSize],
        gmsColors.gmsRecessed,
        true
      );
      fkUtil.drawCircle(
        ctx,
        xForDots,
        yForPredictedDot,
        [fkUtil.markerRadiusSize],
        gmsColors.gmsMain,
        true
      );
      fkUtil.drawCircle(
        ctx,
        xForDots,
        yForCrossHairDot,
        [fkUtil.markerRadiusSize],
        gmsColors.gmsMain,
        true
      );
      fkUtil.drawCrosshairDot(
        ctx,
        xForDots,
        yForCrossHairDot,
        gmsColors.gmsRecessed,
        fkUtil.markerRadiusSize
      );
    }

    if (canvasRef) {
      /** Canvas rendering context used to draw different dots for the legend */
      const ctx = canvasRef.getContext('2d');
      drawFkLegend(ctx);
    }
  }, [canvasRef]);

  /**
   * Renders the component.
   */
  return (
    <div className="fk-legend">
      <canvas
        className="fk-legend__canvas"
        ref={ref => {
          canvasRef = ref;
        }}
      />
      <div className="fk-legend-font__analyst">Selected</div>
      <div className="fk-legend-font__peak">Peak</div>
      <div className="fk-legend-font__predicted">Predicted</div>
    </div>
  );
}
