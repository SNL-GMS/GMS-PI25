import { NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { IanDisplays } from '@gms/common-model/lib/displays/types';
import type GoldenLayout from '@gms/golden-layout';
import { selectHistorySize, useAppSelector } from '@gms/ui-state';
import React from 'react';

import { BaseDisplay } from '~common-ui/components/base-display';

import { HistoryPanel } from './history-panel';

export interface HistoryProps {
  // passed in from golden-layout
  readonly glContainer?: GoldenLayout.Container;
}

/**
 * Renders the {@link HistoryPanel} with props {@link HistoryProps}
 */
export const HistoryComponent = React.memo(function HistoryComponent({
  glContainer
}: HistoryProps) {
  const historySize = useAppSelector(selectHistorySize);

  const nonIdealState =
    historySize < 1 ? (
      <NonIdealState
        icon={IconNames.UNDO}
        action={null}
        title="No undo/redo history available"
        description="Perform an action to see undo/redo entries"
      />
    ) : undefined;

  return (
    <BaseDisplay
      glContainer={glContainer}
      className="history-display-window gms-body-text"
      tabName={IanDisplays.HISTORY}
    >
      {nonIdealState !== undefined ? nonIdealState : <HistoryPanel />}
    </BaseDisplay>
  );
});
