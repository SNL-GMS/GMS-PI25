import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type { WorkflowTypes } from '@gms/common-model';
import {
  isActivityInterval,
  isInteractiveAnalysisStageInterval,
  isStageInterval
} from '@gms/common-model/lib/workflow/types';
import { useAppSelector } from '@gms/ui-state';
import flatMap from 'lodash/flatMap';
import React from 'react';

export interface IntervalContextMenuProps {
  readonly interval: WorkflowTypes.ActivityInterval | WorkflowTypes.StageInterval;
  readonly isSelectedInterval: boolean;
  readonly allActivitiesOpenForSelectedInterval: boolean;

  readonly openCallback: (
    interval: WorkflowTypes.ActivityInterval | WorkflowTypes.StageInterval
  ) => void;
  readonly closeCallback: (
    interval: WorkflowTypes.ActivityInterval | WorkflowTypes.StageInterval
  ) => void;
}

/**
 * Component that renders the interval context menu.
 */
// eslint-disable-next-line react/function-component-definition
export const IntervalContextMenu: React.FunctionComponent<IntervalContextMenuProps> = (
  props: IntervalContextMenuProps
) => {
  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);
  const {
    interval,
    isSelectedInterval,
    allActivitiesOpenForSelectedInterval,
    openCallback,
    closeCallback
  } = props;

  const userName = useAppSelector(state => state.app.userSession.authenticationStatus.userName);

  const isDisabled =
    (allActivitiesOpenForSelectedInterval &&
      isSelectedInterval &&
      openIntervalName === interval.intervalId.definitionId.name) ||
    (isSelectedInterval && interval.intervalId.definitionId.name !== openIntervalName);

  // determine if the logged in user is an active analyst; if so allow them to close that interval
  let isActiveAnalyst = false;
  if (isStageInterval(interval)) {
    if (isInteractiveAnalysisStageInterval(interval)) {
      isActiveAnalyst = flatMap(interval.activityIntervals.map(a => a.activeAnalysts)).includes(
        userName
      );
    }
  } else if (isActivityInterval(interval)) {
    isActiveAnalyst = interval.activeAnalysts.includes(userName);
  }

  return (
    <Menu>
      <MenuItem2
        className="menu-item-open-interval"
        data-cy="open-interval-btn"
        text={isActiveAnalyst && !isDisabled ? 'Reopen interval' : 'Open interval'}
        disabled={isDisabled}
        onClick={() => openCallback(interval)}
      />
      <MenuItem2
        className="menu-item-close-interval"
        data-cy="close-interval-btn"
        text="Close interval"
        disabled={!isSelectedInterval && !isActiveAnalyst}
        onClick={() => closeCallback(interval)}
      />
    </Menu>
  );
};
