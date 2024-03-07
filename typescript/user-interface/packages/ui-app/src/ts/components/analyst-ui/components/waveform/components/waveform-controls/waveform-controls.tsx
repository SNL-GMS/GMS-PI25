import { Radio, RadioGroup } from '@blueprintjs/core';
import type { ToolbarTypes } from '@gms/ui-core-components';
import { Tooltip2Wrapper, useImperativeContextMenuCallback } from '@gms/ui-core-components';
import { useAppDispatch, waveformActions } from '@gms/ui-state';
import { AlignWaveformsOn } from '@gms/ui-state/lib/app/state/analyst/types';
import React from 'react';

import { PhaseSelectorDialog } from '~analyst-ui/common/dialogs/phase-selector/phase-selector-dialog';
import { useBaseDisplaySize } from '~common-ui/components/base-display/base-display-hooks';

import { useCreateEventControl } from '../../../../common/toolbar-items/create-event-control';
import type { QcContextMenuCallbacks } from '../../quality-control';
import { QcContextMenus } from '../../quality-control';
import { useAlignmentControl } from './alignment-control';
import { useCreateQcSegmentControl } from './create-qc-segment-btn';
import { useCurrentPhaseControl } from './current-phase-control';
import { EventBeamControls } from './event-beam-controls';
import { EventBeamDialog } from './event-beam-dialog/event-beam-dialog';
import { useMeasureWindowControl } from './measure-window-control';
import { useModeControl } from './mode-selector-control';
import { useNumWaveformControl } from './num-waveform-control';
import { usePanGroupControl } from './pan-group-controls';
import { usePhaseControl } from './phase-selector-control';
import { usePredictedControl } from './predicted-control';
import { useQcMaskControl } from './qc-mask-control';
import { useScalingOptions } from './scaling-options';
import { useShowDetectionsControl } from './show-detections-control';
import { useStationSortControl } from './station-sort-control';
import { useStationsDropdownControl } from './stations-control';
import { useTimeUncertaintySwitch } from './time-uncertainty-switch';
import type { WaveformControlsProps } from './types';
import { WaveformToolbar } from './waveform-toolbar';
import { useZASControl } from './zas-control';

const eventBeamControlsKey = 'Event Beam Controls';

/**
 * Waveform Display Controls Component
 * Builds and renders the waveform toolbar and loading spinner (absolutely positioned to appear at
 * a different location on the screen).
 */
