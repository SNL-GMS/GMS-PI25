import type { ChannelTypes, FilterTypes, WaveformTypes } from '@gms/common-model';
import {
  getCombinedFilterId,
  getFilterName,
  isFilterError
} from '@gms/common-model/lib/filter/filter-util';
import type { Filter, FilterDefinition, FilterList } from '@gms/common-model/lib/filter/types';
import { FilterError } from '@gms/common-model/lib/filter/types';
import type { SignalDetectionHypothesis } from '@gms/common-model/lib/signal-detection/types';
import { Timer } from '@gms/common-util';
import { UILogger, usePrevious } from '@gms/ui-util';
import { UNFILTERED } from '@gms/weavess-core/lib/types';
import produce from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import React, { useEffect, useMemo, useRef } from 'react';
import { batch } from 'react-redux';

import type {
  ChannelFilterRecord,
  ChannelSegmentsToSignalDetectionHypothesisRecord,
  FilterDefinitionsForChannelSegmentsRecord,
  FilterDefinitionsForSignalDetectionsRecord,
  FilterDefinitionsRecord,
  ProcessedItemsCacheRecord,
  SampleRate,
  UiChannelSegment,
  UIChannelSegmentRecord
} from '../../types';
import type { FilterDescriptor, FilterResult } from '../../workers/api/ui-filter-processor';
import { designFilterDefinitions, filter } from '../../workers/api/ui-filter-processor';
import { createChannelSegmentString } from '../../workers/waveform-worker/util/channel-segment-util';
import type { ProcessingAnalystConfigurationQuery } from '../api';
import {
  addDesignedFilterDefinitions,
  addFilteredChannels,
  addFilteredChannelSegments,
  selectDefaultFilterDefinitionByUsageForChannelSegments,
  selectFilterDefinitions,
  selectFilterDefinitionsForSignalDetections,
  useGetFilterListsDefinitionQuery,
  useGetProcessingAnalystConfigurationQuery
} from '../api';
import {
  analystActions,
  AnalystWorkspaceOperations,
  selectHotkeyCycle,
  selectSelectedFilter,
  selectSelectedFilterIndex,
  selectSelectedFilterList,
  selectSelectedSdIds,
  selectWorkflowIntervalUniqueId,
  waveformActions,
  waveformSlice
} from '../state';
import type { HotkeyCycleList } from '../state/analyst/types';
import { selectSelectedStationsAndChannelIds } from '../state/common/selectors';
import { selectChannelFilters } from '../state/waveform/selectors';
import { isRawChannel } from '../util/channel-factory-util';
import { OrderedPriorityQueue } from '../util/ordered-priority-queue';
import { useUnfilteredChannelsRecord } from './channel-hooks';
import {
  useChannelSegmentsToSignalDetectionHypothesis,
  useVisibleChannelSegments
} from './channel-segment-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useSignalDetectionHypotheses } from './signal-detection-hooks';
import { useAllStations, useVisibleStations } from './station-definition-hooks';
import { useViewportVisibleStations } from './waveform-hooks';

const logger = UILogger.create('GMS_LOG_FILTERS', process.env.GMS_LOG_FILTERS);

/**
 * @returns a setter function that dispatches an update to the redux store, updating the filter list.
 */
export const useSetFilterList = (): ((fl: FilterTypes.FilterList | string) => void) => {
  const dispatch = useAppDispatch();
  const filterQuery = useGetFilterListsDefinitionQuery();
  const filterLists = filterQuery.data?.filterLists;
  const stations = useAllStations();
  return React.useCallback(
    (fl: FilterTypes.FilterList | string) => {
      batch(() => {
        let filterList;
        if (typeof fl === 'string') {
          filterList = filterLists.find(f => f.name === fl);
          if (!filterList) {
            throw new Error(`Filter list ${fl} not found`);
          }
        } else {
          filterList = fl;
        }
        dispatch(analystActions.setSelectedFilterList(filterList.name));
        dispatch(analystActions.setSelectedFilterIndex(filterList.defaultFilterIndex));
        dispatch(AnalystWorkspaceOperations.setDefaultFilterForStations(stations));
      });
    },
    [dispatch, filterLists, stations]
  );
};

/**
 * @returns the name of the preferred filter list for the currently open activity (interval)
 */
export const usePreferredFilterListForActivity = (): string => {
  const filterListQuery = useGetFilterListsDefinitionQuery();
  const openActivityNames = useAppSelector(state => state.app.workflow.openActivityNames);
  const preferredFilterList = filterListQuery.data?.preferredFilterListByActivity.find(
    pf => pf.workflowDefinitionId.name === openActivityNames[0]
  );
  return preferredFilterList?.name;
};

/**
 * @returns the selected filter list, derived from the selected filter name and the filter lists from the signal-enhancement query
 * If no filter list is selected, will update the redux store to select the default filter list, and return that.
 */
