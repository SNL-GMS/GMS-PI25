package gms.shared.waveform.api.facet;

import static com.google.common.base.Preconditions.checkNotNull;
import static com.google.common.base.Preconditions.checkState;

import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.facet.FacetingTypes;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessor;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Timeseries;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import gms.shared.waveform.qc.coi.QcSegment;
import gms.shared.waveform.qc.coi.QcSegmentVersion;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.apache.commons.lang3.NotImplementedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * Waveform faceting utility for channel segments, qc segment versions and qc segment faceting
 * operations.
 */
@Component
public class WaveformFacetingUtility implements WaveformFaceting {

  private static final Logger LOGGER = LoggerFactory.getLogger(WaveformFacetingUtility.class);
  private static final String NOT_IMPLEMENTED_MSG = "waveformAccessor methods to retrieve ";

  private final WaveformAccessor waveformAccessor;
  private final StationDefinitionFacetingUtility stationDefinitionFacetingUtility;

  @Autowired
  public WaveformFacetingUtility(
      WaveformAccessor waveformAccessor,
      @Qualifier("bridgedStationDefinitionAccessor") StationDefinitionAccessor stationDefinitionAccessorImpl) {
    this.waveformAccessor = waveformAccessor;
    this.stationDefinitionFacetingUtility =
        StationDefinitionFacetingUtility.create(stationDefinitionAccessorImpl);
  }

  @Override
  public ChannelSegment<? extends Timeseries> populateFacets(
      ChannelSegment<? extends Timeseries> initialChannelSegment,
      FacetingDefinition facetingDefinition) {

    facetingNullCheck(
        initialChannelSegment, facetingDefinition, ChannelSegment.class.getSimpleName());
    checkState(
        facetingDefinition.isPopulated(),
        FacetingTypes.CHANNEL_SEGMENT_TYPE.getValue()
            + " only supports populated = true at this time");

    var channelFacetingDefinition =
        facetingDefinition.getFacetingDefinitionByName(FacetingTypes.ID_CHANNEL_KEY.getValue());

    // validate facetingDefinition types passed in
    if (!facetingDefinition.getFacetingDefinitions().isEmpty()) {
      checkState(
          facetingDefinition.getFacetingDefinitions().size() == 1,
          "Only valid faceting definition is: "
              + FacetingTypes.CHANNEL_SEGMENT_TYPE.getValue()
              + ". Found:"
              + facetingDefinition.getFacetingDefinitions());
    }

    var facetedProcMask =
        getChannelSegmentFacetedProcessingMask(initialChannelSegment, facetingDefinition);

    if (channelFacetingDefinition.isPresent()) {

      facetingNullCheck(
          initialChannelSegment.getId().getChannel(),
          channelFacetingDefinition.get(),
          Channel.class.getSimpleName());

      // delegate channelFaceting to StationDefinitionFacetingUtility
      var facetedChannel =
          stationDefinitionFacetingUtility.populateFacets(
              initialChannelSegment.getId().getChannel(),
              channelFacetingDefinition.get(),
              initialChannelSegment.getId().getCreationTime());
      return ChannelSegment.from(
          facetedChannel,
          initialChannelSegment.getUnits(),
          initialChannelSegment.getTimeseries(),
          initialChannelSegment.getId().getCreationTime(),
          facetedProcMask,
          Map.of());
    } else if (initialChannelSegment.getData().isEmpty()) {
      LOGGER.warn(
          "No ChannelSegment data. Unable to facet. Returning original initialChannelSegment");
      return initialChannelSegment;
    } else {
      LOGGER.debug(
          "No {} Faceting Definition provided, returning unmodified Channel information",
          FacetingTypes.ID_CHANNEL_KEY.getValue());
      return ChannelSegment.from(
          initialChannelSegment.getId().getChannel(),
          initialChannelSegment.getUnits(),
          initialChannelSegment.getTimeseries(),
          initialChannelSegment.getId().getCreationTime(),
          facetedProcMask,
          Map.of());
    }
  }

