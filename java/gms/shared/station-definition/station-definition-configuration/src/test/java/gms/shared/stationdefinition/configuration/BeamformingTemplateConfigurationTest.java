package gms.shared.stationdefinition.configuration;

import static com.google.common.base.Preconditions.checkNotNull;
import static gms.shared.stationdefinition.testfixtures.CSSDaoTestFixtures.SITE_DAO_3;
import static gms.shared.stationdefinition.testfixtures.CssDaoAndCoiParameters.CHAN3;
import static gms.shared.stationdefinition.testfixtures.CssDaoAndCoiParameters.STA2;
import static gms.shared.stationdefinition.testfixtures.CssDaoAndCoiParameters.STA2_PARAM_MAP;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamDescription;
import gms.shared.derivedchannel.coi.BeamformingConfiguration;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.derivedchannel.types.BeamSummation;
import gms.shared.derivedchannel.types.SamplingType;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.Selector;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.testfixtures.CssDaoAndCoiParameters;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import java.io.File;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Properties;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockitoExtension.class)
class BeamformingTemplateConfigurationTest {
  private static final Logger logger =
      LoggerFactory.getLogger(BeamformingTemplateConfigurationTest.class);

  private static final String BEAM_TYPE_SELECTOR = "beamType";
  private static final String STATION_SELECTOR = "station";
  private static final String PHASE_TYPE_SELECTOR = "phaseType";
  private static final Location PROCESSING_MASK_LOCATION =
      Location.from(35.0, -125.0, 100.0, 5500.0);

  private ConfigurationConsumerUtility configurationConsumerUtility;
  private ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;
  private BeamformingTemplateConfiguration beamformingTemplateConfiguration;

  @Mock private StationDefinitionAccessor stationDefinitionAccessor;

  @BeforeAll
  void init() {
    var configurationRoot =
        checkNotNull(
                Thread.currentThread().getContextClassLoader().getResource("configuration-base"))
            .getPath();
    configurationConsumerUtility =
        ConfigurationConsumerUtility.builder(
                FileConfigurationRepository.create(new File(configurationRoot).toPath()))
            .retryConfiguration(RetryConfig.create(1, 2, ChronoUnit.SECONDS, 1))
            .build();

    processingMaskDefinitionConfiguration =
        new ProcessingMaskDefinitionConfiguration(configurationConsumerUtility);
  }

  @BeforeEach
  void setUp() {
    beamformingTemplateConfiguration =
        new BeamformingTemplateConfiguration(
            configurationConsumerUtility, stationDefinitionAccessor);

    beamformingTemplateConfiguration.beamformingTemplateConfig =
        "station-definition-manager.beamforming-configuration";
    processingMaskDefinitionConfiguration.processingMaskDefinitionConfig =
        "station-definition-manager.processing-mask-definition";

    // TODO: May or may not need the configuration consumer utility test class
  }

  @Test
  void testBeamformingTemplateDefault() {
    var station = UtilsTestFixtures.getStationForDaos();
    var phaseType = PhaseType.P;
    var beamType = BeamType.EVENT;

    var expectedStation =
        Station.createVersionReference(station.getName(), station.getEffectiveAt().get());
    var expectedChannel =
        Channel.createVersionReference(
            UtilsTestFixtures.createTestChannelForDao(
                CssDaoAndCoiParameters.REFERENCE_STATION,
                STA2,
                CHAN3,
                SITE_DAO_3,
                CssDaoAndCoiParameters.INSTRUMENT_PARAM_MAP,
                STA2_PARAM_MAP,
                CssDaoAndCoiParameters.CHAN_PARAM_MAP));

    var beamformingConfiguration =
        getBeamformingConfiguration(getBeamformingProperties(station, phaseType, beamType)).get();

    var beamformingTemplateOpt =
        beamformingTemplateConfiguration.getBeamformingTemplate(station, phaseType, beamType);

    var expectedBeamDescription =
        BeamDescription.builder()
            .setPhase(phaseType)
            .setBeamType(beamType)
            .setBeamSummation(BeamSummation.COHERENT)
            .setTwoDimensional(true)
            .setSamplingType(SamplingType.SNAPPED)
            .build();

    // first check the beam description, station and channels
    assertTrue(beamformingTemplateOpt.isPresent());
    var beamformingTemplate = beamformingTemplateOpt.get();
    assertEquals(expectedBeamDescription, beamformingTemplate.getBeamDescription());
    assertEquals(expectedStation, beamformingTemplate.getStation());
    var beamformingChannels = beamformingTemplate.getInputChannels();
    assertEquals(1, beamformingChannels.size());
    assertEquals(expectedChannel, beamformingChannels.get(0));

    // check all other beamforming template fields
    verifyBeamformingTemplate(beamformingTemplate, beamformingConfiguration);
  }

  @Test
  void testBeamformingTemplateEmptyBeamConfiguration() {
    var station = UtilsTestFixtures.getStationForDaos();
    var phaseType = PhaseType.I;
    var beamType = BeamType.EVENT;

    var beamformingTemplateOpt =
        beamformingTemplateConfiguration.getBeamformingTemplate(station, phaseType, beamType);
    assertTrue(beamformingTemplateOpt.isEmpty());
  }

  @Test
  void testBeamformingTemplateEmptyStation() {
    var station = UtilsTestFixtures.getStationVersion();
    var phaseType = PhaseType.P;
    var beamType = BeamType.EVENT;

    Mockito.when(
            stationDefinitionAccessor.findStationsByNameAndTime(
                List.of(station.getName()), station.getEffectiveAt().get()))
        .thenReturn(List.of());
    var beamformingTemplateOpt =
        beamformingTemplateConfiguration.getBeamformingTemplate(station, phaseType, beamType);
    assertTrue(beamformingTemplateOpt.isEmpty());
  }

  @Test
  void testBeamformingTemplateEmptyBeamformingChannels() {
    var station = UtilsTestFixtures.getStationForDaosTwo();
    var phaseType = PhaseType.P;
    var beamType = BeamType.EVENT;

    var beamformingTemplateOpt =
        beamformingTemplateConfiguration.getBeamformingTemplate(station, phaseType, beamType);
    assertTrue(beamformingTemplateOpt.isEmpty());
  }

  /**
   * Check beamforming template fields
   *
   * @param beamformingTemplate template to check
   */
  private void verifyBeamformingTemplate(
      BeamformingTemplate beamformingTemplate, BeamformingConfiguration beamformingConfiguration) {
    assertEquals(
        Optional.of(beamformingConfiguration.getLeadDuration()),
        beamformingTemplate.getLeadDuration());
    assertEquals(
        Optional.of(beamformingConfiguration.getBeamDuration()),
        beamformingTemplate.getBeamDuration());
    assertEquals(
        beamformingConfiguration.getOrientationAngleToleranceDeg(),
        beamformingTemplate.getOrientationAngleToleranceDeg());
    assertEquals(
        beamformingConfiguration.getSampleRateToleranceHz(),
        beamformingTemplate.getSampleRateToleranceHz());
    assertEquals(
        beamformingConfiguration.getMinWaveformsToBeam(),
        beamformingTemplate.getMinWaveformsToBeam());
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
                  beamformingTemplateConfiguration.beamformingTemplateConfig,
                  List.of(beamTypeSelector, stationSelector, phaseTypeSelector),
                  BeamformingConfiguration.class));
    } catch (IllegalStateException ex) {
      logger.warn(
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
}