export const useSelectedFilterList = (): FilterTypes.FilterList => {
  const filterListQuery = useGetFilterListsDefinitionQuery();
  const result = useAppSelector(selectSelectedFilterList);
  const dispatch = useAppDispatch();
  const preferred = usePreferredFilterListForActivity();
  React.useEffect(() => {
    // select the preferred filter list if none was already selected
    if (!result) {
      dispatch(analystActions.setSelectedFilterList(preferred));
    }
  }, [dispatch, preferred, result]);
  if (!result && filterListQuery?.data) {
    return filterListQuery?.data?.filterLists?.find(fl => fl.name === preferred);
  }
  return result;
};

/**
 * Returns the default filter for the selected filter list
 * or Unfiltered if default filter is not found
 *
 * @returns the default filter
 */
export function useDefaultFilter() {
  const filterList: FilterList = useSelectedFilterList();

  return useMemo(() => {
    const defaultFilter = filterList?.filters[filterList?.defaultFilterIndex];
    const unfiltered = filterList?.filters.find(f => f.unfiltered);
    return defaultFilter || unfiltered;
  }, [filterList]);
}

/**
 * Returns the default filter name for the selected filter list
 * or Unfiltered if default filter is not found
 *
 * @returns the default filter name
 */
export function useDefaultFilterName() {
  const defaultFilter: FilterTypes.Filter = useDefaultFilter();

  return useMemo(() => getFilterName(defaultFilter), [defaultFilter]);
}

/**
 * Will find all the unique sampleRates within uiChannelSegments by dataSegments.
 *
 * @param uiChannelSegments the uiChannelSegments will be used to find all unique sample rates
 * @param cachedFilterDefinitionsBySampleRate current record of cached filter definitions
 * @returns unique sample rates found in the given uiChannelSegments
 */
function getSampleRatesToDesign(
  uiChannelSegments: UiChannelSegment[],
  cachedFilterDefinitionsBySampleRate: Record<SampleRate, FilterDefinition> = {}
): number[] {
  const sampleRateMap = new Set([]);
  const filterDefinitionSampleRates = Object.keys(cachedFilterDefinitionsBySampleRate).map(key =>
    Number(key)
  );
  uiChannelSegments.forEach(({ channelSegment }) => {
    channelSegment.timeseries.forEach(timeseries => {
      const waveform = timeseries as WaveformTypes.Waveform;
      // If the sample rate does not exist in the cached filter definition sample rates
      if (
        waveform._uiClaimCheckId &&
        filterDefinitionSampleRates?.indexOf(waveform.sampleRateHz) < 0
      ) {
        sampleRateMap?.add(waveform.sampleRateHz);
      }
    });
  });

  return Array.from(sampleRateMap);
}

/**
 * For any sample rate in the given ui channel segments, this will design
 * new versions of the filterDefinition given if they do not already exist in the cache.
 *
 * @param filterDefinition the current filter definition
 * @param uiChannelSegments the ui channel segments the filter will eventually apply to
 * @param cachedFilterDefinitions existing list of cached filter definitions
 * @param groupDelaySec the group delay seconds config setting
 * @param sampleRateToleranceHz the sample rate tolerance in hertz config setting
 * @param taper the taper config setting
 * @param removeGroupDelay the remove group delay config setting
 * @returns an object containing the newly created filter definitions as an array, and
 * an updated record of all cached and created filter definitions
 */
async function designFiltersAndGetUpdatedFilterDefinitions(
  channelName: string,
  currentFilter: Filter,
  uiChannelSegments: UiChannelSegment[],
  cachedFilterDefinitions: FilterDefinitionsRecord,
  groupDelaySecs: number,
  sampleRateToleranceHz: number,
  taper: number,
  removeGroupDelay: boolean,
  handleFilterError: (error: FilterError) => void
): Promise<{
  newFilterDefinitions: FilterDefinition[];
  filterDefinitionRecord: FilterDefinitionsRecord;
}> {
  const sampleRatesToDesign = getSampleRatesToDesign(
    uiChannelSegments,
    cachedFilterDefinitions[currentFilter.filterDefinition.name]
  );

  const newFilterDefinitions: FilterDefinition[] = [];
  let filterDefinitionRecord = { ...cachedFilterDefinitions };

  // Avoid running designFilterDefinitions if possible
  if (sampleRatesToDesign.length) {
    await designFilterDefinitions(
      [currentFilter.filterDefinition],
      sampleRatesToDesign,
      groupDelaySecs,
      sampleRateToleranceHz,
      taper,
      removeGroupDelay
    ).then((promises: PromiseSettledResult<FilterTypes.FilterDefinition>[]) => {
      promises.forEach(p => {
        if (p.status === 'fulfilled') {
          newFilterDefinitions.push(p.value);
        } else {
          const failedChannelSegments = uiChannelSegments.filter(({ channelSegment }) => {
            return channelSegment.timeseries.find(timeseries => {
              const waveform = timeseries as WaveformTypes.Waveform;
              // If the sample rate does not exist in the cached filter definition sample rates
              return waveform._uiClaimCheckId && waveform.sampleRateHz === p.reason.sampleRateHz;
            });
          });

          failedChannelSegments.forEach(failedChannelSegment => {
            handleFilterError(
              new FilterError(
                `Error designing filter ${currentFilter.filterDefinition.name} for sample rate ${p.reason.sampleRateHz}`,
                getCombinedFilterId(currentFilter, currentFilter.filterDefinition),
                channelName,
                createChannelSegmentString(failedChannelSegment.channelSegmentDescriptor)
              )
            );
          });
        }
      });
    });

    // Overwrite with newly updated definitions if we have newly designed filter defs
    filterDefinitionRecord = produce(cachedFilterDefinitions, draft => {
      // Update the record with new filter definitions
      newFilterDefinitions.forEach(fd => {
        if (!draft[fd.name]) draft[fd.name] = {};
        draft[fd.name][fd.filterDescription.parameters.sampleRateHz] = fd;
      });
    });
  }

  return Promise.resolve({
    newFilterDefinitions,
    filterDefinitionRecord
  });
}