  private List<ProcessingMask> getChannelSegmentFacetedProcessingMask(
      ChannelSegment<? extends Timeseries> initialChannelSegment,
      FacetingDefinition channelSegmentFacetingDefinition) {

    var dataOptional = Optional.ofNullable(initialChannelSegment).flatMap(ChannelSegment::getData);
    if (dataOptional.isPresent()) {
      var maskedByDefinition =
          channelSegmentFacetingDefinition
              .getFacetingDefinitionByName(FacetingTypes.MASKED_BY_KEY.toString())
              .orElse(getDefaultProcessingMaskFacetingDefinition());

      return dataOptional.get().getMaskedBy().stream()
          .map(maskedBy -> populateFacets(maskedBy, maskedByDefinition))
          .toList();
    } else {
      return List.<ProcessingMask>of();
    }
  }

  @Override
  public QcSegment populateFacets(
      QcSegment initialQcSegment, FacetingDefinition facetingDefinition) {

    // make sure we have a QcSegment faceting definition type
    facetingNullCheck(initialQcSegment, facetingDefinition, QcSegment.class.getSimpleName());

    // check if the facet def is populated and pass on the data
    if (facetingDefinition.isPopulated()) {
      return populateQcSegmentData(initialQcSegment, facetingDefinition);
    } else {
      return initialQcSegment.toEntityReference();
    }
  }

  @Override
  public QcSegmentVersion populateFacets(
      QcSegmentVersion initialQcSegmentVersion, FacetingDefinition facetingDefinition) {

    // check for the faceting definition and populate accordingly
    facetingNullCheck(
        initialQcSegmentVersion, facetingDefinition, QcSegmentVersion.class.getSimpleName());

    // check if the facet def is populated and pass on the data
    if (facetingDefinition.isPopulated()) {
      return populateQcSegmentVersionData(initialQcSegmentVersion, facetingDefinition);
    } else {
      return initialQcSegmentVersion.toEntityReference();
    }
  }

  @Override
  public QcSegment populateFacets(QcSegment initialQcSegment) {
    Objects.requireNonNull(initialQcSegment);

    // facet definition is not present -> run default faceting
    return populateQcSegmentData(initialQcSegment, getDefaultQcSegmentFacetingDefinition());
  }

  @Override
  public QcSegmentVersion populateFacets(QcSegmentVersion initialQcSegmentVersion) {
    Objects.requireNonNull(initialQcSegmentVersion);

    // faceting definition is not present -> run default faceting
    return populateQcSegmentVersionData(
        initialQcSegmentVersion, getDefaultQcSegmentVersionFacetingDefinition());
  }

  /**
   * Populate the qcSegment's data according to the faceting definition
   *
   * @param initialQcSegment the {@link QcSegment} to be populated
   * @param facetingDefinition the {@link FacetingDefinition} for the qcSegment
   * @return {@link QcSegment}
   */
  private QcSegment populateQcSegmentData(
      QcSegment initialQcSegment, FacetingDefinition facetingDefinition) {

    var qcSegmentData = checkQcSegmentData(initialQcSegment);

    // facet channel according to faceting defintion
    Channel facetedChannel;
    var channelFacetingDefinition =
        facetingDefinition.getFacetingDefinitionByName(FacetingTypes.CHANNEL_KEY.getValue());
    var channel = qcSegmentData.getChannel();

    if (channelFacetingDefinition.isPresent()) {

      if (channel.getEffectiveAt().isEmpty()) {
        LOGGER.warn(
            "Qc segment's channel does not have effective at, " + "cannot populate channel");
        facetedChannel = channel;
      } else {
        facetedChannel =
            stationDefinitionFacetingUtility.populateFacets(
                channel, channelFacetingDefinition.get(), channel.getEffectiveAt().orElseThrow());
      }
    } else {
      facetedChannel = channel.toEntityReference();
    }

    // facet segment versions according to faceting defintion
    var segmentVersionFacetingDefinition =
        facetingDefinition.getFacetingDefinitionByName(
            FacetingTypes.QC_SEGMENT_VERSIONS.getValue());
    SortedSet<QcSegmentVersion> facetedVersionHistory;

    if (segmentVersionFacetingDefinition.isPresent()) {
      // populate the segment version history
      facetedVersionHistory =
          qcSegmentData.getVersionHistory().stream()
              .map(
                  qcSegmentVersion ->
                      populateFacets(qcSegmentVersion, segmentVersionFacetingDefinition.get()))
              .collect(Collectors.toCollection(TreeSet::new));
    } else {
      // default faceting for last segment version is default populated seg version
      facetedVersionHistory = new TreeSet<>(qcSegmentData.getVersionHistory());

      if (!facetedVersionHistory.isEmpty()) {
        var currentVersion = facetedVersionHistory.last();
        facetedVersionHistory.remove(currentVersion);

        // populate the last qc segment version and make all others entity reference
        currentVersion = populateFacets(currentVersion);
        facetedVersionHistory =
            facetedVersionHistory.stream()
                .map(QcSegmentVersion::toEntityReference)
                .collect(Collectors.toCollection(TreeSet::new));
        facetedVersionHistory.add(currentVersion);
      }
    }

    // create the new populated qc segment data
    var populatedQcSegmentData =
        QcSegment.Data.instanceBuilder()
            .setChannel(facetedChannel)
            .setVersionHistory(facetedVersionHistory)
            .build();

    return QcSegment.instanceBuilder()
        .setData(populatedQcSegmentData)
        .setId(initialQcSegment.getId())
        .build();
  }

