import { getStore } from '@gms/ui-state';
import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';

import { MapEventDetails } from '~analyst-ui/components/map/map-event-details';

import {} from '../../../../../src/ts/components/analyst-ui/components/map/map-station-details';

describe('MapEventDetails', () => {
  test('functions are defined', () => {
    expect(MapEventDetails).toBeDefined();
  });

  it('matches snapshot', () => {
    const store = getStore();
    const component = renderer
      .create(
        <Provider store={store}>
          <MapEventDetails
            eventId="test"
            time={{ value: 0, uncertainty: 0 }}
            latitudeDegrees={45}
            longitudeDegrees={45}
            depthKm={{ value: 10, uncertainty: 0 }}
          />
        </Provider>
      )
      .toJSON();
    expect(component).toMatchSnapshot();
  });
});