/**
 * Provides a callback that puts additional bounds around the filter function
 * to revert to unfiltered (or the default filtered) data in case of an error with the
 * ui-filter-processor.
 *
 * @param channelName the current raw channel name
 * @param channelDescriptors an array of objs that contain a fully populated channel
 * and the corresponding UI channel segment
 * @param filterName the name of the filter to apply
 * @param filterDefinitions a record of Filter Definitions by hz
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied
 */
function useFilterWithErrorHandling(handleFilterError: (error: FilterError) => void) {
  const dispatch = useAppDispatch();

  return React.useCallback(
    async (
      channelName: string,
      filterName: string,
      filterDescriptors: FilterDescriptor[],
      taper: number,
      removeGroupDelay: boolean
    ) => {
      if (!filterDescriptors?.length) return;

      await Promise.all(
        filterDescriptors.map(async filterDescriptor => {
          Timer.start(`Filtered ${filterDescriptor.channel.name}`);

          // Will filter and store the data
          const results = await filter(filterDescriptor, taper, removeGroupDelay);

          // Handle rejected on a case by case basis
          const rejected = results.filter(
            (r): r is PromiseRejectedResult => r.status === 'rejected'
          );
          if (rejected.length > 0) {
            rejected.forEach(r => {
              if (isFilterError(r.reason)) {
                handleFilterError(
                  new FilterError(
                    r.reason.message,
                    r.reason.filterNames,
                    channelName,
                    r.reason.channelSegmentDescriptorIds
                  )
                );
              } else {
                throw new Error(r.reason);
              }
            });
          }
          Timer.end(`Filtered ${filterDescriptor.channel.name}`);

          // Handle fulfilled all together
          const fulfilled: PromiseFulfilledResult<FilterResult>[] = results.filter(
            (r): r is PromiseFulfilledResult<FilterResult> => r.status === 'fulfilled'
          );
          return fulfilled.map(f => f.value);
        })
      )
        .then(filterResults => {
          if (filterResults) {
            // Split channels and channelSegments from filter results
            const { channels, channelSegments } = filterResults
              .flatMap(filterResult => filterResult)
              .reduce(
                (finalResult, filterResult) => {
                  return {
                    channels: [...finalResult.channels, filterResult.channel],
                    channelSegments: [...finalResult.channelSegments, filterResult.uiChannelSegment]
                  };
                },
                { channels: [], channelSegments: [] }
              );
            dispatch(addFilteredChannels(channels));
            dispatch(
              // Will force the data into a filter name slot (in case of named filter)
              addFilteredChannelSegments([
                {
                  name: channelName,
                  filterName,
                  channelSegments
                }
              ])
            );
          }
        })
        .catch(error => {
          // if something else goes wrong that we can't handle on an individual basis, then fail the whole channel
          handleFilterError(new FilterError(error.message, filterName, channelName));
        });
    },
    [dispatch, handleFilterError]
  );
}

/**
 * Gets the named filter definition for the given default named filter and uiChannelSegment
 * combination.
 *
 * @param namedFilter the filter to lookup
 * @param uiChannelSegment the uiChannelSegment that will be related to the filter definition
 * @param signalDetections the full list of signal detections to compare against
 * @param filterDefinitionsForSignalDetections the record of filters for signal detections
 * @param filterDefinitionsForChannelSegments the record of filters for channel segment fallbacks
 * @returns a filter definition for the given default named filter and uiChannelSegment combination
 */
