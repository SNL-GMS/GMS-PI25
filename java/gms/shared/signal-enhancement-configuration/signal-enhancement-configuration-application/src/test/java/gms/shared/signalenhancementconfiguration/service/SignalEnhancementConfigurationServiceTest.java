package gms.shared.signalenhancementconfiguration.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.base.Preconditions;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamTestFixtures;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.signaldetection.api.SignalDetectionAccessor;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.BeamformingTemplatesRequest;
import gms.shared.signalenhancementconfiguration.api.ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskDefinitionRequest;
import gms.shared.signalenhancementconfiguration.api.SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.webclient.FkReviewablePhasesRequest;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterList;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.utils.ConfigurationTestUtility;
import gms.shared.signalenhancementconfiguration.utils.FilterName;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelBandType;
import gms.shared.stationdefinition.coi.channel.ChannelInstrumentType;
import gms.shared.stationdefinition.coi.channel.ChannelOrientationType;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessor;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockitoExtension.class)
class SignalEnhancementConfigurationServiceTest {

  private static final String WILD_CARD = "*";
  private ConfigurationConsumerUtility configurationConsumerUtility;

  SignalEnhancementConfiguration signalEnhancementFilterConfiguration;
  ConfigurationTestUtility testUtility;
  SignalEnhancementConfigurationService signalEnhancementConfigurationService;
  Map<String, FilterDefinition> filterDefinitionMap;
  SignalDetectionHypothesis sigDetHyp;

  ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;

  @Mock StationDefinitionFacetingUtility stationDefinitionFacetingUtility;

  @Mock SignalDetectionFacetingUtility signalDetectionFacetingUtility;

  @Mock StationDefinitionAccessor stationDefinitionAccessor;

  @Mock WaveformAccessor waveformAccessor;

  @Mock SignalDetectionAccessor signalDetectionAccessor;

  @BeforeAll
  void init() {
    var configurationRoot =
        Preconditions.checkNotNull(
                Thread.currentThread().getContextClassLoader().getResource("configuration-base"))
            .getPath();

    configurationConsumerUtility =
        ConfigurationConsumerUtility.builder(
                FileConfigurationRepository.create(new File(configurationRoot).toPath()))
            .retryConfiguration(RetryConfig.create(1, 2, ChronoUnit.SECONDS, 1))
            .build();

    processingMaskDefinitionConfiguration =
        new ProcessingMaskDefinitionConfiguration(configurationConsumerUtility);

    sigDetHyp =
        SignalDetectionHypothesis.builder()
            .setId(ConfigurationTestUtility.RANDOM_SIG_DET_HYP_ID)
            .build();
  }

  @BeforeEach
  void setUp() {
    signalEnhancementFilterConfiguration =
        new SignalEnhancementConfiguration(
            stationDefinitionAccessor,
            configurationConsumerUtility,
            processingMaskDefinitionConfiguration);
    signalEnhancementFilterConfiguration.filterListDefinitionConfig =
        "global.filter-list-definition";
    signalEnhancementFilterConfiguration.filterMetadataConfig = "global.filter-metadata";
    processingMaskDefinitionConfiguration.processingMaskDefinitionConfig =
        "global.processing-mask-definition";

    testUtility = new ConfigurationTestUtility(configurationConsumerUtility);
    signalEnhancementConfigurationService =
        new SignalEnhancementConfigurationService(
            signalEnhancementFilterConfiguration,
            stationDefinitionFacetingUtility,
            signalDetectionFacetingUtility);
    filterDefinitionMap = testUtility.filterDefinitionMap();
  }

  @Test
  void testResolveFilterListDefinition() {
    FilterListDefinition filterListDefinition =
        signalEnhancementConfigurationService.filterListDefinition();

    List<FilterList> actualFilterList =
        filterListDefinition.getFilterLists().stream().collect(Collectors.toUnmodifiableList());

    List<FilterList> expectedFilterList =
        testUtility.filterListMap().values().stream().collect(Collectors.toUnmodifiableList());

    assertEquals(expectedFilterList, actualFilterList);
  }