export const WaveformControls = React.memo(function InternalWaveformControls({
  measurementMode,
  currentOpenEventId,
  currentTimeInterval,
  viewableTimeInterval,
  setMode,
  defaultSignalDetectionPhase,
  setCreateEventMenuVisibility,
  setCurrentPhaseMenuVisibility,
  setDefaultSignalDetectionPhase,
  analystNumberOfWaveforms,
  setAnalystNumberOfWaveforms,
  alignWaveformsOn,
  selectedStationIds,
  phaseToAlignOn,
  showPredictedPhases,
  setWaveformAlignment,
  setAlignWaveformsOn,
  currentSortType,
  setSelectedSortType,
  isMeasureWindowVisible,
  toggleMeasureWindow,
  pan,
  zoomAlignSort,
  amplitudeScaleOption,
  fixedScaleVal,
  setAmplitudeScaleOption,
  setFixedScaleVal,
  featurePredictionQueryDataUnavailable,
  qcMaskDefaultVisibility,
  uiTheme
}: WaveformControlsProps) {
  const dispatch = useAppDispatch();

  const [alignedOn, setAlignedOn] = React.useState(alignWaveformsOn);
  const [isOpen, setIsOpen] = React.useState(false);
  const onPhaseSubmit = React.useCallback(
    (phases: string[]) => {
      // Manually call this because setWaveformAlignment is a slow operation and the pop stays open too long
      setIsOpen(false);

      setWaveformAlignment(
        alignedOn,
        phases[0],
        alignedOn !== AlignWaveformsOn.TIME ? true : showPredictedPhases
      );
      if (alignedOn === AlignWaveformsOn.PREDICTED_PHASE) {
        dispatch(waveformActions.setShouldShowPredictedPhases(true));
      }
    },
    [alignedOn, dispatch, setWaveformAlignment, showPredictedPhases]
  );

  const onRadioClick = React.useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      setAlignedOn(event.currentTarget.value as AlignWaveformsOn);
      if (event.currentTarget.value === 'Time') {
        setIsOpen(false);
        setWaveformAlignment(AlignWaveformsOn.TIME, undefined, showPredictedPhases);
      }
    },
    [setWaveformAlignment, showPredictedPhases]
  );

  const closeCallback = React.useCallback(() => setIsOpen(false), []);

  const [widthPx] = useBaseDisplaySize();

  const panGroup = usePanGroupControl(pan, currentTimeInterval, viewableTimeInterval, 'wfpangroup');

  const createEventControl = useCreateEventControl(setCreateEventMenuVisibility, 'wfcreateevent');

  const zoomAlignSortGroup = useZASControl(
    zoomAlignSort,
    currentOpenEventId,
    featurePredictionQueryDataUnavailable,
    'wfzasgroup'
  );

  const currentPhaseMenu = useCurrentPhaseControl(
    setCurrentPhaseMenuVisibility,
    'wfcurrentphasemenu'
  );
  const [isEventBeamDialogVisible, setEventBeamDialogVisibility] = React.useState(false);

  const stationSelector = useStationsDropdownControl('wfstationselect');

  const numWaveformsSelector = useNumWaveformControl(
    analystNumberOfWaveforms,
    setAnalystNumberOfWaveforms,
    'wfnumwaveformselect'
  );

  const { toolbarItem: scalingOptions } = useScalingOptions(
    amplitudeScaleOption,
    fixedScaleVal,
    setAmplitudeScaleOption,
    setFixedScaleVal,
    'wfscaling'
  );

  const timeUncertaintySwitch = useTimeUncertaintySwitch('wftimeuncertainty');

  const modeSelector = useModeControl(measurementMode, setMode, 'wfmodeselect');

  const sdPhaseSelector = usePhaseControl(
    defaultSignalDetectionPhase,
    setDefaultSignalDetectionPhase,
    'wfsdphaseselect'
  );

  const alignmentSelector = useAlignmentControl(
    alignWaveformsOn,
    phaseToAlignOn,
    setAlignedOn,
    setIsOpen,
    currentOpenEventId,
    'wfalignment'
  );

  const stationSort = useStationSortControl(
    currentSortType,
    alignWaveformsOn,
    currentOpenEventId,
    setSelectedSortType,
    'wfstationsort'
  );

  const predictedDropdown = usePredictedControl(
    currentOpenEventId,
    'wfpredicted',
    setAlignWaveformsOn
  );

  const showDetectionsDropdown = useShowDetectionsControl('wfshowdets');

  const qcMaskPicker = useQcMaskControl(qcMaskDefaultVisibility, uiTheme);

  const [qcContextMenusCb, setQcContextMenusCb] = useImperativeContextMenuCallback<
    unknown,
    QcContextMenuCallbacks
  >({
    qcSegmentsContextMenuCb: undefined,
    qcSegmentEditContextMenuCb: undefined,
    qcSegmentSelectionContextMenuCb: undefined,
    qcSegmentCreationContextMenuCb: undefined,
    processingMaskContextMenuCb: undefined
  });
  const createQcSegment = useCreateQcSegmentControl(
    selectedStationIds,
    viewableTimeInterval,
    qcContextMenusCb,
    'wfcreateseg'
  );

  const measureWindowSwitch = useMeasureWindowControl(
    isMeasureWindowVisible,
    toggleMeasureWindow,
    'wfmeasurewindow'
  );

  const leftItems: ToolbarTypes.ToolbarItemElement[] = React.useMemo(() => {
    return [panGroup, zoomAlignSortGroup, createEventControl];
  }, [panGroup, createEventControl, zoomAlignSortGroup]);

  const rightItems: ToolbarTypes.ToolbarItemElement[] = React.useMemo(() => {
    return [
      <EventBeamControls
        key={eventBeamControlsKey}
        setEventBeamDialogVisibility={setEventBeamDialogVisibility}
        currentOpenEventId={currentOpenEventId}
      />,
      stationSelector,
      currentPhaseMenu,
      modeSelector,
      scalingOptions,
      sdPhaseSelector,
      numWaveformsSelector,
      alignmentSelector,
      stationSort,
      timeUncertaintySwitch,
      predictedDropdown,
      showDetectionsDropdown,
      qcMaskPicker,
      createQcSegment,
      measureWindowSwitch
    ];
  }, [
    currentOpenEventId,
    stationSelector,
    currentPhaseMenu,
    modeSelector,
    scalingOptions,
    sdPhaseSelector,
    numWaveformsSelector,
    alignmentSelector,
    stationSort,
    timeUncertaintySwitch,
    predictedDropdown,
    showDetectionsDropdown,
    qcMaskPicker,
    createQcSegment,
    measureWindowSwitch
  ]);

  return (
    <>
      <QcContextMenus getOpenCallback={setQcContextMenusCb} />
      <EventBeamDialog
        // Making this key controlled effectively resets its internal state every time it is opened
        key={`event-beam-dialog-${isEventBeamDialogVisible ? 'open' : 'closed'}`}
        isEventBeamDialogVisible={isEventBeamDialogVisible}
        setEventBeamDialogVisibility={setEventBeamDialogVisibility}
      />
      <PhaseSelectorDialog
        isOpen={isOpen}
        title="Set Alignment"
        selectedPhases={[phaseToAlignOn]}
        phaseSelectorCallback={onPhaseSubmit}
        closeCallback={closeCallback}
      >
        <Tooltip2Wrapper content="Alignment type">
          <RadioGroup onChange={onRadioClick} selectedValue={alignedOn} inline>
            <Radio label="Time" value="Time" key="Time" data-cy="Time" />
            <Radio label="Observed" value="Observed" key="Observed" data-cy="Observed" />{' '}
            <Radio label="Predicted" value="Predicted" key="Predicted" data-cy="Predicted" />
          </RadioGroup>
        </Tooltip2Wrapper>
      </PhaseSelectorDialog>
      <WaveformToolbar
        leftToolbarItems={leftItems}
        rightToolbarItems={rightItems}
        widthPx={widthPx}
      />
    </>
  );
});
