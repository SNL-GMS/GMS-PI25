import type * as CommonTypes from '../../common/types';
import type { EntityReference, Faceted, VersionReference } from '../../faceted';
import type { Station } from '../station-definitions/station-definitions';
import type * as ResponseTypes from './response-definitions';

/**
 * ChannelGroupType enum represents the different groupings of channels
 */
export enum ChannelGroupType {
  PROCESSING_GROUP = 'PROCESSING_GROUP',
  SITE_GROUP = 'SITE_GROUP',
  PHYSICAL_SITE = 'PHYSICAL_SITE'
}

/**
 * Represents a physical installation (e.g., building, underground vault, borehole)
 * containing a collection of instruments that produce raw channel waveform data.
 *
 * You should think of a channel group as immutable; a change to an installation in the
 * real-world merits creation of a new channel group. For example, if a channel is added
 * at the installation, the old channel group should no longer be used and a new one created
 * to represent the new state of the installation.
 */
export interface ChannelGroup extends Faceted {
  /**
   * Name of the channel group, e.g., "ABC.XY01".
   */
  readonly name: string;
  /**
   * Description of the channel group.
   */
  readonly description: string;
  /**
   * Time that the channel group came online. ISO-8601 time string, down to ms, e.g., "2021-02-26T19:10:41.283Z".
   */
  readonly effectiveAt: number;
  /**
   * Time that the channel group went offline. ISO-8601 time string, down to ms, e.g., "2021-02-26T19:10:41.283Z".
   */
  readonly effectiveUntil: number;
  /**
   * The location of the channel group.
   */
  readonly location: Location;
  /**
   * The type of the group.
   */
  readonly type: ChannelGroupType;
  /**
   * The channels comprising the channel group.
   */
  readonly channels: Channel[];
}

/**
 * Represents a source for unprocessed (raw) or processed (derived) time series data
 * from a seismic, hydroacoustic, or infrasonic sensor.
 */
export interface Channel extends Faceted {
  /**
   * Name of the channel, e.g., "ABC.XY01.BHZ".
   */
  readonly name: string;
  /**
   * Typically the name of the channel for a raw channel and a name that includes the derivation method for non-raw/derived channels.
   */
  readonly canonicalName: string;
  /**
   * Description of the channel.
   */
  readonly description: string;
  /**
   * Time that the channel came online in epoch seconds
   */
  readonly effectiveAt: number;
  /**
   * The effective time provided in the query predicate used to load this Channel
   */
  readonly effectiveForRequestTime?: number;
  /**
   * Time that the channel went offline. ISO-8601 time string, down to ms, e.g., "2021-02-26T19:10:41.283Z".
   */
  readonly effectiveUntil: number;
  /**
   * Station that the channel belongs to, e.g., "ABC.XY01".
   */
  readonly station: Station | VersionReference<'name'> | EntityReference<'name'>;
  /**
   * The type of data recorded by this channel.
   */
  readonly channelDataType: ChannelDataType;
  /**
   * The bandwidth recorded by this channel.
   */
  readonly channelBandType: ChannelBandType;
  /**
   * The type of instrument that records data for this channel.
   */
  readonly channelInstrumentType: ChannelInstrumentType;
  /**
   * The possible directions of travel of the instrument for this channel.
   */
  readonly channelOrientationType: ChannelOrientationType;
  /**
   * A character corresponding to the orientation type.
   */
  readonly channelOrientationCode: string; // Duplicate field necessary because the code in the enum gets transpiled out.
  /**
   * The units used when recording data in this channel.
   */
  readonly units: CommonTypes.Units;
  /**
   * The sample rate of the channel.
   */
  readonly nominalSampleRateHz: number;
  /**
   * The location of the channel.
   */
  readonly location: Location;
  /**
   * The orientation angle of the channel.
   */
  readonly orientationAngles?: Orientation;
  readonly configuredInputs: Channel[] | VersionReference<'name'>[];
  readonly processingDefinition: Record<string, any> | undefined;
  readonly processingMetadata:
    | Partial<Record<keyof typeof ChannelProcessingMetadataType, any>>
    | undefined;
  response?: ResponseTypes.Response;
}

/**
 * Represents the orientation angles used in processing channels
 */
export interface Orientation {
  horizontalAngleDeg?: number;
  verticalAngleDeg?: number;
}

/**
 * Enumeration representing the different types of processing channels.
 */
