import type { ChannelSegmentTypes } from '@gms/common-model';
import { UILogger } from '@gms/ui-util';
import { useEffect, useMemo } from 'react';

import type { UiChannelSegment } from '../../types';
import { createChannelSegmentString } from '../../workers/waveform-worker/util/channel-segment-util';
import { selectRawChannels, selectUiChannelSegments } from '../api';
import { getDefaultFilterDefinitionByUsageForChannelSegments } from '../api/data/signal-enhancement/get-filter-definitions-for-channel-segments';
import type { GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs } from '../api/data/signal-enhancement/types';
import { UIStateError } from '../error-handling/ui-state-error';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { usePreferredEventHypothesis } from './signal-detection-hooks';

const logger = UILogger.create(
  'GMS_LOG_SIGNAL_ENHANCEMENT_CONFIGURATION_HOOKS',
  process.env.GMS_LOG_CHANNEL_SEGMENT_HOOKS
);

/**
 * A hook that can be used to return the startimeConcatEndtimeLookupKey's history of the
 * getDefaultFilterDefinitionByUsageForChannelSegments query.
 *
 * @returns array of startimeConcatEndtimeLookupKey's
 */
export const useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory = (): [
  string[],
  string[]
] => {
  const history = useAppSelector(
    state => state.data.queries.getDefaultFilterDefinitionByUsageForChannelSegments
  );

  return useMemo(() => {
    let requestedChannelSegments: string[] = [];
    let requestedChannelSegmentsForEvent: string[] = [];
    Object.values(history).forEach(DefaultFilterDefinitionByUsageForChannelSegmentsRecord =>
      Object.values(DefaultFilterDefinitionByUsageForChannelSegmentsRecord).forEach(request => {
        if (request.arg.eventHypothesis) {
          requestedChannelSegmentsForEvent = [
            ...requestedChannelSegmentsForEvent,
            ...request.arg.channelSegments.map(cs => createChannelSegmentString(cs.id))
          ];
        } else {
          requestedChannelSegments = [
            ...requestedChannelSegments,
            ...request.arg.channelSegments.map(cs => createChannelSegmentString(cs.id))
          ];
        }
      })
    );
    return [requestedChannelSegments, requestedChannelSegmentsForEvent];
  }, [history]);
};

/**
 * Goes through all the uiChannelSegmentsRecords and checks to see if they are
 * from a Raw channel
 *
 * @returns rawUnfilteredUIChannelSegments UiChannelSegment[]
 */
export const useGetRawUnfilteredUIChannelSegments = (): UiChannelSegment[] => {
  const rawChannelsRecord = useAppSelector(selectRawChannels);
  const uiChannelSegmentsRecord = useAppSelector(selectUiChannelSegments);
  return useMemo(() => {
    let rawUiChannelSegments: UiChannelSegment[] = [];
    Object.values(uiChannelSegmentsRecord).forEach(channelSegmentRecord => {
      if (
        channelSegmentRecord?.Unfiltered?.length > 0 &&
        rawChannelsRecord[channelSegmentRecord?.Unfiltered[0].channelSegmentDescriptor.channel.name]
      ) {
        rawUiChannelSegments = rawUiChannelSegments.concat(channelSegmentRecord.Unfiltered);
      }
    });
    return rawUiChannelSegments;
  }, [rawChannelsRecord, uiChannelSegmentsRecord]);
};

/**
 * Goes through all the rawUnfilteredUIChannelSegments and returns as a list of their
 * ChannelSegmentFaceted objects { id: unfilteredUIChannelSegment.channelSegmentDescriptor }
 *
 * @returns rawUnfilteredUIChannelSegmentsFaceted ChannelSegmentTypes.ChannelSegmentFaceted[]
 */
export const useGetRawUnfilteredUniqueIChannelSegmentsFaceted = (): ChannelSegmentTypes.ChannelSegmentFaceted[] => {
  const rawUnfilteredUIChannelSegments = useGetRawUnfilteredUIChannelSegments();
  return useMemo(() => {
    return rawUnfilteredUIChannelSegments.map(unfilteredUIChannelSegment => {
      return { id: unfilteredUIChannelSegment.channelSegmentDescriptor };
    });
  }, [rawUnfilteredUIChannelSegments]);
};

/**
 * A hook that can be used to retrieve and store default filter definitions for channel segments.
 */
export const useGetDefaultFilterDefinitionByUsageForChannelSegments = () => {
  const dispatch = useAppDispatch();
  const rawChannelSegments: ChannelSegmentTypes.ChannelSegmentFaceted[] = useGetRawUnfilteredUniqueIChannelSegmentsFaceted();

  const [
    requestedChannelSegments,
    requestedChannelSegmentsForEvent
  ] = useDefaultFilterDefinitionByUsageForChannelSegmentsQueryHistory();
  const viewableInterval = useAppSelector(state => state.app.waveform.viewableInterval);
  const eventHypothesis = usePreferredEventHypothesis();

  useEffect(() => {
    if (rawChannelSegments?.length) {
      logger.debug('calling GetDefaultFilterDefinitionByUsageForChannelSegmentsQuery');
      const channelSegments = rawChannelSegments.filter(cs => {
        if (
          // we already have data for the CS so we skip it
          requestedChannelSegments.includes(createChannelSegmentString(cs.id))
        ) {
          return false;
        }
        return true;
      });
      const channelSegmentsWithEvent = rawChannelSegments.filter(cs => {
        if (
          // we already have data for the CS so we skip it
          requestedChannelSegmentsForEvent.includes(createChannelSegmentString(cs.id))
        ) {
          return false;
        }
        return true;
      });

      if (viewableInterval && channelSegments?.length) {
        const requestArgs: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs = {
          // filter out cs that we have data for
          interval: viewableInterval,
          channelSegments
        };

        dispatch(getDefaultFilterDefinitionByUsageForChannelSegments(requestArgs)).catch(error => {
          throw new UIStateError(error);
        });
      }

      if (viewableInterval && channelSegmentsWithEvent?.length) {
        const requestArgs: GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs = {
          // filter out cs that we have data for
          interval: viewableInterval,
          channelSegments: channelSegmentsWithEvent,
          eventHypothesis
        };

        dispatch(getDefaultFilterDefinitionByUsageForChannelSegments(requestArgs)).catch(error => {
          throw new UIStateError(error);
        });
      }
    }
  }, [
    dispatch,
    rawChannelSegments,
    requestedChannelSegments,
    viewableInterval,
    eventHypothesis,
    requestedChannelSegmentsForEvent
  ]);
};