function getNamedFilterForChannelSegment(
  namedFilter: FilterTypes.Filter,
  uiChannelSegment: UiChannelSegment,
  selectedSdIds: string[],
  signalDetectionHypotheses: SignalDetectionHypothesis[],
  channelSegmentsToSignalDetectionHypothesis: ChannelSegmentsToSignalDetectionHypothesisRecord,
  filterDefinitionsForSignalDetections: FilterDefinitionsForSignalDetectionsRecord,
  filterDefinitionsForChannelSegments: FilterDefinitionsForChannelSegmentsRecord
): FilterDefinition {
  const filterName = namedFilter.namedFilter;

  if (!filterName) return undefined;

  const channelSegmentString = createChannelSegmentString(
    uiChannelSegment.channelSegmentDescriptor
  );

  let signalDetectionHypothesisId: string;

  // If only one signal detection is selected return that filter for all raw channels
  if (
    selectedSdIds.length === 1 &&
    isRawChannel(uiChannelSegment.channelSegmentDescriptor.channel)
  ) {
    signalDetectionHypothesisId = signalDetectionHypotheses?.find(
      signalDetectionHypothesis =>
        signalDetectionHypothesis.id.signalDetectionId === selectedSdIds[0]
    )?.id?.id;
  } else {
    signalDetectionHypothesisId = channelSegmentsToSignalDetectionHypothesis[channelSegmentString];
  }

  // TODO: We need a method of determining if we have the ability to receive the data, vs an API error
  if (!signalDetectionHypothesisId)
    return filterDefinitionsForChannelSegments?.[channelSegmentString]?.[filterName];

  return filterDefinitionsForSignalDetections?.[signalDetectionHypothesisId]?.[filterName];
  // Additional flow required for events etc...
}

/**
 * Will get a novel filter for the given uiChannelSegment in the case a namedFilter is passed in.
 * The filter will be composed of the namedFilter combined with its appropriate filterDefinition.
 * If a defined filter is passed in, the function will not make modifications to it.
 *
 * @param uiChannelSegment the uiChannelSegment to filter
 * @param channelFilter the channel filter from channelFilters related to this uiChannelSegment
 * @param selectedSdIds an array of selected signal detection ids
 * @param signalDetections a record of all available signal detections
 * @param filterDefinitionsForSignalDetections the record of filters for signal detections
 * @param filterDefinitionsForChannelSegments the record of filters for channel segment fallbacks
 *
 * @returns the related filter definition or undefined
 *
 */
function getFilterForChannelSegment(
  uiChannelSegment: UiChannelSegment,
  channelFilter: FilterTypes.Filter,
  selectedSdIds: string[],
  signalDetectionHypotheses: SignalDetectionHypothesis[],
  channelSegmentsToSignalDetectionHypothesis: ChannelSegmentsToSignalDetectionHypothesisRecord,
  filterDefinitionsForSignalDetections: FilterDefinitionsForSignalDetectionsRecord,
  filterDefinitionsForChannelSegments: FilterDefinitionsForChannelSegmentsRecord
): Filter {
  if (channelFilter.unfiltered) return undefined;

  // In the case of a namedFilter operation we will need to see if the filter is in place
  if (channelFilter.namedFilter) {
    const filterDefinition = getNamedFilterForChannelSegment(
      channelFilter,
      uiChannelSegment,
      selectedSdIds,
      signalDetectionHypotheses,
      channelSegmentsToSignalDetectionHypothesis,
      filterDefinitionsForSignalDetections,
      filterDefinitionsForChannelSegments
    );

    return {
      ...channelFilter,
      filterDefinition
    };
  }

  return channelFilter;
}

/**
 * Provides a callback that can be used to build a list of filter descriptors from a given
 * channelFilter and uiChannelSegments.
 *
 * @param channelFilter the filter to apply to the channel segments
 * @param uiChannelSegments the uiChannelSegments to operate on
 * @returns an array of {@link FilterDescriptor}
 */
