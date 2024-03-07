import type { SignalDetectionTypes } from '@gms/common-model';
import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import type { AnalystWorkspaceTypes } from '@gms/ui-state';
import {
  selectEvents,
  selectOpenEventId,
  selectOpenIntervalName,
  selectPreviousActionTargets,
  selectSelectedSignalDetections,
  selectSignalDetections,
  selectWorkflowTimeRange,
  useAppSelector,
  useEventStatusQuery,
  useGetSdIdsToShowFk,
  useSetSdIdsToShowFk,
  useUiTheme
} from '@gms/ui-state';
import union from 'lodash/union';
import React from 'react';

import type { SignalDetectionDetailsProps } from '../../dialogs/signal-detection-details/types';
import type { CreateEventMenuProps } from '../signal-detection-menu';
import { SignalDetectionMenu } from '../signal-detection-menu';
import {
  canGenerateFk,
  getSignalDetectionDetailsProps
} from './signal-detection-context-menu-utils';

export interface SignalDetectionContextMenuContentProps {
  keyPrefix: string;
  /** Used for right-clicking */
  readonly selectedSds?: SignalDetectionTypes.SignalDetection[];
  readonly measurementMode?: AnalystWorkspaceTypes.MeasurementMode;
  readonly setMeasurementModeEntries?: (entries: Record<string, boolean>) => void;
  readonly signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
  readonly setPhaseMenuVisibilityCb?: (visibility: boolean) => void;
  readonly createEventMenuProps?: CreateEventMenuProps;
}

export function SignalDetectionContextMenuContent({
  keyPrefix,
  selectedSds,
  setMeasurementModeEntries,
  signalDetectionDetailsCb,
  setPhaseMenuVisibilityCb,
  createEventMenuProps
}: SignalDetectionContextMenuContentProps) {
  const previousActionTargets = useAppSelector(selectPreviousActionTargets);
  const signalDetections = useAppSelector(selectSignalDetections);
  let actionTargetSd;
  if (previousActionTargets[0]) {
    actionTargetSd = Object.values(signalDetections).find(sd => sd.id === previousActionTargets[0]);
  }

  const reduxSelectedSds = useAppSelector(selectSelectedSignalDetections);
  const internalSelectedSds = selectedSds || reduxSelectedSds;
  const events = useAppSelector(selectEvents);
  const eventStatusQuery = useEventStatusQuery();
  const [uiTheme] = useUiTheme();
  const currentOpenEventId = useAppSelector(selectOpenEventId);
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const intervalTimeRange = useAppSelector(selectWorkflowTimeRange);
  const setSdIdsToShowFk = useSetSdIdsToShowFk();
  const sdIdsToShowFk = useGetSdIdsToShowFk();

  /**
   * Opens the Signal Detections Details context menu
   */
  const signalDetectionDetailsOnClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      signalDetectionDetailsCb(
        event,
        getSignalDetectionDetailsProps(
          actionTargetSd,
          Object.values(events),
          currentOpenEventId,
          eventStatusQuery.data,
          openIntervalName,
          intervalTimeRange,
          uiTheme
        )
      );
    },
    [
      signalDetectionDetailsCb,
      actionTargetSd,
      events,
      currentOpenEventId,
      eventStatusQuery.data,
      openIntervalName,
      intervalTimeRange,
      uiTheme
    ]
  );

  /**
   * Sets or updates the signal detection ids to show FK based on
   * the selected signal detections.
   */
  const setSdIdsToShowFkOnClick = React.useCallback(() => {
    const selectedSdIdsToShowFk = internalSelectedSds
      .filter(sd => sd && canGenerateFk(sd))
      .map(sd => sd.id);
    if (selectedSdIdsToShowFk && selectedSdIdsToShowFk.length > 0) {
      setSdIdsToShowFk(union(sdIdsToShowFk, selectedSdIdsToShowFk));
    }
  }, [internalSelectedSds, sdIdsToShowFk, setSdIdsToShowFk]);

  return (
    <SignalDetectionMenu
      keyPrefix={keyPrefix}
      setSdIdsToShowFkOnClick={setSdIdsToShowFkOnClick}
      signalDetectionDetailsOnClick={signalDetectionDetailsOnClick}
      setPhaseMenuVisibilityCb={setPhaseMenuVisibilityCb}
      setMeasurementModeEntries={setMeasurementModeEntries}
      createEventMenuProps={createEventMenuProps}
    />
  );
}