  /**
   * Populate the {@link QcSegmentVersion} data
   *
   * @param initialQcSegmentVersion the {@link QcSegmentVersion} to facet
   * @param facetingDefinition the {@link FacetingDefinition} defining the fields to facet value
   * @return a faceted {@link QcSegmentVersion}
   */
  private QcSegmentVersion populateQcSegmentVersionData(
      QcSegmentVersion initialQcSegmentVersion, FacetingDefinition facetingDefinition) {

    var qcSegmentVersionData = checkQcSegmentVersionData(initialQcSegmentVersion);

    final var channelSegmentFacetingDefinition =
        facetingDefinition.getFacetingDefinitionByName(
            FacetingTypes.CHANNEL_SEGMENTS_KEY.getValue());
    final var channelFacetingDefinition =
        facetingDefinition.getFacetingDefinitionByName(FacetingTypes.CHANNELS_KEY.getValue());

    // first get the channel segments and channels from the data then populate
    List<ChannelSegment<? extends Timeseries>> channelSegments =
        qcSegmentVersionData.getDiscoveredOn();
    List<Channel> channels = qcSegmentVersionData.getChannels();

    // populate the channel segments if the facet definition is not null
    if (channelSegmentFacetingDefinition.isPresent()) {
      channelSegments =
          channelSegments.stream()
              .map(
                  channelSegment ->
                      populateFacets(channelSegment, channelSegmentFacetingDefinition.get()))
              .collect(Collectors.toList());
    } else {
      // default faceting for channel segments
      channelSegments =
          channelSegments.stream()
              .map(ChannelSegment::toEntityReference)
              .collect(Collectors.toList());
    }

    // populate the channels using station def facet utility
    if (channelFacetingDefinition.isPresent()) {
      channels =
          channels.stream()
              .map(
                  channel ->
                      stationDefinitionFacetingUtility.populateFacets(
                          channel,
                          channelFacetingDefinition.get(),
                          initialQcSegmentVersion.getId().getEffectiveAt()))
              .collect(Collectors.toList());
    } else {
      // default faceting for channels
      channels =
          channels.stream().map(Channel::createVersionReference).collect(Collectors.toList());
    }

    var categoryOptional = qcSegmentVersionData.getCategory();
    var typeOptional = qcSegmentVersionData.getType();
    var category = categoryOptional.isPresent() ? categoryOptional.get() : null;
    var type = typeOptional.isPresent() ? typeOptional.get() : null;

    // create the new populated qc segment version data
    var populatedQcSegmentVersionData =
        QcSegmentVersion.Data.instanceBuilder()
            .setChannels(channels)
            .setCategory(category)
            .setType(type)
            .setStartTime(qcSegmentVersionData.getStartTime())
            .setEndTime(qcSegmentVersionData.getEndTime())
            .setCreatedBy(qcSegmentVersionData.getCreatedBy())
            .setRejected(qcSegmentVersionData.isRejected())
            .setRationale(qcSegmentVersionData.getRationale())
            .setDiscoveredOn(channelSegments)
            .build();

    return QcSegmentVersion.instanceBuilder()
        .setId(initialQcSegmentVersion.getId())
        .setData(populatedQcSegmentVersionData)
        .build();
  }

