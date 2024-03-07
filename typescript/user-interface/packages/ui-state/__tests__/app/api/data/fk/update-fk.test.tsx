/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { FkTypes } from '@gms/common-model';

import { updateFk } from '../../../../../src/ts/app/api/data/fk/update-fk';
import { fkInput, getTestFkCoiData } from '../../../../__data__';

const fkSpectraCoi = getTestFkCoiData(2000);
describe('Update Fk after computeFkSpectra call', () => {
  it('update Fk COI', () => {
    const result = updateFk(fkSpectraCoi as FkTypes.FkPowerSpectra, fkInput);
    const resultWithoutValues = {
      ...result,
      values: []
    };
    expect(resultWithoutValues).toMatchSnapshot();
  });

  it('update Fk COI can handle undefined', () => {
    expect(updateFk(undefined, fkInput)).toMatchSnapshot();
  });
});
