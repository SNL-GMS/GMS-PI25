/* eslint-disable react/destructuring-assignment */
import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { WithNonIdealStates } from '@gms/ui-core-components';
import type { SignalDetectionFetchResult } from '@gms/ui-state';
import {
  selectCurrentPhase,
  selectDefaultPhase,
  selectSignalDetectionAssociationConflictCount,
  selectValidActionTargetSignalDetectionIds,
  selectWorkflowIntervalUniqueId,
  useAppSelector,
  useAssociateSignalDetections,
  useBaseStationTime,
  useBeamformingTemplatesForEvent,
  useChannels,
  useCreateSignalDetection,
  useEventStatusQuery,
  useFilterQueue,
  useGetChannelSegments,
  useGetEvents,
  useGetProcessingAnalystConfigurationQuery,
  useGetSignalDetections,
  useKeyboardShortcutConfigurations,
  useMaximumOffset,
  useMinimumOffset,
  usePan,
  useSelectedFilterList,
  useSetSignalDetectionActionTargets,
  useShouldShowPredictedPhases,
  useShouldShowTimeUncertainty,
  useStationsVisibility,
  useUiTheme,
  useUnassociateSignalDetections,
  useUpdateSignalDetection,
  useUpdateSignalDetectionPhase,
  useViewableInterval,
  useViewportVisibleStations,
  useZoomInterval
} from '@gms/ui-state';
import type { Weavess } from '@gms/weavess';
import flatMap from 'lodash/flatMap';
import React from 'react';

import { AnalystNonIdealStates } from '~analyst-ui/common/non-ideal-states';
import {
  getDistanceToStationsForPreferredLocationSolutionId,
  memoizedLocationToEventAzimuth,
  memoizedLocationToEventDistance
} from '~analyst-ui/common/utils/event-util';
import { BaseDisplay } from '~common-ui/components/base-display';
import { CommonNonIdealStateDefs } from '~common-ui/components/non-ideal-states';

import { useSetCurrentPhase } from './components/waveform-controls/current-phase-control';
import type { WaveformComponentProps, WaveformDisplayProps } from './types';
import { buildWeavessHotkeys } from './utils';
import {
  useFeaturePredictionQueryByLocationForWaveformDisplay,
  useGetPhaseHotkeys,
  useMaskVisibility,
  useOnWeavessMount,
  useProcessingMaskForWaveformDisplay,
  useQcMasksForWaveformDisplay,
  useWaveformOffsets,
  useWaveformStations
} from './waveform-hooks';
import { WaveformPanel } from './waveform-panel';
import { WeavessContext } from './weavess-context';
import * as WaveformUtil from './weavess-stations-util';

interface WaveformNonIdealStateProps extends Omit<WaveformDisplayProps, 'signalDetections'> {
  signalDetectionResults: SignalDetectionFetchResult;
}

const WaveformOrNonIdealState = WithNonIdealStates<
  WaveformNonIdealStateProps,
  WaveformDisplayProps
>(
  [
    ...CommonNonIdealStateDefs.baseNonIdealStateDefinitions,
    ...AnalystNonIdealStates.processingAnalystConfigNonIdealStateDefinitions,
    ...AnalystNonIdealStates.timeRangeNonIdealStateDefinitions('waveforms', 'currentTimeInterval'),
    ...AnalystNonIdealStates.stationDefinitionNonIdealStateDefinitions,
    ...AnalystNonIdealStates.signalDetectionsNonIdealStateDefinitions,
    ...AnalystNonIdealStates.waveformIntervalsNonIdealStateDefinitions
  ],
  WaveformPanel
);

