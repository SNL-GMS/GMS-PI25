import { EventTypes, SignalDetectionTypes } from '@gms/common-model';
import type { VersionReference } from '@gms/common-model/lib/faceted';
import type { FilterDefinition } from '@gms/common-model/lib/filter';
import { getFilterName } from '@gms/common-model/lib/filter/filter-util';
import {
  FilterDefinitionUsage,
  isFilterDefinition,
  UNFILTERED
} from '@gms/common-model/lib/filter/types';
import type {
  FeatureMeasurement,
  SignalDetection,
  SignalDetectionHypothesis
} from '@gms/common-model/lib/signal-detection';
import { FeatureMeasurementType } from '@gms/common-model/lib/signal-detection';
import {
  findArrivalTimeFeatureMeasurementUsingSignalDetection,
  getCurrentHypothesis
} from '@gms/common-model/lib/signal-detection/util';
import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { Station } from '@gms/common-model/lib/station-definitions/station-definitions/station-definitions';
import { epochSecondsNow, uuid } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import produce from 'immer';
import React from 'react';
import { batch } from 'react-redux';

import type { ChannelFilterRecord, UiChannelSegment, UIChannelSegmentRecord } from '../../types';
import type { UpdateEventStatusMutationFunc, UpdateSignalDetectionArgs } from '../api';
import {
  addBeamedChannels,
  createSignalDetection,
  deleteSignalDetection,
  selectOpenEventId,
  updateArrivalTimeSignalDetection,
  updatePhaseSignalDetection,
  useGetProcessingAnalystConfigurationQuery,
  useGetProcessingMonitoringOrganizationConfigurationQuery,
  useUpdateEventStatusMutation
} from '../api';
import { getFilterDefinitionsForSignalDetectionHypotheses } from '../api/data/signal-detection/get-filter-definitions-for-signal-detection-hypotheses';
import { UIStateError } from '../error-handling/ui-state-error';
import type { ArrivalTime } from '../state';
import { selectOpenIntervalName, selectUsername } from '../state';
import { analystActions, selectSelectedSdIds } from '../state/analyst';
import { selectChannelFilters } from '../state/waveform/selectors';
import { createTemporary } from '../util/channel-factory';
import {
  getAnalysisChannel,
  getMeasuredChannel,
  isRawChannelName,
  isTemporaryChannel
} from '../util/channel-factory-util';
import { getChannelRecordKey } from '../util/channel-segment-util';
import { useAllChannelsRecord } from './channel-hooks';
import {
  useGetVisibleChannelSegmentsByStationAndTime,
  useVisibleChannelSegments
} from './channel-segment-hooks';
import { useEventStatusQuery, useGetEvents } from './event-manager-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { usePreferredEventHypothesis, useSignalDetections } from './signal-detection-hooks';
import { useAllStations } from './station-definition-hooks';
import { useViewableInterval } from './waveform-hooks';
import { useStageId } from './workflow-hooks';

const logger = UILogger.create(
  'GMS_LOG_SIGNAL_DETECTION_HOOKS',
  process.env.GMS_LOG_CHANNEL_SEGMENT_HOOKS
);

const buildAnalysisWaveform = (
  channel: Channel,
  channelVersionReference: VersionReference<'name', Channel>,
  uiChannelSegment: UiChannelSegment,
  featureMeasurementType: FeatureMeasurementType
): SignalDetectionTypes.WaveformAndFilterDefinition => {
  let filterDefinition: FilterDefinition | undefined;

  // processingDefinition may not be a filter definition so we need to confirm
  if (isFilterDefinition(channel?.processingDefinition)) {
    filterDefinition = {
      name: channel?.processingDefinition?.name,
      comments: channel?.processingDefinition?.comments,
      filterDescription: channel?.processingDefinition?.filterDescription
    };
  }

  let filterDefinitionUsage;

  // Only set the filterDefinitionUsage if the featureMeasurementType is ARRIVAL_TIME
  // and the filterDefinition is extracted from the channel processingDefinition
  if (featureMeasurementType === FeatureMeasurementType.ARRIVAL_TIME && filterDefinition) {
    filterDefinitionUsage = FilterDefinitionUsage.DETECTION;
  }

  return channelVersionReference && uiChannelSegment?.channelSegmentDescriptor
    ? {
        waveform:
          channelVersionReference && uiChannelSegment?.channelSegmentDescriptor
            ? {
                id: {
                  channel: channelVersionReference,
                  startTime: uiChannelSegment.channelSegmentDescriptor.startTime,
                  endTime: uiChannelSegment.channelSegmentDescriptor.endTime,
                  creationTime: uiChannelSegment.channelSegmentDescriptor.creationTime
                }
              }
            : undefined,
        filterDefinitionUsage,
        filterDefinition
      }
    : undefined;
};

