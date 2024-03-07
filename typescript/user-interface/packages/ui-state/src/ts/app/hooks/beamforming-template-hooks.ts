import { BeamformingTemplateTypes, FacetedTypes } from '@gms/common-model';
import React from 'react';

import { useGetProcessingAnalystConfigurationQuery } from '../api';
import {
  getBeamformingTemplates,
  shouldSkipGetBeamformingTemplates
} from '../api/data/signal-enhancement/get-beamforming-templates';
import type {
  GetBeamformingTemplatesHistory,
  GetBeamformingTemplatesQueryArgs
} from '../api/data/signal-enhancement/types';
import { UIStateError } from '../error-handling/ui-state-error';
import type { AsyncFetchResult } from '../query';
import { selectPhaseSelectorFavorites } from '../state/analyst/selectors';
import { useFetchHistoryStatus } from './fetch-history-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useVisibleStations } from './station-definition-hooks';

/**
 * Defines async fetch result for the beamforming template history.
 *
 * @see {@link AsyncFetchResult}
 */
export type GetBeamformingTemplatesHistoryFetchResult = AsyncFetchResult<
  GetBeamformingTemplatesHistory
>;

/**
 * Defines async fetch result for the beamforming templates. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type BeamformingTemplateFetchResult = AsyncFetchResult<
  BeamformingTemplateTypes.BeamformingTemplatesByStationByPhase
>;

/**
 * A hook that can be used to return the current history of the beamforming templates query.
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the history of the `getBeamformingTemplates` queries
 *
 * @see {@link GetBeamformingTemplatesHistoryFetchResult}
 *
 * @returns the current history of the processing mask definitions query.
 */
export const useGetBeamformingTemplatesRangeHistory = (): GetBeamformingTemplatesHistoryFetchResult => {
  const history = useAppSelector(state => state.data.queries.getBeamformingTemplates);
  return useFetchHistoryStatus<GetBeamformingTemplatesQueryArgs>(history);
};

/**
 * @returns the skipped result for the beamforming templates query
 */
const useGetBeamformingTemplatesSkippedResult = (): BeamformingTemplateFetchResult => {
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
 * A hook that issues the requests for the beamforming templates query.
 *
 * @param args the beamforming templates query arguments
 */
const useFetchBeamformingTemplatesQuery = (args: GetBeamformingTemplatesQueryArgs): void => {
  const dispatch = useAppDispatch();
  React.useEffect(() => {
    dispatch(getBeamformingTemplates(args)).catch(error => {
      throw new UIStateError(error);
    });
  }, [dispatch, args]);
};

/**
 * A hook that can be used to retrieve beamforming templates
 *
 * @returns the beamforming templates result.
 */
export const useBeamformingTemplates = (
  args: GetBeamformingTemplatesQueryArgs
): BeamformingTemplateFetchResult => {
  const history = useGetBeamformingTemplatesRangeHistory();
  // issue any new fetch requests
  useFetchBeamformingTemplatesQuery(args);

  // retrieve all beamforming templates from the state
  const beamformingTemplates = useAppSelector(state => state.data.beamformingTemplates);
  const skippedReturnValue = useGetBeamformingTemplatesSkippedResult();
  return React.useMemo(() => {
    if (shouldSkipGetBeamformingTemplates(args)) {
      return skippedReturnValue;
    }
    return { ...history, data: beamformingTemplates[args.beamType] };
  }, [args, history, beamformingTemplates, skippedReturnValue]);
};

/**
 * Hook to obtain beamforming templates for visible stations and favorite phases
 *
 * @param beamType
 * @returns beamFormingTemplate
 */
export const useBeamformingTemplatesForVisibleStationsAndFavoritePhases = (
  beamType: BeamformingTemplateTypes.BeamType
): BeamformingTemplateFetchResult => {
  const visibleStations = useVisibleStations();
  const stationVersionReferences = React.useMemo(
    () =>
      visibleStations?.map(station =>
        FacetedTypes.convertToVersionReference(
          { effectiveAt: station.effectiveAt, name: station.name },
          'name'
        )
      ),
    [visibleStations]
  );
  const favorites = useAppSelector(selectPhaseSelectorFavorites);
  const config = useGetProcessingAnalystConfigurationQuery();
  const phaseLists = config?.data?.phaseLists;
  const phases = React.useMemo(() => {
    let phaseArray: string[] = [];

    phaseLists?.forEach(phaseList => {
      if (!favorites[phaseList.listTitle]) {
        phaseArray = phaseArray.concat(phaseList.favorites);
      } else {
        phaseArray = phaseArray.concat(favorites[phaseList.listTitle]);
      }
    });
    return phaseArray;
  }, [favorites, phaseLists]);
  const args = React.useMemo(
    () => ({
      phases,
      stations: stationVersionReferences,
      beamType
    }),
    [beamType, phases, stationVersionReferences]
  );
  return useBeamformingTemplates(args);
};

/**
 * Hook to obtain beamforming templates for visible stations and favorite phases for EVENT
 */
export const useBeamformingTemplatesForEvent = () => {
  return useBeamformingTemplatesForVisibleStationsAndFavoritePhases(
    BeamformingTemplateTypes.BeamType.EVENT
  );
};

/**
 * Hook to obtain beamforming templates for visible stations and favorite phases for FK
 */
export const useBeamformingTemplatesForFK = () => {
  return useBeamformingTemplatesForVisibleStationsAndFavoritePhases(
    BeamformingTemplateTypes.BeamType.FK
  );
};
