package gms.shared.signalenhancementconfiguration.service;

import com.google.common.base.Preconditions;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.signaldetection.api.SignalDetectionAccessor;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.coi.detection.FeatureMeasurement;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.types.FeatureMeasurementTypes;
import gms.shared.signaldetection.coi.values.PhaseTypeMeasurementValue;
import gms.shared.signalenhancementconfiguration.api.BeamformingTemplatesRequest;
import gms.shared.signalenhancementconfiguration.api.ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskDefinitionByPhaseByChannel;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskDefinitionRequest;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskPhaseChannelItem;
import gms.shared.signalenhancementconfiguration.api.SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.webclient.FkReviewablePhasesRequest;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.facet.FacetingTypes;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessor;
import gms.shared.waveform.api.facet.WaveformFacetingUtility;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.stereotype.Component;

@Component
@ComponentScan(
    basePackages = {
      "gms.shared.signaldetection",
      "gms.shared.stationdefinition",
      "gms.shared.waveform",
      "gms.shared.emf"
    })
public class SignalEnhancementConfigurationService {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(SignalEnhancementConfigurationService.class);

  private static final FacetingDefinition channelFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(FacetingTypes.CHANNEL_TYPE.getValue())
          .setPopulated(true)
          .build();

  private static final FacetingDefinition featureMeasurementFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(FeatureMeasurement.class.getSimpleName())
          .setPopulated(true)
          .build();

  private static final FacetingDefinition signalDetectionHypothesisFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(SignalDetectionHypothesis.class.getSimpleName())
          .setPopulated(true)
          .addFacetingDefinitions("featureMeasurements", featureMeasurementFacetingDefinition)
          .build();

  private final SignalEnhancementConfiguration signalEnhancementFilterConfiguration;

  private final SignalDetectionFacetingUtility signalDetectionFacetingUtility;
  private final StationDefinitionFacetingUtility stationDefinitionFacetingUtility;

  @Autowired
  public SignalEnhancementConfigurationService(
      SignalEnhancementConfiguration signalEnhancementFilterConfiguration,
      StationDefinitionFacetingUtility stationDefinitionFacetingUtility,
      WaveformAccessor waveformAccessor,
      @Qualifier("bridgedStationDefinitionAccessor") StationDefinitionAccessor stationDefinitionAccessorImpl,
      @Qualifier("bridgedSignalDetectionAccessor") SignalDetectionAccessor signalDetectionAccessor) {

    var waveformFacetingUtility =
        new WaveformFacetingUtility(waveformAccessor, stationDefinitionAccessorImpl);
    this.signalEnhancementFilterConfiguration = signalEnhancementFilterConfiguration;
    this.signalDetectionFacetingUtility =
        SignalDetectionFacetingUtility.create(
            signalDetectionAccessor, waveformFacetingUtility, stationDefinitionFacetingUtility);
    this.stationDefinitionFacetingUtility = stationDefinitionFacetingUtility;
  }

  public SignalEnhancementConfigurationService(
      SignalEnhancementConfiguration signalEnhancementConfiguration,
      StationDefinitionFacetingUtility stationDefinitionFacetingUtility,
      SignalDetectionFacetingUtility signalDetectionFacetingUtility) {

    this.signalEnhancementFilterConfiguration = signalEnhancementConfiguration;
    this.signalDetectionFacetingUtility = signalDetectionFacetingUtility;
    this.stationDefinitionFacetingUtility = stationDefinitionFacetingUtility;
  }

  public FilterListDefinition filterListDefinition() {
    return signalEnhancementFilterConfiguration.filterListDefinition();
  }

