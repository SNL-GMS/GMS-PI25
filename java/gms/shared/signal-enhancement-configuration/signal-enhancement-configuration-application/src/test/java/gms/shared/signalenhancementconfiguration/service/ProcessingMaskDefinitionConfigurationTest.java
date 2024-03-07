package gms.shared.signalenhancementconfiguration.service;

import static com.google.common.base.Preconditions.checkNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.stationdefinition.coi.channel.ChannelBandType;
import gms.shared.stationdefinition.coi.channel.ChannelInstrumentType;
import gms.shared.stationdefinition.coi.channel.ChannelOrientationType;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategoryAndType;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import java.io.File;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/** */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProcessingMaskDefinitionConfigurationTest {

  private static final Location PROCESSING_MASK_LOCATION =
      Location.from(35.0, -125.0, 100.0, 5500.0);

  private ConfigurationConsumerUtility configurationConsumerUtility;

  private ProcessingMaskDefinitionConfiguration signalEnhancementFilterConfiguration;

  @BeforeAll
  void init() {
    var configurationRoot =
        checkNotNull(
                Thread.currentThread().getContextClassLoader().getResource("configuration-base"),
                "Unable to find configuration-base test directory")
            .getPath();

    configurationConsumerUtility =
        ConfigurationConsumerUtility.builder(
                FileConfigurationRepository.create(new File(configurationRoot).toPath()))
            .retryConfiguration(RetryConfig.create(1, 2, ChronoUnit.SECONDS, 1))
            .build();
  }

  @BeforeEach
  void setUp() {
    signalEnhancementFilterConfiguration =
        new ProcessingMaskDefinitionConfiguration(configurationConsumerUtility);
    signalEnhancementFilterConfiguration.processingMaskDefinitionConfig =
        "global.processing-mask-definition";
  }

  @Test
  void testProcessingMaskDefinitionDefault() {

    var testChannel =
        UtilsTestFixtures.createTestChannelForProcessingMaskConfiguration(
            "ASAR",
            "AS31",
            "BHZ",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.TRANSVERSE,
            PROCESSING_MASK_LOCATION);

    var testStationGroup = StationGroup.createEntityReference("Primary");
    var actualPMDef =
        signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
            ProcessingOperation.AMPLITUDE_MEASUREMENT_BEAM,
            testStationGroup,
            testChannel,
            PhaseType.Lg);

    // 25 QcSegmentCategoryAndType values expected
    var qcExpectedSet =
        Set.of(
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.LONG_TERM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.STATION_SOH, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.STATION_SOH, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED),
            QcSegmentCategoryAndType.create(QcSegmentCategory.DATA_AUTHENTICATION));

    var expectedPMDef =
        ProcessingMaskDefinition.create(
            Duration.ofSeconds(1), ProcessingOperation.AMPLITUDE_MEASUREMENT_BEAM, qcExpectedSet);
    verifyProcessingMaskDefinition(expectedPMDef, actualPMDef);
  }

  @Test
  void testProcessingMaskDefinitionValidationOne() {

    var testChannel =
        UtilsTestFixtures.createTestChannelForProcessingMaskConfiguration(
            "ASAR",
            "AS31",
            "BHZ",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            PROCESSING_MASK_LOCATION);

    var testStationGroup = StationGroup.createEntityReference("Primary");
    var actualPMDef =
        signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
            ProcessingOperation.FK_SPECTRA, testStationGroup, testChannel, PhaseType.P);

    // 22 QcSegmentCategoryAndType values expected
    var qcExpectedSet =
        Set.of(
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.LONG_TERM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED));

    var expectedPMDef =
        ProcessingMaskDefinition.create(
            Duration.ofSeconds(1), ProcessingOperation.FK_SPECTRA, qcExpectedSet);
    verifyProcessingMaskDefinition(expectedPMDef, actualPMDef);
  }

  @Test
  void testProcessingMaskDefinitionValidationTwo() {

    var testChannel =
        UtilsTestFixtures.createTestChannelForProcessingMaskConfiguration(
            "ASAR",
            "AS31",
            "BHZ",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            PROCESSING_MASK_LOCATION);

    var testStationGroup = StationGroup.createEntityReference("Primary");
    var actualPMDef =
        signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
            ProcessingOperation.FK_SPECTRA, testStationGroup, testChannel, PhaseType.S);

    // 22 QcSegmentCategoryAndType values expected
    var qcExpectedSet =
        Set.of(
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.LONG_TERM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED),
            QcSegmentCategoryAndType.create(QcSegmentCategory.DATA_AUTHENTICATION));

    var expectedPMDef =
        ProcessingMaskDefinition.create(
            Duration.ofSeconds(1), ProcessingOperation.FK_SPECTRA, qcExpectedSet);
    verifyProcessingMaskDefinition(expectedPMDef, actualPMDef);
  }

  @Test
  void testProcessingMaskDefinitionValidationThree() {

    var testChannel =
        UtilsTestFixtures.createTestChannelForProcessingMaskConfiguration(
            "ASAR",
            "beam",
            "BHZ",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            PROCESSING_MASK_LOCATION);

    var testStationGroup = StationGroup.createEntityReference("Primary");
    var actualPMDef =
        signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
            ProcessingOperation.SPECTROGRAM, testStationGroup, testChannel, PhaseType.P);

    // 22 QcSegmentCategoryAndType values expected
    var qcExpectedSet =
        Set.of(
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.LONG_TERM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED));
    var expectedPMDef =
        ProcessingMaskDefinition.create(
            Duration.ofSeconds(1), ProcessingOperation.SPECTROGRAM, qcExpectedSet);
    verifyProcessingMaskDefinition(expectedPMDef, actualPMDef);
  }

  @Test
  void testProcessingMaskDefinitionValidationFour() {

    var testChannel =
        UtilsTestFixtures.createTestChannelForProcessingMaskConfiguration(
            "ASAR",
            "AS01",
            "BHZ",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            PROCESSING_MASK_LOCATION);

    var testStationGroup = StationGroup.createEntityReference("Secondary");
    var actualPMDef =
        signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
            ProcessingOperation.DISPLAY_FILTER, testStationGroup, testChannel, PhaseType.S);

    // 22 QcSegmentCategoryAndType values expected
    var list =
        Set.of(
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(QcSegmentCategory.LONG_TERM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.AGGREGATE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.FLAT),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.GAP),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.NOISY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SENSOR_PROBLEM),
            QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.SPIKE),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.ANALYST_DEFINED, QcSegmentType.TIMING),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.CALIBRATION),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_PROBLEM),
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.STATION_SOH, QcSegmentType.STATION_SECURITY),
            QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED),
            QcSegmentCategoryAndType.create(QcSegmentCategory.DATA_AUTHENTICATION));

    var expectedPMDef =
        ProcessingMaskDefinition.create(
            Duration.ofSeconds(1), ProcessingOperation.DISPLAY_FILTER, list);
    verifyProcessingMaskDefinition(expectedPMDef, actualPMDef);
  }

  /**
   * Common asserts for validating ProcessingMaskDefinition objects
   *
   * @param expectedPMDef Expected {@link ProcessingMaskDefinition} object
   * @param actualPMDef Actual {@link ProcessingMaskDefinition} object from
   *     getProcessingMaskDefinition method
   */
  private void verifyProcessingMaskDefinition(
      ProcessingMaskDefinition expectedPMDef, ProcessingMaskDefinition actualPMDef) {

    assertEquals(
        expectedPMDef.getMaskedSegmentMergeThreshold(),
        actualPMDef.getMaskedSegmentMergeThreshold());
    assertEquals(expectedPMDef.getProcessingOperation(), actualPMDef.getProcessingOperation());

    // Starting with larger list, find items that don't match and report appropiatly
    if (actualPMDef.getAppliedQcSegmentCategoryAndTypes().size()
        >= expectedPMDef.getAppliedQcSegmentCategoryAndTypes().size()) {
      actualPMDef
          .getAppliedQcSegmentCategoryAndTypes()
          .forEach(
              item -> {
                assertTrue(
                    expectedPMDef.getAppliedQcSegmentCategoryAndTypes().contains(item),
                    "Set contained unexpected item(s) " + item);
              });
    } else {
      expectedPMDef
          .getAppliedQcSegmentCategoryAndTypes()
          .forEach(
              item -> {
                assertTrue(
                    actualPMDef.getAppliedQcSegmentCategoryAndTypes().contains(item),
                    "Set missing expected item(s) " + item);
              });
    }
    assertEquals(
        expectedPMDef.getAppliedQcSegmentCategoryAndTypes().size(),
        actualPMDef.getAppliedQcSegmentCategoryAndTypes().size(),
        "Unexpected number of items");
  }
}
