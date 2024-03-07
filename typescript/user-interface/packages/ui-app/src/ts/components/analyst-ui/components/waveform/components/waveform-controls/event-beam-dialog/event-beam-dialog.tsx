import {
  Button,
  ButtonGroup,
  Dialog,
  DialogBody,
  DialogFooter,
  Icon,
  Intent,
  Radio,
  RadioGroup
} from '@blueprintjs/core';
import { TimePicker, TimePrecision } from '@blueprintjs/datetime';
import { IconNames } from '@blueprintjs/icons';
import type { ChannelTypes, FilterTypes } from '@gms/common-model';
import { StationTypes } from '@gms/common-model';
import {
  BeamSummation,
  InterpolationMethod
} from '@gms/common-model/lib/beamforming-templates/types';
import { convertDateToUTCDate, toDate, uuid4 } from '@gms/common-util';
import { DialogTitle, FormContent, FormGroup, FormMessage } from '@gms/ui-core-components';
import type { Message } from '@gms/ui-core-components/lib/components/ui-widgets/form/types';
import {
  analystActions,
  selectSelectedStationsAndChannelIds,
  useAppDispatch,
  useAppSelector,
  useChannels,
  useGetProcessingAnalystConfigurationQuery,
  useSelectedFilter,
  useVisibleStations
} from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import orderBy from 'lodash/orderBy';
import React from 'react';

import { PhaseSelectorDialog } from '~analyst-ui/common/dialogs/phase-selector/phase-selector-dialog';
import { ChannelSelector } from '~analyst-ui/common/forms/inputs/channel-selector';
import { StationSelector } from '~analyst-ui/common/forms/inputs/station-selector';
import { KeyMark } from '~common-ui/components/keyboard-shortcuts/key-mark';

import { FilterSelector } from '../../../../../common/forms/inputs/filter-selector';

const logger = UILogger.create('GMS_LOG_EVENT_BEAM_DIALOG', process.env.GMS_LOG_EVENT_BEAM_DIALOG);

const errorNumChannels = (beamChannelThreshold: number): Message => ({
  summary: 'Too few channels',
  details: `Select at least ${beamChannelThreshold} compatible channels`,
  intent: 'danger'
});

// TODO: "Invalid selection" error needs to be created at runtime by validating that the selection meets one of the following criteria:
// * there are no selected stations or raw channels; there are only stations selected;
// * there is only one selected station and at least the configured number of raw channels,
// * all of which are compatible (ground motion and sample rates)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorUnclearSelection = (stations: StationTypes.Station[], phase: string): Message => ({
  summary: 'Invalid selection',
  details: `Valid selections include: no selection; only stations; a single station plus compatible raw channels. ${
    stations.length > 0
      ? `Using default channels for selected stations.`
      : `Because no stations are selected, using all stations without ${phase}.`
  }`,
  intent: 'none'
});

// TODO: 'Incompatible selected channels' error needs to be created at runtime by validating the channel data orientation angle and channel codes (ie, BHZ, SHZ, BHE)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorGroundMotion: Message = {
  summary: 'Incompatible selected channels',
  details: `Select channels with consistent types of ground motion: ASAR.AS01.BHZ (vertical angle: 12°), ASAR.AS02.BHZ (vertical angle: 1°), ASAR.AS04.BHZ (vertical angle: 3°)`,
  intent: 'danger'
};

// TODO: 'Sample rates outside of tolerance" needs to be created at runtime by validating the sample rates vs tolerance
// TODO: 'Sample rates outside of tolerance" needs to add the configured sample rate tolerance dynamically
// TODO: 'Sample rates outside of tolerance" needs to add the channels and their sample rates dynamically
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorSampleRate: Message = {
  summary: 'Sample rates outside of tolerance (2.5hz)',
  details: `Select channels with compatible sample rates: ASAR.AS01.BHZ (40hz), ASAR.AS02.BHZ (40hz), ASAR.AS03.BHZ (80hz)`,
  intent: 'danger'
};

const unusedMockErrors = [errorGroundMotion, errorSampleRate];

const channelSelectorPlaceholders = {
  multipleStationsSelected: 'Multiple stations selected. Using default channels',
  invalidRowsSelected: 'Invalid selection. Using default channels',
  noneSelected: 'None selected. Using default channels'
} as const;
type ChannelSelectorPlaceholders = typeof channelSelectorPlaceholders[keyof typeof channelSelectorPlaceholders];

