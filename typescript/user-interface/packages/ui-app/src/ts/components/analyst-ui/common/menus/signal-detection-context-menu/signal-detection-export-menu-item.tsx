import { IconNames } from '@blueprintjs/icons';
import { MenuItem2 } from '@blueprintjs/popover2';
import {
  AnalystWaveformSelectors,
  selectFilterDefinitions,
  selectSelectedSignalDetections,
  useAppSelector,
  useGetChannelSegments,
  useViewableInterval
} from '@gms/ui-state';
import React from 'react';

import { exportChannelSegmentsBySelectedSignalDetections } from '../../utils/signal-detection-util';

/**
 * The type of the props for the {@link WaveformExportMenuItem} component
 */
export interface WaveformExportMenuItemProps {
  readonly keyPrefix: string;
}

/**
 * Creates an export menu option bound to redux for access to signal detection UiChannelSegments
 */
export function WaveformExportMenuItem({ keyPrefix }: WaveformExportMenuItemProps) {
  const [viewableInterval] = useViewableInterval();
  const channelSegmentResults = useGetChannelSegments(viewableInterval);
  const uiChannelSegments = channelSegmentResults.data;
  const channelFilters = useAppSelector(AnalystWaveformSelectors.selectChannelFilters);
  const filterDefinitions = useAppSelector(selectFilterDefinitions);
  const selectedSignalDetections = useAppSelector(selectSelectedSignalDetections);

  return (
    <MenuItem2
      key={`${keyPrefix}-waveform-export`}
      text="Export"
      icon={IconNames.EXPORT}
      onClick={async () => {
        await exportChannelSegmentsBySelectedSignalDetections(
          selectedSignalDetections,
          uiChannelSegments,
          channelFilters,
          filterDefinitions
        );
      }}
      data-cy="menu-item-export"
    />
  );
}
