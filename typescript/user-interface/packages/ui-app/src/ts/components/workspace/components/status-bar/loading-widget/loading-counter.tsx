import { selectRequestStats, useAppSelector } from '@gms/ui-state';
import React from 'react';

/**
 * Simple component to render the count
 */
export const LoadingCounter = React.memo(function LoadingCounter() {
  const { initiated, completed } = useAppSelector(selectRequestStats);
  return <span className="loading-counter">{`${completed}/${initiated}`}</span>;
});