/**
 * Checks if targeted channels have the same parent station
 * Exported for testing
 *
 * @param targetChannels
 */
export const areChannelsIncompatible = (targetChannels: ChannelTypes.Channel[]): boolean => {
  const channelArrLength = targetChannels.length;
  if (channelArrLength <= 1) return false;
  const firstStationName = targetChannels[0].name.substring(0, targetChannels[0].name.indexOf('.'));
  for (let i = 1; i < channelArrLength; i += 1) {
    if (
      targetChannels[i].name.substring(0, targetChannels[i].name.indexOf('.')) !== firstStationName
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if targeted stations match targeted channels or if targeted channels have the same parent station
 * Exported for testing
 *
 * @param targetStations
 * @param targetChannels
 */
export const areRowSelectionsIncompatible = (
  targetStations: StationTypes.Station[],
  targetChannels: ChannelTypes.Channel[]
): boolean => {
  const stationArrLength = targetStations.length;
  if (!stationArrLength) {
    return areChannelsIncompatible(targetChannels);
  }
  const firstStationName = targetStations[0].name;
  const channelArrLength = targetChannels.length;
  for (let i = 0; i < channelArrLength; i += 1) {
    if (
      targetChannels[i].name.substring(0, targetChannels[i].name.indexOf('.')) !== firstStationName
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Checks number of channels against threshold stored in configuration
 * Exported for testing
 *
 * @param targetChannels
 * @param beamChannelThreshold
 */
export const isBelowThreshold = (
  targetChannels: ChannelTypes.Channel[],
  beamChannelThreshold: number
) => {
  return targetChannels.length > 0 && targetChannels.length < beamChannelThreshold;
};

const emptyStationList: StationTypes.Station[] = [];
const emptyChannelList: ChannelTypes.Channel[] = [];

/**
 * @returns the following
 * validStations: the stations which are valid targets for selection (visible array stations)
 * targetStations: the local selected stations within this dialog
 * selectStations: function for overriding the global station selection to select stations within this dialog
 */
const useStationSelection = () => {
  const visibleStations = useVisibleStations() ?? emptyStationList;
  const validStations = React.useMemo(
    () =>
      visibleStations?.filter(
        station =>
          station.type === StationTypes.StationType.SEISMIC_ARRAY ||
          station.type === StationTypes.StationType.HYDROACOUSTIC_ARRAY ||
          StationTypes.StationType.INFRASOUND_ARRAY
      ),
    [visibleStations]
  );
  const selectedStationAndChannelIds = useAppSelector(selectSelectedStationsAndChannelIds);
  const selectedStations = React.useMemo(() => {
    if (!validStations) return emptyStationList;
    const selected = validStations.filter(station =>
      selectedStationAndChannelIds.includes(station.name)
    );
    if (selected?.length >= 1) {
      return selected;
    }
    if (selected?.length === 0 && selectedStationAndChannelIds.length > 0) {
      const implicitStation = validStations.find(station => {
        return selectedStationAndChannelIds.every(channelId => {
          return station.allRawChannels.find(chan => chan.name === channelId);
        });
      });
      return implicitStation ? [implicitStation] : emptyStationList;
    }
    return emptyStationList;
  }, [selectedStationAndChannelIds, validStations]);
  const [stationSelectionOverrides, setStationSelectionOverrides] = React.useState<
    StationTypes.Station[]
  >(null);

  const targetStations = React.useMemo(() => {
    return stationSelectionOverrides ?? selectedStations;
  }, [selectedStations, stationSelectionOverrides]);

  return { validStations, targetStations, selectStations: setStationSelectionOverrides };
};

/**
 * @returns the following
 * validChannels: the channels which are valid targets for selection (channels of the selected station, if only one station is selected)
 * targetChannels: the local selected channels within this dialog
 * selectChannels: function for overriding the global channel selection to select channels within this dialog
 */
const useChannelSelections = (validStations, targetStations) => {
  const selectedStationAndChannelIds = useAppSelector(selectSelectedStationsAndChannelIds);

  const visibleChannels = React.useMemo(
    () => validStations?.flatMap(station => station.allRawChannels) ?? emptyChannelList,
    [validStations]
  );

  const selectedChannels = React.useMemo(
    () =>
      visibleChannels?.filter(
        channel => selectedStationAndChannelIds.includes(channel.name) ?? emptyChannelList
      ),
    [selectedStationAndChannelIds, visibleChannels]
  );

  const [channelSelectionOverrides, setChannelSelectionOverrides] = React.useState<
    ChannelTypes.Channel[]
  >(null);

  const validChannels = React.useMemo(
    () => orderBy(targetStations?.[0]?.allRawChannels ?? selectedChannels),
    [selectedChannels, targetStations]
  );
  const targetChannels = React.useMemo(() => {
    return channelSelectionOverrides ?? selectedChannels;
  }, [channelSelectionOverrides, selectedChannels]);
  return {
    validChannels,
    targetChannels,
    selectChannels: setChannelSelectionOverrides
  };
};

const useBuildChannelTag = (): ((channel: ChannelTypes.Channel) => string) => {
  const populatedChannels = useChannels();
  return React.useCallback(
    channel => {
      const fullyPopulatedChannel = populatedChannels.find(
        populatedChannel => populatedChannel.name === channel.name
      );
      const sampleRateStr = `(${fullyPopulatedChannel.nominalSampleRateHz}hz)`;
      return `${channel.name}${sampleRateStr}`;
    },
    [populatedChannels]
  );
};

/**
 * The type of the props for the {@link EventBeamDialog} component
 */
export interface EventBeamDialogProps {
  isEventBeamDialogVisible: boolean;
  setEventBeamDialogVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

const beamSummationMethodsToFriendlyNameMap: Map<keyof typeof BeamSummation, string> = new Map([
  [BeamSummation.COHERENT, 'Coherent'],
  [BeamSummation.INCOHERENT, 'Incoherent'],
  [BeamSummation.RMS, 'Root-mean-square (RMS)']
]);

/**
 * A dialog component for creating event beams with the user's desired settings
 */
export function EventBeamDialog({
  isEventBeamDialogVisible,
  setEventBeamDialogVisibility
}: EventBeamDialogProps) {
  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const {
    beamChannelThreshold,
    createEventBeamsDescription,
    leadDuration,
    beamDuration,
    beamSummationMethods,
    interpolationMethods
  } = processingAnalystConfiguration.data.beamforming;

  const tooltipContentText = (
    <>
      {createEventBeamsDescription
        .concat(beamChannelThreshold.toString())
        .split(/\r?\n/)
        .map(line => (
          <p key={uuid4()}>{line}</p>
        ))}
    </>
  );

  const dispatch = useAppDispatch();
  const currentPhase = useAppSelector(state => state.app.analyst.currentPhase);
  const defaultFilter = useSelectedFilter().selectedFilter;
  const { validStations, targetStations, selectStations } = useStationSelection();
  const { validChannels, targetChannels, selectChannels } = useChannelSelections(
    validStations,
    targetStations
  );
  const buildChannelTag = useBuildChannelTag();

  const [isPhaseSelectorOpen, setPhaseSelectorOpen] = React.useState(false);
  const [coherency, setCoherency] = React.useState<keyof typeof BeamSummation>(
    Object.values(beamSummationMethods).sort()[0]
  );
  const [interpolation, setInterpolation] = React.useState<InterpolationMethod>(
    Object.values(interpolationMethods).sort().reverse()[0] as InterpolationMethod
  );
  const [selectedFilter, setSelectedFilter] = React.useState<FilterTypes.Filter>(defaultFilter);
  const [formMessage, setFormMessage] = React.useState<Message>();
  const [channelSelectorPlaceholderText, setChannelSelectorPlaceholderText] = React.useState<
    ChannelSelectorPlaceholders
  >(channelSelectorPlaceholders.noneSelected);
  const [leadDurationTime, setLeadDurationTime] = React.useState<Date>(
    convertDateToUTCDate(toDate(leadDuration))
  );
  const [beamDurationTime, setBeamDurationTime] = React.useState<Date>(
    convertDateToUTCDate(toDate(beamDuration))
  );

  const onCloseCallback = React.useCallback(() => {
    setCoherency(Object.values(beamSummationMethods).sort()[0]);
    setInterpolation(
      Object.values(interpolationMethods).sort().reverse()[0] as InterpolationMethod
    );
    setSelectedFilter(defaultFilter);
    setFormMessage(undefined);
    setChannelSelectorPlaceholderText(channelSelectorPlaceholders.noneSelected);
    setLeadDurationTime(convertDateToUTCDate(toDate(leadDuration)));
    setBeamDurationTime(convertDateToUTCDate(toDate(beamDuration)));
    setEventBeamDialogVisibility(false);
  }, [
    beamDuration,
    beamSummationMethods,
    defaultFilter,
    interpolationMethods,
    leadDuration,
    setEventBeamDialogVisibility
  ]);

  // TODO: should other error types be included? Only `channel` is supported at this time.
  // We may need to track the offending channels so we can highlight them individually
  // We also may be able to reduce the number of distinct pieces of state by tracking more granular error info
  const [maybeErrorType, setErrorType] = React.useState<'channel'>();

  const isChannelSelectorEnabled = React.useCallback(() => targetStations?.length === 1, [
    targetStations?.length
  ]);

  const validateChannels = React.useCallback(
    (channels: ChannelTypes.Channel[]) => {
      if (isBelowThreshold(channels, beamChannelThreshold)) {
        setFormMessage(errorNumChannels(beamChannelThreshold));
        setErrorType('channel');
        return errorNumChannels;
      }
      setFormMessage(undefined);
      setErrorType(undefined);
      return undefined;
    },
    [beamChannelThreshold]
  );

  const validateChannelSelection = React.useCallback(
    (stations: StationTypes.Station[], channels: ChannelTypes.Channel[]) => {
      if (
        (stations.length !== 0 && channels.length > 0) ||
        areRowSelectionsIncompatible(stations, channels)
      ) {
        setChannelSelectorPlaceholderText(channelSelectorPlaceholders.invalidRowsSelected);
        selectChannels(emptyChannelList);
        setFormMessage(errorUnclearSelection(stations, currentPhase));
      } else if (stations.length > 1) {
        setChannelSelectorPlaceholderText(channelSelectorPlaceholders.multipleStationsSelected);
      } else if (channels.length < 1) {
        setChannelSelectorPlaceholderText(channelSelectorPlaceholders.noneSelected);
      } else {
        setChannelSelectorPlaceholderText(channelSelectorPlaceholders.noneSelected);
        setErrorType(undefined);
      }
    },
    [currentPhase, selectChannels]
  );

  return (
    <>
      <PhaseSelectorDialog
        isOpen={isPhaseSelectorOpen}
        title="Set Phase"
        selectedPhases={[currentPhase]}
        phaseSelectorCallback={val => {
          dispatch(analystActions.setCurrentPhase(val[0]));
        }}
        closeCallback={() => setPhaseSelectorOpen(false)}
      />
      <Dialog
        isOpen={isEventBeamDialogVisible}
        enforceFocus={false}
        onClose={onCloseCallback}
        onOpening={() => {
          validateChannelSelection(targetStations, targetChannels);
        }}
        shouldReturnFocusOnClose
        title={<DialogTitle titleText="Create Event Beams" tooltipContent={tooltipContentText} />}
        isCloseButtonShown
        canEscapeKeyClose
      >
        <DialogBody className="event-beam-dialog">
          <FormContent className="create-event-beam-settings">
            <StationSelector
              validStations={validStations}
              selectedStations={targetStations}
              onChange={selection => {
                selectStations(selection);
                selectChannels(emptyChannelList);
                validateChannelSelection(selection, emptyChannelList);
              }}
              placeholder={`None selected. Using all stations without ${currentPhase}.`}
            />
            <FormGroup
              helperText="If none are selected, use default configured channels for the selected station."
              label="Input Channels"
            >
              <ChannelSelector
                disabled={!isChannelSelectorEnabled()}
                intent={maybeErrorType === 'channel' ? Intent.DANGER : Intent.NONE}
                validChannels={validChannels}
                buildChannelTag={buildChannelTag}
                placeholder={channelSelectorPlaceholderText}
                selectedChannels={targetChannels}
                onChange={selection => {
                  selectChannels(selection);
                  if (formMessage) {
                    validateChannels(selection);
                  }
                }}
              />
            </FormGroup>
            <FormGroup
              helperText="Beam for this phase at the predicted time"
              label="Phase"
              labelInfo="(current phase)"
            >
              <Button
                id="beam-phase-name"
                disabled={formMessage?.intent === 'danger'}
                className="event-beam-dialog__current-phase"
                onClick={() => setPhaseSelectorOpen(true)}
                value={currentPhase}
                rightIcon={<Icon icon={IconNames.SELECT} size={14} />}
                fill
                alignText="left"
              >
                <span>{currentPhase}</span>
              </Button>
            </FormGroup>
            <FormGroup helperText="Lead time before the predicted phase" label="Lead time">
              {/* Year, month and day are ignored */}
              <TimePicker
                disabled={formMessage?.intent === 'danger'}
                precision={TimePrecision.SECOND}
                value={leadDurationTime}
                onChange={setLeadDurationTime}
              />
            </FormGroup>
            <FormGroup helperText="Duration of the event beam" label="Duration">
              {/* Year, month and day are ignored */}
              <TimePicker
                disabled={formMessage?.intent === 'danger'}
                precision={TimePrecision.SECOND}
                value={beamDurationTime}
                onChange={setBeamDurationTime}
              />
            </FormGroup>
            <FormGroup helperText="Filter to apply before beaming" label="Prefilter">
              <FilterSelector
                disabled={formMessage?.intent === 'danger'}
                selectedFilter={selectedFilter}
                setSelectedFilter={setSelectedFilter}
              />
            </FormGroup>
            <FormGroup helperText="How to sum waveforms" label="Beam summation method">
              {Object.keys(beamSummationMethods).length > 1 ? (
                <RadioGroup
                  name="Beam summation method"
                  disabled={formMessage?.intent === 'danger'}
                  onChange={c => {
                    if (
                      c.currentTarget.value === beamSummationMethods.COHERENT ||
                      c.currentTarget.value === beamSummationMethods.INCOHERENT ||
                      c.currentTarget.value === beamSummationMethods.RMS
                    ) {
                      setCoherency(c.currentTarget.value);
                    } else {
                      throw new Error('Invalid summation method');
                    }
                  }}
                  selectedValue={coherency}
                >
                  {Object.values(beamSummationMethods)
                    .sort()
                    .map(method => (
                      <Radio value={method} key={method}>
                        {beamSummationMethodsToFriendlyNameMap.get(method)}
                      </Radio>
                    ))}
                </RadioGroup>
              ) : (
                <span>
                  {beamSummationMethodsToFriendlyNameMap.get(
                    Object.values(beamSummationMethods)[0]
                  )}
                </span>
              )}
            </FormGroup>
            <FormGroup helperText="How to align samples" label="Interpolation method">
              {Object.keys(interpolationMethods).length > 1 ? (
                <RadioGroup
                  name="Interpolation method"
                  disabled={formMessage?.intent === 'danger'}
                  onChange={c => {
                    if (
                      c.currentTarget.value === InterpolationMethod.NEAREST_SAMPLE ||
                      c.currentTarget.value === InterpolationMethod.INTERPOLATED
                    ) {
                      setInterpolation(c.currentTarget.value);
                    } else {
                      throw new Error('Invalid interpolation value');
                    }
                  }}
                  selectedValue={interpolation}
                >
                  {Object.values(interpolationMethods)
                    .sort()
                    .reverse()
                    .map(method => (
                      <Radio value={method} key={method}>
                        {method}
                      </Radio>
                    ))}
                </RadioGroup>
              ) : (
                <span>{Object.values(interpolationMethods)[0]}</span>
              )}
            </FormGroup>
          </FormContent>
          <div className="hotkey-reminder">
            Create beams with default settings: <KeyMark>B</KeyMark>
          </div>
        </DialogBody>
        <DialogFooter
          minimal
          actions={
            <ButtonGroup>
              <Button onClick={() => setEventBeamDialogVisibility(false)}>Cancel</Button>
              <Button
                intent={formMessage?.intent === 'danger' ? 'danger' : 'primary'}
                type="submit"
                disabled={formMessage?.intent === 'danger'}
                onClick={() => {
                  const maybeChanErrorMsg = validateChannels(targetChannels);
                  if (!maybeChanErrorMsg) {
                    logger.info('Create beams');
                    // TODO: Actually create beams on submit
                    onCloseCallback();
                  } else {
                    setErrorType('channel');
                    logger.info(
                      `Logging unused error count to satisfy eslint: ${unusedMockErrors.length}`
                    );
                  }
                }}
                title="Create Beams"
              >
                Create beams
              </Button>
            </ButtonGroup>
          }
        >
          {formMessage && <FormMessage message={formMessage} hasCopyButton />}
        </DialogFooter>
      </Dialog>
    </>
  );
}