function useBuildFilterDescriptors(handleFilterError: (error: FilterError) => void) {
  const dispatch = useAppDispatch();

  const channelsRecord: Record<string, ChannelTypes.Channel> = useUnfilteredChannelsRecord();
  const cachedFilterDefinitions: FilterDefinitionsRecord = useAppSelector(selectFilterDefinitions);
  const signalDetectionHypotheses: SignalDetectionHypothesis[] = useSignalDetectionHypotheses();
  const channelSegmentsToSignalDetectionHypothesis: ChannelSegmentsToSignalDetectionHypothesisRecord = useChannelSegmentsToSignalDetectionHypothesis();
  const filterDefinitionsForSignalDetectionsRecord: FilterDefinitionsForSignalDetectionsRecord = useAppSelector(
    selectFilterDefinitionsForSignalDetections
  );
  const filterDefinitionsForChannelSegmentsRecord: FilterDefinitionsForChannelSegmentsRecord = useAppSelector(
    selectDefaultFilterDefinitionByUsageForChannelSegments
  );
  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);

  return React.useCallback(
    async (
      channelName: string,
      channelFilter: FilterTypes.Filter,
      uiChannelSegments: UiChannelSegment[]
    ): Promise<FilterDescriptor[]> => {
      const {
        defaultGroupDelaySecs,
        defaultSampleRateToleranceHz,
        defaultTaper,
        defaultRemoveGroupDelay
      } = processingAnalystConfigurationQuery.data.gmsFilters;

      // Organize the channels by name
      const channelsByName: Record<string, ChannelTypes.Channel> = uiChannelSegments.reduce(
        (accumulatedChannelsByName, uiChannelSegment) => {
          const channel = channelsRecord[uiChannelSegment?.channelSegmentDescriptor?.channel?.name];
          if (!channel) return accumulatedChannelsByName;
          return {
            ...accumulatedChannelsByName,
            [uiChannelSegment?.channelSegmentDescriptor?.channel?.name]: channel
          };
        },
        {}
      );

      // Bail early if it's unfiltered
      if (channelFilter.unfiltered) return [];

      const filterDescriptorPromises = Object.entries(channelsByName).map(
        async ([name, channel]) => {
          const filterSegmentsToProcess = uiChannelSegments
            ?.filter(
              ({ channelSegmentDescriptor }) => channelSegmentDescriptor?.channel?.name === name
            )
            ?.map(uiChannelSegment => ({
              uiChannelSegment,
              filtersBySampleRate: {}
            }));

          const designedFilterPromises = filterSegmentsToProcess.map(async filterSegment => {
            const currentFilter = getFilterForChannelSegment(
              filterSegment.uiChannelSegment,
              channelFilter,
              selectedSdIds,
              signalDetectionHypotheses,
              channelSegmentsToSignalDetectionHypothesis,
              filterDefinitionsForSignalDetectionsRecord,
              filterDefinitionsForChannelSegmentsRecord
            );

            const {
              newFilterDefinitions,
              filterDefinitionRecord
            } = await designFiltersAndGetUpdatedFilterDefinitions(
              channelName,
              currentFilter,
              uiChannelSegments,
              cachedFilterDefinitions,
              defaultGroupDelaySecs,
              defaultSampleRateToleranceHz,
              defaultTaper,
              defaultRemoveGroupDelay,
              handleFilterError
            );

            // TODO: Refactor this to commit the filter definitions to the redux store AFTER we finish filtering
            if (false && newFilterDefinitions?.length) {
              dispatch(addDesignedFilterDefinitions(newFilterDefinitions));
            }

            if (filterDefinitionRecord[currentFilter.filterDefinition.name]) {
              return {
                ...filterSegment,
                filter: currentFilter,
                filtersBySampleRate: filterDefinitionRecord[currentFilter.filterDefinition.name]
              };
            }
            return undefined;
          });

          const filterSegments = await Promise.all(designedFilterPromises);

          return {
            channel,
            filterSegments: filterSegments.filter(f => f !== undefined)
          };
        }
      );

      return Promise.all(filterDescriptorPromises);
    },
    [
      cachedFilterDefinitions,
      channelSegmentsToSignalDetectionHypothesis,
      channelsRecord,
      dispatch,
      filterDefinitionsForChannelSegmentsRecord,
      filterDefinitionsForSignalDetectionsRecord,
      handleFilterError,
      processingAnalystConfigurationQuery?.data?.gmsFilters,
      selectedSdIds,
      signalDetectionHypotheses
    ]
  );
}

/**
 * Given an array of channel names, the useDesignAndFilter hook designs necessary filters
 * and applies filters to those channel names. Do not use this directly, use {@link useFilterQueue}
 * to filter instead.
 *
 * @param channelNamesToFilter An array of channel names
 * @param queue the queue that will control the priority of the filter actions
 * @param handleFilterError a function to handle filter errors
 */
function useDesignAndFilter(
  toFilter: ProcessedItemsCacheRecord,
  queue: OrderedPriorityQueue,
  handleFilterError: (error: FilterError) => void
) {
  const uiChannelSegmentsRecord: UIChannelSegmentRecord = useVisibleChannelSegments();
  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);

  const filterWithErrorHandling = useFilterWithErrorHandling(handleFilterError);
  const buildFilterDescriptors = useBuildFilterDescriptors(handleFilterError);

  const [viewportVisibleStations] = useViewportVisibleStations();

  useEffect(() => {
    if (!Object.keys(toFilter).length || !processingAnalystConfigurationQuery?.data?.gmsFilters)
      return;

    const {
      defaultTaper,
      defaultRemoveGroupDelay
    } = processingAnalystConfigurationQuery.data.gmsFilters;

    // Build list of promises
    Object.entries(toFilter).forEach(([filterNameId, cache]) => {
      Object.entries(cache).forEach(([channelName, uiChannelSegmentIdSet]) => {
        // This should only be the filter name so do not fallback to unfiltered here
        const filterName =
          channelFilters[channelName].namedFilter ||
          channelFilters[channelName]?.filterDefinition?.name;

        const options = {
          priority: viewportVisibleStations.indexOf(channelName),
          tag: filterName
        };

        queue
          .add(async () => {
            try {
              // Get unfiltered uiChannelSegments by channelName
              const uiChannelSegments = uiChannelSegmentsRecord[channelName][
                UNFILTERED
              ].filter(({ channelSegmentDescriptor }) =>
                uiChannelSegmentIdSet?.has(createChannelSegmentString(channelSegmentDescriptor))
              );

              const filterDescriptors: FilterDescriptor[] = await buildFilterDescriptors(
                channelName,
                channelFilters[channelName],
                uiChannelSegments
              );

              return filterWithErrorHandling(
                channelName,
                filterName,
                filterDescriptors,
                defaultTaper,
                defaultRemoveGroupDelay
              );
            } catch (error) {
              // Invalidate the whole channel, because we don't know what happened. Designing the filters should handle errors per ChannelSegment
              handleFilterError(new FilterError(error.message, filterNameId, channelName));
              return Promise.reject(error);
            }
          }, options)
          .catch(logger.error);
      });
    });
  }, [
    buildFilterDescriptors,
    channelFilters,
    filterWithErrorHandling,
    handleFilterError,
    processingAnalystConfigurationQuery.data.gmsFilters,
    queue,
    toFilter,
    uiChannelSegmentsRecord,
    viewportVisibleStations
  ]);
}

