import type {
  ChannelTypes,
  FilterTypes,
  ProcessingMaskDefinitionTypes,
  TypeUtil
} from '@gms/common-model';
import type { BeamDefinition } from '@gms/common-model/lib/beamforming-templates/types';
import { Units } from '@gms/common-model/lib/common/types';
import {
  convertToVersionReference,
  isEntityReference,
  isVersionReference
} from '@gms/common-model/lib/faceted';
import {
  ChannelBandType,
  ChannelInstrumentType,
  ChannelOrientationType
} from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import type { Station } from '@gms/common-model/lib/station-definitions/station-definitions/station-definitions';
import { Logger, recordHasStringOrNumberKeys, sortRecordByKeys } from '@gms/common-util';
import {
  axiosBaseQuery,
  deserializeTypeTransformer,
  serializeTypeTransformer
} from '@gms/ui-workers';

import { config } from '../api/system-event-gateway/endpoint-configuration';
import {
  buildBeamedChannelDescription,
  buildBeamedChannelName,
  buildConfiguredInputs,
  buildConfiguredInputsFromStation,
  buildFilteredChannelName,
  buildMaskedChannelName,
  buildProcessingMetadataForFilteredChannel,
  buildTemporaryChannelName,
  getChannelDataTypeFromStation
} from './channel-factory-util';

const logger = Logger.create('GMS_LOG_CHANNEL_FACTORY', process.env.GMS_LOG_CHANNEL_FACTORY);

/**
 * Publishes the newly created derived channel.
 */
export async function publishDerivedChannelsCreatedEvent(
  channels: ChannelTypes.Channel[]
): Promise<boolean> {
  try {
    const queryFn = axiosBaseQuery<ChannelTypes.Channel[]>({
      baseUrl: config.gateway.baseUrl
    });
    // ! pass undefined as the second and third args because our axios request doesn't use the api or extra options
    await queryFn(
      {
        requestConfig: {
          ...config.gateway.services.publishDerivedChannels.requestConfig,
          data: channels
        }
      },
      undefined,
      undefined
    );
    return true;
  } catch (error) {
    if (error.message !== 'canceled') {
      logger.error(`Error publishing channel`, error);
    }
    return false;
  }
}

/**
 * This operation creates and returns a filtered derived Channel describing the Channel
 * created by applying the provided FilterDefinition to the provided input Channel.
 * After creating the filtered Channel, this operation calls the ChannelFactory's
 * publishDerivedChannelCreatedEvent operation which publishes a DerivedChannelCreatedEvent
 * containing the new Channel.
 *
 * @param inputChannel the channel to filter
 * @param filterDefinition the filter to apply
 * @returns a derived channel that represents the new filtered channel
 */
export async function createFiltered(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
): Promise<ChannelTypes.Channel> {
  if (inputChannel == null) {
    throw new Error('inputChannel may not be null');
  }
  if (filterDefinition == null) {
    throw new Error('filterDefinition may not be null');
  }

  // make sure the keys are sorted so that the json string generated is deterministic
  if (!recordHasStringOrNumberKeys(filterDefinition)) {
    throw new Error('FilterDefinition type is not sortable');
  }
  const sortedFilterDef: FilterTypes.FilterDefinition = sortRecordByKeys(
    serializeTypeTransformer(filterDefinition)
  );

  const newChannel: TypeUtil.Writeable<ChannelTypes.Channel> = {
    channelBandType: inputChannel.channelBandType,
    canonicalName: undefined, // set later after creating the hash
    channelOrientationCode: inputChannel.channelOrientationCode,
    configuredInputs: buildConfiguredInputs(inputChannel),
    channelDataType: inputChannel.channelDataType,
    description: `${inputChannel.description} Filtered using a ${filterDefinition.name} filter.`,
    effectiveAt: inputChannel.effectiveAt,
    effectiveForRequestTime: inputChannel.effectiveForRequestTime,
    effectiveUntil: inputChannel.effectiveUntil,
    channelInstrumentType: inputChannel.channelInstrumentType,
    location: inputChannel.location,
    name: inputChannel.name, // override later after creating the hash
    nominalSampleRateHz: inputChannel.nominalSampleRateHz,
    orientationAngles: inputChannel.orientationAngles,
    channelOrientationType: inputChannel.channelOrientationType,
    processingDefinition: sortedFilterDef,
    processingMetadata: buildProcessingMetadataForFilteredChannel(inputChannel, sortedFilterDef),
    response: undefined,
    station: inputChannel.station,
    units: inputChannel.units
  };

  // Build the name using the new channel, and then add that name to the new channel
  const name = await buildFilteredChannelName(newChannel, filterDefinition);
  newChannel.canonicalName = name;
  newChannel.name = name;
  return newChannel;
}

