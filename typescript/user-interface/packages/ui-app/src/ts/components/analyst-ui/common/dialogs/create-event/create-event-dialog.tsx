import { Button, Dialog, DialogBody, DialogFooter, Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { setDecimalPrecision } from '@gms/common-util';
import {
  DialogItem,
  DialogTitle,
  FormMessage,
  NumericInput,
  TimePicker
} from '@gms/ui-core-components';
import type { Message } from '@gms/ui-core-components/lib/components/ui-widgets/form/types';
import { selectCoordinates, useAppSelector, useCreateVirtualEvent } from '@gms/ui-state';
import React from 'react';

import { useInitialEventDate } from './create-event-hooks';
import {
  depthValidationDefs,
  latitudeValidationDefs,
  longitudeValidationDefs,
  useDateRangeValidationDefs
} from './create-event-validation-defs';

const coordinatePasteButtonTooltip = 'Paste latitude & longitude from copied Map coordinates';
const coordinatePasteButtonDisabledTooltip =
  'Copy a latitude & longitude value from the Map Display to enable';

interface CreateEventDialogProps {
  /**
   * A callback that is invoked when user interaction causes the overlay to close, such as
   * clicking on the overlay or pressing the esc key (if enabled).
   *
   * Receives the event from the user's interaction, if there was an event (generally either
   * a mouse or key event).
   *
   * Note that, since this component is controlled by the isOpen prop, it will not actually close
   * itself until that prop becomes false.
   */
  onClose: (event: React.SyntheticEvent<HTMLElement, Event>) => void;
  isOpen: boolean;
  /** Latitude in degrees, can be used as the initial field value when the dialog is opened */
  lat?: number;
  /** Longitude in degrees, can be used as the initial field value when the dialog is opened */
  lon?: number;
}

/**
 * Dialog component to create a new virtual event.
 */
export function CreateEventDialog({ isOpen, onClose, lat, lon }: CreateEventDialogProps) {
  const initialEventDate = useInitialEventDate();
  const createVirtualEvent = useCreateVirtualEvent();

  /** Validation to ensure the selected date is within the viewable interval */
  const dateRangeValidationDefs = useDateRangeValidationDefs();

  const coordinates = useAppSelector(selectCoordinates);

  const latLongPrecision = 3;
  const displayLat = setDecimalPrecision(lat, latLongPrecision);
  const displayLon = setDecimalPrecision(lon, latLongPrecision);

  // EventDate state
  const [eventDate, setEventDate] = React.useState<Date>(initialEventDate);
  const [eventDateHold, setEventDateHold] = React.useState(false);
  const [eventDateInvalidMsg, setEventDateInvalidMsg] = React.useState<Message>(undefined);

  /** Latitude state. Values should be strings to allow decimals, per Blueprint documentation */
  const [latitude, setLatitude] = React.useState<string>('0');
  const [latInvalidMsg, setLatInvalidMsg] = React.useState<Message>(undefined);

  /** Longitude state. Values should be strings to allow decimals, per Blueprint documentation */
  const [longitude, setLongitude] = React.useState<string>('0');
  const [lonInvalidMsg, setLonInvalidMsg] = React.useState<Message>(undefined);

  /** Depth state. Values should be strings to allow decimals, per Blueprint documentation */
  const [depth, setDepth] = React.useState<string>('0');
  const [depthInvalidMsg, setDepthInvalidMsg] = React.useState<Message>(undefined);

  /** Update display values if applicable */
  const internalOnOpen = React.useCallback(() => {
    if (displayLat && displayLon) {
      setLatitude(displayLat);
      setLongitude(displayLon);
    }

    // Blueprint DateInput2 handles converting the timezone to UTC
    setEventDate(initialEventDate);
  }, [displayLat, displayLon, initialEventDate]);

  /**
   * Reset all state when menu is closed, this prevents "carry-over" input
   * when the user re-opens the menu (or inconsistency if the dialog is opened from another display)
   */
  const internalOnClose = React.useCallback(
    (event: React.SyntheticEvent<HTMLElement, Event>) => {
      // Reset all state when menu is closed
      onClose(event);
      setEventDate(new Date());
      setEventDateHold(false);
      setEventDateInvalidMsg(undefined);
      setLatitude('0');
      setLatInvalidMsg(undefined);
      setLongitude('0');
      setLonInvalidMsg(undefined);
      setDepth('0');
      setDepthInvalidMsg(undefined);
    },
    [onClose]
  );

  /** Memoized click handler to create a new virtual event. Automatically closes the dialog. */
  const createEventOnClick = React.useCallback(
    async (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      await createVirtualEvent(
        eventDate,
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(depth)
      );
      internalOnClose(event);
    },
    [createVirtualEvent, depth, eventDate, internalOnClose, latitude, longitude]
  );

  const errorMessage = eventDateInvalidMsg || latInvalidMsg || lonInvalidMsg || depthInvalidMsg;

  /** Referentially stable change handler for numeric input */
  const onNumericInputChange = React.useCallback(
    (stateSetter: React.Dispatch<React.SetStateAction<string>>) => (value: number | string) => {
      stateSetter(value as string);
    },
    []
  );

  const latLonMinorStepSize = 0.000001;
  const depthMinorStepSize = 0.0001;

  return (
    <Dialog
      isOpen={isOpen}
      onOpening={internalOnOpen}
      onClose={internalOnClose}
      className="create-event__dialog"
      shouldReturnFocusOnClose
      title={<DialogTitle titleText="Create Event" />}
      isCloseButtonShown
    >
      <DialogBody className="create-event__dialog-body">
        <DialogItem
          label="Event time:"
          value={
            <TimePicker
              fillWidth
              date={eventDate}
              datePickerEnabled
              onChange={setEventDate}
              invalidFormatMessage={{ summary: 'Invalid event time', intent: 'danger' }}
              hasHold={eventDateHold}
              setHold={setEventDateHold}
              validationDefinitions={dateRangeValidationDefs}
              onError={setEventDateInvalidMsg}
            />
          }
        />
        <DialogItem
          label="Lat (°):"
          value={
            <NumericInput
              className="monospace"
              value={latitude}
              minorStepSize={latLonMinorStepSize}
              validationDefinitions={latitudeValidationDefs}
              onChange={onNumericInputChange(setLatitude)}
              onError={setLatInvalidMsg}
              tooltip=""
            />
          }
        />
        <DialogItem
          label="Lon (°):"
          value={
            <NumericInput
              className="monospace"
              value={longitude}
              minorStepSize={latLonMinorStepSize}
              validationDefinitions={longitudeValidationDefs}
              onChange={onNumericInputChange(setLongitude)}
              onError={setLonInvalidMsg}
              tooltip=""
            />
          }
        />
        <DialogItem
          label="Depth (km):"
          value={
            <NumericInput
              className="monospace"
              value={depth}
              minorStepSize={depthMinorStepSize}
              validationDefinitions={depthValidationDefs}
              onChange={onNumericInputChange(setDepth)}
              onError={setDepthInvalidMsg}
              tooltip=""
            />
          }
        />
      </DialogBody>
      <DialogFooter
        minimal
        actions={
          <>
            <div className="create-event__error">
              <div className="create-event__error-text">
                <FormMessage message={errorMessage} />
              </div>
            </div>
            <Button
              text="Create"
              intent={Intent.PRIMARY}
              disabled={!!errorMessage}
              title={errorMessage?.summary || 'Create new event'}
              onClick={createEventOnClick}
            />
            <Button text="Cancel" onClick={internalOnClose} />
            <Button
              icon={IconNames.Clipboard}
              title={
                coordinates != null
                  ? coordinatePasteButtonTooltip
                  : coordinatePasteButtonDisabledTooltip
              }
              disabled={coordinates == null}
              onClick={() => {
                setLatitude(coordinates.latitudeDegrees.toString());
                setLongitude(coordinates.longitudeDegrees.toString());
              }}
            />
          </>
        }
      />
    </Dialog>
  );
}
