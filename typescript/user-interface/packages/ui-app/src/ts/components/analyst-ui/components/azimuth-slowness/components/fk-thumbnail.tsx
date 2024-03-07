/* eslint-disable react/destructuring-assignment */
import type { FkTypes } from '@gms/common-model';
import { useColorMap } from '@gms/ui-state';
import isEqual from 'lodash/isEqual';
import React, { useEffect, useState } from 'react';

import * as fkUtil from './fk-util';

/**
 * Fk Thumbnail Props.
 */
export interface FkThumbnailProps {
  fkData: FkTypes.FkPowerSpectra;
  sizePx: number;
  label: string;
  fkUnit: FkTypes.FkUnits;
  dimFk: boolean;
  highlightLabel?: boolean;
  predictedPoint?: FkTypes.AzimuthSlowness;
  selected?: boolean;
  arrivalTimeMovieSpectrumIndex: number;

  showFkThumbnailMenu?(event: React.MouseEvent): void;
  onClick?(e: React.MouseEvent<HTMLCanvasElement>): void;
}

export function FkThumbnail(props: FkThumbnailProps) {
  /** destination to draw the fk. */
  let canvasRef: HTMLCanvasElement | undefined;

  /** The current fk represented as an ImageBitmap. */
  const currentImage = React.useRef<ImageBitmap>();

  const classNames = ['fk-thumbnail', props.selected ? 'selected' : undefined].join(' ');
  const [colorMap] = useColorMap();

  /**
   * Displays a context menu for reviewing/clearing an fk
   */
  function showThumbnailContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (props.showFkThumbnailMenu) {
      props.showFkThumbnailMenu(e);
    }
  }

  const [currentFkDisplayData, setCurrentFkDisplayData] = useState<number[][]>([]);
  const [prevProps, setPreviousProps] = useState<FkThumbnailProps>(undefined);

  useEffect(() => {
    async function fetchCreateImage(fkDisplayData: number[][]) {
      const [min, max] = fkUtil.computeMinMaxFkValues(fkDisplayData);
      currentImage.current = await fkUtil.createFkImageBitmap(fkDisplayData, min, max, colorMap);
      fkUtil.drawImage(canvasRef, currentImage.current, props.dimFk);
      fkUtil.draw(
        canvasRef,
        props.fkData,
        props.predictedPoint,
        props.arrivalTimeMovieSpectrumIndex,
        true,
        props.dimFk
      );
      setCurrentFkDisplayData(fkDisplayData);
      setPreviousProps(props);
    }

    if (!props.fkData || !props.fkData.values) {
      return;
    }

    const fkDisplayData = fkUtil.getFkHeatmapArrayFromFkSpectra(
      props.fkData.values[props.arrivalTimeMovieSpectrumIndex],
      props.fkUnit
    );

    if (fkDisplayData.length === 0) {
      return;
    }

    if (
      !isEqual(currentFkDisplayData, fkDisplayData) ||
      props.fkUnit !== prevProps?.fkUnit ||
      props.dimFk !== prevProps?.dimFk
    ) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchCreateImage(fkDisplayData);
    } else if (currentImage && prevProps?.sizePx !== props.sizePx) {
      fkUtil.drawImage(canvasRef, currentImage.current, props.dimFk);
      fkUtil.draw(
        canvasRef,
        props.fkData,
        props.predictedPoint,
        props.arrivalTimeMovieSpectrumIndex,
        true,
        props.dimFk
      );
      setPreviousProps(props);
    }
  }, [
    props,
    currentFkDisplayData,
    prevProps?.fkUnit,
    prevProps?.dimFk,
    prevProps?.sizePx,
    canvasRef,
    colorMap
  ]);

  const createOnClick = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (props.onClick) {
        props.onClick(e);
      }
    },
    [props]
  );
  return (
    <div
      className={classNames}
      style={{
        width: `${props.sizePx}px`,
        height: `${props.sizePx}px`
      }}
      onContextMenu={e => showThumbnailContextMenu(e)}
    >
      <div
        className={
          !props.highlightLabel || props.dimFk
            ? 'fk-thumbnail__label--reviewed'
            : 'fk-thumbnail__label'
        }
      >
        {props.label}
      </div>
      <canvas
        className="fk-thumbnail__canvas"
        height={props.sizePx}
        width={props.sizePx}
        ref={ref => {
          canvasRef = ref;
        }}
        onClick={createOnClick}
      />
    </div>
  );
}
