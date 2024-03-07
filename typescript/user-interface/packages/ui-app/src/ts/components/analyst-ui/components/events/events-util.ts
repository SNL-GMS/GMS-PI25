import type { CommonTypes } from '@gms/common-model';
import { EventTypes } from '@gms/common-model';
import { isArrivalTimeFeatureMeasurement } from '@gms/common-model/lib/signal-detection/util';
import type { AgGridReact } from '@gms/ui-core-components';
import type { AppDispatch, EventStatus, UpdateEventStatusMutationFunc } from '@gms/ui-state';
import {
  analystActions,
  AnalystWorkspaceTypes,
  useAppDispatch,
  useAppSelector,
  useGetProcessingAnalystConfigurationQuery,
  useUpdateEventStatusMutation,
  waveformActions
} from '@gms/ui-state';
import { AlignWaveformsOn } from '@gms/ui-state/lib/app/state/analyst/types';
import React from 'react';

import { setRowNodeSelection } from '~common-ui/common/table-utils';

import type { EventRow } from './types';
import { EventFilterOptions } from './types';

/**
 * Dispatches the openEventId to the open event or null along will call mutation
 * to update the event status
 *
 * @param eventStatus the event status to update for the event
 * @param updateEventStatusMutation mutation for the update
 */
export const setEventStatus = (
  eventStatus: EventTypes.EventStatus,
  userName: string,
  stageName: string,
  configuredPhase: string,
  dispatch: AppDispatch,
  updateEventMutation: UpdateEventStatusMutationFunc
) => async (id: string): Promise<void> => {
  const eventStatusRequestData: EventStatus = {
    stageId: {
      name: stageName
    },
    eventId: id,
    eventStatusInfo: {
      eventStatus,
      activeAnalystIds: [userName]
    }
  };
  switch (eventStatus) {
    case EventTypes.EventStatus.NOT_COMPLETE:
      dispatch(analystActions.setOpenEventId(null));
      dispatch(
        analystActions.setSelectedSortType(AnalystWorkspaceTypes.WaveformSortType.stationNameAZ)
      );
      break;
    case EventTypes.EventStatus.COMPLETE:
      dispatch(analystActions.setOpenEventId(null));
      dispatch(
        analystActions.setSelectedSortType(AnalystWorkspaceTypes.WaveformSortType.stationNameAZ)
      );
      dispatch(analystActions.setAlignWaveformsOn(AlignWaveformsOn.TIME));
      break;
    default:
      dispatch(analystActions.setOpenEventId(id));
      dispatch(analystActions.setSelectedSortType(AnalystWorkspaceTypes.WaveformSortType.distance));
      dispatch(analystActions.setAlignWaveformsOn(AlignWaveformsOn.PREDICTED_PHASE));
      dispatch(analystActions.setPhaseToAlignOn(configuredPhase));
  }

  // update Redux to show predicted phases in waveform display by default
  dispatch(waveformActions.setShouldShowPredictedPhases(true));

  await updateEventMutation(eventStatusRequestData);
};

/**
 * Hook used as a helper for updating event status. Gets the username from the store
 *
 * @param eventStatus to update
 * @returns higher order function to perform the redux dispatch and mutation
 */
export const useSetEvent = (
  eventStatus: EventTypes.EventStatus
): ((id: string) => Promise<void>) => {
  const dispatch = useAppDispatch();
  const [updateEventStatusMutation] = useUpdateEventStatusMutation();
  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const userName = useAppSelector(state => state.app.userSession.authenticationStatus.userName);
  const stageName = useAppSelector(state => state.app.workflow.openIntervalName);
  return React.useMemo(
    () =>
      setEventStatus(
        eventStatus,
        userName,
        stageName,
        processingAnalystConfiguration.data?.zasDefaultAlignmentPhase,
        dispatch,
        updateEventStatusMutation
      ),
    [
      dispatch,
      eventStatus,
      processingAnalystConfiguration.data?.zasDefaultAlignmentPhase,
      stageName,
      updateEventStatusMutation,
      userName
    ]
  );
};

/**
 * Opens an event and updates the redux state with the open event id
 * Hits a endpoint to update the event status with in progress and username
 */
export const useSetOpenEvent = (): ((id: string) => Promise<void>) => {
  return useSetEvent(EventTypes.EventStatus.IN_PROGRESS);
};

/**
 * Closes an event and updates the redux state to have no open event id
 * Hits a endpoint to update the event status with no complete and removes username
 */
export const useSetCloseEvent = (): ((id: string) => Promise<void>) => {
  return useSetEvent(EventTypes.EventStatus.NOT_COMPLETE);
};

/**
 * Builds a single {@link EventRow} given a {@link EventTypes.Event} object
 *
 * @param eventDataForRow Object containing like data related to the event.
 * @param openIntervalName Current interval opened by the analyst.
 * @param timeRange The open interval time range (used to determine if this is an edge event and should be displayed or not)
 * @param eventActionType The type of action to (potentially) be performed on this event (reject, delete, etc)
 */