  @Test
  void testMultipleChannelWithDifferentTiming() throws JsonProcessingException {
    var defaultChannel = ConfigurationTestUtility.getDefaultChannel();
    var cs1 =
        ConfigurationTestUtility.buildChannelSegment(defaultChannel, Instant.EPOCH.plusSeconds(10));
    var cs2 =
        ConfigurationTestUtility.buildChannelSegment(
            defaultChannel, Instant.EPOCH.plusSeconds(300));
    var defaultEventHypothesis = ConfigurationTestUtility.getDefaultEventHypothesis();
    var defaultNonCausalFilterDefinitionPairs = getDefaultNonCausalFilterDefinitionPairs();

    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(cs1, cs2))
            .setEventHypothesis(defaultEventHypothesis)
            .build();

    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForChannelSegments(request)
            .getKey();
    var expected = getChanSegFilterMap(List.of(cs1, cs2), defaultNonCausalFilterDefinitionPairs);

    assertEquals(
        expected.getChannelSegmentByFilterDefinition(),
        actual.getChannelSegmentByFilterDefinition());

    assertEquals(
        expected.getChannelSegmentByFilterDefinitionUsage(),
        actual.getChannelSegmentByFilterDefinitionUsage());

    assertEquals(
        expected.getChannelSegmentByFilterDefinitionByFilterDefinitionUsage(),
        actual.getChannelSegmentByFilterDefinitionByFilterDefinitionUsage());
  }

  @Test
  void testMultipleChannelWithTheSameTiming() throws JsonProcessingException {
    var defaultChannel = ConfigurationTestUtility.getDefaultChannel();
    var cs1 = ConfigurationTestUtility.buildChannelSegment(defaultChannel, Instant.MIN);
    var cs2 = ConfigurationTestUtility.buildChannelSegment(defaultChannel, Instant.MIN);
    var defaultEventHypothesis = ConfigurationTestUtility.getDefaultEventHypothesis();
    var defaultNonCausalFilterDefinitionPairs = getDefaultNonCausalFilterDefinitionPairs();

    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(cs1, cs2))
            .setEventHypothesis(defaultEventHypothesis)
            .build();

    var actual =
        signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);
    var expected = getChanSegFilterMap(List.of(cs1), defaultNonCausalFilterDefinitionPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      Collection<ProcessingMask> maskedBy,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    // TODO verify whether maskedBy is needed. currently set for parameterized tests

    var sdh =
        ConfigurationTestUtility.buildSignalDetectionHypothesis(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            Location.from(channelLatitude, channelLongitude, 0, 0),
            phaseType);

    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));

    var request =
        FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(eventHypothesis)
            .setSignalDetectionsHypotheses(List.of(sdh))
            .build();

    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputSignalDetectionHypothesisWithVersionedChannels(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      Collection<ProcessingMask> maskedBy,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    // TODO verify whether maskedBy is needed. currently set for parameterized tests

    var sdh =
        ConfigurationTestUtility
            .buildSignalDetectionHypothesisWithVersionChannelInFeatureMeasurement(
                station,
                channelGroup,
                channelBand,
                channelInstrument,
                channelOrientation,
                Location.from(channelLatitude, channelLongitude, 0, 0),
                phaseType);

    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.any(Channel.class),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(
            ConfigurationTestUtility.buildChannel(
                station,
                channelGroup,
                channelBand,
                channelInstrument,
                channelOrientation,
                Location.from(channelLatitude, channelLongitude, 0, 0),
                Optional.empty()));

    var request =
        FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(eventHypothesis)
            .setSignalDetectionsHypotheses(List.of(sdh))
            .build();

    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testForFacetedSignalDetectionHypothesis(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      Collection<ProcessingMask> maskedBy,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    // TODO verify whether maskedBy is needed. currently set for parameterized tests

    var sdh =
        ConfigurationTestUtility.buildSignalDetectionHypothesis(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            Location.from(channelLatitude, channelLongitude, 0, 0),
            phaseType);
    var facetedSdh = sdh.toEntityReference();
    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));

    var request =
        FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(eventHypothesis)
            .setSignalDetectionsHypotheses(List.of(facetedSdh))
            .build();

    Mockito.when(signalDetectionFacetingUtility.populateFacets(Mockito.any(), Mockito.any()))
        .thenReturn(sdh);
    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);
    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultUsageForChannelSegment(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      Collection<ProcessingMask> maskedBy,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {

    var cs =
        ConfigurationTestUtility.buildChannelSegment(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            Location.from(channelLatitude, channelLongitude, 0, 0),
            phaseType,
            maskedBy); // TODO Add ProcessingMask stuff here
    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));

    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(cs))
            .setEventHypothesis(eventHypothesis)
            .build();

    var actual =
        signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);
    var expected = getChanSegFilterMap(List.of(cs), expectedFilterDefinitionsPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultUsageForChannelSegmentWithFacetedChannel(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      Collection<ProcessingMask> maskedBy,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {

    var cs =
        ConfigurationTestUtility.buildChannelSegment(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            Location.from(channelLatitude, channelLongitude, 0, 0),
            phaseType,
            maskedBy); // TODO Add ProcessingMask stuff here

    var csd = cs.getId();
    var channel = csd.getChannel();
    var facetedCs =
        cs.toBuilder()
            .setId(
                ChannelSegmentDescriptor.from(
                    channel.toEntityReference().toBuilder()
                        .setEffectiveAt(channel.getEffectiveAt())
                        .build(),
                    csd.getCreationTime(),
                    csd.getStartTime(),
                    csd.getEndTime()))
            .build();

    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));

    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(facetedCs))
            .setEventHypothesis(eventHypothesis)
            .build();

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.any(Channel.class),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(channel);

    var actual =
        signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);
    var expected = getChanSegFilterMap(List.of(facetedCs), expectedFilterDefinitionsPairs);

    assertEquals(expected, actual.getKey());
    assertFalse(actual.getValue());
  }

  @Test
  void testNullFacetingChannel() {
    var defaultChannel = ConfigurationTestUtility.getDefaultChannel();
    var cs =
        ConfigurationTestUtility.buildChannelSegment(defaultChannel, Instant.EPOCH.plusSeconds(10));
    var defaultEventHypothesis = ConfigurationTestUtility.getDefaultEventHypothesis();
    var csd = cs.getId();

    var facetedCs =
        cs.toBuilder()
            .setId(
                ChannelSegmentDescriptor.from(
                    defaultChannel.toEntityReference().toBuilder()
                        .setEffectiveAt(defaultChannel.getEffectiveAt())
                        .build(),
                    csd.getCreationTime(),
                    csd.getStartTime(),
                    csd.getEndTime()))
            .build();

    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(facetedCs))
            .setEventHypothesis(defaultEventHypothesis)
            .build();

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.any(Channel.class),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(null);

    var actual =
        signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);

    assertTrue(actual.getValue());
    assertTrue(actual.getKey().getFilterDefinitionByUsageByChannelSegment().isEmpty());
  }

  @Test
  void testNullFacetingHypothesis() {
    var sdh = ConfigurationTestUtility.getDefaultSignalDetectionHypothesis();
    var defaultEventHypothesis = ConfigurationTestUtility.getDefaultEventHypothesis();

    SignalDetectionHypothesis facetedSdh = sdh.toEntityReference();

    var request =
        FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(defaultEventHypothesis)
            .setSignalDetectionsHypotheses(List.of(facetedSdh))
            .build();

    Mockito.when(signalDetectionFacetingUtility.populateFacets(Mockito.any(), Mockito.any()))
        .thenReturn(null);

    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    assertTrue(actual.getValue());
    assertTrue(actual.getKey().getFilterDefinitionByUsageBySignalDetectionHypothesis().isEmpty());
  }

  @Test
  void testNullFacetingChannelInSignalDetection() {
    String station = "ASAR";
    String channelGroup = "AS31";
    ChannelBandType channelBand = ChannelBandType.BROADBAND;
    ChannelInstrumentType channelInstrument = ChannelInstrumentType.HIGH_GAIN_SEISMOMETER;
    ChannelOrientationType channelOrientation = ChannelOrientationType.NORTH_SOUTH;
    PhaseType phaseType = PhaseType.P;
    double channelLatitude = -23.665;
    double channelLongitude = 133.905;

    var sdh =
        ConfigurationTestUtility
            .buildSignalDetectionHypothesisWithVersionChannelInFeatureMeasurement(
                station,
                channelGroup,
                channelBand,
                channelInstrument,
                channelOrientation,
                Location.from(channelLatitude, channelLongitude, 0, 0),
                phaseType);

    var defaultEventHypothesis = ConfigurationTestUtility.getDefaultEventHypothesis();

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.any(Channel.class),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(null);

    var request =
        FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(defaultEventHypothesis)
            .setSignalDetectionsHypotheses(List.of(sdh))
            .build();

    var actual =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    assertTrue(actual.getValue());
    assertTrue(actual.getKey().getFilterDefinitionByUsageBySignalDetectionHypothesis().isEmpty());
  }

  @Test
  void testGetProcessingMaskDefinitions() {

    var mockStation = Mockito.mock(Station.class);
    Mockito.when(mockStation.getName()).thenReturn("MyStation");

    var channelVersion1 = Channel.createVersionReference("BHZ", Instant.EPOCH);

    var mockPopulatedChannel1 = Mockito.mock(Channel.class);

    Mockito.when(mockPopulatedChannel1.getChannelBandType()).thenReturn(ChannelBandType.BROADBAND);
    Mockito.when(mockPopulatedChannel1.getChannelInstrumentType())
        .thenReturn(ChannelInstrumentType.HIGH_GAIN_SEISMOMETER);
    Mockito.when(mockPopulatedChannel1.getChannelOrientationCode()).thenReturn('Z');
    Mockito.when(mockPopulatedChannel1.getStation()).thenReturn(mockStation);
    Mockito.when(mockPopulatedChannel1.getProcessingMetadata())
        .thenReturn(Map.of(ChannelProcessingMetadataType.CHANNEL_GROUP, "AS1"));

    var channelVersion2 = Channel.createVersionReference("BHX", Instant.EPOCH);

    var mockPopulatedChannel2 = Mockito.mock(Channel.class);

    Mockito.when(mockPopulatedChannel2.getChannelBandType()).thenReturn(ChannelBandType.BROADBAND);
    Mockito.when(mockPopulatedChannel2.getChannelInstrumentType())
        .thenReturn(ChannelInstrumentType.HIGH_GAIN_SEISMOMETER);
    Mockito.when(mockPopulatedChannel2.getChannelOrientationCode()).thenReturn('X');
    Mockito.when(mockPopulatedChannel2.getStation()).thenReturn(mockStation);
    Mockito.when(mockPopulatedChannel2.getProcessingMetadata())
        .thenReturn(Map.of(ChannelProcessingMetadataType.CHANNEL_GROUP, "AS1"));

    var stationGroup = StationGroup.createEntityReference("Primary");

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.eq(channelVersion1),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(mockPopulatedChannel1);

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.eq(channelVersion2),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(mockPopulatedChannel2);

    var result =
        signalEnhancementConfigurationService.getProcessingMaskDefinitions(
            ProcessingMaskDefinitionRequest.create(
                stationGroup,
                Set.of("AMPLITUDE_MEASUREMENT_BEAM", "FK_SPECTRA"),
                Set.of(channelVersion1, channelVersion2),
                Set.of("P", "S")));

    assertNotNull(result);

    var channelMap =
        Map.of(
            channelVersion1, mockPopulatedChannel1,
            channelVersion2, mockPopulatedChannel2);

    // Keep track of how many definitions weve verified.
    AtomicInteger pmdCountRef = new AtomicInteger();

    result
        .getProcessingMaskDefinitionByPhaseByChannel()
        .forEach(
            item -> {
              var channel = channelMap.get(item.getChannel());
              item.getProcessingMaskDefinitionByPhase()
                  .forEach(
                      (phase, pmdList) ->
                          pmdList.forEach(
                              actual -> {
                                // Use the assumed-to-be-tested configuration utility as the
                                // source of truth and compare against it.
                                var expected =
                                    signalEnhancementFilterConfiguration
                                        .getProcessingMaskDefinition(
                                            actual.getProcessingOperation(),
                                            stationGroup,
                                            channel,
                                            phase);
                                assertEquals(expected, actual);
                                pmdCountRef.incrementAndGet();
                              }));
            });

    // Since we had 2 ProcessingOperations, 2 channels, and 2 phases, there
    // should be 2x2x2=8 definitions.
    assertEquals(8, pmdCountRef.get());
  }

  @Test
  void testBeamformingTemplate() {
    var mockedSignalEnhancementConfig = Mockito.mock(SignalEnhancementConfiguration.class);
    var station1 = Station.createEntityReference("one");
    var station2 = Station.createEntityReference("two");
    var phaseType = PhaseType.I;
    var beamType = BeamType.CONTINUOUS_LOCATION;

    var serviceWithMock =
        new SignalEnhancementConfigurationService(
            mockedSignalEnhancementConfig,
            stationDefinitionFacetingUtility,
            waveformAccessor,
            stationDefinitionAccessor,
            signalDetectionAccessor);

    BeamformingTemplatesRequest beamformingRequest =
        BeamformingTemplatesRequest.builder()
            .setBeamType(beamType)
            .setPhases(List.of(phaseType))
            .setStations(List.of(station1, station2))
            .build();
    Mockito.when(
            mockedSignalEnhancementConfig.getBeamformingTemplate(station1, phaseType, beamType))
        .thenReturn(Optional.of(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE));
    Mockito.when(
            mockedSignalEnhancementConfig.getBeamformingTemplate(station2, phaseType, beamType))
        .thenReturn(Optional.of(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE));

    List<BeamformingTemplate> results = serviceWithMock.getBeamformingTemplates(beamformingRequest);
    assertEquals(2, results.size());
    assertEquals(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE, results.get(0));
  }

  @Test
  void testOptionalReturnBeamformingTemplate() {
    var mockedSignalEnhancement = Mockito.mock(SignalEnhancementConfiguration.class);
    var station1 = Station.createEntityReference("one");
    var station2 = Station.createEntityReference("two");
    var phaseType = PhaseType.I;
    var beamType = BeamType.CONTINUOUS_LOCATION;
    var serviceWithMock =
        new SignalEnhancementConfigurationService(
            mockedSignalEnhancement,
            stationDefinitionFacetingUtility,
            signalDetectionFacetingUtility);
    BeamformingTemplatesRequest beamformingRequest =
        BeamformingTemplatesRequest.builder()
            .setBeamType(beamType)
            .setPhases(List.of(phaseType))
            .setStations(List.of(station1, station2))
            .build();
    Mockito.when(mockedSignalEnhancement.getBeamformingTemplate(station1, phaseType, beamType))
        .thenReturn(Optional.empty());
    Mockito.when(mockedSignalEnhancement.getBeamformingTemplate(station2, phaseType, beamType))
        .thenReturn(Optional.empty());
    Mockito.when(mockedSignalEnhancement.getBeamformingTemplate(station1, phaseType, beamType))
        .thenReturn(Optional.of(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE));
    Mockito.when(mockedSignalEnhancement.getBeamformingTemplate(station2, phaseType, beamType))
        .thenReturn(Optional.of(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE));

    List<BeamformingTemplate> results = serviceWithMock.getBeamformingTemplates(beamformingRequest);
    assertEquals(2, results.size());
    assertEquals(BeamTestFixtures.CONTINUOUS_BEAMFORMING_TEMPLATE, results.get(0));
  }

  @Test
  void testGetFkReviewablePhases() {
    var secConfigMock = Mockito.mock(SignalEnhancementConfiguration.class);
    var station1 = Station.createEntityReference("one");
    var station2 = Station.createEntityReference("two");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var serviceWithMock =
        new SignalEnhancementConfigurationService(
            secConfigMock, stationDefinitionFacetingUtility, signalDetectionFacetingUtility);

    var request = new FkReviewablePhasesRequest(List.of(station1, station2), activity);
    var phases1 = Set.of(PhaseType.P);
    var phases2 = Set.of(PhaseType.P, PhaseType.S);
    Mockito.when(secConfigMock.getFkReviewablePhases(station1.getName(), activity))
        .thenReturn(Optional.of(phases1));
    Mockito.when(secConfigMock.getFkReviewablePhases(station2.getName(), activity))
        .thenReturn(Optional.of(phases2));

    var expected = Map.of(station1, phases1, station2, phases2);
    var results = serviceWithMock.getFkReviewablePhases(request);

    assertEquals(expected, results);
  }

  @Test
  void testGetFkReviewablePhasesIgnoreDuplicateStations() {
    var secConfigMock = Mockito.mock(SignalEnhancementConfiguration.class);
    var station1 = Station.createEntityReference("one");
    var station2 = Station.createEntityReference("two");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var serviceWithMock =
        new SignalEnhancementConfigurationService(
            secConfigMock, stationDefinitionFacetingUtility, signalDetectionFacetingUtility);

    var request = new FkReviewablePhasesRequest(List.of(station1, station2, station1), activity);
    var phases1 = Set.of(PhaseType.P);
    var phases2 = Set.of(PhaseType.P, PhaseType.S);
    Mockito.when(secConfigMock.getFkReviewablePhases(station1.getName(), activity))
        .thenReturn(Optional.of(phases1));
    Mockito.when(secConfigMock.getFkReviewablePhases(station2.getName(), activity))
        .thenReturn(Optional.of(phases2));

    var expected = Map.of(station1, phases1, station2, phases2);
    var results = serviceWithMock.getFkReviewablePhases(request);

    assertEquals(expected, results);
  }

  @Test
  void testGetFkReviewablePhasesPartialResult() {
    var secConfigMock = Mockito.mock(SignalEnhancementConfiguration.class);
    var station1 = Station.createEntityReference("one");
    var station2 = Station.createEntityReference("two");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var serviceWithMock =
        new SignalEnhancementConfigurationService(
            secConfigMock, stationDefinitionFacetingUtility, signalDetectionFacetingUtility);

    var request = new FkReviewablePhasesRequest(List.of(station1, station2), activity);
    var phases2 = Set.of(PhaseType.P, PhaseType.S);
    Mockito.when(secConfigMock.getFkReviewablePhases(station1.getName(), activity))
        .thenReturn(Optional.empty());
    Mockito.when(secConfigMock.getFkReviewablePhases(station2.getName(), activity))
        .thenReturn(Optional.of(phases2));

    var expected = Map.of(station2, phases2);
    var results = serviceWithMock.getFkReviewablePhases(request);

    assertEquals(expected, results);
  }

  @ParameterizedTest
  @MethodSource("badRequestTestSource")
  void testGetProcessingMaskDefinitionsBadRequest(Throwable populateChannelThrowable) {

    var mockStation = Mockito.mock(Station.class);
    Mockito.when(mockStation.getName()).thenReturn("MyStation");

    var channelVersion1 = Channel.createVersionReference("BHX", Instant.EPOCH);

    var mockPopulatedChannel1 = Mockito.mock(Channel.class);

    Mockito.when(mockPopulatedChannel1.getChannelBandType()).thenReturn(ChannelBandType.BROADBAND);
    Mockito.when(mockPopulatedChannel1.getChannelInstrumentType())
        .thenReturn(ChannelInstrumentType.HIGH_GAIN_SEISMOMETER);
    Mockito.when(mockPopulatedChannel1.getChannelOrientationCode()).thenReturn('Z');
    Mockito.when(mockPopulatedChannel1.getStation()).thenReturn(mockStation);
    Mockito.when(mockPopulatedChannel1.getProcessingMetadata())
        .thenReturn(Map.of(ChannelProcessingMetadataType.CHANNEL_GROUP, "AS1"));

    var channelVersion2 = Channel.createVersionReference("BHZ", Instant.EPOCH);

    var stationGroup = StationGroup.createEntityReference("Primary");

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.eq(channelVersion1),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(mockPopulatedChannel1);

    if (Objects.isNull(populateChannelThrowable)) {
      Mockito.when(
              stationDefinitionFacetingUtility.populateFacets(
                  Mockito.eq(channelVersion2),
                  Mockito.any(FacetingDefinition.class),
                  Mockito.any(Instant.class)))
          .thenReturn(null);
    } else {
      Mockito.when(
              stationDefinitionFacetingUtility.populateFacets(
                  Mockito.eq(channelVersion2),
                  Mockito.any(FacetingDefinition.class),
                  Mockito.any(Instant.class)))
          .thenThrow(populateChannelThrowable);
    }

    var processingOperationSet = Set.of("AMPLITUDE_MEASUREMENT_BEAM", "FK_SPECTRA");
    var channelVersionSet = Set.of(channelVersion1, channelVersion2);
    var phaseLabelSet = Set.of("P", "S");
    var request =
        ProcessingMaskDefinitionRequest.create(
            stationGroup, processingOperationSet, channelVersionSet, phaseLabelSet);

    var result = signalEnhancementConfigurationService.getProcessingMaskDefinitions(request);

    var phaseMap =
        result.getProcessingMaskDefinitionByPhaseByChannel().stream()
            .filter(item -> item.getChannel().equals(channelVersion2))
            .collect(Collectors.toList());

    assertTrue(phaseMap.get(0).getProcessingMaskDefinitionByPhase().isEmpty());
  }

  static Stream<Arguments> inputFilterDefinitionUsageForChannel() {
    return Stream.of(
        arguments(
            "ASAR",
            "AS31",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.NORTH_SOUTH,
            -23.665,
            133.905,
            PhaseType.P,
            List.of(),
            -23.665,
            134.905,
            List.of(
                Pair.of(
                    FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
        arguments(
            "ASAR",
            "AS01",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -23.665,
            133.905,
            PhaseType.P,
            List.of(),
            -23.665,
            134.905,
            List.of(
                Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_1_0_3_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_4_0_8_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.S,
            List.of(),
            -76.517,
            161.853,
            List.of(
                Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.P,
            List.of(),
            -75.517,
            161.853,
            List.of(
                Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.P,
            List.of(),
            -70.517,
            161.853,
            List.of(
                Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
        arguments(
            WILD_CARD,
            WILD_CARD,
            ChannelBandType.UNKNOWN,
            ChannelInstrumentType.UNKNOWN,
            ChannelOrientationType.UNKNOWN,
            -77.517,
            161.853,
            PhaseType.UNKNOWN,
            List.of(),
            -70.517,
            161.853,
            List.of(
                Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL),
                Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))));
  }

  static Stream<Arguments> badRequestTestSource() {

    return Stream.of(arguments((Throwable) null), arguments(new IllegalStateException("")));
  }

  private FilterDefinitionByUsageBySignalDetectionHypothesis getSigDetFilterMap(
      SignalDetectionHypothesis signalDetectionHypothesis,
      List<Pair<FilterDefinitionUsage, FilterName>> filterDefintionByFilterDefinitionUsuagePairs) {
    FilterDefinitionByFilterDefinitionUsage filterDefinitionByFilterDefinitionUsage =
        FilterDefinitionByFilterDefinitionUsage.from(
            filterDefintionByFilterDefinitionUsuagePairs.stream()
                .map(
                    pair ->
                        Pair.of(
                            pair.getLeft(), filterDefinitionMap.get(pair.getRight().toString())))
                .collect(Collectors.toMap(pair -> pair.getLeft(), pair -> pair.getRight())));

    return FilterDefinitionByUsageBySignalDetectionHypothesis.from(
        List.of(
            SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.builder()
                .setSignalDetectionHypothesis(signalDetectionHypothesis)
                .setFilterDefinitionByFilterDefinitionUsage(filterDefinitionByFilterDefinitionUsage)
                .build()));
  }

  private FilterDefinitionByUsageByChannelSegment getChanSegFilterMap(
      List<ChannelSegment<Waveform>> chanSegs,
      List<Pair<FilterDefinitionUsage, FilterName>> filterDefintionByFilterDefinitionUsuagePairs) {
    FilterDefinitionByFilterDefinitionUsage filterDefinitionByFilterDefinitionUsage =
        FilterDefinitionByFilterDefinitionUsage.from(
            filterDefintionByFilterDefinitionUsuagePairs.stream()
                .map(
                    pair ->
                        Pair.of(
                            pair.getLeft(), filterDefinitionMap.get(pair.getRight().toString())))
                .collect(Collectors.toMap(pair -> pair.getLeft(), pair -> pair.getRight())));

    List<ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair> pairs =
        chanSegs.stream()
            .map(
                chanSeg ->
                    ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.builder()
                        .setChannelSegment(chanSeg)
                        .setFilterDefinitionByFilterDefinitionUsage(
                            filterDefinitionByFilterDefinitionUsage)
                        .build())
            .collect(Collectors.toList());

    return FilterDefinitionByUsageByChannelSegment.from(pairs);
  }

  private List<Pair<FilterDefinitionUsage, FilterName>> getDefaultNonCausalFilterDefinitionPairs() {
    return List.of(
        Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
        Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
        Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL),
        Pair.of(FilterDefinitionUsage.MEASURE, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL));
  }
}
