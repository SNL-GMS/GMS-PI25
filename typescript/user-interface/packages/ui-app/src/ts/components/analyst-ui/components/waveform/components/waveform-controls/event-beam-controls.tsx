import { ButtonToolbarItem } from '@gms/ui-core-components';
import React from 'react';

export function EventBeamControls({
  currentOpenEventId,
  setEventBeamDialogVisibility
}: {
  currentOpenEventId: string;
  setEventBeamDialogVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <ButtonToolbarItem
      key="Event beam"
      label="Event Beam"
      tooltip="Event beam settings. Create event beams (hotkey: b). Open an event to enable"
      disabled={currentOpenEventId === undefined}
      onButtonClick={() => setEventBeamDialogVisibility(true)}
    />
  );
}