export function WaveformComponent(props: WaveformComponentProps) {
  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const keyboardShortcuts = useKeyboardShortcutConfigurations();
  const weavessHotkeyDefinitions = buildWeavessHotkeys(keyboardShortcuts);

  const stationDefResult = useWaveformStations();

  const maskVisibility = useMaskVisibility();

  const [uiTheme] = useUiTheme();
  // Use state rather than a ref because we want things to rerender when this updates.
  const [weavessInstance, setWeavessInstance] = React.useState<Weavess>();

  const [viewableInterval, setViewableInterval] = useViewableInterval();
  const [maximumOffset, setMaximumOffset] = useMaximumOffset();
  const [minimumOffset, setMinimumOffset] = useMinimumOffset();
  const [baseStationTime, setBaseStationTime] = useBaseStationTime();
  const [zoomInterval, setZoomInterval] = useZoomInterval();
  const associateSignalDetections = useAssociateSignalDetections();
  const unassociateSignalDetections = useUnassociateSignalDetections();
  const pan = usePan();
  const updateSignalDetection = useUpdateSignalDetection();
  const signalDetectionPhaseUpdate = useUpdateSignalDetectionPhase();
  const stationsVisibilityProps = useStationsVisibility();
  const [shouldShowTimeUncertainty, setShouldShowTimeUncertainty] = useShouldShowTimeUncertainty();
  const [shouldShowPredictedPhases, setShouldShowPredictedPhases] = useShouldShowPredictedPhases();

  const signalDetectionResults = useGetSignalDetections();
  const sdIdsInConflict = useAppSelector(selectSignalDetectionAssociationConflictCount);
  const channelSegmentResults = useGetChannelSegments(viewableInterval);
  const eventResults = useGetEvents();
  const eventStatusQuery = useEventStatusQuery();

  const displayedSignalDetectionConfiguration = useAppSelector(
    state => state.app.waveform.displayedSignalDetectionConfiguration
  );
  const [createEventMenuVisibility, setCreateEventMenuVisibility] = React.useState(false);
  const [phaseMenuVisibility, setPhaseMenuVisibility] = React.useState(false);
  const [currentPhaseMenuVisibility, setCurrentPhaseMenuVisibility] = React.useState(false);
  const setCurrentPhase = useSetCurrentPhase();
  const currentPhase = useAppSelector(selectCurrentPhase);
  const defaultSignalDetectionPhase = useAppSelector(selectDefaultPhase);
  const phaseHotkeys = useGetPhaseHotkeys();

  const [clickedSdId, setClickedSdId] = React.useState(null as string);
  const signalDetectionActionTargets = useAppSelector(selectValidActionTargetSignalDetectionIds);
  const setSignalDetectionActionTargets = useSetSignalDetectionActionTargets();
  const filterList = useSelectedFilterList();
  const offsets = useWaveformOffsets();
  const createSignalDetection = useCreateSignalDetection();
  const [, setViewportVisibleStations] = useViewportVisibleStations();
  // TODO: calling event beamforming templates to verify, remove later
  useBeamformingTemplatesForEvent();

  React.useEffect(() => {
    memoizedLocationToEventDistance.clear();
    memoizedLocationToEventAzimuth.clear();
  }, [props.currentOpenEventId]);

  const populatedChannels = useChannels();

  const currentOpenEvent = eventResults.data?.find(event => event.id === props.currentOpenEventId);
  const distances = React.useMemo(() => {
    return getDistanceToStationsForPreferredLocationSolutionId(
      currentOpenEvent,
      stationDefResult.data,
      props.currentStageName,
      populatedChannels
    );
  }, [currentOpenEvent, populatedChannels, props.currentStageName, stationDefResult.data]);

  const qcSegments = useQcMasksForWaveformDisplay();
  const processingMask = useProcessingMaskForWaveformDisplay(signalDetectionResults);
  const featurePredictionQuery = useFeaturePredictionQueryByLocationForWaveformDisplay(
    eventResults,
    props.currentOpenEventId,
    props.phaseToAlignOn
  );

  const alignablePhases = React.useMemo(() => {
    if (featurePredictionQuery.data?.receiverLocationsByName) {
      return WaveformUtil.getAlignablePhases(
        flatMap(
          Object.values(featurePredictionQuery.data?.receiverLocationsByName).map(
            response => response.featurePredictions
          )
        )
      );
    }
    return [];
  }, [featurePredictionQuery.data?.receiverLocationsByName]);

  const weavessContextValue = React.useMemo(
    () => ({
      weavessRef: weavessInstance,
      setWeavessRef: setWeavessInstance
    }),
    [weavessInstance]
  );

  const onWeavessMount = useOnWeavessMount();
  useFilterQueue();

  const workflowIntervalUniqueId = useAppSelector(selectWorkflowIntervalUniqueId);

  return (
    <BaseDisplay
      key={workflowIntervalUniqueId}
      tabName={IanDisplays.WAVEFORM}
      glContainer={props.glContainer}
      className="waveform-display-window gms-body-text"
      data-cy="waveform-display-window"
    >
      <WeavessContext.Provider value={weavessContextValue}>
        <WaveformOrNonIdealState
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...props}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...stationsVisibilityProps}
          processingAnalystConfigurationQuery={processingAnalystConfiguration}
          featurePredictionQuery={featurePredictionQuery}
          qcSegments={qcSegments.data}
          processingMask={processingMask}
          maskVisibility={maskVisibility}
          stationsQuery={stationDefResult}
          events={eventResults.data}
          eventStatuses={eventStatusQuery.data}
          signalDetectionResults={signalDetectionResults}
          displayedSignalDetectionConfiguration={displayedSignalDetectionConfiguration}
          sdIdsInConflict={sdIdsInConflict}
          channelSegments={channelSegmentResults.data}
          viewableInterval={viewableInterval}
          setViewableInterval={setViewableInterval}
          maximumOffset={maximumOffset}
          setMaximumOffset={setMaximumOffset}
          minimumOffset={minimumOffset}
          setMinimumOffset={setMinimumOffset}
          baseStationTime={baseStationTime}
          setBaseStationTime={setBaseStationTime}
          pan={pan}
          zoomInterval={zoomInterval}
          setZoomInterval={setZoomInterval}
          shouldShowTimeUncertainty={shouldShowTimeUncertainty}
          setShouldShowTimeUncertainty={setShouldShowTimeUncertainty}
          shouldShowPredictedPhases={shouldShowPredictedPhases}
          setShouldShowPredictedPhases={setShouldShowPredictedPhases}
          uiTheme={uiTheme}
          alignablePhases={alignablePhases}
          onWeavessMount={onWeavessMount}
          distances={distances}
          offsets={offsets}
          filterList={filterList}
          associateSignalDetections={associateSignalDetections}
          unassociateSignalDetections={unassociateSignalDetections}
          updateSignalDetection={updateSignalDetection}
          signalDetectionPhaseUpdate={signalDetectionPhaseUpdate}
          phaseMenuVisibility={phaseMenuVisibility}
          setPhaseMenuVisibility={setPhaseMenuVisibility}
          createEventMenuVisibility={createEventMenuVisibility}
          setCreateEventMenuVisibility={setCreateEventMenuVisibility}
          currentPhaseMenuVisibility={currentPhaseMenuVisibility}
          setCurrentPhaseMenuVisibility={setCurrentPhaseMenuVisibility}
          setCurrentPhase={setCurrentPhase}
          phaseHotkeys={phaseHotkeys}
          currentPhase={currentPhase}
          defaultSignalDetectionPhase={defaultSignalDetectionPhase}
          clickedSdId={clickedSdId}
          setClickedSdId={setClickedSdId}
          setSignalDetectionActionTargets={setSignalDetectionActionTargets}
          signalDetectionActionTargets={signalDetectionActionTargets}
          weavessHotkeyDefinitions={weavessHotkeyDefinitions}
          keyboardShortcuts={keyboardShortcuts}
          createSignalDetection={createSignalDetection}
          setViewportVisibleStations={setViewportVisibleStations}
        />
      </WeavessContext.Provider>
    </BaseDisplay>
  );
}
