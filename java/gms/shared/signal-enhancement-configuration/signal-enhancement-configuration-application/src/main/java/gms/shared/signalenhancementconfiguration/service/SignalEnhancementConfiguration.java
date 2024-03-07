package gms.shared.signalenhancementconfiguration.service;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamformingConfiguration;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.featureprediction.utilities.math.GeoMath;
import gms.shared.frameworks.configuration.Selector;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterConfiguration;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterList;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.converter.util.StationDefinitionCoiFilter;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * A utility providing clients access to resolved processing configuration used by signal
 * enhancement operations such as beaming, filtering, and Fk spectra calculations.
 */
@Component
public class SignalEnhancementConfiguration {

  private static final String STATION_NAME_SELECTOR = "station";
  private static final String CHANNEL_GROUP_NAME_SELECTOR = "channelGroup";
  private static final String CHANNEL_BAND_NAME_SELECTOR = "channelBand";
  private static final String CHANNEL_INSTRUMENT_NAME_SELECTOR = "channelInstrument";
  private static final String CHANNEL_ORIENTATION_NAME_SELECTOR = "channelOrientation";
  private static final String PHASE_NAME_SELECTOR = "phase";
  private static final String DISTANCE_NAME_SELECTOR = "distance";
  private static final String FILTER_DEFINITION_USAGE_SELECTOR = "filter";
  private static final String DISTANCE_OUT_OF_RANGE = "-99.0";
  private static final String WILD_CARD = "*";
  private static final String BEAM_TYPE_SELECTOR = "beamType";
  private static final String STATION_SELECTOR = "station";
  private static final String PHASE_TYPE_SELECTOR = "phaseType";
  private static final String ACTIVITY_SELECTOR = "activity";

  private static final String STATION_NULL = "Station cannot be null.";
  private static final String PHASE_TYPE_NULL = "PhaseType cannot be null.";
  private static final String BEAM_TYPE_NULL = "BeamType cannot be null.";
  private static final String INPUT_CHANNEL_GROUPS_EMPTY = "Input channel groups cannot be empty.";
  private static final String INPUT_CHANNELS_EMPTY = "Input channels cannot be empty.";
  private static final String STATION_EFFECTIVE_AT_PRESENT = "Station effectiveAt must be present";
  private static final String CONFIGURATION_NO_MATCH =
      "Configuration did not resolve to any matching ConfigurationOptions and also did not match"
          + " any default ConfigurationOptions";

  private static final Logger LOGGER =
      LoggerFactory.getLogger(SignalEnhancementConfiguration.class);

  private final StationDefinitionAccessor stationDefinitionAccessor;
  private final ConfigurationConsumerUtility configurationConsumerUtility;
  private final ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;

  @Value("${filterListDefinitionConfig}")
  public String filterListDefinitionConfig;

  @Value("${filterMetadataConfig}")
  public String filterMetadataConfig;

  @Value("${signalEnhancementBeamformingConfig}")
  public String signalEnhancementBeamformingConfig;

  @Value("${fkReviewablePhasesConfig}")
  public String fkReviewablePhasesConfig;

  @Autowired
  public SignalEnhancementConfiguration(
      StationDefinitionAccessor stationDefinitionAccessor,
      ConfigurationConsumerUtility configurationConsumerUtility,
      ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration) {
    this.stationDefinitionAccessor = stationDefinitionAccessor;
    this.configurationConsumerUtility = configurationConsumerUtility;
    this.processingMaskDefinitionConfiguration = processingMaskDefinitionConfiguration;
  }

  /**
   * Uses the ConfigurationConsumerUtility to resolve the {@link FilterList}s available to Analysts
   *
   * @return the resolved {@link FilterListsDefinition}
   */
  public FilterListDefinition filterListDefinition() {
    return configurationConsumerUtility.resolve(
        filterListDefinitionConfig, List.of(), FilterListDefinition.class);
  }

  /**
   * Resolves a {@link FilterDefinition} for each {@link FilterDefinitionUsage} literal in the
   * channel data
   *
   * @param channel a populated {@link Channel} instance
   * @param eventHypothesis a populated {@link EventHypothesis} instance or an empty Optional
   * @param phaseType the {@link PhaseType} or an empty Optional
   * @return the resolved {@link FilterDefinition}s
   */
  public FilterDefinitionByFilterDefinitionUsage getDefaultFilterDefinitionByUsageForChannel(
      Channel channel, Optional<EventHypothesis> eventHypothesis, Optional<PhaseType> phaseType) {

    Preconditions.checkArgument(channel.getData().isPresent(), "Channel is not populated.");

    var properties =
        getFilterDefinitionProperties(
            channel, phaseType.orElse(PhaseType.UNKNOWN), eventHypothesis);

    return FilterDefinitionByFilterDefinitionUsage.from(
        getFilterDefinitionUsageByFilterDefinitionMap(properties));
  }