export enum ChannelDataType {
  SEISMIC = 'SEISMIC',
  HYDROACOUSTIC = 'HYDROACOUSTIC',
  INFRASOUND = 'INFRASOUND',
  WEATHER = 'WEATHER',
  DIAGNOSTIC_SOH = 'DIAGNOSTIC_SOH',
  DIAGNOSTIC_WEATHER = 'DIAGNOSTIC_WEATHER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Represents the type of processing metadata values that can appear as keys in the
 */
export enum ChannelProcessingMetadataType {
  // General properties
  CHANNEL_GROUP = 'CHANNEL_GROUP',

  // Filtering properties
  FILTER_CAUSALITY = 'FILTER_CAUSALITY',
  FILTER_GROUP_DELAY = 'FILTER_GROUP_DELAY',
  FILTER_HIGH_FREQUENCY_HZ = 'FILTER_HIGH_FREQUENCY_HZ',
  FILTER_LOW_FREQUENCY_HZ = 'FILTER_LOW_FREQUENCY_HZ',
  FILTER_PASS_BAND_TYPE = 'FILTER_PASS_BAND_TYPE',
  FILTER_TYPE = 'FILTER_TYPE',

  // Channel steering properties (used in beaming, rotation)
  STEERING_AZIMUTH = 'STEERING_AZIMUTH',
  STEERING_SLOWNESS = 'STEERING_SLOWNESS',
  STEERING_BACK_AZIMUTH = 'STEERING_BACK_AZIMUTH',

  // Beaming properties
  BEAM_SUMMATION = 'BEAM_SUMMATION',
  BEAM_LOCATION = 'BEAM_LOCATION',
  BEAM_SIGNAL_DETECTION_HYPOTHESIS_ID = 'BEAM_SIGNAL_DETECTION_HYPOTHESIS_ID',
  BEAM_EVENT_HYPOTHESIS_ID = 'BEAM_EVENT_HYPOTHESIS_ID',
  BEAM_TYPE = 'BEAM_TYPE',
  BEAM_PHASE = 'BEAM_PHASE'
}

/**
 * Represents the SEED / FDSN standard Channel Instruments.  Each instrument has a corresponding
 * single letter code.
 */
export enum ChannelInstrumentType {
  UNKNOWN = 'UNKNOWN',
  HIGH_GAIN_SEISMOMETER = 'HIGH_GAIN_SEISMOMETER',
  LOW_GAIN_SEISMOMETER = 'LOW_GAIN_SEISMOMETER',
  GRAVIMETER = 'GRAVIMETER',
  MASS_POSITION_SEISMOMETER = 'MASS_POSITION_SEISMOMETER',
  ACCELEROMETER = 'ACCELEROMETER', // Historic channels might use L or G for accelerometers
  ROTATIONAL_SENSOR = 'ROTATIONAL_SENSOR',
  TILT_METER = 'TILT_METER',
  CREEP_METER = 'CREEP_METER',
  CALIBRATION_INPUT = 'CALIBRATION_INPUT',
  PRESSURE = 'PRESSURE',
  ELECTRONIC_TEST_POINT = 'ELECTRONIC_TEST_POINT',
  MAGNETOMETER = 'MAGNETOMETER',
  HUMIDITY = 'HUMIDITY',
  TEMPERATURE = 'TEMPERATURE',
  WATER_CURRENT = 'WATER_CURRENT',
  GEOPHONE = 'GEOPHONE',
  ELECTRIC_POTENTIAL = 'ELECTRIC_POTENTIAL',
  RAINFALL = 'RAINFALL',
  LINEAR_STRAIN = 'LINEAR_STRAIN',
  TIDE = 'TIDE',
  BOLOMETER = 'BOLOMETER',
  VOLUMETRIC_STRAIN = 'VOLUMETRIC_STRAIN',
  WIND = 'WIND',
  NON_SPECIFIC_INSTRUMENT = 'NON_SPECIFIC_INSTRUMENT',
  DERIVED = 'DERIVED',
  SYNTHESIZED_BEAM = 'SYNTHESIZED_BEAM'
}

/**
 * Represents the SEED / FDSN standard Channel Bands.  Each band has a corresponding single letter
 * code.
 */
export enum ChannelBandType {
  UNKNOWN = '-',

