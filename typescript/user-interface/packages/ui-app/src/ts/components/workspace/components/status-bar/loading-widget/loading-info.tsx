import { selectIsLoading, selectPendingRequests, useAppSelector } from '@gms/ui-state';
import React from 'react';

import { getFriendlyNameFromRequest } from './loading-info-util';

const LoadingCompleteDescription = 'Complete';

/**
 * Displays the loading text for the LoadingWidget, which is either the last of the pending requests,
 * or else a "Loading: Complete" indicator.
 */
export const LoadingInfo = React.memo(function LoadingInfo() {
  const pendingRequests = Object.values(useAppSelector(selectPendingRequests));
  const loadingText = getFriendlyNameFromRequest(
    pendingRequests?.[pendingRequests.length - 1]?.url
  );
  const isLoading = useAppSelector(selectIsLoading);
  return (
    <div className="loading-info">
      <span className="loading-info__label">Loading: </span>
      {isLoading ? loadingText ?? LoadingCompleteDescription : LoadingCompleteDescription}
    </div>
  );
});