  Map<FilterDefinitionUsage, FilterDefinition> getFilterDefinitionUsageByFilterDefinitionMap(
      Properties criterionProperties) {
    var stationNameSelector =
        Selector.from(
            STATION_NAME_SELECTOR, criterionProperties.getProperty(STATION_NAME_SELECTOR));
    var channelGroupNameSelector =
        Selector.from(
            CHANNEL_GROUP_NAME_SELECTOR,
            criterionProperties.getProperty(CHANNEL_GROUP_NAME_SELECTOR));
    var channelBandNameSelector =
        Selector.from(
            CHANNEL_BAND_NAME_SELECTOR,
            criterionProperties.getProperty(CHANNEL_BAND_NAME_SELECTOR));
    var channelInstrumentNameSelector =
        Selector.from(
            CHANNEL_INSTRUMENT_NAME_SELECTOR,
            criterionProperties.getProperty(CHANNEL_INSTRUMENT_NAME_SELECTOR));
    var channelOrientationNameSelector =
        Selector.from(
            CHANNEL_ORIENTATION_NAME_SELECTOR,
            criterionProperties.getProperty(CHANNEL_ORIENTATION_NAME_SELECTOR));
    var phaseNameSelector =
        Selector.from(PHASE_NAME_SELECTOR, criterionProperties.getProperty(PHASE_NAME_SELECTOR));
    var distanceNameSelector =
        Selector.from(DISTANCE_NAME_SELECTOR, getDistance(criterionProperties));

    return Arrays.stream(FilterDefinitionUsage.values())
        .collect(
            Collectors.toMap(
                Function.identity(),
                filterDefinitionUsage ->
                    configurationConsumerUtility
                        .resolve(
                            filterMetadataConfig,
                            List.of(
                                stationNameSelector,
                                channelGroupNameSelector,
                                channelBandNameSelector,
                                channelInstrumentNameSelector,
                                channelOrientationNameSelector,
                                phaseNameSelector,
                                distanceNameSelector,
                                Selector.from(
                                    FILTER_DEFINITION_USAGE_SELECTOR,
                                    filterDefinitionUsage.getName())),
                            FilterConfiguration.class)
                        .getFilterDefinition()));
  }

  /**
   * Retrieves the {@link ProcessingMaskDefinition} based on the input parameters. If there are no
   * matching definitions, a default all encompassing definition will be returned
   *
   * @param processingOperation {@link ProcessingOperation} to use in configuration query
   * @param stationGroup {@link StationGroup} to use in configuration query
   * @param channel {@link Channel} to use in configuration query
   * @param phaseType {@link PhaseType} to use in configuration query
   * @return Populated {@link ProcessingMaskDefinition} object
   */
  public ProcessingMaskDefinition getProcessingMaskDefinition(
      ProcessingOperation processingOperation,
      StationGroup stationGroup,
      Channel channel,
      PhaseType phaseType) {

    return processingMaskDefinitionConfiguration.getProcessingMaskDefinition(
        processingOperation, stationGroup, channel, phaseType);
  }