  /**
   * Resolves default FilterDefinitions for each of the provided ChannelSegment objects for each
   * FilterDefinitionUsage literal
   *
   * @param request A list of ChannelSegment and an optional EventHypothesis
   * @return A map of maps consisting of SignalDetectionHypothesis keys to values consisting of maps
   *     of FilterDefinitionUsuage keys to FilterDefinition values
   */
  public Pair<FilterDefinitionByUsageByChannelSegment, Boolean>
      getDefaultFilterDefinitionByUsageForChannelSegments(
          FilterDefinitionByUsageForChannelSegmentsRequest request) {

    var channelSegments = request.getChannelSegments().stream().collect(Collectors.toSet());
    var eventHypothesis = request.getEventHypothesis();

    Preconditions.checkArgument(
        !channelSegments.isEmpty(), "Must provide at least onechannel segment");

    var optionalChannelSegToFilterDefPairs =
        channelSegments.stream()
            .map(this::channelSegToChannelPair)
            .map(
                channelSegPair ->
                    createOptionalChannelSegToFilterDefPair(channelSegPair, eventHypothesis))
            .toList();

    return Pair.of(
        optionalChannelSegToFilterDefPairs.stream()
            .flatMap(Optional::stream)
            .collect(
                Collectors.collectingAndThen(
                    Collectors.toList(), FilterDefinitionByUsageByChannelSegment::from)),
        optionalChannelSegToFilterDefPairs.stream().anyMatch(Optional::isEmpty));
  }

  /**
   * Resolves for empty channel by trying to populate it using the faceting utility and makes sure
   * this operation is safe by doing it with an optional
   *
   * @param request ChannelSegment<Waveform> as input
   * @return An entry of channel segment and optional channel that was populated with the faceting
   *     utility if it was initially empty
   */
  private Entry<ChannelSegment<Waveform>, Optional<Channel>> channelSegToChannelPair(
      ChannelSegment<Waveform> channelSeg) {
    var channel = channelSeg.getId().getChannel();
    var chanName = channel.getName();

    Optional<Channel> populatedOptionalChannel = Optional.of(channel);

    if (!channel.isPresent()) {
      populatedOptionalChannel = Optional.ofNullable(populateChannel(channel));
    }

    if (populatedOptionalChannel.isEmpty()) {
      LOGGER.warn("Faceting utility returned null for faceted" + " channel {}", chanName);
    }

    return Pair.of(channelSeg, populatedOptionalChannel);
  }

  /**
   * Creates the ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair optional
   *
   * @param request an entry of ChannelSegment<Waveform> and Optional<Channel>
   * @param request the Optional<EventHypothesis>
   * @return An ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair optional
   */
  private Optional<ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair>
      createOptionalChannelSegToFilterDefPair(
          Entry<ChannelSegment<Waveform>, Optional<Channel>> entry,
          Optional<EventHypothesis> eventHypothesis) {
    Optional<ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair>
        chanSegToFilterDefPairOptional = Optional.empty();

    Optional<Channel> channelOptional = entry.getValue();
    if (channelOptional.isPresent()) {
      var channel = channelOptional.get();

      chanSegToFilterDefPairOptional =
          Optional.ofNullable(
              ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.builder()
                  .setChannelSegment(entry.getKey())
                  .setFilterDefinitionByFilterDefinitionUsage(
                      signalEnhancementFilterConfiguration
                          .getDefaultFilterDefinitionByUsageForChannel(
                              channel, eventHypothesis, getPhaseTypeFromChannelBeamDef(channel)))
                  .build());
    }

    return chanSegToFilterDefPairOptional;
  }

  /**
   * Resolves processing mask definitions given the request object, using its list of processing
   * operations, channels, and phases, along with its station group.
   *
   * @param request contains what it needed to resolve processing mask definitions.
   * @return A data structure with lists of pairs (channel, phaseMap) where channel is the passed in
   *     channel, and phaseMap is a map from phase to list of definitions. There will be one
   *     definition in this list for each processing operation.
   */
  public ProcessingMaskDefinitionByPhaseByChannel getProcessingMaskDefinitions(
      ProcessingMaskDefinitionRequest request) {

    return ProcessingMaskDefinitionByPhaseByChannel.create(
        request.getChannels().stream()
            .parallel()
            //
            // Map each input channel to a ProcessingMaskPhaseChannelItem
            //
            .map(
                inputChannel ->
                    ProcessingMaskPhaseChannelItem.create(
                        inputChannel,
                        request.getPhaseTypes().stream()
                            .parallel()
                            //
                            // Map each phase to the phaseMap mentioned in the description.
                            //
                            .map(phase -> createPhaseMapEntry(request, phase, inputChannel))
                            .flatMap(Optional::stream)
                            .collect(Collectors.toMap(Entry::getKey, Entry::getValue))))
            .toList());
  }

