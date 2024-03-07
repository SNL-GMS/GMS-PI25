import { Logger } from '@gms/common-util';
import { getStore } from '@gms/ui-state';
import { setAppAuthenticationStatus } from '@gms/ui-state/lib/app/state/operations';
import { render } from '@testing-library/react';
import * as React from 'react';

import { App } from '~app/ui-ian-app/app';

// eslint-disable-next-line import/namespace
import * as Index from '../../../src/ts/app/ui-ian-app/index';

const logger = Logger.create('GMS_LOG_JEST', process.env.GMS_LOG_JEST);

jest.mock('../../../src/ts/components/analyst-ui/components', () => {
  return { IANMap: () => logger.debug('hi') };
});

jest.mock('@gms/common-util', () => {
  const actual = jest.requireActual('@gms/common-util');
  return {
    ...actual,
    GMS_UI_MODE: 'ian',
    IS_MODE_SOH: false,
    IS_MODE_IAN: true
  };
});

describe('Root IAN app', () => {
  const store = getStore();
  store.dispatch(
    setAppAuthenticationStatus({
      authenticated: true,
      authenticationCheckComplete: true,
      failedToConnect: false,
      userName: 'username'
    })
  );

  it('exists', () => {
    expect(Index).toBeDefined();
  });

  it('matches a snapshot', () => {
    const { container } = render(<App />);
    expect(container).toMatchSnapshot();
  });
});