  /**
   * Resolve {@link BeamformingTemplate} using processing configuration, input {@link Station},
   * {@link PhaseType} and {@link BeamType}
   *
   * @param station input {@link Station}
   * @param phaseType input {@link PhaseType}
   * @param beamType input {@link BeamType}
   * @return {@link BeamformingTemplate}
   */
  public Optional<BeamformingTemplate> getBeamformingTemplate(
      Station station, PhaseType phaseType, BeamType beamType) {

    Preconditions.checkNotNull(station, STATION_NULL);
    Preconditions.checkNotNull(phaseType, PHASE_TYPE_NULL);
    Preconditions.checkNotNull(beamType, BEAM_TYPE_NULL);

    // get beamforming properties and build beamforming configuration
    var properties = getBeamformingProperties(station, phaseType, beamType);
    var beamformingConfiguration = getBeamformingConfiguration(properties);
    if (beamformingConfiguration.isEmpty()) {
      return Optional.empty();
    }
    // get input channel groups and channels from the beamforming config
    var inputChannelGroups = beamformingConfiguration.get().getInputChannelGroups();
    var inputChannels = beamformingConfiguration.get().getInputChannels();

    Preconditions.checkArgument(!inputChannelGroups.isEmpty(), INPUT_CHANNEL_GROUPS_EMPTY);
    Preconditions.checkArgument(!inputChannels.isEmpty(), INPUT_CHANNELS_EMPTY);
    var effectiveAt =
        station
            .getEffectiveAt()
            .orElseThrow(() -> new IllegalArgumentException(STATION_EFFECTIVE_AT_PRESENT));

    List<Channel> beamformingChannels = new ArrayList<>();
    if (!station.isPresent()) {
      // query for station data before filtering channel groups & channels
      var stationName = station.getName();
      List<Station> stations =
          stationDefinitionAccessor.findStationsByNameAndTime(List.of(stationName), effectiveAt);
      if (stations.isEmpty()) {
        LOGGER.warn(
            "Beamforming Template could not be created because station {} could not be found",
            station);
        return Optional.empty();
      }
      station = stations.get(0);
    }

    // filter raw channels using input channel groups & channels
    StationDefinitionCoiFilter.filterStationRawChannels(
        station.getAllRawChannels(), inputChannelGroups, inputChannels, beamformingChannels);
    if (beamformingChannels.isEmpty()) {
      LOGGER.warn(
          "Beamfroming Template could not be created because station {} does not have any channels"
              + " to beam that match configuration",
          station);
      return Optional.empty();
    }

    var beamDescription =
        beamformingConfiguration.get().getBeamDescription().toBuilder()
            .setPhase(phaseType)
            .setBeamType(beamType)
            .build();
    return Optional.of(
        BeamformingTemplate.builder()
            .setLeadDuration(beamformingConfiguration.get().getLeadDuration())
            .setBeamDuration(beamformingConfiguration.get().getBeamDuration())
            .setOrientationAngleToleranceDeg(
                beamformingConfiguration.get().getOrientationAngleToleranceDeg())
            .setSampleRateToleranceHz(beamformingConfiguration.get().getSampleRateToleranceHz())
            .setMinWaveformsToBeam(beamformingConfiguration.get().getMinWaveformsToBeam())
            .setBeamDescription(beamDescription)
            .setStation(Station.createVersionReference(station.getName(), effectiveAt))
            .setInputChannels(ImmutableList.copyOf(beamformingChannels))
            .build());
  }

  /**
   * Get the {@link BeamformingConfiguration} from processing configuration files using the
   * configuration consumer utility
   *
   * @param criterionProperties Properties for selectors
   * @return {@link BeamformingConfiguration}
   */
  private Optional<BeamformingConfiguration> getBeamformingConfiguration(
      Properties criterionProperties) {
    var beamTypeSelector =
        Selector.from(BEAM_TYPE_SELECTOR, criterionProperties.getProperty(BEAM_TYPE_SELECTOR));
    var stationSelector =
        Selector.from(STATION_SELECTOR, criterionProperties.getProperty(STATION_SELECTOR));
    var phaseTypeSelector =
        Selector.from(PHASE_TYPE_SELECTOR, criterionProperties.getProperty(PHASE_TYPE_SELECTOR));
    Optional<BeamformingConfiguration> beamformingConfiguration;
    try {
      beamformingConfiguration =
          Optional.of(
              configurationConsumerUtility.resolve(
                  signalEnhancementBeamformingConfig,
                  List.of(beamTypeSelector, stationSelector, phaseTypeSelector),
                  BeamformingConfiguration.class));
    } catch (IllegalStateException ex) {
      LOGGER.warn(
          "Configuration could not be resolved and returned an error message of {} for the"
              + " following criterion {}.  This indicates a possible misconfiguration.",
          ex.getMessage(),
          criterionProperties);
      beamformingConfiguration = Optional.empty();
    }
    return beamformingConfiguration;
  }

  /**
   * Get the Beamforming configuration properties used to create selectors
   *
   * @param station station name
   * @param phaseType phase type enum
   * @param beamType beam type enum
   * @return beamforming properties
   */
  private static Properties getBeamformingProperties(
      Station station, PhaseType phaseType, BeamType beamType) {
    var stationName = station.getName();
    var phase = phaseType.getLabel();
    var beam = beamType.getLabel();

    var properties = new Properties();
    properties.setProperty(BEAM_TYPE_SELECTOR, beam);
    properties.setProperty(STATION_SELECTOR, stationName);
    properties.setProperty(PHASE_TYPE_SELECTOR, phase);

    return properties;
  }