/**
 * Will add an id to the filter queue delta
 *
 * @param delta the processed items cache record
 * @param filterName the filter name associated with the id
 * @param channelName the channel name associated with the id
 * @param id the channel segment string {@link createChannelSegmentString}
 *
 * @returns the updated processed items cache record
 */
function mutateFilterQueueDelta(
  delta: ProcessedItemsCacheRecord,
  filterName: string,
  channelName: string,
  id: string
): ProcessedItemsCacheRecord {
  return produce(delta, draft => {
    if (!draft[filterName]) draft[filterName] = {};
    if (!draft[filterName][channelName]) draft[filterName][channelName] = new Set();

    draft[filterName][channelName].add(id);
  });
}

/**
 * This will return a function that checks against the given filter and uiChannelSegment, and update the delta if needed.
 *
 * @params handleFilterError a function to handle filter errors
 */
const useUpdateFilterQueueDelta = (handleFilterError: (error: FilterError) => void) => {
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  const signalDetectionHypotheses: SignalDetectionHypothesis[] = useSignalDetectionHypotheses();
  const channelSegmentsToSignalDetectionHypothesis = useChannelSegmentsToSignalDetectionHypothesis();
  const filterDefinitionsForSignalDetectionsRecord: FilterDefinitionsForSignalDetectionsRecord = useAppSelector(
    selectFilterDefinitionsForSignalDetections
  );
  const filterDefinitionsForChannelSegmentsRecord: FilterDefinitionsForChannelSegmentsRecord = useAppSelector(
    selectDefaultFilterDefinitionByUsageForChannelSegments
  );

  const channelsByName: Record<string, ChannelTypes.Channel> = useUnfilteredChannelsRecord();

  return React.useCallback(
    (
      delta: ProcessedItemsCacheRecord,
      processedItemsCache: ProcessedItemsCacheRecord,
      uiChannelSegment: UiChannelSegment,
      channelName: string,
      channelFilter: Filter
    ) => {
      let currentFilter;
      try {
        const id = createChannelSegmentString(uiChannelSegment?.channelSegmentDescriptor);

        currentFilter = getFilterForChannelSegment(
          uiChannelSegment,
          channelFilter,
          selectedSdIds,
          signalDetectionHypotheses,
          channelSegmentsToSignalDetectionHypothesis,
          filterDefinitionsForSignalDetectionsRecord,
          filterDefinitionsForChannelSegmentsRecord
        );

        if (!currentFilter || !currentFilter.filterDefinition) return delta;

        // Combined filter name is required in the case that two named filters have the same filter definition.
        // Without it the filter may not be processed.
        const filterNameId = getCombinedFilterId(currentFilter, currentFilter.filterDefinition);

        if (!channelsByName[uiChannelSegment?.channelSegmentDescriptor?.channel?.name]) {
          throw new Error(`No channel found for channel segment ${id}`);
        }

        if (processedItemsCache?.[filterNameId]?.[channelName]?.has(id)) return delta;

        // Key processed delta items by the filter definition name, not the channelFilters filter name
        // this insures that if the filter CHANGES between runs we will build new data.
        return mutateFilterQueueDelta(delta, filterNameId, channelName, id);
      } catch (error) {
        handleFilterError(
          new FilterError(
            error.message,
            getCombinedFilterId(currentFilter, currentFilter.filterDefinition),
            channelName,
            createChannelSegmentString(uiChannelSegment?.channelSegmentDescriptor)
          )
        );
        return delta;
      }
    },
    [
      channelSegmentsToSignalDetectionHypothesis,
      channelsByName,
      filterDefinitionsForChannelSegmentsRecord,
      filterDefinitionsForSignalDetectionsRecord,
      handleFilterError,
      selectedSdIds,
      signalDetectionHypotheses
    ]
  );
};

/**
 * Creates an error handler function for handling errors that occur while filtering.
 *
 * @param processedItems the ref cache that tracks the processed items
 * @returns a referentially stable callback error handler
 */