/**
 * This operation creates and returns a temporary derived Channel with defaults
 * and information from its associated station.
 *
 * @param inputStation the station used to create the new temporary channel
 * @returns a new temporary derived channel
 */
export async function createTemporary(inputStation: Station): Promise<ChannelTypes.Channel> {
  if (!inputStation) {
    throw new Error('inputStation may not be null');
  }

  const channelDataType = getChannelDataTypeFromStation(inputStation);

  if (!channelDataType) {
    throw new Error('There is no StationType to ChannelDataType map');
  }

  const temporaryChannel: TypeUtil.Writeable<ChannelTypes.Channel> = {
    channelBandType: ChannelBandType.UNKNOWN,
    canonicalName: undefined, // override later after creating the hash
    channelOrientationCode: ChannelOrientationType.UNKNOWN,
    configuredInputs: buildConfiguredInputsFromStation(inputStation),
    channelDataType,
    description: `Temporary Channel for Station ${inputStation.name}.`,
    effectiveAt: inputStation.effectiveAt,
    // nulls may need to be removed (not set as null) to match backend
    // effectiveForRequestTime DOES NOT EXIST ON THE BACKEND YET
    effectiveForRequestTime: null,
    effectiveUntil: inputStation.effectiveUntil,
    channelInstrumentType: ChannelInstrumentType.UNKNOWN,
    location: inputStation.location,
    name: inputStation.name, // override later after creating the hash
    // nulls may need to be removed (not set as null) to match backend
    nominalSampleRateHz: null,
    // nulls may need to be removed (not set as null) to match backend
    orientationAngles: {
      horizontalAngleDeg: null,
      verticalAngleDeg: null
    },
    channelOrientationType: ChannelOrientationType.UNKNOWN,
    processingDefinition: {},
    processingMetadata: {},
    // nulls may need to be removed (not set as null) to match backend
    response: null,
    station: {
      effectiveAt: inputStation.effectiveAt,
      name: inputStation.name
    },
    units: Units.UNITLESS
  };

  // Build the name using the new channel, and then add that name to the new channel
  const name = await buildTemporaryChannelName(temporaryChannel);
  temporaryChannel.canonicalName = name;
  temporaryChannel.name = name;
  return temporaryChannel;
}

/**
 *
 * This operation creates and returns a masked derived Channel describing the Channel
 * created by applying the provided ProcessingMaskDefinition to the provided input Channel.
 */
export async function createMasked(
  inputChannel: ChannelTypes.Channel,
  processingMaskDefinition: ProcessingMaskDefinitionTypes.ProcessingMaskDefinition
): Promise<ChannelTypes.Channel> {
  if (inputChannel == null) {
    throw new Error('inputChannel may not be null');
  }
  if (processingMaskDefinition == null) {
    throw new Error('processingMaskDefinition may not be null');
  }

  // make sure the keys are sorted so that the json string generated is deterministic
  if (!recordHasStringOrNumberKeys(processingMaskDefinition)) {
    throw new Error('processingMaskDefinition type is not sortable');
  }

  const sortedProcessingMaskDef: ProcessingMaskDefinitionTypes.ProcessingMaskDefinition = sortRecordByKeys(
    deserializeTypeTransformer(processingMaskDefinition)
  );

  const newChannel: TypeUtil.Writeable<ChannelTypes.Channel> = {
    channelBandType: inputChannel.channelBandType,
    canonicalName: undefined, // set later after creating the hash
    channelOrientationCode: inputChannel.channelOrientationCode,
    configuredInputs: buildConfiguredInputs(inputChannel),
    channelDataType: inputChannel.channelDataType,
    description: `${inputChannel.description} Masked samples removed.`,
    effectiveAt: inputChannel.effectiveAt,
    effectiveForRequestTime: inputChannel.effectiveForRequestTime,
    effectiveUntil: inputChannel.effectiveUntil,
    channelInstrumentType: inputChannel.channelInstrumentType,
    location: inputChannel.location,
    name: inputChannel.name, // override later after creating the hash
    nominalSampleRateHz: inputChannel.nominalSampleRateHz,
    orientationAngles: inputChannel.orientationAngles,
    channelOrientationType: inputChannel.channelOrientationType,
    processingDefinition: sortedProcessingMaskDef,
    processingMetadata: inputChannel.processingMetadata,
    response: undefined,
    station: inputChannel.station,
    units: inputChannel.units
  };

  const name = await buildMaskedChannelName(inputChannel);
  newChannel.canonicalName = name;
  newChannel.name = name;

  // TODO: remove this when properly publishing as processing mask creation is implemented
  await publishDerivedChannelsCreatedEvent([newChannel]);

  return newChannel;
}
/**
 *This operation creates and returns a beamed derived Channel describing the Channel created by applying the provided BeamDefinition to the provided input Channels.
 * After creating the beamed Channel, this operation calls the ChannelFactory's publishDerivedChannelCreatedEvent(Channel) operation which publishes a DerivedChannelCreatedEvent containing the new Channel.
 *
 * @param inputChannels An array of channels with fully populated stations.
 * @param beamDefinition
 */
