import { MenuItem2 } from '@blueprintjs/popover2';
import type { UpdateSignalDetectionArgs } from '@gms/ui-state';
import {
  selectSelectedSdIds,
  selectValidActionTargetSignalDetectionIds,
  useAppSelector,
  useDetermineActionTargetsByType,
  useSetActionType,
  useSetSelectedSdIds,
  useUpdateSignalDetection
} from '@gms/ui-state';
import React from 'react';

export interface DeleteMenuItemProps {
  readonly keyPrefix: string;
}

/**
 * Menu item to be used to delete signal detections
 *
 * @param props
 */
export function DeleteContextMenuItem(props: DeleteMenuItemProps): JSX.Element {
  const updateSignalDetection = useUpdateSignalDetection();
  const selectedSignalDetectionIds = useAppSelector(selectSelectedSdIds);
  const setActionType = useSetActionType();
  const determineActionTargetsByType = useDetermineActionTargetsByType();
  const setSelectedSdIds = useSetSelectedSdIds();
  const validActionTargetSignalDetectionIds = useAppSelector(
    selectValidActionTargetSignalDetectionIds
  );

  /**
   * Deletes the signal detections for the provided ids.
   *
   * @param sdIds the signal detection ids to delete
   */
  const deleteDetectionsOnClick = React.useCallback(
    (sdIds: string[]) => {
      const args: UpdateSignalDetectionArgs = {
        isDeleted: true,
        signalDetectionIds: sdIds,
        phase: undefined,
        arrivalTime: undefined
      };
      updateSignalDetection(args);
    },
    [updateSignalDetection]
  );
  const { keyPrefix } = props;
  return (
    <MenuItem2
      text={`Delete ${determineActionTargetsByType('delete').length}`}
      disabled={validActionTargetSignalDetectionIds.length === 0}
      onClick={() => {
        // remove qualified sd action targets from array of selected sd ids
        const sdIdsToReselect = selectedSignalDetectionIds.filter(
          sdId => !validActionTargetSignalDetectionIds.includes(sdId)
        );
        deleteDetectionsOnClick(validActionTargetSignalDetectionIds);
        setSelectedSdIds(sdIdsToReselect); // leave SD's that were unqualified action targets selected
      }}
      data-cy="delete-sd"
      onMouseEnter={() => setActionType('delete')}
      onMouseLeave={() => setActionType(null)}
      key={`${keyPrefix}-delete-sd`}
    />
  );
}
