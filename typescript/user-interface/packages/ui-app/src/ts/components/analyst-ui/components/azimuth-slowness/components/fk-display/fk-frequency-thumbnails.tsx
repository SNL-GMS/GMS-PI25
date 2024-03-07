/* eslint-disable react/destructuring-assignment */
import type { FkTypes } from '@gms/common-model';
import React from 'react';

import { frequencyBandToString } from '~analyst-ui/common/utils/fk-utils';

import { FkThumbnail } from '../fk-thumbnail';

const SIZE_PX_OF_FREQUENCY_THUMBNAILS_PX = 100;

export interface FkFrequencyThumbnailProps {
  fkFrequencySpectra: FkTypes.FkFrequencyThumbnail[];
  fkUnit: FkTypes.FkUnits;
  arrivalTimeMovieSpectrumIndex: number;

  onThumbnailClick(minFrequency: number, maxFrequency: number): void;
}
export function FkFrequencyThumbnails(props: FkFrequencyThumbnailProps) {
  return (
    <div className="fk-frequency-thumbnails">
      {props.fkFrequencySpectra.map(spectra => (
        <FkThumbnail
          fkData={spectra.fkSpectra}
          label={frequencyBandToString(spectra.frequencyBand)}
          key={frequencyBandToString(spectra.frequencyBand)}
          selected={false}
          dimFk={false}
          sizePx={SIZE_PX_OF_FREQUENCY_THUMBNAILS_PX}
          fkUnit={props.fkUnit}
          showFkThumbnailMenu={() => {
            // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
          }}
          arrivalTimeMovieSpectrumIndex={props.arrivalTimeMovieSpectrumIndex}
          onClick={() => {
            props.onThumbnailClick(
              spectra.frequencyBand.minFrequencyHz,
              spectra.frequencyBand.maxFrequencyHz
            );
          }}
        />
      ))}
    </div>
  );
}
