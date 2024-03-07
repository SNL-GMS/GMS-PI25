import React from 'react';

import { useSignalDetectionConfigKeyDown } from './signal-detection-hotkey-configs';

export interface MapHotkeysProps {
  selectedSignalDetectionsIds: string[];
  setPhaseMenuVisibility: (value: boolean) => void;
  setCreateEventMenuVisibility: (value: boolean) => void;
}

/**
 * !This component takes focus in order to prevent Cesium from clobbering keyboard events.
 * !Be mindful of where you're placing it in the component tree.
 *
 * @returns the HotkeyConfiguration for the map display
 */
export const MapHotkeys = React.memo(function MapHotkeys({
  selectedSignalDetectionsIds,
  setPhaseMenuVisibility,
  setCreateEventMenuVisibility,
  children
}: React.PropsWithChildren<MapHotkeysProps>) {
  const containerRef = React.useRef<HTMLDivElement>();

  const handleKeyDown = useSignalDetectionConfigKeyDown(
    selectedSignalDetectionsIds,
    setPhaseMenuVisibility,
    setCreateEventMenuVisibility
  );

  // !This component taking focus is necessary, otherwise the Cesium map will take
  // !focus and suppress all keyboard events.
  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={{ height: '100%' }}
      role="tab"
      tabIndex={-1}
      onMouseEnter={() => {
        containerRef.current?.focus();
      }}
      onMouseLeave={() => {
        containerRef.current?.blur();
      }}
      onClick={() => {
        containerRef.current?.focus();
      }}
    >
      {children}
    </div>
  );
});