const buildArrivalTimeFeatureMeasurement = (
  channelVersionReference: VersionReference<'name', Channel>,
  channel: Channel,
  uiChannelSegment: UiChannelSegment,
  arrivalTime: number,
  defaultSDTimeUncertainty: number
): FeatureMeasurement => {
  const featureMeasurementType = FeatureMeasurementType.ARRIVAL_TIME;
  const measuredChannelSegment = uiChannelSegment?.channelSegmentDescriptor
    ? {
        id: uiChannelSegment?.channelSegmentDescriptor
      }
    : undefined;

  const analysisWaveform = buildAnalysisWaveform(
    channel,
    channelVersionReference,
    uiChannelSegment,
    featureMeasurementType
  );

  return {
    featureMeasurementType,
    measurementValue: {
      arrivalTime: {
        value: arrivalTime,
        standardDeviation: defaultSDTimeUncertainty
      },
      travelTime: undefined
    },
    snr: undefined,
    channel: {
      name: channel.name,
      effectiveAt: channel.effectiveAt
    },
    measuredChannelSegment,
    analysisWaveform
  };
};

const buildPhaseFeatureMeasurement = (
  channelVersionReference: VersionReference<'name', Channel>,
  channel: Channel,
  uiChannelSegment: UiChannelSegment,
  arrivalTime: number,
  phase: string
): FeatureMeasurement => {
  const featureMeasurementType = FeatureMeasurementType.PHASE;
  const measuredChannelSegment = uiChannelSegment?.channelSegmentDescriptor
    ? {
        id: uiChannelSegment?.channelSegmentDescriptor
      }
    : undefined;

  const analysisWaveform = buildAnalysisWaveform(
    channel,
    channelVersionReference,
    uiChannelSegment,
    featureMeasurementType
  );

  return {
    featureMeasurementType,
    measurementValue: {
      value: phase,
      confidence: undefined,
      referenceTime: arrivalTime
    },
    snr: undefined,
    channel: {
      name: channel.name,
      effectiveAt: channel.effectiveAt
    },
    measuredChannelSegment,
    analysisWaveform
  };
};

const buildSignalDetectionHypothesis = (
  signalDetectionId: string,
  station: Station,
  channelVersionReference: VersionReference<'name', Channel>,
  channel: Channel,
  uiChannelSegment: UiChannelSegment,
  arrivalTime: number,
  phase: string,
  monitoringOrganization: string,
  defaultSDTimeUncertainty: number
): SignalDetectionTypes.SignalDetectionHypothesis => {
  const arrivalTimeFeatureMeasurement = buildArrivalTimeFeatureMeasurement(
    channelVersionReference,
    channel,
    uiChannelSegment,
    arrivalTime,
    defaultSDTimeUncertainty
  );
  const phaseFeatureMeasurement = buildPhaseFeatureMeasurement(
    channelVersionReference,
    channel,
    uiChannelSegment,
    arrivalTime,
    phase
  );

  return {
    id: {
      id: uuid.asString(),
      signalDetectionId
    },
    monitoringOrganization,
    deleted: false,
    station: {
      name: station.name,
      effectiveAt: station.effectiveAt
    },
    featureMeasurements: [arrivalTimeFeatureMeasurement, phaseFeatureMeasurement],
    parentSignalDetectionHypothesis: null
  };
};

