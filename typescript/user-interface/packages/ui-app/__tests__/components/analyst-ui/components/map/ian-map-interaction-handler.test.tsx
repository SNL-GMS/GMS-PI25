import { getStore } from '@gms/ui-state';
import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { Provider } from 'react-redux';

import { useIanMapInteractionHandler } from '~analyst-ui/components/map/ian-map-interaction-handler';

import { ianMapStationTooltipLabel } from '../../../../../src/ts/components/analyst-ui/components/map/ian-map-interaction-utils';

const store = getStore();

function TestReduxWrapper({ children }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('IanMapInteractionHandler', () => {
  test('can create a mouse move handler', () => {
    const viewer: any = {
      scene: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pickPosition: jest.fn(endPosition => {
          'myPosition';
        })
      },
      entities: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getById: jest.fn(id => {
          return undefined;
        }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        add: jest.fn(incomingEntity => {
          return ianMapStationTooltipLabel;
        })
      }
    };
    const container = renderHook(
      () => {
        const IanMapTooltipHandler = useIanMapInteractionHandler(
          {
            eventContextMenuCb: jest.fn(),
            eventDetailsCb: jest.fn(),
            signalDetectionContextMenuCb: jest.fn(),
            signalDetectionDetailsCb: jest.fn(),
            stationContextMenuCb: jest.fn(),
            stationDetailsCb: jest.fn(),
            mapContextMenuCb: jest.fn()
          },
          jest.fn
        );
        return <IanMapTooltipHandler viewer={viewer} />;
      },
      { wrapper: TestReduxWrapper }
    );
    expect(container).toMatchSnapshot();
  });
  test('can handle an undefined viewer', () => {
    const viewer: any = undefined;
    const container = renderHook(
      () => {
        const IanMapTooltipHandler = useIanMapInteractionHandler(
          {
            eventContextMenuCb: jest.fn(),
            eventDetailsCb: jest.fn(),
            signalDetectionContextMenuCb: jest.fn(),
            signalDetectionDetailsCb: jest.fn(),
            stationContextMenuCb: jest.fn(),
            stationDetailsCb: jest.fn(),
            mapContextMenuCb: jest.fn()
          },
          jest.fn
        );
        return <IanMapTooltipHandler viewer={viewer} />;
      },
      { wrapper: TestReduxWrapper }
    );
    expect(container).toMatchSnapshot();
  });
});
