/* eslint-disable react/jsx-props-no-spreading */
import type { EventTypes, FkTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { getTestFkChannelSegmentRecord } from '@gms/ui-state/__tests__/__data__';
import { render } from '@testing-library/react';
import { act } from '@testing-library/react-hooks';
import Immutable from 'immutable';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as util from 'util';

import type { FkThumbnailListProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnail-list';
import { FkThumbnailList } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnail-list';

Object.defineProperty(window, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(window, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});
Object.defineProperty(global, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(global, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});

// This is required so that jest.spyOn doesn't throw a type error
jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useGetFkChannelSegments: jest.fn().mockReturnValue(() => {
      return getTestFkChannelSegmentRecord(signalDetectionsData[0]);
    })
  };
});
// TODO the file name .redo. makes the tests skip everything in here, the tests need to be redone
describe('FK thumbnails tests', () => {
  const mockProps: FkThumbnailListProps = {
    sortedSignalDetections: signalDetectionsData,
    signalDetectionIdsToFeaturePrediction: Immutable.Map<string, EventTypes.FeaturePrediction[]>(),
    thumbnailSizePx: 300,
    selectedSdIds: [signalDetectionsData[0].id],
    unassociatedSignalDetections: [signalDetectionsData[0]],
    arrivalTimeMovieSpectrumIndex: 0,
    fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>(),
    displayedSignalDetection: signalDetectionsData[0],
    showFkThumbnailContextMenu: () => {
      /** empty */
    },
    setSelectedSdIds: () => {
      /** empty */
    },
    setDisplayedSignalDetection: () => {
      /** empty */
    }
  };

  const store = getStore();
  it('matches snapshot', () => {
    let container;
    act(() => {
      container = render(
        <Provider store={store}>
          <FkThumbnailList {...mockProps} />
        </Provider>
      );
    });
    expect(container).toMatchSnapshot();
  });
});