const buildSignalDetection = (
  station: Station,
  channelVersionReference: VersionReference<'name', Channel>,
  channel: Channel,
  uiChannelSegment: UiChannelSegment,
  arrivalTime: number,
  phase: string,
  monitoringOrganization: string,
  defaultSDTimeUncertainty: number
): SignalDetection => {
  const signalDetectionId = uuid.asString();
  const signalDetectionHypothesis = buildSignalDetectionHypothesis(
    signalDetectionId,
    station,
    channelVersionReference,
    channel,
    uiChannelSegment,
    arrivalTime,
    phase,
    monitoringOrganization,
    defaultSDTimeUncertainty
  );
  return {
    id: signalDetectionId,
    monitoringOrganization,
    station: {
      name: station.name
    },
    signalDetectionHypotheses: [signalDetectionHypothesis],
    _uiHasUnsavedChanges: epochSecondsNow()
  };
};

/**
 * Hook to properly update filter definitions in the case of a created or updated signal detection.
 *
 * @returns a callback which will call the required service to update filter definitions
 */
export const useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses = () => {
  const dispatch = useAppDispatch();
  const eventHypothesis = usePreferredEventHypothesis();
  const stageId = useStageId();

  return React.useCallback(
    (signalDetectionsHypotheses: SignalDetectionHypothesis[]) => {
      if (!stageId?.definitionId?.name) return;

      batch(() => {
        dispatch(
          getFilterDefinitionsForSignalDetectionHypotheses({
            stageId: {
              name: stageId.definitionId.name
            },
            signalDetectionsHypotheses
          })
        ).catch(error => {
          throw new UIStateError(error);
        });

        // Per guidance we must call this endpoint twice, once without the event hypothesis and once with
        if (eventHypothesis) {
          dispatch(
            getFilterDefinitionsForSignalDetectionHypotheses({
              stageId: {
                name: stageId.definitionId.name
              },
              signalDetectionsHypotheses,
              eventHypothesis
            })
          ).catch(error => {
            throw new UIStateError(error);
          });
        }
      });
    },
    [dispatch, eventHypothesis, stageId]
  );
};

/**
 * Hook that returns a callback that allows you to create a new signal detection
 *
 * @returns a callback that will create a new signal detection
 */
