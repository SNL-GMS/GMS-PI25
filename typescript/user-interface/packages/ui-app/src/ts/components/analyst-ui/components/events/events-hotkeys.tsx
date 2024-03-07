import { useHotkeys } from '@blueprintjs/core';
import React from 'react';

import { useCreateNewEventHotkeyConfig } from '~analyst-ui/common/hotkey-configs/event-hotkey-configs';

export interface EventsHotkeysProps {
  setCreateEventMenuVisibility: (value: boolean) => void;
}

/**
 * Wrapper component to handle hotkeys for Events actions
 *
 * @returns wrapper component to handle hotkey actions when triggered
 */
export function InternalEventsHotkeys({
  setCreateEventMenuVisibility,
  children
}: React.PropsWithChildren<EventsHotkeysProps>) {
  const createNewEventHotKeyConfig = useCreateNewEventHotkeyConfig(setCreateEventMenuVisibility);

  const config = React.useMemo(() => {
    // combine hotkey configurations
    return [...createNewEventHotKeyConfig];
  }, [createNewEventHotKeyConfig]);

  const { handleKeyDown } = useHotkeys(config);

  return (
    <div onKeyDown={handleKeyDown} style={{ height: '100%' }} role="tab" tabIndex={-1}>
      {children}
    </div>
  );
}

export const EventsHotkeys = React.memo(InternalEventsHotkeys);
