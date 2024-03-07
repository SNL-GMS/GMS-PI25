import { ProcessingOperation } from '@gms/common-model/lib/channel-segment/types';
import { convertToVersionReference } from '@gms/common-model/lib/faceted';
import type { ProcessingMaskDefinitionsByPhaseByChannel } from '@gms/common-model/lib/processing-mask-definitions/types';
import React from 'react';

import { useGetProcessingAnalystConfigurationQuery } from '../api';
import {
  getProcessingMaskDefinitions,
  shouldSkipGetProcessingMaskDefinitions
} from '../api/data/signal-enhancement/get-processing-mask-definitions';
import type {
  GetProcessingMaskDefinitionsHistory,
  GetProcessingMaskDefinitionsQueryArgs
} from '../api/data/signal-enhancement/types';
import { UIStateError } from '../error-handling/ui-state-error';
import type { AsyncFetchResult } from '../query';
import { selectPhaseSelectorFavorites } from '../state';
import { useRawChannels } from './channel-hooks';
import { useFetchHistoryStatus } from './fetch-history-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useVisibleStations } from './station-definition-hooks';

export const MAX_CHANNELS_PER_REQUEST = 10;

/**
 * Defines async fetch result for the processing mask definition history.
 *
 * @see {@link AsyncFetchResult}
 */
export type GetProcessingMaskDefinitionsHistoryFetchResult = AsyncFetchResult<
  GetProcessingMaskDefinitionsHistory
>;

/**
 * Defines async fetch result for the processing mask definitions. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type ProcessingMaskDefinitionFetchResult = AsyncFetchResult<
  Record<string, ProcessingMaskDefinitionsByPhaseByChannel[]>
>;

/**
 * A hook that can be used to return the current history of the processing mask definitions query.
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the history of the `getProcessingMaskDefinitions` queries
 *
 * @see {@link GetProcessingMaskDefinitionsHistoryFetchResult}
 *
 * @returns the current history of the processing mask definitions query.
 */
export const useGetProcessingMaskDefinitionsRangeHistory = (): GetProcessingMaskDefinitionsHistoryFetchResult => {
  const history = useAppSelector(state => state.data.queries.getProcessingMaskDefinitions);
  return useFetchHistoryStatus<GetProcessingMaskDefinitionsQueryArgs>(history);
};

/**
 * @returns the skipped result for the processing mask definitions query
 */
const useGetProcessingMaskDefinitionsSkippedResult = (): ProcessingMaskDefinitionFetchResult => {
  const result = React.useRef({
    data: undefined,
    pending: 0,
    fulfilled: 0,
    rejected: 0,
    isLoading: false,
    isError: false
  });
  return result.current;
};

/**
 * Helper function that filters out channels we already have
 */
const filterArgChannelsAndPhases = (
  args: GetProcessingMaskDefinitionsQueryArgs,
  reduxData: Record<string, ProcessingMaskDefinitionsByPhaseByChannel[]>
): GetProcessingMaskDefinitionsQueryArgs => {
  const newChannels = args.channels.filter(channel => {
    const reduxRecord = reduxData[channel.name]?.find(
      pmd => pmd.channel.name === channel.name && pmd.channel.effectiveAt === channel.effectiveAt
    );

    // if the channel isn't found in redux it needs to be requested
    if (!reduxRecord) {
      return true;
    }
    const loadedPhases = Object.keys(reduxRecord.processingMaskDefinitionByPhase);
    // Only request a channel if it is missing at least one phase
    return args.phaseTypes.filter(x => loadedPhases.indexOf(x) === -1).length > 0;
  });

  return { ...args, channels: newChannels };
};

/**
 * A hook that issues the requests for the processing mask definitions query.
 *
 * @param args the processing mask definitions query arguments
 */
