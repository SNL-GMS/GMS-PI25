import { FkTypes } from '@gms/common-model';
import {
  defaultStations,
  eventList,
  featurePredictionsASAR,
  processingAnalystConfigurationData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import React from 'react';
import renderer from 'react-test-renderer';

import type { FkDisplayProps } from '../../../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-display/fk-display';
import { FkDisplay } from '../../../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-display/fk-display';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const fkDisplayProps: Partial<FkDisplayProps> = {
  defaultStations,
  eventsInTimeRange: eventList,
  currentOpenEvent: eventList[0],
  signalDetectionsByStation: signalDetectionsData,
  signalDetection: signalDetectionsData[0],
  signalDetectionFeaturePredictions: featurePredictionsASAR,
  widthPx: 100,
  heightPx: 90,
  multipleSelected: true,
  numberOfOutstandingComputeFkMutations: 5,
  fkUnit: FkTypes.FkUnits.FSTAT,
  fkFrequencyThumbnails: [],
  currentMovieSpectrumIndex: 4,
  uiTheme: processingAnalystConfigurationData.uiThemes[0],
  openIntervalName: 'AL1'
};

it('FkDisplay renders & matches snapshot', () => {
  const tree = renderer
    .create(
      <div
        style={{
          border: `1px solid #111`,
          resize: 'both',
          overflow: 'auto',
          height: '700px',
          width: '1000px'
        }}
      >
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FkDisplay {...(fkDisplayProps as any)} />
      </div>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});