  // Long Period Bands
  /**
   * 1Hz - 10Hz
   */
  MID_PERIOD = 'MID_PERIOD',
  /**
   * ~1Hz
   */
  LONG_PERIOD = 'LONG_PERIOD',
  /**
   * ~0.1Hz
   */
  VERY_LONG_PERIOD = 'VERY_LONG_PERIOD',
  /**
   * ~0.01Hz
   */
  ULTRA_LONG_PERIOD = 'ULTRA_LONG_PERIOD',
  /**
   * 0.0001Hz - 0.001Hz
   */
  EXTREMELY_LONG_PERIOD = 'EXTREMELY_LONG_PERIOD',
  /**
   * 0.00001Hz - 0.0001Hz (new)
   */
  PARTICULARLY_LONG_PERIOD = 'PARTICULARLY_LONG_PERIOD',
  /**
   * 0.000001Hz - 0.00001Hz (new)
   */
  TREMENDOUSLY_LONG_PERIOD = 'TREMENDOUSLY_LONG_PERIOD',
  /**
   * < 0.000001Hz (new)
   */
  IMMENSELY_LONG_PERIOD = 'IMMENSELY_LONG_PERIOD',

  // Short Period Bands
  /**
   * 1000Hz - 5000Hz (new)
   */
  TREMENDOUSLY_SHORT_PERIOD = 'TREMENDOUSLY_SHORT_PERIOD',
  /**
   * 250Hz - 10000Hz (new)
   */
  PARTICULARLY_SHORT_PERIOD = 'PARTICULARLY_SHORT_PERIOD',
  /**
   * 80Hz - 250Hz
   */
  EXTREMELY_SHORT_PERIOD = 'EXTREMELY_SHORT_PERIOD',
  /**
   * 10Hz - 80Hz
   */
  SHORT_PERIOD = 'SHORT_PERIOD',

  // Broadband (Corner Periods > 10 sec)
  /**
   * 1000Hz - 5000Hz (new)
   */
  ULTRA_HIGH_BROADBAND = 'ULTRA_HIGH_BROADBAND',
  /**
   * 250Hz - 1000Hz (new)
   */
  VERY_HIGH_BROADBAND = 'VERY_HIGH_BROADBAND',
  /**
   * 80Hz - 250Hz
   */
  HIGH_BROADBAND = 'HIGH_BROADBAND',
  /**
   * 10Hz - 80Hz
   */
  BROADBAND = 'BROADBAND',

  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OPAQUE = 'OPAQUE'
}

/**
 * Seismometer, Rotational Sensor, or Derived/Generated Orientations.
 * These correspond to instrument codes H, L, G, M, N, J, and X.
 */
export enum ChannelOrientationType {
  UNKNOWN = 'UNKNOWN',
  VERTICAL = 'VERTICAL',
  NORTH_SOUTH = 'NORTH_SOUTH',
  EAST_WEST = 'EAST_WEST',
  TRIAXIAL_A = 'TRIAXIAL_A',
  TRIAXIAL_B = 'TRIAXIAL_B',
  TRIAXIAL_C = 'TRIAXIAL_C',
  TRANSVERSE = 'TRANSVERSE',
  RADIAL = 'RADIAL',
  ORTHOGONAL_1 = 'ORTHOGONAL_1',
  ORTHOGONAL_2 = 'ORTHOGONAL_2',
  ORTHOGONAL_3 = 'ORTHOGONAL_3',
  OPTIONAL_U = 'OPTIONAL_U',
  OPTIONAL_V = 'OPTIONAL_V',
  OPTIONAL_W = 'OPTIONAL_W'
}

/**
 * Location information
 *
 * @JsonProperty("latitudeDegrees") double latitudeDegrees,
 * @JsonProperty("longitudeDegrees") double longitudeDegrees,
 * @JsonProperty("depthKm") double depthKm,
 * @JsonProperty("elevationKm") double elevationKm)
 */
export interface Location {
  latitudeDegrees: number;
  longitudeDegrees: number;
  elevationKm: number;
  depthKm: number;
}

/**
 * Relative position information
 *
 * @JsonProperty("northDisplacementKm") double northDisplacementKm,
 * @JsonProperty("eastDisplacementKm") double eastDisplacementKm,
 * @JsonProperty("verticalDisplacementKm") double verticalDisplacementKm)
 */
export interface RelativePosition {
  northDisplacementKm: number;
  eastDisplacementKm: number;
  verticalDisplacementKm: number;
}
