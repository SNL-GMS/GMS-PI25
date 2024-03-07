package gms.shared.waveform.accessor;

import static com.google.common.base.Preconditions.checkNotNull;
import static com.google.common.base.Preconditions.checkState;

import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import gms.shared.waveform.api.WaveformAccessor;
import gms.shared.waveform.api.WaveformRepository;
import gms.shared.waveform.api.facet.WaveformFacetingUtility;
import gms.shared.waveform.bridge.repository.QcDataGenerator;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.processingmask.api.ProcessingMaskRepository;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import gms.shared.waveform.qc.coi.QcData;
import gms.shared.waveform.qc.coi.QcDataList;
import gms.shared.waveform.qc.coi.QcSegment;
import gms.shared.waveform.qc.coi.QcSegmentRepository;
import gms.shared.waveform.qc.coi.QcSegmentVersion;
import gms.shared.waveform.qc.coi.QcSegmentVersionId;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * Accessor for retrieving Waveforms from the backing store. This contains a cache of previously
 * retrieved channels, and a class to a retrieve any channels not in the cache from the backing
 * store.
 */
@Component
public class DefaultWaveformAccessor implements WaveformAccessor {

  private static final Logger LOGGER = LoggerFactory.getLogger(DefaultWaveformAccessor.class);

  private static final int DEFAULT_QC_MASK_TYPE = 600;
  private static final int DEFAULT_QC_VERSIONS = 9;
  private static final String NOT_SUPPORTED = "Not supported yet.";

  public static final String NULL_CHANNELS = "Channel list cannot be null";
  public static final String NULL_CHANNEL_SEGMENT_DESCRIPTORS =
      "Channel segment " + "descriptors list cannot be null";
  public static final String EMPTY_CHANNELS_MESSAGE = "Channels cannot be empty";
  public static final String EMPTY_CHANNEL_SEGMENT_DESCRIPTORS_MESSAGE =
      "Channel " + "segment descriptors cannot be empty";
  public static final String START_END_TIME_ERR = "Start Time cannot be after " + "end time";
  public static final String START_FUTURE_ERR = "Start Time cannot be in the future";
  public static final String NULL_FACETING_DEFINITION_MESSAGE =
      "Faceting definition " + "cannot be null";
  public static final String NULL_QC_SEG_IDS = "QC segment ids cannot be null";
  public static final String EMPTY_QC_SEG_IDS = "QC segment ids cannot be empty";
  public static final String NULL_QC_SEG_VERSION_IDS = "QC segment version ids cannot be null";
  public static final String EMPTY_QC_SEG_VERSION_IDS = "QC segment version ids cannot be empty";

  public static final String NULL_PM_IDS = "Processing Mask ids cannot be null";

  private final WaveformRepository waveformRepositoryImpl;
  private final ProcessingMaskRepository pmRepositoryImpl;

  private final QcSegmentRepository qcSegmentRepositoryImpl;
  private final WaveformFacetingUtility waveformFacetingUtility;
  private final QcDataGenerator qcDataGenerator;

  @Autowired
  public DefaultWaveformAccessor(
      WaveformRepository waveformRepositoryImpl,
      @Qualifier("bridgedQcSegmentRepository") QcSegmentRepository qcSegmentRepositoryImpl,
      @Qualifier("bridgedProcessingMaskRepository") ProcessingMaskRepository pmRepositoryImpl,
      @Qualifier("bridgedStationDefinitionAccessor") StationDefinitionAccessor stationDefinitionAccessorImpl,
      QcDataGenerator qcDataGenerator) {
    this.waveformRepositoryImpl = waveformRepositoryImpl;
    this.qcSegmentRepositoryImpl = qcSegmentRepositoryImpl;
    this.pmRepositoryImpl = pmRepositoryImpl;
    this.qcDataGenerator = qcDataGenerator;
    this.waveformFacetingUtility = new WaveformFacetingUtility(this, stationDefinitionAccessorImpl);
  }

  @Override
  public Collection<ChannelSegment<Waveform>> findByChannelsAndTimeRange(
      Set<Channel> channels, Instant startTime, Instant endTime) {

    checkNotNull(channels, NULL_CHANNELS);
    checkState(!channels.isEmpty(), EMPTY_CHANNELS_MESSAGE);
    checkState(startTime.isBefore(endTime), START_END_TIME_ERR);

    return waveformRepositoryImpl.findByChannelsAndTimeRange(channels, startTime, endTime);
  }