const useFetchProcessingMaskDefinitionsQuery = (
  args: GetProcessingMaskDefinitionsQueryArgs
): void => {
  const dispatch = useAppDispatch();
  const reduxData = useAppSelector(state => state.data.processingMaskDefinitions);
  // TODO: Remove the arbitrary cap of 100 once the backend end point doesn't time out
  React.useEffect(() => {
    console.log('something changed', args);
    const filteredArgs = filterArgChannelsAndPhases(args, reduxData);
    for (let i = 0; i < filteredArgs.channels.length && i < 100; i += MAX_CHANNELS_PER_REQUEST) {
      const dispatchParam = getProcessingMaskDefinitions({
        ...filteredArgs,
        channels: filteredArgs.channels.slice(i, i + MAX_CHANNELS_PER_REQUEST)
      });

      dispatch(dispatchParam).catch(error => {
        throw new UIStateError(error);
      });
    }
    // Intentionally don't rerun when reduxData changes to prevent thrashing since this populates that value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, args]);

  React.useEffect(() => console.log('args changed', args), [args]);
};

/**
 * A hook that can be used to retrieve processing mask definitions
 *
 * @returns the processing mask definitions result.
 */
export const useProcessingMaskDefinitions = (
  args: GetProcessingMaskDefinitionsQueryArgs
): ProcessingMaskDefinitionFetchResult => {
  const history = useGetProcessingMaskDefinitionsRangeHistory();

  // issue any new fetch requests
  useFetchProcessingMaskDefinitionsQuery(args);

  // retrieve all processing mask definitions from the state
  const processingMaskDefinitions = useAppSelector(state => state.data.processingMaskDefinitions);
  const skippedReturnValue = useGetProcessingMaskDefinitionsSkippedResult();

  return React.useMemo(() => {
    if (shouldSkipGetProcessingMaskDefinitions(args)) {
      return skippedReturnValue;
    }

    return { ...history, data: processingMaskDefinitions };
  }, [args, history, processingMaskDefinitions, skippedReturnValue]);
};

/** A hook that returns processing mask definitions for the favorite phase list
 *
 */
export const useFavoriteProcessingMaskDefinitions = (): Record<
  string,
  ProcessingMaskDefinitionsByPhaseByChannel[]
> => {
  const favorites = useAppSelector(selectPhaseSelectorFavorites);

  const phaseLists = useGetProcessingAnalystConfigurationQuery()?.data?.phaseLists;

  const phases = React.useMemo(() => {
    let phaseArray = [];

    phaseLists.forEach(phaseList => {
      if (!favorites[phaseList.listTitle]) {
        phaseArray = phaseArray.concat(phaseList.favorites);
      } else {
        phaseArray = phaseArray.concat(favorites[phaseList.listTitle]);
      }
    });
    return phaseArray;
  }, [favorites, phaseLists]);

  const fullChannels = useRawChannels();

  const visibleStations = useVisibleStations();

  // filter the channels down to only ones on visible stations and make version references
  const channelVersionReferences = React.useMemo(
    () =>
      fullChannels
        .filter(channel => visibleStations?.find(station => station.name === channel.station.name))
        .map(channel => convertToVersionReference(channel, 'name')),
    [fullChannels, visibleStations]
  );

  const stationGroup = useAppSelector(state => state.app.workflow.stationGroup);
  const startTimeSecs = useAppSelector(state => state.app.workflow.timeRange.startTimeSecs);
  const stationGroupVersionReference = React.useMemo(
    () => ({
      ...stationGroup,
      effectiveAt: startTimeSecs
    }),
    [startTimeSecs, stationGroup]
  );

  // Referentially stable args
  const args = React.useMemo(
    () => ({
      phaseTypes: phases,
      stationGroup: stationGroupVersionReference,
      channels: channelVersionReferences,
      processingOperations: [ProcessingOperation.EVENT_BEAM]
    }),
    [channelVersionReferences, phases, stationGroupVersionReference]
  );

  const result = useProcessingMaskDefinitions(args);

  return result.data;
};
