import type { FacetedTypes, FilterTypes } from '@gms/common-model';
import { ChannelTypes, StationTypes } from '@gms/common-model';
import type { BeamDefinition } from '@gms/common-model/lib/beamforming-templates/types';
import type { ChannelSegmentDescriptor } from '@gms/common-model/lib/channel-segment/types';
import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { Station } from '@gms/common-model/lib/station-definitions/station-definitions/station-definitions';
import { setDecimalPrecision, toOSDTime } from '@gms/common-util';
import { digestMessageSHA256 } from '@gms/ui-util';
import cloneDeep from 'lodash/cloneDeep';

import type { ChannelRecord, UiChannelSegment } from '../../types';

export const TEMPORARY_CHANNEL_GROUP = 'temp';
export const SPLIT_CHANNEL_TOKEN = 'split';
export const TEMPORARY_CHANNEL_CODE = '---';
export const ATTRIBUTE_SEPARATOR = ',';
export const COMPONENT_SEPARATOR = '/';

/**
 * Build a sorted array from channel param records. Used to generate channel name hashes.
 *
 * @param r the Record to be parsed
 * @returns a sorted array of the format [{key: value}, {key: value}, ...]
 */
export function buildSortedArrayFromRecord<T = unknown>(r: Record<string, T>) {
  return [...Object.keys(r)].sort().map(k => ({ [k]: r[k] }));
}

/**
 * Creates a filter parameter entry for a channel name.
 * Does not include the leading '/' character.
 * Replaces / characters in the filter name with | characters
 *
 * @param filterDefinition the filter to parse
 * @returns the string formatted in the format: filter,filter name
 */
export function createFilterAttributesForChannelName(
  filterDefinition: FilterTypes.FilterDefinition
) {
  if (filterDefinition?.name) {
    return `filter${ATTRIBUTE_SEPARATOR}${filterDefinition.name.replace(/\//, '|')}`;
  }
  return '';
}

/**
 * Creates the object that gets stringified for the derived channel name hash
 *
 * @param channel a channel to parse
 * @returns an object containing the channel data to be hashed
 */
export function generateChannelDataForHash(channel: ChannelTypes.Channel) {
  const sortedProcessingDefinition = buildSortedArrayFromRecord(channel.processingDefinition);
  const sortedProcessingMetadata = buildSortedArrayFromRecord(channel.processingMetadata);
  const configuredInputs = [{ effectiveAt: toOSDTime(channel.effectiveAt), name: channel.name }];
  return {
    channelBandType: channel.channelBandType,
    channelDataType: channel.channelDataType,
    channelInstrumentType: channel.channelInstrumentType,
    channelOrientationCode: channel.channelOrientationCode,
    channelOrientationType: channel.channelOrientationType,
    configuredInputs,
    description: channel.description,
    location: channel.location,
    nominalSampleRateHz: channel.nominalSampleRateHz,
    orientationAngles: channel.orientationAngles,
    processingDefinition: sortedProcessingDefinition,
    processingMetadata: sortedProcessingMetadata,
    response: channel.response?.id ?? null,
    station: channel.station.name,
    units: channel.units
  };
}

/**
 * Generates the JSON string used as the input for the channel name hash
 */
export function generateChannelJsonString(channel: ChannelTypes.Channel): string {
  return JSON.stringify(generateChannelDataForHash(channel));
}

/**
 * Takes a channel and returns a promise for the channel name hash, using SHA256.
 * Uses a custom json property order based on architecture guidance so that the
 * front end and back end align.
 *
 * @param channel a channel to parse
 * @returns a deterministic hash based on the channel details
 */
export async function generateChannelHash(channel: ChannelTypes.Channel): Promise<string> {
  const jsonStringToHash = generateChannelJsonString(channel);
  return digestMessageSHA256(jsonStringToHash);
}

/**
 * Strips the end hash from a channel name
 *
 * @param name channel name
 * @returns the channel name without the ending hash
 */