  /**
   * Get the default QcSegment faceting definition
   *
   * @return default faceting definition for QcSegment type
   */
  private static FacetingDefinition getDefaultQcSegmentFacetingDefinition() {
    return FacetingDefinition.builder()
        .setClassType(FacetingTypes.QC_SEGMENT_VERSION_TYPE.getValue())
        .setPopulated(true)
        .build();
  }

  /**
   * Get the default QcSegmentVersion faceting definition
   *
   * @return default faceting definition for QcSegmentVersion type
   */
  private static FacetingDefinition getDefaultQcSegmentVersionFacetingDefinition() {
    return FacetingDefinition.builder()
        .setClassType(FacetingTypes.QC_SEGMENT_VERSION_TYPE.getValue())
        .setPopulated(true)
        .build();
  }

  /**
   * Check {@link QcSegment.Data} exists and return the data
   *
   * @param qcSegment original {@link QcSegment}
   * @return {@link QcSegment.Data}
   */
  private static QcSegment.Data checkQcSegmentData(QcSegment qcSegment) {
    var qcSegmentData = qcSegment.getData();
    if (qcSegmentData.isPresent()) {
      return qcSegmentData.get();
    } else {
      LOGGER.warn("The data is empty for the QcSegment with id: {}", qcSegment.getId());
      // todo use waveformAccessor to retrieve populated data
      throw new NotImplementedException(NOT_IMPLEMENTED_MSG + "qcSegment not yet implemented");
    }
  }

  /**
   * Check {@link QcSegmentVersion.Data} exists and return the data
   *
   * @param qcSegmentVersion original {@link QcSegmentVersion}
   * @return {@link QcSegmentVersion.Data}
   */
  private static QcSegmentVersion.Data checkQcSegmentVersionData(
      QcSegmentVersion qcSegmentVersion) {
    var qcSegmentVersionData = qcSegmentVersion.getData();
    if (qcSegmentVersionData.isPresent()) {
      return qcSegmentVersionData.get();
    } else {
      LOGGER.warn(
          "The data is empty for the QcSegmentVersion with id: {}", qcSegmentVersion.getId());
      // todo use waveformAccessor to retrieve populated data
      throw new NotImplementedException(
          NOT_IMPLEMENTED_MSG + "qcSegmentVersion not yet implemented");
    }
  }

  /**
   * Check {@link QcSegmentVersion.Data} exists and return the data
   *
   * @param qcSegmentVersion original {@link QcSegmentVersion}
   * @return {@link QcSegmentVersion.Data}
   */
  private static ProcessingMask.Data checkProcessingMaskData(ProcessingMask processingMask) {
    // remove method when waveformAccessor capability is implemented
    var processingMaskData = processingMask.getData();
    if (processingMaskData.isPresent()) {
      return processingMaskData.get();
    } else {
      LOGGER.warn("The data is empty for the ProcessingMask with id: {}", processingMask.getId());
      throw new NotImplementedException(NOT_IMPLEMENTED_MSG + "processingmask not yet implemented");
    }
  }

  /**
   * Get the default QcSegmentVersion faceting definition
   *
   * @return default faceting definition for QcSegmentVersion type
   */
  private static FacetingDefinition getDefaultProcessingMaskFacetingDefinition() {
    return FacetingDefinition.builder()
        .setClassType(FacetingTypes.PROCESSING_MASK_TYPE.getValue())
        .setPopulated(true)
        .addFacetingDefinitions(
            FacetingTypes.APPLIED_TO_RAW_CHANNEL.getValue(),
            FacetingDefinition.builder()
                .setClassType(FacetingTypes.CHANNEL_TYPE.getValue())
                .setPopulated(false)
                .build())
        .addFacetingDefinitions(
            FacetingTypes.MASKED_QC_SEGMENT_VERSION_KEY.getValue(),
            FacetingDefinition.builder()
                .setClassType(FacetingTypes.QC_SEGMENT_VERSION_TYPE.getValue())
                .setPopulated(false)
                .build())
        .build();
  }

