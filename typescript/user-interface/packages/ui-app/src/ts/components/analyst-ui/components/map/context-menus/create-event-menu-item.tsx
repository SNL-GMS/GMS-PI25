import { MenuItem2 } from '@blueprintjs/popover2';
import { setDecimalPrecision, setDecimalPrecisionAsNumber } from '@gms/common-util';
import {
  selectSelectedSdIds,
  selectSelectedSignalDetectionsCurrentHypotheses,
  useAppSelector,
  useCreateNewEvent,
  useViewableInterval
} from '@gms/ui-state';
import React from 'react';
import { toast } from 'react-toastify';

import { useGetEventKeyboardShortcut } from '~analyst-ui/common/hotkey-configs/event-hotkey-configs';
import { formatHotkeyString } from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import { useSetCoordinates } from '../ian-map-hooks';

export interface CreateEventMenuItemProps {
  /** In degrees */
  readonly latitude: number;
  /** In degrees */
  readonly longitude: number;

  /** Callback function to display the Create Event dialog as well as provide lat/lon */
  setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
}

/**
 * Custom menu item for creating a new event on the Map display.
 * Displays the provided lat/lon to 3 decimal precision.
 */
export function CreateEventMenuItem(props: CreateEventMenuItemProps) {
  const { latitude, longitude, setCreateEventMenuCb } = props;
  const createEventHotkeyConfig = useGetEventKeyboardShortcut().createNewEvent;
  const [viewableInterval] = useViewableInterval();
  const setCoordinates = useSetCoordinates();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  const selectedSDHypos = useAppSelector(selectSelectedSignalDetectionsCurrentHypotheses);
  const createNewEvent = useCreateNewEvent();

  const createEventOnClick = React.useCallback(async () => {
    // setCreateEventMenuCb defined in ian-map-component
    if (selectedSdIds?.length === 0) setCreateEventMenuCb(true, latitude, longitude);
    else {
      try {
        await createNewEvent(selectedSdIds);
      } catch (e) {
        toast.warn((e as Error).message);
      }
    }
  }, [createNewEvent, latitude, longitude, selectedSdIds, setCreateEventMenuCb]);

  // disable create event context menu option if all selected sd's are deleted
  const allSDsAreDeleted: boolean =
    selectedSDHypos.length > 0 ? selectedSDHypos.filter(sd => !sd.deleted).length === 0 : false;

  // Events cannot be created if there is no open interval
  const noOpenInterval = !(viewableInterval?.startTimeSecs && viewableInterval?.endTimeSecs);

  let tooltipText: string;
  if (noOpenInterval) tooltipText = 'Select an interval to create an event';
  if (allSDsAreDeleted)
    tooltipText = 'Cannot create event. All selected signal detections are deleted.';

  return (
    <>
      <MenuItem2
        className="menu-item-create-event"
        text={
          selectedSdIds.length > 0 ? (
            `Create event`
          ) : (
            <>
              Create event at{' '}
              <span className="menu-item-create-event__lat">
                {setDecimalPrecision(latitude, 3)}°/
              </span>
              <span className="menu-item-create-event__lon">
                {setDecimalPrecision(longitude, 3)}°
              </span>
            </>
          )
        }
        // Display purposes, so use only the first hotkey entry
        label={formatHotkeyString(createEventHotkeyConfig.combos[0])}
        onClick={createEventOnClick}
        disabled={noOpenInterval || allSDsAreDeleted}
        title={tooltipText}
      />
      <MenuItem2
        className="copy-lat-long-create-event"
        text="Copy Latitude/Longitude"
        onClick={async () => {
          setCoordinates({
            latitudeDegrees: setDecimalPrecisionAsNumber(latitude, 3),
            longitudeDegrees: setDecimalPrecisionAsNumber(longitude, 3)
          });
          await navigator.clipboard.writeText(
            `${setDecimalPrecision(latitude, 3)}/${setDecimalPrecision(longitude, 3)}`
          );
        }}
      />
    </>
  );
}
