import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import { useSetSignalDetectionActionTargets } from '@gms/ui-state';
import React from 'react';

import type { SignalDetectionDetailsProps } from '~analyst-ui/common/dialogs/signal-detection-details/types';
import { SignalDetectionContextMenuContent } from '~analyst-ui/common/menus/signal-detection-context-menu';

/**
 * Props which are passed to the {@link MapSignalDetectionContextMenuContent} externally
 * (via an imperative callback function)
 */
export interface MapSignalDetectionContextMenuProps {
  /** For right-clicking a specific Cesium SD entity */
  readonly sdId: string;
  /** In degrees */
  readonly latitude: number;
  /** In degrees */
  readonly longitude: number;
  readonly signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
}

/**
 * Displays the Map Signal Detection Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapSignalDetectionContextMenu = React.memo(
  function MapSignalDetectionContextMenu(props: {
    getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<MapSignalDetectionContextMenuProps>;
    signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<SignalDetectionDetailsProps>;
    setPhaseMenuVisibilityCb: (visibility: boolean) => void;
    /** Callback function to display the Create Event dialog as well as provide lat/lon */
    setCreateEventMenuCb: (visibility: boolean, lat: number, lon: number) => void;
  }): JSX.Element {
    const {
      getOpenCallback,
      signalDetectionDetailsCb,
      setPhaseMenuVisibilityCb,
      setCreateEventMenuCb
    } = props;
    const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();

    const content = React.useCallback(
      (p: MapSignalDetectionContextMenuProps) => {
        return (
          <SignalDetectionContextMenuContent
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...p}
            keyPrefix="map-sd"
            signalDetectionDetailsCb={signalDetectionDetailsCb}
            setPhaseMenuVisibilityCb={setPhaseMenuVisibilityCb}
            createEventMenuProps={{
              setCreateEventMenuCb,
              latitude: p?.latitude,
              longitude: p?.longitude
            }}
          />
        );
      },
      [signalDetectionDetailsCb, setPhaseMenuVisibilityCb, setCreateEventMenuCb]
    );

    return (
      <ImperativeContextMenu<MapSignalDetectionContextMenuProps>
        content={content}
        getOpenCallback={getOpenCallback}
        onClose={() => setSignalDetectionActionTargets([])}
      />
    );
  }
);
