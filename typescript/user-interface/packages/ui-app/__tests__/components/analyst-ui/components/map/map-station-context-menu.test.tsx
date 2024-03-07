import { render } from '@testing-library/react';
import React from 'react';

import { MapStationContextMenu } from '../../../../../src/ts/components/analyst-ui/components/map/map-station-context-menu';

describe('MapSignalDetectionContextMenu', () => {
  test('functions are defined', () => {
    expect(MapStationContextMenu).toBeDefined();
  });

  it('matches snapshot', () => {
    const component = render(
      <MapStationContextMenu
        getOpenCallback={jest.fn()}
        mapStationDetailsCb={jest.fn()}
        setCreateEventMenuCb={jest.fn()}
      />
    );
    expect(component.baseElement).toMatchSnapshot();
  });
});
