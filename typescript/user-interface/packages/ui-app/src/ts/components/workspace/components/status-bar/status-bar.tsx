import React from 'react';

import { LoadingWidget } from './loading-widget/loading-widget';

/**
 * A status bar for the bottom of the screen, which shows useful info to the users
 */
export const StatusBar = React.memo(function StatusBar() {
  return (
    <div className="status-bar">
      <LoadingWidget />
    </div>
  );
});