  /**
   * Populate the {@link ProcessingMask} from the provided faceting definition
   *
   * @param initialProcessingMask The {@link ProcessingMask} to populate
   * @param facetingDefinition The {@link FacetingDefinition} defining which fields to populate
   * @return the faceted {@link ProcessingMask}
   */
  public ProcessingMask populateFacets(
      ProcessingMask initialProcessingMask, FacetingDefinition facetingDefinition) {

    facetingNullCheck(
        initialProcessingMask, facetingDefinition, ProcessingMask.class.getSimpleName());

    // Replace this code when waveformaccessor is implemented
    var pmData = checkProcessingMaskData(initialProcessingMask);
    var pmDataBuilder = pmData.toBuilder();
    if (facetingDefinition.isPopulated()) {

      var effectiveAt =
          initialProcessingMask
              .getData()
              .orElseThrow(
                  () -> new IllegalStateException("ProcessingMask Data object not present"))
              .getEffectiveAt();

      final var channelFacetingDefinition =
          facetingDefinition.getFacetingDefinitionByName(
              FacetingTypes.APPLIED_TO_RAW_CHANNEL.getValue());
      // populate the channels using station def facet utility
      var pmRawChannel = pmData.getAppliedToRawChannel();
      if (channelFacetingDefinition.isPresent() && channelFacetingDefinition.get().isPopulated()) {
        pmRawChannel =
            stationDefinitionFacetingUtility.populateFacets(
                pmRawChannel, channelFacetingDefinition.get(), effectiveAt);
        if (pmRawChannel == null) {
          LOGGER.error("Station Definition populateFacets returned null channel");
        }
      } else {
        pmRawChannel = pmRawChannel.toEntityReference();
      }

      pmDataBuilder.setAppliedToRawChannel(pmRawChannel);
      final var qcSegmentVersionFacetingDefinition =
          facetingDefinition.getFacetingDefinitionByName(
              FacetingTypes.MASKED_QC_SEGMENT_VERSION_KEY.getValue());
      var qcSegVer = pmData.getMaskedQcSegmentVersions();
      if (qcSegmentVersionFacetingDefinition.isPresent()) {
        qcSegVer =
            qcSegVer.stream()
                .map(
                    version ->
                        this.populateFacets(version, qcSegmentVersionFacetingDefinition.get()))
                .collect(Collectors.toCollection(TreeSet::new));
      }

      pmDataBuilder.setMaskedQcSegmentVersions(qcSegVer);

      return initialProcessingMask.toBuilder().setData(pmDataBuilder.build()).build();

    } else {
      return initialProcessingMask.toEntityReference();
    }
  }

  /**
   * Common helper method to assist in validating Precondition checks for faceted objects
   *
   * @param initialObject Object supplied to be populated
   * @param facetingDefinition Provided {@link FacetingDefinition}
   * @param className className of the classType to validate against
   */
  private static void facetingNullCheck(
      Object initialObject, FacetingDefinition facetingDefinition, String className) {
    checkNotNull(initialObject, "Initial %s cannot be null", className);
    checkNotNull(facetingDefinition, "FacetingDefinition for %s cannot be null", className);
    checkState(
        facetingDefinition.getClassType().equals(className),
        "FacetingDefinition must be for the %s class. Found: %s",
        className,
        facetingDefinition.getClassType());
  }

  @Override
  public ProcessingMask populateFacets(ProcessingMask initialProcessingMask) {
    Objects.requireNonNull(initialProcessingMask);

    // faceting definition is not present -> run default faceting
    return this.populateFacets(initialProcessingMask, getDefaultProcessingMaskFacetingDefinition());
  }
}