export async function createBeamed(
  inputChannels: ChannelTypes.Channel[],
  beamDefinition: BeamDefinition
): Promise<ChannelTypes.Channel> {
  if (inputChannels == null || inputChannels.length === 0) {
    throw new Error('inputChannels array may not be null or empty');
  }
  if (beamDefinition == null) {
    throw new Error('beamDefinition may not be null');
  }
  if (
    isVersionReference(inputChannels[0].station, 'name') ||
    isEntityReference(inputChannels[0].station, 'name')
  ) {
    throw new Error('the first channel must have a fully populated station');
  }
  const station = inputChannels[0].station as Station;

  const newMetaData = inputChannels[0].processingMetadata;

  newMetaData.STEERING_BACK_AZIMUTH = beamDefinition.beamParameters.receiverToSourceAzimuthDeg;
  newMetaData.STEERING_SLOWNESS = beamDefinition.beamParameters.slownessSecPerDeg;
  newMetaData.BEAM_SUMMATION = beamDefinition.beamDescription.beamSummation;
  newMetaData.BEAM_PHASE = beamDefinition.beamDescription.phase;
  newMetaData.BEAM_TYPE = beamDefinition.beamDescription.beamType;
  newMetaData.BEAM_EVENT_HYPOTHESIS_ID = beamDefinition.beamParameters.eventHypothesis.id;
  newMetaData.BEAM_SIGNAL_DETECTION_HYPOTHESIS_ID =
    beamDefinition.beamParameters.signalDetectionHypothesis.id;
  newMetaData.BEAM_LOCATION = beamDefinition.beamParameters.location;

  const newChannel: TypeUtil.Writeable<ChannelTypes.Channel> = {
    channelBandType: inputChannels[0].channelBandType,
    canonicalName: undefined, // set later after creating the hash
    channelOrientationCode: inputChannels[0].channelOrientationCode,
    configuredInputs: inputChannels.map(ic => convertToVersionReference(ic, 'name')),
    channelDataType: inputChannels[0].channelDataType,
    description: buildBeamedChannelDescription(inputChannels, beamDefinition, station.name),
    effectiveAt: Math.max(...inputChannels.map(ic => ic.effectiveAt)),
    effectiveForRequestTime: Math.max(...inputChannels.map(ic => ic.effectiveForRequestTime)),
    effectiveUntil: Math.min(...inputChannels.map(ic => ic.effectiveUntil)),
    channelInstrumentType: inputChannels[0].channelInstrumentType,
    location: station.location,
    name: inputChannels[0].name, // override later after creating the hash
    nominalSampleRateHz: beamDefinition.beamParameters.sampleRateHz,
    orientationAngles: beamDefinition.beamParameters.orientationAngles,
    channelOrientationType: inputChannels[0].channelOrientationType,
    processingDefinition: { ...beamDefinition.beamDescription, ...beamDefinition.beamParameters },
    processingMetadata: newMetaData,
    response: undefined,
    station: inputChannels[0].station,
    units: inputChannels[0].units
  };

  const name = await buildBeamedChannelName(inputChannels[0], beamDefinition);
  newChannel.canonicalName = name;
  newChannel.name = name;

  await publishDerivedChannelsCreatedEvent([newChannel]);

  return newChannel;
}