const useHandleFilterError = (
  processedItems: React.MutableRefObject<ProcessedItemsCacheRecord>
) => {
  const dispatch = useAppDispatch();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);

  return React.useCallback(
    (error: FilterError) => {
      const { channelName, filterNames, channelSegmentDescriptorIds } = error;
      logger.error(error?.message);
      const currentFilter = channelFilters[channelName];
      filterNames.forEach(filterNameId => {
        if (processedItems.current[filterNameId]?.[channelName] != null) {
          // Mutating the mutable ref cache should be safe
          // eslint-disable-next-line no-param-reassign
          if (!processedItems.current[filterNameId]) processedItems.current[filterNameId] = {};
          if (!processedItems.current[filterNameId][channelName])
            // Mutating the mutable ref cache should be safe
            // eslint-disable-next-line no-param-reassign
            processedItems.current[filterNameId][channelName] = new Set();
          if (channelSegmentDescriptorIds) {
            channelSegmentDescriptorIds.forEach(channelSegmentDescriptorId => {
              processedItems.current[filterNameId][channelName]?.delete(channelSegmentDescriptorId);
            });
          } else {
            processedItems.current[filterNameId][channelName]?.clear();
          }
        }
      });
      if (!currentFilter?._uiIsError) {
        dispatch(
          waveformSlice.actions.setFilterForChannel({
            channelOrSdName: channelName,
            filter: {
              ...cloneDeep(currentFilter),
              _uiIsError: true
            }
          })
        );
      }
    },
    [channelFilters, dispatch, processedItems]
  );
};

const useShouldClearQueue = () => {
  const timeRange = useAppSelector(state => state.app.workflow.timeRange);
  const workflowId = useAppSelector(selectWorkflowIntervalUniqueId);
  const oldTimeRange = usePrevious(timeRange, undefined);
  const previousWorkflowId = usePrevious(workflowId);

  return (
    oldTimeRange?.startTimeSecs !== timeRange?.startTimeSecs || previousWorkflowId !== workflowId
  );
};

/**
 * useFilterQueue watches for changes in channelFilters, uiChannelSegmentsRecord, channels and
 * creates a queue of channel names to filter. Then it calls useDesignAndFilter design and apply
 * filters to those channels.
 */
export function useFilterQueue() {
  // TODO: Because we use ref, if two instances are open we could process dupe filter data
  // * Suggestion: Base operation on a unique key, to insure only one instance runs at a given time
  const processedItems = useRef<ProcessedItemsCacheRecord>({});
  const queue = useRef(new OrderedPriorityQueue({ concurrency: 4 }));

  if (useShouldClearQueue()) {
    logger.info('Filter queue is watching new interval');
    processedItems.current = {};
    // Clear out any hanging tasks from the queue
    queue.current.clear();
  }

  const uiChannelSegmentsRecord: UIChannelSegmentRecord = useVisibleChannelSegments();
  const processingAnalystConfigurationQuery: ProcessingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);

  const handleFilterError = useHandleFilterError(processedItems);
  const updateFilterQueueDelta = useUpdateFilterQueueDelta(handleFilterError);

  const currentFilterName = useMemo(() => {
    const currentFilter = Object.values(channelFilters)?.[0];
    return currentFilter?.namedFilter || currentFilter?.filterDefinition?.name;
  }, [channelFilters]);

  const delta: ProcessedItemsCacheRecord = useMemo(() => {
    let draft: ProcessedItemsCacheRecord = {};

    if (processingAnalystConfigurationQuery?.data) {
      Object.entries(channelFilters).forEach(([channelName, channelFilter]) => {
        if (!uiChannelSegmentsRecord?.[channelName]?.[UNFILTERED] || channelFilter.unfiltered)
          return;

        uiChannelSegmentsRecord[channelName][UNFILTERED].forEach(uiChannelSegment => {
          draft = updateFilterQueueDelta(
            draft,
            processedItems.current,
            uiChannelSegment,
            channelName,
            channelFilter
          );
        });
      });
    }

    return draft;
  }, [
    channelFilters,
    processingAnalystConfigurationQuery?.data,
    uiChannelSegmentsRecord,
    updateFilterQueueDelta
  ]);

  // Merge the delta back into the cache
  Object.entries(delta).forEach(([filterName, cache]) => {
    Object.entries(cache).forEach(([channelName, set]) => {
      if (!processedItems.current[filterName]) processedItems.current[filterName] = {};
      if (!processedItems.current[filterName][channelName])
        processedItems.current[filterName][channelName] = new Set();
      processedItems.current[filterName][channelName] = new Set([
        ...processedItems.current[filterName][channelName],
        ...set
      ]);
    });
  });

  // Prioritize the current filter
  queue.current.prioritize(currentFilterName);

  // Get full list of channel names to filter
  useDesignAndFilter(delta, queue.current, handleFilterError);
}

/**
 * A helper hook that returns a callback function that updates the channel filters in redux
 * based on the users' selection. If nothing is selected, it behaves as though every station
 * is selected. If stations are selected, it updates the filters for those default channels,
 * using the station name as the channel name key.
 */
export function useUpdateChannelFilters() {
  const dispatch = useAppDispatch();
  const selectedStationsAndChannels = useAppSelector(selectSelectedStationsAndChannelIds);
  const visibleStations = useVisibleStations();
  const channelFilters = useAppSelector(selectChannelFilters);

  return React.useCallback(
    (selected: FilterTypes.Filter) => {
      let updatedChannelFilters: ChannelFilterRecord = {};
      if (selectedStationsAndChannels.length === 0) {
        // select all stations (but not raw channels)
        if (visibleStations) {
          visibleStations.forEach(s => {
            updatedChannelFilters[s.name] = selected;
          });
        }
      } else {
        // modify selected channels and signal detections
        updatedChannelFilters = produce(channelFilters, draft => {
          selectedStationsAndChannels.forEach(s => {
            draft[s] = selected;
          });
        });
      }

      dispatch(waveformActions.setChannelFilters(updatedChannelFilters));
    },
    [channelFilters, dispatch, selectedStationsAndChannels, visibleStations]
  );
}

