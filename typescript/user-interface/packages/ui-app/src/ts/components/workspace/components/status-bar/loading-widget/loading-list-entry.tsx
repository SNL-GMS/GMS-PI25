import { Icon, Spinner } from '@blueprintjs/core';
import type { RequestStatus } from '@gms/ui-state/lib/app/state/analyst/types';
import classNames from 'classnames';
import React from 'react';

import { getFriendlyNameFromRequest, getIconName } from './loading-info-util';

/**
 * Returns an error message, or null if the error is undefined.
 *
 * @param error the error from which to get the message. Errors have `any` type, so we use that it here, too
 * @returns an error message string, or null
 */
const getErrorMessage = (error: any): string | null => {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error?.message) {
    return error.message;
  }
  return 'See developer console for more details';
};

/**
 * The type of the props for the {@link LoadingListEntry} component
 */
export interface LoadingListEntryProps {
  requestStatus: RequestStatus;
}

/**
 * Creates a single loading list entry for the ordered list in the LoadingInfoTooltip
 */
export const LoadingListEntry = React.memo(function LoadingListEntry({
  requestStatus
}: LoadingListEntryProps) {
  const iconName = getIconName(requestStatus);
  return (
    <li
      className={classNames({
        'loading-list-entry': true,
        'is-error': !!requestStatus.error,
        'is-complete': requestStatus.isComplete,
        'is-pending': !requestStatus.isComplete
      })}
    >
      <div className="loading-list-entry__description">
        {!requestStatus.isComplete ? (
          <Spinner className="loading-list-entry__spinner" size={14} intent="none" />
        ) : (
          <Icon className="loading-list-entry__icon" icon={iconName} />
        )}
        {requestStatus.error ? <span className="loading-list-entry__label">Error: </span> : null}
        <span className="loading-list-entry__value">
          {`${getFriendlyNameFromRequest(requestStatus.url)}`}
        </span>
      </div>
      {requestStatus.error ? (
        <span className="loading-list-entry__more-info">
          {getErrorMessage(requestStatus.error)}
        </span>
      ) : null}
    </li>
  );
});