export const useCreateSignalDetection = () => {
  const dispatch = useAppDispatch();
  const channelsRecord = useAllChannelsRecord();
  const stations = useAllStations();
  const selectedSdIds = useAppSelector(selectSelectedSdIds);
  const getVisibleChannelSegmentsByStationAndTime = useGetVisibleChannelSegmentsByStationAndTime();

  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const processingMonitoringOrganizationConfigurationQuery = useGetProcessingMonitoringOrganizationConfigurationQuery();
  const getFilterDefinitions = useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses();

  return React.useCallback(
    async (
      stationId: string,
      channelName: string,
      timeSecs: number,
      phase: string,
      isTemporary = false
    ) => {
      // Get defaults
      const { monitoringOrganization } = processingMonitoringOrganizationConfigurationQuery.data;
      const { defaultSDTimeUncertainty } = processingAnalystConfigurationQuery.data;
      // Get just the station name (could be a station or channel)
      const stationName = stationId.split('.')[0];
      // Get fully populated station
      const station: Station = stations.find(s => s.name === stationName);
      // Channel record key could be the station name or channel name in the case of raw
      const key = getChannelRecordKey(stationId, station.name, channelName);

      let uiChannelSegments: UiChannelSegment[] = getVisibleChannelSegmentsByStationAndTime(
        key,
        timeSecs
      );

      // In the case we don't find the raw channel segment it might not be loaded, load the 5m beam if available
      if (uiChannelSegments.length <= 0 && isRawChannelName(key)) {
        uiChannelSegments = getVisibleChannelSegmentsByStationAndTime(station.name, timeSecs);
      }

      const uiChannelSegment: UiChannelSegment =
        uiChannelSegments.length > 1
          ? uiChannelSegments?.find(cs => cs.channelSegmentDescriptor.channel.name === channelName)
          : uiChannelSegments?.[0];

      const arrivalTime: number = timeSecs;

      let tempChannelCreated = false;
      let measuredChannel: Channel;
      let analysisChannelVersion: VersionReference<'name', Channel>;

      if (!isTemporary && uiChannelSegment?.channelSegmentDescriptor?.channel) {
        measuredChannel = getMeasuredChannel(channelsRecord, uiChannelSegment);
        const analysisChannel = getAnalysisChannel(channelsRecord, measuredChannel);

        analysisChannelVersion = {
          name: analysisChannel.name,
          effectiveAt: analysisChannel.effectiveAt
        };
      } else {
        measuredChannel = Object.values(channelsRecord).find(
          chan => chan.station.name === stationName && isTemporaryChannel(chan)
        );
        if (isTemporary || !measuredChannel) {
          tempChannelCreated = true;
          measuredChannel = await createTemporary(station);
        }
        analysisChannelVersion = {
          name: measuredChannel.name,
          effectiveAt: measuredChannel.effectiveAt
        };
      }

      batch(() => {
        const signalDetection = buildSignalDetection(
          station,
          analysisChannelVersion,
          measuredChannel,
          uiChannelSegment,
          arrivalTime,
          phase,
          monitoringOrganization,
          defaultSDTimeUncertainty
        );

        if (tempChannelCreated) {
          // Add the temp channel to redux
          dispatch(addBeamedChannels([measuredChannel]));
        }

        dispatch(createSignalDetection(signalDetection));
        dispatch(analystActions.setSelectedSdIds([...selectedSdIds, signalDetection.id]));
        getFilterDefinitions(signalDetection.signalDetectionHypotheses);
      });
    },
    [
      channelsRecord,
      dispatch,
      getFilterDefinitions,
      getVisibleChannelSegmentsByStationAndTime,
      processingAnalystConfigurationQuery.data,
      processingMonitoringOrganizationConfigurationQuery.data,
      selectedSdIds,
      stations
    ]
  );
};

const useIsPhaseConfigured = (): ((phase: string) => boolean) => {
  const emptyList = React.useRef([]);
  const phaseLists =
    useGetProcessingAnalystConfigurationQuery().data?.phaseLists || emptyList.current;
  const configuredPhases = React.useMemo(
    () => phaseLists.flatMap(list => list.categorizedPhases).flatMap(phases => phases.phases),
    [phaseLists]
  );
  return React.useCallback(
    phase => {
      return configuredPhases.includes(phase);
    },
    [configuredPhases]
  );
};

/**
 * Update the event status to 'Not Complete' for all events (not currently opened)
 * that have an associated SD
 *
 * @param selectedSdIds
 * @param openIntervalName
 * @param openEventId
 * @param events
 * @param eventStatusRecord
 * @param updateEventStatusMutation
 */
function updateEventStatus(
  selectedSdIds: string[],
  openIntervalName: string,
  openEventId: string,
  events: EventTypes.Event[],
  eventStatusRecord,
  updateEventStatusMutation: UpdateEventStatusMutationFunc
) {
  // Find events that have an association to the deleted SD(s)
  const eventsToUpdate = events
    .map(evt => {
      let foundOne = false;
      const preferredHyp = EventTypes.findPreferredEventHypothesisByStage(evt, openIntervalName);
      preferredHyp.associatedSignalDetectionHypotheses.forEach(sdHypo => {
        if (selectedSdIds.find(sdId => sdId === sdHypo.id.signalDetectionId)) {
          foundOne = true;
        }
      });
      if (foundOne) {
        return evt;
      }
      return undefined;
    })
    .filter(e => e !== undefined);

  // Get the event status and update it
  eventsToUpdate.forEach(async evt => {
    if (evt && evt.id) {
      const evtStatus = eventStatusRecord[evt.id];
      if (!evtStatus) {
        logger.warn(`Cannot update EventStatus until current EventStatus is ready`);
        return;
      }
      // If the deleted/ rejected Event's eventStatus is IN_PROGRESS (event is open), do not change eventStatus
      if (
        evt.id === openEventId &&
        evtStatus.eventStatusInfo.eventStatus === EventTypes.EventStatus.IN_PROGRESS
      )
        return;
      // Otherwise set eventStatus to NOT_COMPLETE, leave everything else unchanged
      const updatedEventStatus = {
        ...evtStatus,
        eventStatusInfo: {
          ...evtStatus.eventStatusInfo,
          eventStatus: EventTypes.EventStatus.NOT_COMPLETE
        }
      };
      await updateEventStatusMutation(updatedEventStatus);
    }
  });
}