/**
 * @example
 * const { selectedFilter, setSelectedFilter } = useSelectedFilter();
 *
 * @returns an object containing the selected filer, and a setter function. The setter
 * function takes either a string (the filter name) or a filter, or null to unset the selection.
 *
 * All elements returned should be referentially stable, so they may be checked for
 * shallow equality in dependency arrays and memoization functions.
 */
export const useSelectedFilter = (): {
  selectedFilter: FilterTypes.Filter;
  setSelectedFilter: (selectedFilter: FilterTypes.Filter | null) => void;
} => {
  // initiate the subscription to the query data. selectSelectedFilterList will get the data that this stores.
  useGetFilterListsDefinitionQuery();
  const dispatch = useAppDispatch();
  const selectedFilterList = useAppSelector(selectSelectedFilterList);
  const selectedFilter = useAppSelector(selectSelectedFilter);
  const updateChannelFilters = useUpdateChannelFilters();
  return {
    selectedFilter,
    setSelectedFilter: React.useCallback(
      (selected: FilterTypes.Filter | null) => {
        if (!selected || !selectedFilterList?.filters) return;
        const indexOfFilter = selectedFilterList.filters.findIndex(fl => fl === selected);
        updateChannelFilters(selected);
        dispatch(analystActions.setSelectedFilterIndex(indexOfFilter));
      },
      [dispatch, selectedFilterList?.filters, updateChannelFilters]
    )
  };
};

/**
 * @returns an object containing the HotkeyCycleList (which maps indices to whether a filter
 * is in the hotkey cycle), and a setter to set whether a filter at a given index is within that list.
 */
export const useHotkeyCycle = (): {
  hotkeyCycle: HotkeyCycleList;
  setIsFilterWithinHotkeyCycle: (index: number, isWithinCycle: boolean) => void;
} => {
  const hotkeyCycle = useAppSelector(selectHotkeyCycle);
  const dispatch = useAppDispatch();
  return {
    hotkeyCycle,
    setIsFilterWithinHotkeyCycle: (index, isWithinCycle) =>
      dispatch(analystActions.setIsFilterWithinHotkeyCycle({ index, isWithinCycle }))
  };
};

/**
 * @returns two functions, one to select the next filter, and one to select the previous filter.
 */
export const useFilterCycle = (): {
  selectNextFilter: () => void;
  selectPreviousFilter: () => void;
  selectUnfiltered: () => void;
} => {
  const selectedFilterIndex = useAppSelector(selectSelectedFilterIndex);
  const { hotkeyCycle } = useHotkeyCycle();
  const dispatch = useAppDispatch();
  const filterList = useSelectedFilterList();
  const updateChannelFilters = useUpdateChannelFilters();
  const selectNextFilter = React.useCallback(() => {
    if (selectedFilterIndex == null || !hotkeyCycle?.length) {
      return;
    }
    let i = selectedFilterIndex + 1 < hotkeyCycle.length ? selectedFilterIndex + 1 : 0;
    while (!hotkeyCycle[i] && i !== selectedFilterIndex) {
      i += 1;
      if (i >= hotkeyCycle.length) {
        i = 0;
      }
    }
    updateChannelFilters(filterList.filters[i]);
    dispatch(analystActions.setSelectedFilterIndex(i));
  }, [dispatch, filterList?.filters, hotkeyCycle, selectedFilterIndex, updateChannelFilters]);
  const selectPreviousFilter = React.useCallback(() => {
    if (selectedFilterIndex == null || !hotkeyCycle?.length) {
      return;
    }
    let i = selectedFilterIndex - 1 >= 0 ? selectedFilterIndex - 1 : hotkeyCycle.length - 1;
    while (!hotkeyCycle[i] && i !== selectedFilterIndex) {
      i -= 1;
      if (i < 0) {
        i = hotkeyCycle.length - 1;
      }
    }
    updateChannelFilters(filterList.filters[i]);
    dispatch(analystActions.setSelectedFilterIndex(i));
  }, [dispatch, filterList?.filters, hotkeyCycle, selectedFilterIndex, updateChannelFilters]);
  const selectUnfiltered = React.useCallback(() => {
    if (filterList?.filters == null) {
      return;
    }
    const unfilteredIndex = filterList?.filters.findIndex(f => f.unfiltered);
    updateChannelFilters(filterList?.filters[unfilteredIndex]);
    dispatch(analystActions.setSelectedFilterIndex(unfilteredIndex));
  }, [dispatch, filterList?.filters, updateChannelFilters]);
  return {
    selectNextFilter,
    selectPreviousFilter,
    selectUnfiltered
  };
};