export function stripHashFromChannelName(name: string): string {
  // future proofing in case the COMPONENT_SEPARATOR changes, escapes the character for use in regex
  const escapedComponentSeparator = COMPONENT_SEPARATOR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripHash = new RegExp(`${escapedComponentSeparator}[a-f0-9]{64}`);
  return name.replace(stripHash, '');
}

/**
 * Builds a channel name for a filtered, derived channel, in the format
 * [PREVIOUS_CHANNEL_NAME_WITHOUT_HASH]/[FILTER_PROCESSING_ATTRIBUTES]/[CHANNEL_HASH]
 *
 * @param inputChannel the channel that is being named (not the old channel)
 * @param filterDefinition the filter that is being applied
 */
export async function buildFilteredChannelName(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
): Promise<string> {
  const hash = await generateChannelHash(inputChannel);
  const channelNameWithoutHash = stripHashFromChannelName(inputChannel.name);
  return `${channelNameWithoutHash}${COMPONENT_SEPARATOR}${createFilterAttributesForChannelName(
    filterDefinition
  )}${COMPONENT_SEPARATOR}${hash}`;
}

/**
 * Builds a temporary channel name for a filtered, derived channel, in the format
 * [PREVIOUS_CHANNEL_NAME_WITHOUT_HASH]/[CHANNEL_HASH]
 *
 * @param inputChannel the channel that is being named (not the old channel)
 */
export async function buildTemporaryChannelName(
  inputChannel: ChannelTypes.Channel
): Promise<string> {
  const hash = await generateChannelHash(inputChannel);
  const channelNameWithoutHash = stripHashFromChannelName(inputChannel.name);

  return `${channelNameWithoutHash}.${TEMPORARY_CHANNEL_GROUP}.${TEMPORARY_CHANNEL_CODE}${COMPONENT_SEPARATOR}${hash}`;
}

/**
 *
 * Builds a masked channel name for a masked derived channel formatted:
 * [PREVIOUS_CHANNEL_NAME_WITHOUT_HASH]/masked/[CHANNEL_HASH]
 */
export async function buildMaskedChannelName(inputChannel: ChannelTypes.Channel): Promise<string> {
  const hash = await generateChannelHash(inputChannel);
  const channelNameWithoutHash = stripHashFromChannelName(inputChannel.name);
  return `${channelNameWithoutHash}${COMPONENT_SEPARATOR}masked${COMPONENT_SEPARATOR}${hash}`;
}

/**
 *
 * Builds a masked channel name for a masked derived channel formatted:
 * [PREVIOUS_CHANNEL_NAME_WITHOUT_HASH]/masked/[CHANNEL_HASH]
 */
export async function buildBeamedChannelName(
  inputChannel: ChannelTypes.Channel,
  beamDefinition: BeamDefinition
): Promise<string> {
  const hash = await generateChannelHash(inputChannel);
  const channelNameWithoutHash = stripHashFromChannelName(inputChannel.name);
  const channelNameComponents = channelNameWithoutHash.split('.');
  const newChannelName = `${channelNameComponents[0]}.BEAM.${channelNameComponents[2]}`;
  return `${newChannelName}${COMPONENT_SEPARATOR}beam${ATTRIBUTE_SEPARATOR}${beamDefinition.beamDescription.beamType.toLowerCase()}${ATTRIBUTE_SEPARATOR}${beamDefinition.beamDescription.beamSummation.toLowerCase()}${COMPONENT_SEPARATOR}steer${ATTRIBUTE_SEPARATOR}backaz_${setDecimalPrecision(
    beamDefinition.beamParameters.receiverToSourceAzimuthDeg,
    3
  )}deg${ATTRIBUTE_SEPARATOR}slow_${setDecimalPrecision(
    beamDefinition.beamParameters.slownessSecPerDeg,
    3
  )}s_per_deg${COMPONENT_SEPARATOR}${hash}`;
}

/**
 * builds the description for a beamed channel based on a base channel description and a beam definition.
 *
 * @param inputChannel input channel to use the base description from
 * @param beamDefinition the beam definition to get the event id, sd id, lat/lon, azimuth,and beam summation
 * @returns channel description string
 */