  /**
   * Retrieves configured reviewable phases if such configuration exists
   *
   * @param stationName Name of the station used to resolve reviewable phases
   * @param activity ID referencing the activity used to resolve reviewable phases
   * @return An optional set of phases if properly configured. Empty if configuration not found or
   *     unable to be parsed.
   */
  public Optional<Set<PhaseType>> getFkReviewablePhases(
      String stationName, WorkflowDefinitionId activity) {

    var stationSelector = Selector.from(STATION_SELECTOR, stationName);
    var activitySelector = Selector.from(ACTIVITY_SELECTOR, activity.getName());

    try {
      FkReviewablePhasesConfiguration phasesConfig =
          configurationConsumerUtility.resolve(
              fkReviewablePhasesConfig,
              List.of(stationSelector, activitySelector),
              FkReviewablePhasesConfiguration.class);

      return Optional.of(phasesConfig.phases());
    } catch (IllegalArgumentException | IllegalStateException e) {
      // TODO: This handling is temporary due to the imminent migration to the new configuration
      // framework
      // Once migrated, this handling should simplify into e.g. Optional management or specific
      // exception handling, as these checks are brittle and difficult to maintain
      if (e instanceof IllegalArgumentException
          && e.getMessage().contains("Resolved Configuration is not a valid instance")) {
        LOGGER.warn(
            """
            Configuration for selectors {} resolved, but failed to be parsed as {}.
            Please check the configuration parameters.""",
            List.of(stationSelector, activitySelector),
            FkReviewablePhasesConfiguration.class.getName());
        return Optional.empty();
      } else if (e instanceof IllegalStateException
          && e.getMessage().contains(CONFIGURATION_NO_MATCH)) {
        LOGGER.warn(
            """
            Configuration for selectors {} could not be resolved with cause '{}'.
            Please check the configuration is defined for these selectors.""",
            List.of(stationSelector, activitySelector),
            e.getMessage());
        return Optional.empty();
      } else {
        // Propagate unexpected exception
        throw e;
      }
    }
  }

  /**
   * Get the filter definition properties used to create selectors
   *
   * @param channel input {@link Channel}
   * @param phaseType input {@link PhaseType}
   * @param eventHypothesis optional {@link EventHypothesis}
   * @return filter definition properties
   */
  private static Properties getFilterDefinitionProperties(
      Channel channel, PhaseType phaseType, Optional<EventHypothesis> eventHypothesis) {
    var station = channel.getStation().getName();
    var channelGroup =
        channel.getProcessingMetadata().get(ChannelProcessingMetadataType.CHANNEL_GROUP).toString();
    var channelBand = String.valueOf(channel.getChannelBandType().getCode());
    var channelInstrument = String.valueOf(channel.getChannelInstrumentType().getCode());
    var channelOrientation = String.valueOf(channel.getChannelOrientationType().getCode());
    var phase = phaseType.getLabel();
    var properties = new Properties();

    properties.setProperty(STATION_NAME_SELECTOR, station);
    properties.setProperty(CHANNEL_GROUP_NAME_SELECTOR, channelGroup);
    properties.setProperty(CHANNEL_BAND_NAME_SELECTOR, channelBand);
    properties.setProperty(CHANNEL_INSTRUMENT_NAME_SELECTOR, channelInstrument);
    properties.setProperty(CHANNEL_ORIENTATION_NAME_SELECTOR, channelOrientation);
    properties.setProperty(PHASE_NAME_SELECTOR, phase);
    properties.setProperty(DISTANCE_NAME_SELECTOR, "");

    eventHypothesis.ifPresent(
        event ->
            event
                .getData()
                .ifPresent(
                    data ->
                        data.getPreferredLocationSolution()
                            .ifPresent(
                                preferredLocation ->
                                    preferredLocation
                                        .getData()
                                        .ifPresent(
                                            location ->
                                                properties.setProperty(
                                                    DISTANCE_NAME_SELECTOR,
                                                    String.valueOf(
                                                        GeoMath.greatCircleAngularSeparation(
                                                            location
                                                                .getLocation()
                                                                .getLatitudeDegrees(),
                                                            location
                                                                .getLocation()
                                                                .getLongitudeDegrees(),
                                                            channel
                                                                .getLocation()
                                                                .getLatitudeDegrees(),
                                                            channel
                                                                .getLocation()
                                                                .getLongitudeDegrees())))))));

    return properties;
  }

  private static double getDistance(Properties criterionProperties) {
    String distance = criterionProperties.getProperty(DISTANCE_NAME_SELECTOR);
    if (distance.equals(WILD_CARD) || distance.isEmpty()) {
      distance = DISTANCE_OUT_OF_RANGE;
    }

    return Double.parseDouble(distance);
  }
}
