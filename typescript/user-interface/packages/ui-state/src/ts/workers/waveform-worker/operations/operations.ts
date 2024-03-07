/** Web worker operations */
export const WorkerOperations = {
  COMPUTE_FK_SPECTRA: 'computeFkSpectra',
  EXPORT_CHANNEL_SEGMENTS: 'exportChannelSegments',
  FETCH_SIGNAL_DETECTIONS_WITH_SEGMENTS_BY_STATIONS_TIME:
    'fetchSignalDetectionsWithSegmentsByStationsAndTime',
  FETCH_CHANNEL_SEGMENTS_BY_CHANNEL: 'fetchChannelSegmentsByChannel',
  FETCH_EVENTS_WITH_DETECTIONS_AND_SEGMENTS_BY_TIME: 'fetchEventsWithDetectionsAndSegmentsByTime',
  FILTER_CHANNEL_SEGMENT: 'filterChannelSegment',
  FILTER_CHANNEL_SEGMENTS: 'filterChannelSegments',
  DESIGN_FILTER: 'designFilter',
  FETCH_EVENTS_BY_ASSOCIATED_SIGNAL_DETECTION_HYPOTHESES:
    'fetchEventsByAssociatedSignalDetectionHypotheses',
  FETCH_CHANNELS_BY_NAMES_TIME_RANGE: 'fetchChannelsByNamesTimeRange',
  FETCH_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTIONS: 'fetchFilterDefinitionsForSignalDetections',
  FETCH_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS:
    'fetchDefaultFilterDefinitionByUsageForChannelSegments',
  FETCH_PROCESSING_MASK_DEFINITIONS: 'fetchProcessingMaskDefinitions',
  FETCH_DEFAULT_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES:
    'fetchDefaultFilterDefinitionsForSignalDetectionHypotheses',
  GET_WAVEFORM: 'getWaveform',
  GET_BOUNDARIES: 'getBoundaries',
  CLEAR_WAVEFORMS: 'clearWaveforms',
  CANCEL_WORKER_REQUESTS: 'cancelWorkerRequests'
};