export function buildBeamedChannelDescription(
  inputChannels: ChannelTypes.Channel[],
  beamDefinition: BeamDefinition,
  stationName: string
): string {
  let baseDescription = inputChannels[0].description;
  const index = inputChannels.findIndex(channel => channel.description !== baseDescription);

  if (index !== -1) {
    baseDescription = stationName;
  }

  return `${baseDescription} ${beamDefinition.beamDescription.beamType} beamed for ${
    beamDefinition.beamParameters.eventHypothesis
      ? `event ${beamDefinition.beamParameters.eventHypothesis.id.hypothesisId},`
      : ''
  } ${
    beamDefinition.beamParameters.signalDetectionHypothesis
      ? `signal detection hypothesis ${beamDefinition.beamParameters.signalDetectionHypothesis.id.id},`
      : ''
  }at location ${beamDefinition.beamParameters.location.latitudeDegrees}/${
    beamDefinition.beamParameters.location.longitudeDegrees
  } ${beamDefinition.beamDescription.phase}, back azimuth ${
    beamDefinition.beamParameters.receiverToSourceAzimuthDeg
  }deg, slowness ${beamDefinition.beamParameters.slownessSecPerDeg}sec/deg, ${
    beamDefinition.beamDescription.beamSummation
  }, ${beamDefinition.beamDescription.twoDimensional}.`;
}

/**
 * Builds the processing metadata entry for a derived, filtered channel
 */
export function buildProcessingMetadataForFilteredChannel(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
) {
  const processingMetadata = cloneDeep(inputChannel.processingMetadata);
  processingMetadata.FILTER_TYPE = filterDefinition.filterDescription.filterType;
  processingMetadata.FILTER_CAUSALITY = filterDefinition.filterDescription.causal;
  return processingMetadata;
}

/**
 * @param inputChannel the source channel
 * @returns the configured inputs, consisting of a version reference of the channel in an array
 */
export function buildConfiguredInputs(
  inputChannel: ChannelTypes.Channel
): [FacetedTypes.VersionReference<'name', ChannelTypes.Channel>] {
  return [
    {
      effectiveAt: inputChannel.effectiveAt,
      name: inputChannel.name
    }
  ];
}

/**
 * Will build the channel version references from a given station's raw channels
 *
 * @param inputStation the source channel
 * @returns the configured inputs, consisting of a version reference of the channel in an array
 */
export function buildConfiguredInputsFromStation(
  inputStation: Station
): FacetedTypes.VersionReference<'name', ChannelTypes.Channel>[] {
  return inputStation.allRawChannels.map(channel => {
    return {
      effectiveAt: channel.effectiveAt,
      name: channel.name
    };
  });
}

/**
 * Gets the correct ChannelDataType for the given station
 *
 * @param station the source station
 * @returns a channel data type
 */
export function getChannelDataTypeFromStation(inputStation: Station): ChannelTypes.ChannelDataType {
  const stationDataTypeToChannelDataType = {
    [StationTypes.StationType.SEISMIC_1_COMPONENT]: ChannelTypes.ChannelDataType.SEISMIC,
    [StationTypes.StationType.SEISMIC_3_COMPONENT]: ChannelTypes.ChannelDataType.SEISMIC,
    [StationTypes.StationType.SEISMIC_ARRAY]: ChannelTypes.ChannelDataType.SEISMIC,
    [StationTypes.StationType.HYDROACOUSTIC]: ChannelTypes.ChannelDataType.HYDROACOUSTIC,
    [StationTypes.StationType.HYDROACOUSTIC_ARRAY]: ChannelTypes.ChannelDataType.HYDROACOUSTIC,
    [StationTypes.StationType.INFRASOUND]: ChannelTypes.ChannelDataType.INFRASOUND,
    [StationTypes.StationType.INFRASOUND_ARRAY]: ChannelTypes.ChannelDataType.INFRASOUND,
    [StationTypes.StationType.WEATHER]: ChannelTypes.ChannelDataType.WEATHER,
    [StationTypes.StationType.UNKNOWN]: ChannelTypes.ChannelDataType.UNKNOWN
  };

  return stationDataTypeToChannelDataType[inputStation.type];
}

