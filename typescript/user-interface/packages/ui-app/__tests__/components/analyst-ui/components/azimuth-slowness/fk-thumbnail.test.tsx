import { FkTypes } from '@gms/common-model';
import { getTestFkData } from '@gms/ui-state/__tests__/__data__';
import { shallow } from 'enzyme';
import React from 'react';
import renderer from 'react-test-renderer';

import type { FkThumbnailProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail';
import { FkThumbnail } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const pixelSize: any = 200;
const mockCallBack = jest.fn();

const fkThumbProps: FkThumbnailProps = {
  fkData: getTestFkData(1000),
  predictedPoint: undefined,
  sizePx: pixelSize,
  label: 'USRK P',
  selected: false,
  fkUnit: FkTypes.FkUnits.FSTAT,
  dimFk: false,
  onClick: mockCallBack,
  showFkThumbnailMenu: () => {
    /** empty */
  },
  arrivalTimeMovieSpectrumIndex: 0
};

/**
 * TODO: re-enable this test once jest tests pass in node 15 - flaky test for now
 * Test is not passing consistently, and feature work is so far in the future that fixing it
 * would probably be better left to that time
 */
it.skip('FkThumbnails renders & matches snapshot', () => {
  // eslint-disable-next-line react/jsx-props-no-spreading
  const tree = renderer.create(<FkThumbnail {...fkThumbProps} />).toJSON();

  expect(tree).toMatchSnapshot();
});

it.skip('FkThumbnails onClick fires correctly', () => {
  // eslint-disable-next-line react/jsx-props-no-spreading
  const thumbnail = shallow(<FkThumbnail {...fkThumbProps} />);
  thumbnail.find('.fk-thumbnail').simulate('click');
  expect(mockCallBack).toHaveBeenCalled();
});
