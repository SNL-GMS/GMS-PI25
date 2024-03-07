import { nonIdealStateWithSpinner } from '@gms/ui-core-components';
import React from 'react';

import type { HistoryProps } from './history-component';

const HistoryLazy = React.lazy(async () =>
  import(/* webpackChunkName: 'ui-app-history' */ './history-component').then(module => ({
    default: module.HistoryComponent
  }))
);

export function History(props: HistoryProps) {
  const { glContainer } = props;
  return (
    <React.Suspense fallback={nonIdealStateWithSpinner()}>
      <HistoryLazy glContainer={glContainer} />
    </React.Suspense>
  );
}