export const buildEventRow = (
  eventDataForRow: {
    event: EventTypes.Event;
    eventStatus: EventStatus;
    eventIsOpen: boolean;
    eventInConflict: boolean;
    eventIsActionTarget: boolean;
  },
  openIntervalName: string,
  timeRange: CommonTypes.TimeRange,
  eventActionType: AnalystWorkspaceTypes.EventActionTypes
): EventRow => {
  const { event, eventStatus, eventIsOpen, eventInConflict, eventIsActionTarget } = eventDataForRow;
  const magnitude: Record<string, number> = {};

  // If no preferredEventHypo for the open stage, returns the most recent hypo
  let eventHypothesis = EventTypes.findPreferredEventHypothesisByStage(event, openIntervalName);

  if (eventHypothesis === undefined || eventHypothesis.locationSolutions === undefined) {
    eventHypothesis = EventTypes.findEventHypothesisParent(event, eventHypothesis);
  }

  const locationSolution = EventTypes.findPreferredLocationSolution(
    eventHypothesis.id.hypothesisId,
    event.eventHypotheses
  );

  locationSolution?.networkMagnitudeSolutions.forEach(netMag => {
    magnitude[netMag.type] = netMag.magnitude.value;
  });

  const ellipsisCoverage = locationSolution?.locationUncertainty?.ellipses.find(
    value => value.scalingFactorType === EventTypes.ScalingFactorType.COVERAGE
  );

  const ellipsisConfidence = locationSolution?.locationUncertainty?.ellipses.find(
    value => value.scalingFactorType === EventTypes.ScalingFactorType.CONFIDENCE
  );

  const filtersForEvent = [];
  if (locationSolution?.location?.time < timeRange.startTimeSecs) {
    filtersForEvent.push(EventFilterOptions.BEFORE);
  } else if (locationSolution?.location?.time > timeRange.endTimeSecs) {
    filtersForEvent.push(EventFilterOptions.AFTER);
  } else {
    filtersForEvent.push(EventFilterOptions.INTERVAL);
  }

  if (eventHypothesis.deleted) {
    filtersForEvent.push(EventFilterOptions.DELETED);
  } else if (eventHypothesis.rejected) {
    filtersForEvent.push(EventFilterOptions.REJECTED);
  }

  const determineIfUnqualifiedAction = () => {
    if (!eventIsActionTarget) return false;
    switch (eventActionType) {
      case 'delete':
      case 'reject':
      case 'duplicate':
        return eventHypothesis.deleted || eventHypothesis.rejected;
      case 'open':
      case 'close':
      case 'details':
      default:
        return false;
    }
  };

  const numDefiningArrivalTimeFeatureMeasurement = locationSolution.locationBehaviors.filter(
    behavior => isArrivalTimeFeatureMeasurement(behavior.measurement) && behavior.defining
  ).length;
  const numAssociatedArrivalTimeFeatureMeasurement =
    eventHypothesis.associatedSignalDetectionHypotheses.length;

  return {
    id: event.id,
    eventFilterOptions: filtersForEvent,
    time: {
      value: locationSolution?.location?.time,
      uncertainty: ellipsisCoverage?.timeUncertainty
    },
    activeAnalysts: eventStatus?.eventStatusInfo?.activeAnalystIds ?? [],
    conflict: eventInConflict,
    depthKm: {
      value: locationSolution?.location?.depthKm,
      uncertainty: ellipsisCoverage?.depthUncertaintyKm
    },
    latitudeDegrees: locationSolution?.location?.latitudeDegrees,
    longitudeDegrees: locationSolution?.location?.longitudeDegrees,
    magnitudeMb: magnitude[EventTypes.MagnitudeType.MB],
    magnitudeMs: magnitude[EventTypes.MagnitudeType.MS],
    magnitudeMl: magnitude[EventTypes.MagnitudeType.ML],
    numberAssociated: numAssociatedArrivalTimeFeatureMeasurement,
    numberDefining: numDefiningArrivalTimeFeatureMeasurement,
    observationsStandardDeviation: locationSolution.locationUncertainty?.stdDevOneObservation,
    confidenceSemiMajorAxis: ellipsisConfidence?.semiMajorAxisLengthKm,
    confidenceSemiMinorAxis: ellipsisConfidence?.semiMinorAxisLengthKm,
    coverageSemiMajorAxis: ellipsisCoverage?.semiMajorAxisLengthKm,
    coverageSemiMinorAxis: ellipsisCoverage?.semiMinorAxisLengthKm,
    preferred: EventTypes.isPreferredEventHypothesisByStage(
      event,
      openIntervalName,
      eventHypothesis
    ),
    region: 'TBD',
    status: eventStatus?.eventStatusInfo?.eventStatus,
    isOpen: eventIsOpen,
    rejected: eventHypothesis.rejected,
    deleted: eventHypothesis.deleted,
    unsavedChanges: event._uiHasUnsavedChanges !== undefined,
    isActionTarget: eventIsActionTarget,
    isUnqualifiedActionTarget: determineIfUnqualifiedAction()
  };
};

/**
 * Cycles through all rows in the table and updates their row selection attribute
 * Sets rowSelection to true if their row id is in {@param selectedSdIds}, false otherwise
 *
 * @param tableRef
 * @param selectedSdIds
 */
export function updateRowSelection(
  tableRef: React.MutableRefObject<AgGridReact>,
  selectedSdIds: string[]
): React.MutableRefObject<AgGridReact> {
  tableRef?.current?.api?.forEachNode(node =>
    setRowNodeSelection(node, selectedSdIds.includes(node.id))
  );
  return tableRef;
}
