import {
  selectSelectedSdIds,
  useAppSelector,
  useCreateNewEvent,
  useViewableInterval
} from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import React from 'react';
import { toast } from 'react-toastify';

const logger = UILogger.create('GMS_EVENT_HOOKS', process.env.GMS_EVENT_HOOKS);

/**
 * @param setCreateEventMenuVisibility state-setter for displaying the
 * Create Virtual Event dialog
 *
 * @returns function that determines whether to create a new event (when
 * signal detections are selected) or open the Create Event dialog (when
 * no SDs are selected)
 */
export function useCreateEventInteractionHandler(
  setCreateEventMenuVisibility: (newValue: boolean) => void
) {
  const [viewableInterval] = useViewableInterval();
  // Events cannot be created if there is no open interval
  const disabled = !(viewableInterval?.startTimeSecs && viewableInterval?.endTimeSecs);

  const createNewEvent = useCreateNewEvent();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);

  return React.useCallback(async () => {
    if (disabled) {
      logger.info('Events cannot be created without an open interval');
      return;
    }
    if (selectedSdIds?.length === 0) setCreateEventMenuVisibility(true);
    else {
      await createNewEvent(selectedSdIds).catch(e => toast.warn((e as Error).message));
    }
  }, [createNewEvent, disabled, selectedSdIds, setCreateEventMenuVisibility]);
}
