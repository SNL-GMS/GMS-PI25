package gms.shared.stationdefinition.facet;

/**
 * The Station Definition FacetingTypes enum defines the keys and values used to build the faceted
 * objects. keys represent the JSON key names of the facet-able attributes type represents class
 * names of the associated keys
 */
public enum FacetingTypes {
  STATION_GROUP_TYPE("StationGroup"),
  STATION_TYPE("Station"),
  CHANNEL_GROUP_TYPE("ChannelGroup"),
  CHANNEL_TYPE("Channel"),
  RESPONSE_TYPE("Response"),
  CHANNEL_SEGMENT_TYPE("ChannelSegment"),
  STATIONS_KEY("stations"),
  CHANNEL_GROUPS_KEY("channelGroups"),
  CHANNEL_KEY("channel"),
  CHANNELS_KEY("channels"),
  RESPONSES_KEY("responses"),
  ID_CHANNEL_KEY("id.Channel"),
  QC_SEGMENT_TYPE("QcSegment"),
  QC_SEGMENT_VERSIONS("qcSegmentVersions"),
  QC_SEGMENT_VERSION_TYPE("QcSegmentVersion"),
  CHANNEL_SEGMENTS_KEY("ChannelSegments"),
  PROCESSING_MASK_TYPE("ProcessingMask"),
  MASKED_BY_KEY("maskedBy"),
  APPLIED_TO_RAW_CHANNEL("appliedToRawChannel"),
  MASKED_QC_SEGMENT_VERSION_KEY("maskedQcSegmentVersions");

  private final String value;

  FacetingTypes(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }

  @Override
  public String toString() {
    return getValue();
  }
}