/** hook that provides a util function for validating and checking {@link UpdateSignalDetectionArgs} */
export const useAreUpdateSignalDetectionArgsValid = () => (
  args: UpdateSignalDetectionArgs
): boolean => {
  const { signalDetectionIds, arrivalTime, phase, isDeleted: isRejected } = args;

  if (!signalDetectionIds || signalDetectionIds.length < 1) {
    logger.warn(`No signal detection ids provided for updating`, args);
    return false;
  }

  if (!arrivalTime && !phase && !isRejected) {
    logger.info(`No data provided for updating signal detections`, args);
    return false;
  }
  return true;
};

/** hook that provides a util function for adjusting the arrival time to ensure that it is within the viewable interval */
export const useAdjustArrivalTimeToBeWithinViewableInterval = () => {
  const [viewableInterval] = useViewableInterval();
  return (arrivalTime: ArrivalTime): ArrivalTime => {
    return produce(arrivalTime, draft => {
      if (draft.value < viewableInterval.startTimeSecs) {
        draft.value = viewableInterval.startTimeSecs;
      } else if (draft.value > viewableInterval.endTimeSecs) {
        draft.value = viewableInterval.endTimeSecs;
      }
    });
  };
};

/**
 * Hook to update the filter definitions for updated signal detections
 */
const useUpdateFilterDefinitionsForSignalDetections = () => {
  const signalDetections = useSignalDetections();
  const stageId = useStageId();
  const getFilterDefinitions = useGetFilterDefinitionsForNewOrUpdatedSignalDetectionHypotheses();

  return React.useCallback(
    (signalDetectionIds: string[], phase: string) => {
      if (!stageId?.definitionId?.name) return;

      const currentSignalDetectionHypotheses: SignalDetectionTypes.SignalDetectionHypothesis[] = signalDetectionIds.reduce(
        (sdh, signalDetectionId) => {
          const signalDetection = signalDetections[signalDetectionId];
          const signalDetectionHypothesis = getCurrentHypothesis(
            signalDetection.signalDetectionHypotheses
          );
          const fmIndex = signalDetectionHypothesis.featureMeasurements.findIndex(
            fm => fm.featureMeasurementType === SignalDetectionTypes.FeatureMeasurementType.PHASE
          );

          if (fmIndex < 0) return sdh;

          const phaseFM = signalDetectionHypothesis.featureMeasurements[fmIndex];
          const updatedPhaseFM = {
            ...phaseFM,
            measurementValue: {
              ...phaseFM.measurementValue,
              value: phase
            }
          };

          const result = produce(signalDetectionHypothesis, draft => {
            draft.featureMeasurements.splice(fmIndex, 1, updatedPhaseFM);
          });

          return [...sdh, result];
        },
        []
      );

      getFilterDefinitions(currentSignalDetectionHypotheses);
    },
    [getFilterDefinitions, signalDetections, stageId]
  );
};

/**
 * Hook to get the current uiChannelSegment associated with a signal detection with a fully populated channel.
 * Will return undefined if the SD is not associated to a channel segment
 */
