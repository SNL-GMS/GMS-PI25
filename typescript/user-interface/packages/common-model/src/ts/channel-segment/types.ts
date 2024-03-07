import type { Units } from '../common/types';
import type { EntityReference, VersionReference } from '../faceted';
import type { QCSegmentVersion } from '../qc-segment';
import type { Channel } from '../station-definitions/channel-definitions/channel-definitions';

/**
 * Channel Segment Descriptor contains Channel and start, end and creation times of channel segment
 * (this replaces ChannelSegment Id in FeatureMeasurement)
 */
export interface ChannelSegmentDescriptor {
  readonly channel: VersionReference<'name'> | Channel;
  readonly startTime: number;
  readonly endTime: number;
  readonly creationTime: number;
}

export enum TimeSeriesType {
  WAVEFORM = 'WAVEFORM',
  FK_SPECTRA = 'FK_SPECTRA',
  DETECTION_FEATURE_MAP = 'DETECTION_FEATURE_MAP'
}

export enum ProcessingOperation {
  AMPLITUDE_MEASUREMENT_BEAM = 'AMPLITUDE_MEASUREMENT_BEAM',
  DISPLAY_FILTER = 'DISPLAY_FILTER',
  EVENT_BEAM = 'EVENT_BEAM',
  FK_BEAM = 'FK_BEAM',
  FK_SPECTRA = 'FK_SPECTRA',
  ROTATION = 'ROTATION',
  SIGNAL_DETECTION_BEAM = 'SIGNAL_DETECTION_BEAM',
  SPECTROGRAM = 'SPECTROGRAM',
  VIRTUAL_BEAM = 'VIRTUAL_BEAM'
}

/**
 * Represents a mask that has been applied to the channel segment
 */
export interface ProcessingMask {
  /**
   * UUID string
   */
  id: string;

  /**
   * effective at time
   */
  effectiveAt: number;

  /**
   * mask start time
   */
  startTime: number;

  /**
   * mask end time
   */
  endTime: number;

  /**
   * entity reference for the channel applied too
   */
  appliedToRawChannel: EntityReference<'name', Channel>;

  /**
   * Processing operation type
   */
  processingOperation: ProcessingOperation;

  /**
   * List of qc segments covered by the processing mask
   */
  maskedQcSegmentVersions: QCSegmentVersion[];
}

/**
 * A base interface for time series data should be extended to include time series data.
 */
export interface TimeSeries {
  /**
   * The type of data contained in this time series.
   */
  type: TimeSeriesType;
  /**
   * The time corresponding to the first point in the time series, measured in seconds since the Linux epoch.
   */
  startTime: number;
  /**
   * The time corresponding to the last point in the time series, measured in seconds since the Linux epoch.
   */
  endTime: number;
  /**
   * The sample rate of the time series, in Hz.
   */
  sampleRateHz: number;
  /**
   * The number of samples expected to be in the time series.
   */
  sampleCount: number;
}

/**
 * Represents a subset of data of a single channel segment type from a raw channel or derived channel. Can include many time series but all must be of the same type.
 */
export interface ChannelSegment<T extends TimeSeries> {
  /**
   * Channel Segment Description
   */
  id: ChannelSegmentDescriptor;

  /**
   * Units of the channel segment time series data
   */
  units: Units;

  /**
   * The type of time series in this segment.
   */
  timeseriesType: TimeSeriesType;

  /**
   * The time series data that constitutes this channel segment.
   */
  timeseries: T[];

  /**
   * The processing masks that have been applied to the channel segment
   */
  maskedBy: ProcessingMask[];

  /**
   * Filter name default is 'UNFILTERED'
   */
  _uiFilterId?: string;

  /**
   * Filter name default is 'UNFILTERED'
   */
  _uiConfiguredInput?: ChannelSegmentDescriptor;
}

export interface ChannelSegmentFaceted {
  /**
   * Channel Segment Description
   */
  id: ChannelSegmentDescriptor;
}
