import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { WithNonIdealStates } from '@gms/ui-core-components';
import type { SignalDetectionFetchResult } from '@gms/ui-state';
import {
  selectOpenIntervalName,
  useAppDispatch,
  useAppSelector,
  useBeamformingTemplatesForFK,
  useColorMap,
  useEffectiveTime,
  useEventStatusQuery,
  useGetAllStationsQuery,
  useGetChannelSegments,
  useGetEvents,
  useGetFkChannelSegments,
  useGetFkFrequencyThumbnails,
  useGetSignalDetections,
  useMarkFkReviewed,
  useUiTheme,
  useViewableInterval
} from '@gms/ui-state';
import React from 'react';

import { AnalystNonIdealStates } from '~analyst-ui/common/non-ideal-states';
import { BaseDisplay } from '~common-ui/components/base-display';
import { CommonNonIdealStateDefs } from '~common-ui/components/non-ideal-states';

import { AzimuthSlowness } from './azimuth-slowness-component';
import type { AzimuthSlownessProps } from './types';

interface AzimuthSlownessNonIdealStateProps extends Omit<AzimuthSlownessProps, 'signalDetections'> {
  signalDetectionResults: SignalDetectionFetchResult;
}

const AzimuthSlownessOrNonIdealState = WithNonIdealStates<
  AzimuthSlownessNonIdealStateProps,
  AzimuthSlownessProps
>(
  [
    ...CommonNonIdealStateDefs.baseNonIdealStateDefinitions,
    ...AnalystNonIdealStates.processingAnalystConfigNonIdealStateDefinitions,
    ...AnalystNonIdealStates.stationDefinitionNonIdealStateDefinitions,
    ...AnalystNonIdealStates.signalDetectionsNonIdealStateDefinitions
  ],
  AzimuthSlowness
);

export function AzimuthSlownessDataInjector(props: AzimuthSlownessProps) {
  const { glContainer } = props;
  const dispatch = useAppDispatch();
  const [viewableInterval] = useViewableInterval();
  const signalDetectionQuery = useGetSignalDetections();
  const channelSegmentQuery = useGetChannelSegments(viewableInterval);
  const stationQuery = useGetAllStationsQuery(useEffectiveTime());
  const eventQuery = useGetEvents();
  const eventStatusQuery = useEventStatusQuery();
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const fkChannelSegments = useGetFkChannelSegments();
  const fkFrequencyThumbnails = useGetFkFrequencyThumbnails();
  const markFkReviewed = useMarkFkReviewed();
  const [uiTheme] = useUiTheme();
  // TODO: calling fk beamforming templates to verify, remove later
  useBeamformingTemplatesForFK();

  const [colorMap] = useColorMap();
  return (
    <BaseDisplay
      tabName={IanDisplays.WAVEFORM}
      glContainer={glContainer}
      className="azimuth-slowness"
      data-cy="azimuth-slowness"
    >
      <AzimuthSlownessOrNonIdealState
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        dispatch={dispatch}
        signalDetectionResults={signalDetectionQuery}
        channelSegmentResults={channelSegmentQuery}
        stationsQuery={stationQuery}
        eventResults={eventQuery}
        eventStatusQuery={eventStatusQuery}
        uiTheme={uiTheme}
        openIntervalName={openIntervalName}
        fkChannelSegments={fkChannelSegments}
        fkFrequencyThumbnails={fkFrequencyThumbnails}
        markFkReviewed={markFkReviewed}
        colorMap={colorMap}
      />
    </BaseDisplay>
  );
}
