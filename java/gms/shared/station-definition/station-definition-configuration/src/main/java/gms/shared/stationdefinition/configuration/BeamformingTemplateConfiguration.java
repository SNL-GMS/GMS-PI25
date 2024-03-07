package gms.shared.stationdefinition.configuration;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamformingConfiguration;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.frameworks.configuration.Selector;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.converter.util.StationDefinitionCoiFilter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Properties;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class BeamformingTemplateConfiguration {
  private static final Logger logger =
      LoggerFactory.getLogger(BeamformingTemplateConfiguration.class);

  private static final String BEAM_TYPE_SELECTOR = "beamType";
  private static final String STATION_SELECTOR = "station";
  private static final String PHASE_TYPE_SELECTOR = "phaseType";

  private static final String BEAMFORMING_TEMPLATE_MSG =
      "Beamforming Template " + "could not be created because";
  private static final String STATION_NULL = "Station cannot be null.";
  private static final String PHASE_TYPE_NULL = "PhaseType cannot be null.";
  private static final String BEAM_TYPE_NULL = "BeamType cannot be null.";
  private static final String INPUT_CHANNEL_GROUPS_EMPTY = "Input channel groups cannot be empty.";
  private static final String INPUT_CHANNELS_EMPTY = "Input channels cannot be empty.";
  private static final String STATION_EFFECTIVE_AT_PRESENT = "Station effectiveAt must be present";

  private final StationDefinitionAccessor stationDefinitionAccessor;
  private final ConfigurationConsumerUtility configurationConsumerUtility;

  @Value("${beamformingTemplateConfig}")
  public String beamformingTemplateConfig;

  @Autowired
  public BeamformingTemplateConfiguration(
      ConfigurationConsumerUtility configurationConsumerUtility,
      StationDefinitionAccessor stationDefinitionAccessor) {

    this.configurationConsumerUtility = configurationConsumerUtility;
    this.stationDefinitionAccessor = stationDefinitionAccessor;
  }

  /**
   * Create the {@link BeamformingTemplate} using the processing configuration and station,
   * phaseType and beamType inputs.
   *
   * @param station {@link Station}
   * @param phaseType {@link PhaseType}
   * @param beamType {@link BeamType}
   * @return optional {@link BeamformingTemplate}
   */
  public Optional<BeamformingTemplate> getBeamformingTemplate(
      Station station, PhaseType phaseType, BeamType beamType) {
    Preconditions.checkNotNull(station, STATION_NULL);
    Preconditions.checkNotNull(phaseType, PHASE_TYPE_NULL);
    Preconditions.checkNotNull(beamType, BEAM_TYPE_NULL);

    // get beamforming properties and build beamforming configuration
    var properties = getBeamformingProperties(station, phaseType, beamType);
    var beamformingConfiguration = getBeamformingConfiguration(properties);
    var beamConfigEmpty = beamformingConfiguration.isEmpty();

    var effectiveAt =
        station
            .getEffectiveAt()
            .orElseThrow(() -> new IllegalArgumentException(STATION_EFFECTIVE_AT_PRESENT));

    Pair<Boolean, Station> stationPair = updateStationData(station, effectiveAt);
    var stationEmpty = stationPair.getLeft();
    station = stationPair.getRight();
    if (Boolean.TRUE.equals(stationEmpty) || beamConfigEmpty) {
      logger.warn(
          BEAMFORMING_TEMPLATE_MSG
              + " beamforming configuration and/or station {} could not be found",
          station.getName());
      return Optional.empty();
    }

    // at this point the station exists
    // use beamforming config to resolve channel groups and channels
    var inputChannelGroups = beamformingConfiguration.get().getInputChannelGroups();
    var inputChannels = beamformingConfiguration.get().getInputChannels();
    Preconditions.checkArgument(!inputChannelGroups.isEmpty(), INPUT_CHANNEL_GROUPS_EMPTY);
    Preconditions.checkArgument(!inputChannels.isEmpty(), INPUT_CHANNELS_EMPTY);

    // if station DNE we can't get raw chans
    // filter raw channels using input channel groups & channels
    List<Channel> beamformingChannels = new ArrayList<>();
    StationDefinitionCoiFilter.filterStationRawChannels(
        station.getAllRawChannels(), inputChannelGroups, inputChannels, beamformingChannels);
    if (beamformingChannels.isEmpty()) {
      logger.warn(
          BEAMFORMING_TEMPLATE_MSG + " station {} does not have any channels to beam",
          station.getName());
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
   * Check for empty station data and return a pair of boolean and station object
   *
   * @param station {@link Station} obj
   * @param effectiveAt instant effective at
   * @return pair of boolean and station object
   */
  private Pair<Boolean, Station> updateStationData(Station station, Instant effectiveAt) {
    var stationEmpty = false;
    if (!station.isPresent()) {
      // query for station data before filtering channel groups & channels
      var stationName = station.getName();
      List<Station> stations =
          stationDefinitionAccessor.findStationsByNameAndTime(List.of(stationName), effectiveAt);
      stationEmpty = stations.isEmpty();
      if (!stationEmpty) {
        station = stations.get(0);
      }
    }
    return Pair.of(stationEmpty, station);
  }

  /**
   * Resolve {@link BeamformingConfiguration} using the processing config consumer utility as well
   * as the properties and selectors
   *
   * @param properties Properties needed for selectors
   * @return optional {@link BeamformingConfiguration}
   */
  private Optional<BeamformingConfiguration> getBeamformingConfiguration(Properties properties) {
    var beamTypeSelector =
        Selector.from(BEAM_TYPE_SELECTOR, properties.getProperty(BEAM_TYPE_SELECTOR));
    var stationSelector = Selector.from(STATION_SELECTOR, properties.getProperty(STATION_SELECTOR));
    var phaseTypeSelector =
        Selector.from(PHASE_TYPE_SELECTOR, properties.getProperty(PHASE_TYPE_SELECTOR));

    Optional<BeamformingConfiguration> beamformingConfiguration;
    try {
      beamformingConfiguration =
          Optional.of(
              configurationConsumerUtility.resolve(
                  beamformingTemplateConfig,
                  List.of(beamTypeSelector, stationSelector, phaseTypeSelector),
                  BeamformingConfiguration.class));
    } catch (IllegalStateException ex) {
      logger.warn(
          "Configuration could not be resolved and returned an error message of {} for the"
              + " following criterion {}.  This indicates a possible misconfiguration.",
          ex.getMessage(),
          properties);
      beamformingConfiguration = Optional.empty();
    }

    return beamformingConfiguration;
  }

  /**
   * Get the Beamforming configuration property selectors
   *
   * @param station {@link Station} object
   * @param phaseType {@link PhaseType} enum
   * @param beamType {@link BeamType} enum
   * @return beamforming properties
   */
  private static Properties getBeamformingProperties(
      Station station, PhaseType phaseType, BeamType beamType) {
    var stationName = station.getName();
    var phase = phaseType.getLabel();
    var beam = beamType.getLabel();

    // set the beamforming properties for config selectors
    var properties = new Properties();
    properties.setProperty(BEAM_TYPE_SELECTOR, beam);
    properties.setProperty(STATION_SELECTOR, stationName);
    properties.setProperty(PHASE_TYPE_SELECTOR, phase);

    return properties;
  }
}