  /**
   * Create a Map.Entry, associating phase with a list of ProcessingDefinitions.
   *
   * @param request The overall request object
   * @param phase The specific phase
   * @param populatedChannel The specific channel, which needs to be populated.
   * @return The Map.Entry
   */
  private Optional<Entry<PhaseType, List<ProcessingMaskDefinition>>> createPhaseMapEntry(
      ProcessingMaskDefinitionRequest request, PhaseType phase, Channel versionedChannel) {
    Optional<Channel> optionalPopulatedChannel;

    try {
      optionalPopulatedChannel = Optional.ofNullable(populateChannel(versionedChannel));
      if (optionalPopulatedChannel.isEmpty()) {
        LOGGER.info("Channel {} could not be populated; skipping", versionedChannel);
        return Optional.empty();
      }
    } catch (IllegalStateException e) {
      LOGGER.info("Channel {} could not be populated due to exception:", versionedChannel, e);
      return Optional.empty();
    }

    return optionalPopulatedChannel.map(
        populatedChannel ->
            Map.entry(
                phase,
                request.getProcessingOperations().stream()
                    .parallel()
                    .map(
                        operation ->
                            getOptionalProcessingMaskDefinition(
                                request, operation, populatedChannel, phase))
                    .flatMap(Optional::stream)
                    .collect(Collectors.toList())));
  }