/**
 * Determines if a channel name is formatted like a derived channel by checking the name for a component separator token.
 *
 * @param inputChannelName the source channel name
 * @returns true if the inputChannel is derived
 */
export function isDerivedChannelName(inputChannelName: string): boolean {
  return inputChannelName.includes(COMPONENT_SEPARATOR);
}

/**
 * Determines if a channel is derived by checking the name for a component separator token.
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is derived
 */
export function isDerivedChannel(inputChannel: ChannelSegmentDescriptor['channel']): boolean {
  return isDerivedChannelName(inputChannel.name);
}

/**
 * Determines if a channel name is formatted like a split channel by checking the name for a component separator token.
 *
 * @param inputChannelName the source channel name
 * @returns true if the inputChannel is split
 */
export function isSplitChannelName(inputChannelName: string): boolean {
  return inputChannelName.includes(SPLIT_CHANNEL_TOKEN);
}

/**
 * Determines if a channel is split by checking the name for a component separator token.
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is split
 */
export function isSplitChannel(inputChannel: ChannelSegmentDescriptor['channel']): boolean {
  return isSplitChannelName(inputChannel.name);
}

/**
 * Determines if a channel name is formatted like a raw channel by checking the name for a component separator token.
 *
 * @param inputChannelName the source channel name
 * @returns true if the inputChannel is raw
 */
export function isRawChannelName(inputChannelName: string): boolean {
  return !isDerivedChannelName(inputChannelName);
}

/**
 * Determines if a channel is raw by checking the name for a component separator token.
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is raw
 */
export function isRawChannel(inputChannel: ChannelSegmentDescriptor['channel']): boolean {
  return !isDerivedChannel(inputChannel);
}

/**
 * Determines if a channel name is temporary by the temp channel code
 *
 * @param inputChannelName the source channel name
 * @returns true if the inputChannelName is temporary
 */
export function isTemporaryChannelName(inputChannelName: string): boolean {
  return inputChannelName.includes(TEMPORARY_CHANNEL_CODE);
}

/**
 * Determines if a channel is temporary by checking the name for a temporary channel code.
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is temporary
 */
export function isTemporaryChannel(inputChannel: ChannelSegmentDescriptor['channel']): boolean {
  return isTemporaryChannelName(inputChannel.name);
}

/**
 * Determines if the channel is a filtered channel or not
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is filtered
 */
export function isFilteredChannel(inputChannel: Channel): boolean {
  return inputChannel?.configuredInputs?.length >= 1;
}

/**
 * Given a the channel record and a channel this will return the original unfiltered channel
 *
 * @param channelsRecord channels to search
 * @param inputChannel the source channel
 * @returns the unfiltered channel
 */
export const getAnalysisChannel = (channelsRecord: ChannelRecord, inputChannel: Channel) => {
  // If filtered
  if (isFilteredChannel(inputChannel)) {
    const unfilteredChannel = inputChannel?.configuredInputs.find(
      ({ effectiveAt }) => effectiveAt === inputChannel.effectiveAt
    );
    if (unfilteredChannel) {
      // Could be a version reference so grab this from the record
      return channelsRecord[unfilteredChannel.name];
    }
  }

  return channelsRecord[inputChannel.name];
};

/**
 * Given a the channel record and a uiChannelSegment this will return the the associated channel
 *
 * @param channelsRecord channels to search
 * @param uiChannelSegment the source uiChannelSegment
 * @returns the unfiltered or filtered channel
 */
export const getMeasuredChannel = (
  channelsRecord: ChannelRecord,
  uiChannelSegment: UiChannelSegment
) => {
  return channelsRecord[uiChannelSegment.channelSegmentDescriptor.channel.name];
};