const useGetSignalDetectionUiChannelSegment = (): ((
  signalDetectionId: string
) => UiChannelSegment) => {
  const channelsRecord = useAllChannelsRecord();
  const uiChannelSegmentsRecord: UIChannelSegmentRecord = useVisibleChannelSegments();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);
  const signalDetections = useSignalDetections();

  return React.useCallback(
    (signalDetectionId: string) => {
      const signalDetection = signalDetections[signalDetectionId];
      const arrivalTimeFm = findArrivalTimeFeatureMeasurementUsingSignalDetection(signalDetection);
      if (!arrivalTimeFm.analysisWaveform?.waveform) return undefined;

      /* In the case of raw channels, the raw channel segment may not be loaded. The architecture team decided
      to allow us to use the 5m beam to update the analysisWaveform and measuredChannelSegment instead of the raw.
      The start and end times will be incorrect but given the uniqueness of the raw channel name, the server will
      still be able to associate the signal detection to the the correct raw.
      */

      let stationId = signalDetection.station.name;

      if (
        isRawChannelName(arrivalTimeFm.analysisWaveform?.waveform?.id?.channel?.name) &&
        uiChannelSegmentsRecord[arrivalTimeFm.analysisWaveform?.waveform?.id?.channel?.name]
      ) {
        stationId = arrivalTimeFm.analysisWaveform.waveform.id.channel.name;
      }

      const filter = channelFilters[stationId];
      const filterName = getFilterName(filter);

      const stationChannelSegmentRecord = uiChannelSegmentsRecord[stationId];
      if (!stationChannelSegmentRecord[filterName]) {
        throw new Error(`UI Channel Segment Record is not Available for ${filterName}`);
      }
      const filteredChannelSegment = stationChannelSegmentRecord
        ? stationChannelSegmentRecord[filterName].find(uiChannelSegment => {
            if (filterName !== UNFILTERED) {
              return channelsRecord[
                uiChannelSegment.channelSegmentDescriptor.channel.name
              ].configuredInputs.find(configuredInput => {
                return (
                  configuredInput.name ===
                    arrivalTimeFm.analysisWaveform.waveform.id.channel.name &&
                  configuredInput.effectiveAt ===
                    arrivalTimeFm.analysisWaveform.waveform.id.channel.effectiveAt
                );
              });
            }

            return (
              uiChannelSegment.channelSegmentDescriptor.channel.name ===
              arrivalTimeFm.analysisWaveform?.waveform?.id.channel.name
            );
          })
        : undefined;
      const measuredChannel =
        channelsRecord[filteredChannelSegment?.channelSegmentDescriptor.channel.name];

      return !filteredChannelSegment && !measuredChannel
        ? undefined
        : {
            ...filteredChannelSegment,
            channelSegmentDescriptor: {
              ...filteredChannelSegment?.channelSegmentDescriptor,
              channel: measuredChannel
            }
          };
    },
    [channelFilters, channelsRecord, signalDetections, uiChannelSegmentsRecord]
  );
};

/**
 * Hook to update a signal detection (re-time, re-phase or delete)
 *
 * If necessary, it will create a new working signal detection hypothesis.
 * If necessary, it will create a new working event hypothesis for any associated signal detections.
 *
 * Updates the state with the updated signal detection
 *
 * @returns a callback that requires UpdateSignalDetectionArgs
 */