  /**
   * Retrieve a ProcessingMaskDefinition from configuration, logging and returning an Optional.empty
   * if not found, or if there was an error.
   *
   * @param request Overall request object - needed for station group and for logging.
   * @param operation The ProcessingOperation to look for.
   * @param populatedChannel The (fully populated) channel.
   * @param phase The phase to look for.
   * @return Optional of the matching ProcessingMaskDefinition or Optional.empty if not found.
   */
  private Optional<ProcessingMaskDefinition> getOptionalProcessingMaskDefinition(
      ProcessingMaskDefinitionRequest request,
      ProcessingOperation operation,
      Channel populatedChannel,
      PhaseType phase) {

    try {
      return Optional.of(
          signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
              operation, request.getStationGroup(), populatedChannel, phase));
    } catch (IllegalArgumentException e) {
      LOGGER.info(
          "Missing or invalid configuration for request: {}."
              + " and specfic phsse: {} and channel: {}"
              + "Associated exception was {}",
          request,
          phase,
          populatedChannel.getName(),
          e);
      return Optional.<ProcessingMaskDefinition>empty();
    }
  }

  /**
   * Resolves default FilterDefinitions for each of the provided SignalDetectionHypothesis objects
   * for each FilterDefinitionUsage literal
   *
   * @param request A list of SignalDetectionHypotheses and an optional EventHypothesis
   * @return A map of maps consisting of SignalDetectionHypothesis keys to values consisting of maps
   *     of FilterDefinitionUsuage keys to FilterDefinition values
   */
  public Pair<FilterDefinitionByUsageBySignalDetectionHypothesis, Boolean>
      getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(
          FilterDefinitionByUsageForSignalDetectionHypothesesRequest request) {
    var eventHypothesis = request.getEventHypothesis();
    var signalDetectionsHypotheses = request.getSignalDetectionsHypotheses();

    Preconditions.checkArgument(
        !signalDetectionsHypotheses.isEmpty(),
        "Must provide at least one " + "signal detection hypothesis");

    var optionalSdhToFilterDefPairs =
        signalDetectionsHypotheses.stream()
            .map(this::shdToChannelPair)
            .map(
                shdToChannelPair ->
                    createOptionalSdhToFilterDefPair(shdToChannelPair, eventHypothesis))
            .collect(Collectors.toList());

    return Pair.of(
        optionalSdhToFilterDefPairs.stream()
            .flatMap(Optional::stream)
            .collect(
                Collectors.collectingAndThen(
                    Collectors.toList(), FilterDefinitionByUsageBySignalDetectionHypothesis::from)),
        optionalSdhToFilterDefPairs.stream().anyMatch(Optional::isEmpty));
  }

  /**
   * Resolves a default BeamTemplate for each of the provided Station, BeamTypes and PhaseTypes.
   * Each station will be combined with each BeamType and each PhaseType to create every
   * combination.
   *
   * @param beamformingTemplatesRequest A list of Stations, BeamTypes and PhaseTypes
   * @return A list of BeamformingTemplateTuples where each tuple consists of a BeamTemplate and the
   *     Station, Phase and BeamType used to create the template
   */
  public List<BeamformingTemplate> getBeamformingTemplates(
      BeamformingTemplatesRequest beamformingTemplatesRequest) {
    Preconditions.checkArgument(
        !beamformingTemplatesRequest.getStations().isEmpty(), "Must provide at least one station");
    Preconditions.checkArgument(
        !beamformingTemplatesRequest.getPhases().isEmpty(), "Must provide at least one phase type");

    return beamformingTemplatesRequest.getStations().stream()
        .flatMap(
            station ->
                beamformingTemplatesRequest.getPhases().stream()
                    .map(
                        phaseType ->
                            signalEnhancementFilterConfiguration.getBeamformingTemplate(
                                station, phaseType, beamformingTemplatesRequest.getBeamType())))
        .flatMap(Optional::stream)
        .toList();
  }

  /**
   * Resolves a mapping of {@link Station} to a set of reviewable {@link PhaseType}s for each of the
   * provided {@link Station}s and an activity {@link gms.shared.workflow.coi.WorkflowDefinitionId}.
   *
   * @param request {@link FkReviewablePhasesRequest}
   * @return A mapping of {@link Station}s to reviewable {@link PhaseType}s
   */
  public Map<Station, Set<PhaseType>> getFkReviewablePhases(
      FkReviewablePhasesRequest fkReviewablePhasesRequest) {
    var stationEntityRefs =
        fkReviewablePhasesRequest.stations().stream()
            .map(Station::toEntityReference)
            .collect(Collectors.toSet());
    return stationEntityRefs.stream()
        .map(
            station ->
                signalEnhancementFilterConfiguration
                    .getFkReviewablePhases(station.getName(), fkReviewablePhasesRequest.activity())
                    .map(phases -> Map.entry(station, phases)))
        .flatMap(Optional::stream)
        .collect(Collectors.toMap(Entry::getKey, Entry::getValue));
  }

  /**
   * Resolves for empty signal detection hypothesis by trying to populate it using the faceting
   * utility and makes sure this operation is safe by doing it with an optional.
   *
   * @param request SignalDetectionHypothesis as input
   * @return An entry of optional signal detection hypothesis and optional channel that was
   *     populated with the faceting utility if it was initially empty
   */
  private Entry<Optional<SignalDetectionHypothesis>, Optional<Channel>> shdToChannelPair(
      SignalDetectionHypothesis signalDetectionHypothesis) {
    Optional<SignalDetectionHypothesis> populatedSdhOptional =
        Optional.of(signalDetectionHypothesis);

    // get the id from the signal detection hypothesis
    String id =
        populatedSdhOptional
            .flatMap(sdh -> Optional.of(sdh.getId().getSignalDetectionId().toString()))
            .orElse("Unknown signal detection hypothesis");

    // populate the sdh if the data is not present by using the faceting utility
    if (signalDetectionHypothesis != null && !signalDetectionHypothesis.isPresent()) {
      populatedSdhOptional =
          Optional.ofNullable(populateSignalDetectionHypothesis(signalDetectionHypothesis));
    }

    // if the faceting utility fails to populate the sdh then log this
    if (populatedSdhOptional.isEmpty()) {
      LOGGER.warn(
          "Faceting utility returned null for faceted" + " signal detection hypothesis {}", id);
    }

    Optional<Channel> optionalChannel = Optional.empty();

    if (populatedSdhOptional.isPresent()) {
      optionalChannel = retrieveOptionalChannel(populatedSdhOptional.get());
    }

    return Pair.of(populatedSdhOptional, optionalChannel);
  }

  /**
   * Creates the SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair optional
   *
   * @param request an entry of Optional<SignalDetectionHypothesis> and Optional<Channel>
   * @param request the Optional<EventHypothesis>
   * @return An SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair optional
   */
  private Optional<SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair>
      createOptionalSdhToFilterDefPair(
          Entry<Optional<SignalDetectionHypothesis>, Optional<Channel>> shdToChannelEntry,
          Optional<EventHypothesis> eventHypothesis) {
    Optional<SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair>
        sdhToFilterDefPairOptional = Optional.empty();
    var sdhOptional = shdToChannelEntry.getKey();
    var channelOptional = shdToChannelEntry.getValue();

    if (sdhOptional.isPresent()) {
      var sigDect = sdhOptional.get();
      if (channelOptional.isPresent()) {
        var channel = channelOptional.get();
        var phaseType = getPhaseType(sigDect);

        sdhToFilterDefPairOptional =
            Optional.ofNullable(
                SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.create(
                    sigDect.toEntityReference(),
                    signalEnhancementFilterConfiguration
                        .getDefaultFilterDefinitionByUsageForChannel(
                            channel, eventHypothesis, phaseType)));
      }
    }

    return sdhToFilterDefPairOptional;
  }

  /**
   * Resolves the logic for retrieving a channel from signal detection
   *
   * @param A signal detection hypothesis.
   * @return An optional channel that might be fully populated either from the signal detection
   *     hypothesis or from the faceting utility or and empty.
   */
  private Optional<Channel> retrieveOptionalChannel(SignalDetectionHypothesis sdh) {

    // get channel inside the signal detection hypothesis
    var channelOpt =
        Optional.of(sdh)
            .flatMap(hyp -> hyp.getData())
            .flatMap(hypData -> hypData.getFeatureMeasurement(FeatureMeasurementTypes.ARRIVAL_TIME))
            .flatMap(fm -> Optional.of(fm.getChannel()));

    // check if the channel and its data are present
    if (channelOpt.isPresent() && channelOpt.get().isPresent()) {
      return channelOpt;
    }

    var chanName =
        channelOpt.flatMap(chan -> Optional.of(chan.getName())).orElse("Unknown channel");

    // if not present then try to populate the channels with faceting
    var optChannel = channelOpt.flatMap(chan -> Optional.ofNullable(populateChannel(chan)));

    // if the channel cannot be retrieved from the faceting then log the event
    if (optChannel.isEmpty()) {
      LOGGER.info("Channel {} could not be populatd; skipping", chanName);
    }

    return optChannel;
  }

  /**
   * Resolves the phase type from the signal detection hypothesis
   *
   * @param A signal detection hypothesis.
   * @return An optional phase type that might be fully populated or obtained from the feature
   *     measurement.
   */
  private static Optional<PhaseType> getPhaseType(
      SignalDetectionHypothesis signalDetectionHypothesis) {
    Optional<FeatureMeasurement<PhaseTypeMeasurementValue>> phase =
        signalDetectionHypothesis
            .getData()
            .orElseThrow()
            .getFeatureMeasurement(FeatureMeasurementTypes.PHASE);
    return phase.isPresent()
        ? Optional.of(phase.get().getMeasurementValue().getValue())
        : Optional.empty();
  }

  /**
   * Resolves the phase type from the channel
   *
   * @param A fully populated channel.
   * @return An optional phase type that might be fully populated.
   */
  private static Optional<PhaseType> getPhaseTypeFromChannelBeamDef(Channel channel) {
    var phaseType =
        (PhaseType) channel.getProcessingMetadata().get(ChannelProcessingMetadataType.BEAM_TYPE);
    return Optional.ofNullable(phaseType);
  }

  /**
   * Provides a fully populated channel from the faceting utility
   *
   * @param A channel which is not fully populated.
   * @return A fully populated channel.
   */
  private Channel populateChannel(Channel channel) {
    Instant effectiveAt = channel.getEffectiveAt().orElseThrow();
    return stationDefinitionFacetingUtility.populateFacets(
        channel, channelFacetingDefinition, effectiveAt);
  }

  /**
   * Provides a fully populated signal detection hypothesis from the faceting utility
   *
   * @param A signal detection hypothesis which is not fully populated.
   * @return A fully populated signal detection hypothesis.
   */
  private SignalDetectionHypothesis populateSignalDetectionHypothesis(
      SignalDetectionHypothesis signalDetectionHypothesis) {
    return signalDetectionFacetingUtility.populateFacets(
        signalDetectionHypothesis, signalDetectionHypothesisFacetingDefinition);
  }
}
