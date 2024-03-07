import { UNFILTERED } from '@gms/common-model/lib/filter/types';
import { useEffect, useMemo } from 'react';

import {
  selectBeamedChannels,
  selectFilteredChannels,
  selectRawChannels,
  selectUiChannelSegments
} from '../api';
import { getChannelsByNamesTimeRange } from '../api/data/channel/get-channels-by-names-timerange';
import { UIStateError } from '../error-handling/ui-state-error';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useGetSignalDetections } from './signal-detection-hooks';
import { useAllStations } from './station-definition-hooks';
import { useViewableInterval } from './waveform-hooks';

/**
 * Uses a selector to return an array of channels
 *
 * @returns returns an array of channels
 */
export const useChannels = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  const beamedChannels = useAppSelector(selectBeamedChannels);
  return useMemo(() => {
    return [...Object.values(rawChannels), ...Object.values(beamedChannels)];
  }, [rawChannels, beamedChannels]);
};

/**
 * Uses a selector to return an array of raw channels
 *
 * @returns returns an array of channels
 */
export const useRawChannels = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  return useMemo(() => {
    return Object.values(rawChannels);
  }, [rawChannels]);
};

/**
 * Uses a selector to return an array of derived channels
 *
 * @returns returns an array of channels
 */
export const useBeamedChannels = () => {
  const beamedChannels = useAppSelector(selectBeamedChannels);
  return useMemo(() => {
    return Object.values(beamedChannels);
  }, [beamedChannels]);
};

/**
 * Uses a selector to return the channel record
 *
 * @returns returns a channel record
 */
export const useUnfilteredChannelsRecord = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  const beamedChannels = useAppSelector(selectBeamedChannels);
  return useMemo(() => {
    return { ...rawChannels, ...beamedChannels };
  }, [rawChannels, beamedChannels]);
};

/**
 * Uses a selector to return all channels from the channel record
 *
 * @returns returns a channel record
 */
export const useAllChannelsRecord = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  const beamedChannels = useAppSelector(selectBeamedChannels);
  const filteredChannels = useAppSelector(selectFilteredChannels);
  return useMemo(() => {
    return { ...rawChannels, ...beamedChannels, ...filteredChannels };
  }, [rawChannels, beamedChannels, filteredChannels]);
};

/**
 * Gets the history of the channels requested by the getChannelsByNamesTimeRange fetch
 * requests
 *
 * @returns returns an array of channels
 */
export const useGetChannelsByNamesHistory = () => {
  const [viewableInterval] = useViewableInterval();
  const history = useAppSelector(state => state.data.queries.getChannelsByNamesTimeRange);

  return useMemo(() => {
    // Nothing has been requested yet
    if (
      !viewableInterval ||
      !history ||
      typeof history[viewableInterval.startTimeSecs] === 'undefined' ||
      history[viewableInterval.startTimeSecs] === null
    ) {
      return [];
    }

    return Object.values(history[viewableInterval.startTimeSecs]).flatMap(
      hist => hist.arg.channelNames
    );
  }, [history, viewableInterval]);
};

/**
 * Queries for all channels, without consideration for their visibility
 *
 * Uses the `useGetSignalDetections` hook to get derived channels.
 */
export const useGetChannelsQuery = () => {
  const dispatch = useAppDispatch();
  const [viewableInterval] = useViewableInterval();

  // useGetSignalDetections will populate uiChannelSegments with derived channels
  // so it must be called here to get ALL channels, not just raw
  useGetSignalDetections();

  const allStations = useAllStations();
  const uiChannelSegments = useAppSelector(selectUiChannelSegments);
  const cachedChannelNames = useGetChannelsByNamesHistory();

  const newRawChannelNames = useMemo(() => {
    if (!allStations) return [];
    const allRawChannelNames = allStations.flatMap(station =>
      station.allRawChannels.map(channel => channel.name)
    );
    return allRawChannelNames.filter(name => cachedChannelNames.indexOf(name) < 0);
  }, [allStations, cachedChannelNames]);

  const newDerivedChannelNames = useMemo(() => {
    const allChannelsSet = new Set(
      Object.values(uiChannelSegments).flatMap(value => {
        if (!value[UNFILTERED]) return [];
        return value[UNFILTERED].map(
          uiChannelSegment => uiChannelSegment.channelSegment.id.channel.name
        );
      })
    );
    // Unique list of all channel names
    return Array.from(allChannelsSet).filter(name => cachedChannelNames.indexOf(name) < 0);
  }, [uiChannelSegments, cachedChannelNames]);

  const newChannelNames = useMemo(() => {
    return [...newRawChannelNames, ...newDerivedChannelNames];
  }, [newRawChannelNames, newDerivedChannelNames]);

  // Returns the interval extended to include the channels start / end times
  // This is required because event requests can return channels out of the current viewable interval.
  const extendedInterval = useMemo(() => {
    if (!viewableInterval?.startTimeSecs || !viewableInterval?.endTimeSecs) return viewableInterval;
    const flatUiChannelSegments = Object.values(uiChannelSegments)
      .flatMap(filterRecord => Object.values(filterRecord).flatMap(cs => cs))
      .filter(cs => newChannelNames.indexOf(cs.channelSegmentDescriptor.channel.name) >= 0);

    return flatUiChannelSegments.reduce(
      (interval, cs) => ({
        ...interval,
        startTimeSecs: Math.min(interval.startTimeSecs, cs.channelSegmentDescriptor.startTime),
        endTimeSecs: Math.max(interval.endTimeSecs, cs.channelSegmentDescriptor.endTime)
      }),
      { ...viewableInterval }
    );
  }, [newChannelNames, uiChannelSegments, viewableInterval]);

  useEffect(() => {
    dispatch(
      getChannelsByNamesTimeRange({
        channelNames: newChannelNames,
        startTime: extendedInterval?.startTimeSecs,
        endTime: extendedInterval?.endTimeSecs
      })
    ).catch(error => {
      throw new UIStateError(error);
    });
  }, [newChannelNames, dispatch, extendedInterval?.startTimeSecs, extendedInterval?.endTimeSecs]);
};