export const useUpdateSignalDetection = (): ((args: UpdateSignalDetectionArgs) => void) => {
  const dispatch = useAppDispatch();
  const areUpdateSignalDetectionArgsValid = useAreUpdateSignalDetectionArgsValid();
  const isPhaseConfigured = useIsPhaseConfigured();
  const adjustArrivalTimeToBeWithinViewableInterval = useAdjustArrivalTimeToBeWithinViewableInterval();
  const updateFilterDefinitionsForSignalDetections = useUpdateFilterDefinitionsForSignalDetections();
  const getSignalDetectionUiChannelSegment = useGetSignalDetectionUiChannelSegment();
  const eventStatusQuery = useEventStatusQuery();
  const eventQuery = useGetEvents();
  const openEventId = useAppSelector(selectOpenEventId);
  const [updateEventStatusMutation] = useUpdateEventStatusMutation();

  const username = useAppSelector(selectUsername);
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const stageId = useStageId();

  return React.useCallback(
    (args: UpdateSignalDetectionArgs) => {
      const { signalDetectionIds, phase, isDeleted } = args;
      const { arrivalTime } = args;

      if (!areUpdateSignalDetectionArgsValid(args)) return;

      if (!eventStatusQuery.data) logger.warn(`Cannot reject event until event status is ready`);

      // Update the event statuses before rejecting the SD where SD hypo id
      // might change if first change to SD
      updateEventStatus(
        signalDetectionIds,
        openIntervalName,
        openEventId,
        eventQuery.data,
        eventStatusQuery.data,
        updateEventStatusMutation
      );

      const signalDetectionsRecord = {};
      signalDetectionIds.forEach(signalDetectionId => {
        try {
          signalDetectionsRecord[signalDetectionId] = getSignalDetectionUiChannelSegment(
            signalDetectionId
          );
        } catch (error) {
          logger.error(`Failed to update signal detections`, error, args);
        }
      });

      batch(() => {
        new Promise(() => {
          // perform the necessary data updates
          if (arrivalTime) {
            adjustArrivalTimeToBeWithinViewableInterval(arrivalTime);
            dispatch(
              updateArrivalTimeSignalDetection({
                username,
                stageId,
                openIntervalName,
                signalDetectionsRecord,
                arrivalTime
              })
            );
          }

          if (phase && !!isPhaseConfigured(phase)) {
            updateFilterDefinitionsForSignalDetections(signalDetectionIds, phase);
            dispatch(
              updatePhaseSignalDetection({
                username,
                stageId,
                openIntervalName,
                signalDetectionsRecord,
                phase
              })
            );
          }

          if (isDeleted) {
            dispatch(
              deleteSignalDetection({
                username,
                stageId,
                openIntervalName,
                signalDetectionIds,
                isDeleted
              })
            );
          }
        }).catch(error => {
          logger.error(`Failed to update signal detections`, error, args);
        });
      });
    },
    [
      areUpdateSignalDetectionArgsValid,
      eventStatusQuery.data,
      openIntervalName,
      openEventId,
      eventQuery.data,
      updateEventStatusMutation,
      getSignalDetectionUiChannelSegment,
      isPhaseConfigured,
      adjustArrivalTimeToBeWithinViewableInterval,
      dispatch,
      username,
      stageId,
      updateFilterDefinitionsForSignalDetections
    ]
  );
};

/**
 * Hook to update a signal detection (re-phase)
 *
 * If necessary, it will create a new working signal detection hypothesis.
 * If necessary, it will create a new working event hypothesis for any associated signal detections.
 *
 * Updates the state with the updated signal detection
 *
 * @returns a callback that requires UpdateSignalDetectionArgs
 */
export const useUpdateSignalDetectionPhase = (): ((sdIds: string[], phase: string) => void) => {
  const signalDetectionsRecord = useSignalDetections();
  const updateSignalDetection = useUpdateSignalDetection();
  return React.useCallback(
    (sdIds: string[], phase: string) => {
      const sdToUpdate = sdIds.filter(sdId => {
        const sd = signalDetectionsRecord[sdId];
        const sdHyp = SignalDetectionTypes.Util.getCurrentHypothesis(sd?.signalDetectionHypotheses);
        const phaseFMV = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
          sdHyp?.featureMeasurements
        );
        if (phaseFMV && phaseFMV.value !== phase && !sdHyp.deleted) {
          return true;
        }
        return false;
      });
      if (sdToUpdate.length > 0) {
        const args: UpdateSignalDetectionArgs = {
          isDeleted: false,
          signalDetectionIds: sdToUpdate,
          phase,
          arrivalTime: undefined
        };
        updateSignalDetection(args);
      }
    },
    [signalDetectionsRecord, updateSignalDetection]
  );
};
