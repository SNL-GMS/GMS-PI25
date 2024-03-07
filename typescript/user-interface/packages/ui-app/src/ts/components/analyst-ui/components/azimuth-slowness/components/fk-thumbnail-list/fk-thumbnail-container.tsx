/* eslint-disable react/destructuring-assignment */
import { NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { EventTypes, FkTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import React from 'react';

import { FkThumbnail } from '../fk-thumbnail';
import * as fkUtil from '../fk-util';

/**
 * Fk Thumbnail Props.
 */
export interface FkThumbnailContainerProps {
  data: SignalDetectionTypes.SignalDetection;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  sizePx: number;
  selected: boolean;
  isUnassociated: boolean;
  fkUnit: FkTypes.FkUnits;
  arrivalTimeMovieSpectrumIndex: number;
  selectedFk: FkTypes.FkPowerSpectra;
  showFkThumbnailMenu?(event: React.MouseEvent): void;
  onClick?(e: React.MouseEvent<HTMLCanvasElement>): void;
}

/**
 * A single fk thumbnail in the thumbnail-list
 */
export function FkThumbnailContainer(props: FkThumbnailContainerProps) {
  if (!props.data) {
    return <NonIdealState icon={IconNames.HEAT_GRID} title="All Fks Filtered Out" />;
  }
  const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(props.data.signalDetectionHypotheses)
      .featureMeasurements
  );

  const needsReview = fkUtil.fkNeedsReview(props.data, props.selectedFk);
  const label = `${props.data.station.name} ${fmPhase.value.toString()}`;
  const predictedPoint = fkUtil.getPredictedPoint(props.signalDetectionFeaturePredictions);

  return (
    <FkThumbnail
      fkData={props.selectedFk}
      label={label}
      dimFk={props.isUnassociated}
      highlightLabel={needsReview}
      fkUnit={props.fkUnit}
      sizePx={props.sizePx}
      // eslint-disable-next-line @typescript-eslint/unbound-method
      onClick={props.onClick}
      predictedPoint={predictedPoint}
      selected={props.selected}
      // eslint-disable-next-line @typescript-eslint/unbound-method
      showFkThumbnailMenu={props.showFkThumbnailMenu}
      arrivalTimeMovieSpectrumIndex={props.arrivalTimeMovieSpectrumIndex}
    />
  );
}
