import '~css/soh-app.scss';

import { isDarkMode, replaceFavIcon } from '@gms/ui-util';
import { enableAllPlugins } from 'immer';
import * as JQuery from 'jquery';
import React from 'react';
import ReactDom from 'react-dom';
import { createRoot } from 'react-dom/client';

import { KeyCloakService } from '~app/authentication/gms-keycloak';
import { GMS_DISABLE_KEYCLOAK_AUTH } from '~env';

import { checkEnvConfiguration } from '../check-env-configuration';
import { checkUserAgent } from '../check-user-agent';
import { configureElectron } from '../configure-electron';
import { App } from './app';

// required for golden-layout
(window as any).React = React;
(window as any).ReactDOM = ReactDom;
(window as any).createRoot = createRoot;
(window as any).$ = JQuery;

window.onload = () => {
  checkEnvConfiguration();
  checkUserAgent();
  enableAllPlugins();

  // if the user is in dark mode, we replace the favicon with a lighter icon so it is visible
  if (isDarkMode()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, global-require, import/no-unresolved
    const logo = require('../../../../resources/images/gms-logo-favicon-dark.png');
    replaceFavIcon(logo);
  }

  const root = createRoot(document.getElementById('app'));
  const renderApp = () => root.render(<App />);
  if (GMS_DISABLE_KEYCLOAK_AUTH) {
    renderApp();
  } else KeyCloakService.callLogin(renderApp);
};

configureElectron();
