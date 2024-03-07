/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { authenticator } from '~app/authentication';
import { LoginScreenComponent } from '~components/login-screen/login-screen-component';
import type { LoginScreenReduxProps } from '~components/login-screen/types';

const reduxProps: LoginScreenReduxProps = {
  redirectPath: '',
  authenticated: false,
  authenticationCheckComplete: true,
  failedToConnect: false,
  setAppAuthenticationStatus: jest.fn()
};

describe('Login screen', () => {
  it('should be defined', () => {
    expect(LoginScreenComponent).toBeDefined();
  });

  it('failed to connect should return non ideal state, No connection to server', () => {
    const failProps = { ...reduxProps, failedToConnect: true, authenticationCheckComplete: false };
    const loginScreen = render(
      <LoginScreenComponent authenticator={authenticator} {...failProps} />
    );
    const loginScreenNonIdealStateNoConnection = loginScreen.queryByText('No connection to server');
    expect(loginScreen).toMatchSnapshot();
    expect(loginScreenNonIdealStateNoConnection).not.toBeNull();
  });

  it('authentication check in progress shows spinner, attempts to login', () => {
    const failProps = { ...reduxProps, authenticationCheckComplete: false };

    const loginScreen: any = render(
      <LoginScreenComponent authenticator={authenticator} {...failProps} />
    );
    const statusText = loginScreen.queryByText('Attempting to login...');
    expect(loginScreen).toMatchSnapshot();
    expect(statusText).not.toBeNull();
  });

  it('Connected, authentication check complete, and not authenticated should return login page', () => {
    const successProps = { ...reduxProps };

    const loginScreen: any = render(
      <LoginScreenComponent authenticator={authenticator} {...successProps} />
    );
    const loginButton = loginScreen.getByRole('button', { name: 'Login' });
    expect(loginButton.getAttribute('data-cy')).toBe('login-btn');
    expect(loginScreen).toMatchSnapshot();
  });

  it('user authenticates, the app should try to update authentication status', () => {
    const loginScreen: any = render(
      <LoginScreenComponent authenticator={authenticator} {...reduxProps} />
    );
    const usernameField = loginScreen.getByTestId('username-input');
    const loginButton = loginScreen.getByRole('button', { name: 'Login' });
    expect(usernameField).toBeDefined();
    expect(usernameField.value).toMatch('');
    fireEvent.change(usernameField, { target: { value: 'testUser' } });
    expect(usernameField.value).toMatch('testUser');
    fireEvent.click(loginButton);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reduxProps.setAppAuthenticationStatus).toHaveBeenCalled();
  });
});