  @Override
  public Collection<ChannelSegment<Waveform>> findByChannelsAndTimeRange(
      Set<Channel> channels,
      Instant startTime,
      Instant endTime,
      FacetingDefinition facetingDefinition) {

    checkNotNull(channels, NULL_CHANNELS);
    checkState(!channels.isEmpty(), EMPTY_CHANNELS_MESSAGE);
    checkState(startTime.isBefore(endTime), START_END_TIME_ERR);
    checkNotNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);

    Collection<ChannelSegment<Waveform>> channelSegments =
        waveformRepositoryImpl.findByChannelsAndTimeRange(channels, startTime, endTime);

    return channelSegments.stream()
        .map(
            channelSeg ->
                (ChannelSegment<Waveform>)
                    waveformFacetingUtility.populateFacets(channelSeg, facetingDefinition))
        .toList();
  }

  @Override
  public Collection<ChannelSegment<Waveform>> findByChannelSegmentDescriptors(
      Collection<ChannelSegmentDescriptor> channelSegmentDescriptors) {

    checkNotNull(channelSegmentDescriptors, NULL_CHANNEL_SEGMENT_DESCRIPTORS);
    checkState(!channelSegmentDescriptors.isEmpty(), EMPTY_CHANNEL_SEGMENT_DESCRIPTORS_MESSAGE);

    LOGGER.info(
        "Retrieving waveforms for {} channel segment descriptors",
        channelSegmentDescriptors.size());
    return waveformRepositoryImpl.findByChannelSegmentDescriptors(channelSegmentDescriptors);
  }

  @Override
  public Collection<ChannelSegment<Waveform>> findByChannelNamesAndSegmentDescriptor(
      Collection<ChannelSegmentDescriptor> channelSegmentDescriptors,
      FacetingDefinition facetingDefinition) {

    checkNotNull(channelSegmentDescriptors, NULL_CHANNEL_SEGMENT_DESCRIPTORS);
    checkState(!channelSegmentDescriptors.isEmpty(), EMPTY_CHANNEL_SEGMENT_DESCRIPTORS_MESSAGE);
    checkNotNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);

    LOGGER.info(
        "Retrieving waveforms for {} channel segment descriptors",
        channelSegmentDescriptors.size());

    Collection<ChannelSegment<Waveform>> channelSegments =
        waveformRepositoryImpl.findByChannelSegmentDescriptors(channelSegmentDescriptors);

    return channelSegments.stream()
        .map(
            channelSeg ->
                (ChannelSegment<Waveform>)
                    waveformFacetingUtility.populateFacets(channelSeg, facetingDefinition))
        .toList();
  }

  @Override
  public Collection<QcSegment> findQcSegmentsByChannelsandTimeRangeCanned(
      Collection<Channel> channels,
      Instant startTime,
      Instant endTime,
      FacetingDefinition facetingDefinition) {

    checkNotNull(channels, NULL_CHANNELS);
    checkState(!channels.isEmpty(), EMPTY_CHANNELS_MESSAGE);
    checkNotNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);

    Collection<QcSegment> cannedQcSegments = retrieveCannedQcSegments(startTime);

    // run faceting on the qc segments if they're present
    return cannedQcSegments.stream()
        .map(qcSeg -> waveformFacetingUtility.populateFacets(qcSeg, facetingDefinition))
        .toList();
  }

  @Override
  public Collection<QcSegment> findQcSegmentsByChannelsandTimeRangeCanned(
      Collection<Channel> channels, Instant startTime, Instant endTime) {

    checkNotNull(channels, NULL_CHANNELS);
    checkState(!channels.isEmpty(), EMPTY_CHANNELS_MESSAGE);

    Collection<QcSegment> cannedQcSegments = retrieveCannedQcSegments(startTime);

    // run faceting on the qc segments
    return cannedQcSegments.stream().map(waveformFacetingUtility::populateFacets).toList();
  }

  @Override
  public List<QcSegment> findQcSegmentsByIds(List<UUID> uuids) {
    checkNotNull(uuids, NULL_QC_SEG_IDS);
    checkState(!uuids.isEmpty(), EMPTY_QC_SEG_IDS);

    return qcSegmentRepositoryImpl.findQcSegmentsByIds(uuids);
  }

  @Override
  public List<QcSegmentVersion> findQcSegmentVersionsByIds(
      List<QcSegmentVersionId> qcSegmentVersionIds) {
    checkNotNull(qcSegmentVersionIds, NULL_QC_SEG_VERSION_IDS);
    checkState(!qcSegmentVersionIds.isEmpty(), EMPTY_QC_SEG_VERSION_IDS);

    return qcSegmentRepositoryImpl.findQcSegmentVersionsByIds(qcSegmentVersionIds);
  }

  @Override
  public List<QcSegment> findQcSegmentsByChannelsAndTimeRange(
      Collection<Channel> channels, Instant startTime, Instant endTime) {
    return qcSegmentRepositoryImpl.findQcSegmentsByChannelsAndTimeRange(
        channels, startTime, endTime);
  }

  @Override
  public void clear() {
    qcSegmentRepositoryImpl.clear();
  }

  @Override
  public void storeQcSegments(List<QcSegment> qcSegments) {
    throw new UnsupportedOperationException(NOT_SUPPORTED);
  }

  @Override
  public void storeQcSegmentVersions(List<QcSegmentVersion> qcSegmentVersions) {
    throw new UnsupportedOperationException(NOT_SUPPORTED);
  }

  /**
   * Retrieve canned {@link QcSegment}s from the qc data set json file
   *
   * @param startTime start time for creating versions
   * @return collection of canned {@link QcSegment}s
   */
  private Collection<QcSegment> retrieveCannedQcSegments(Instant startTime) {
    try (InputStream jsonFile =
        Thread.currentThread().getContextClassLoader().getResourceAsStream("/QcDataSet.json")) {
      LOGGER.info("Retrieving findQcSegmentsByChannelsandTimeRangeCanned");

      var jsonData =
          ObjectMapperFactory.getJsonObjectMapper().readValue(jsonFile, QcDataList.class);

      return jsonData.getQcList().stream()
          .map((QcData qcData) -> createCannedQcSegment(qcData, startTime))
          .toList();
    } catch (IOException ex) {
      LOGGER.info("Encountered Exception", ex);
      return List.of();
    }
  }

  /**
   * Create single {@link QcSegment} with qc data
   *
   * @param qcData single qc data obj
   * @param startTime start time of qc segment
   * @return canned qc segment
   */
  private QcSegment createCannedQcSegment(QcData qcData, Instant startTime) {
    if ((qcData.getMaskType() == DEFAULT_QC_MASK_TYPE)
        && "ASAR.AS01".equals(qcData.getSta())
        && "SHZ".equals(qcData.getChan())) {
      return qcDataGenerator.createCannedQcSegmentWithVersions(
          qcData, startTime, DEFAULT_QC_VERSIONS);
    } else {
      return qcDataGenerator.createCannedQcSegmentWithVersions(qcData, startTime, 0);
    }
  }

  /**
   * Creates a list of {@link ProcessingMask}s based on a list of UUIDs
   *
   * @param uuids the UUIDs of interest
   * @return a list of {@link ProcessingMask}s
   */
  @Override
  public Collection<ProcessingMask> findProcessingMasksByIds(Collection<UUID> uuids) {
    checkNotNull(uuids, NULL_PM_IDS);
    return pmRepositoryImpl.findProcessingMasksByIds(uuids);
  }

  /**
   * Creates a faceted list of {@link ProcessingMask}s based on a list of UUIDs
   *
   * @param uuids the UUIDs of interest
   * @param facetingDefinition the {@link FacetingDefinition} to be applied
   * @return a list of {@link ProcessingMask}s
   */
  @Override
  public Collection<ProcessingMask> findProcessingMasksByIds(
      Collection<UUID> uuids, FacetingDefinition facetingDefinition) {
    checkNotNull(uuids, NULL_PM_IDS);
    checkNotNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);

    var masks = pmRepositoryImpl.findProcessingMasksByIds(uuids);

    return masks.stream()
        .map(mask -> waveformFacetingUtility.populateFacets(mask, facetingDefinition))
        .toList();
  }
}
