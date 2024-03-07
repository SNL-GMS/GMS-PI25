package gms.shared.signalenhancementconfiguration.config;

import static com.google.common.base.Preconditions.checkNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamTestFixtures;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
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
import gms.shared.signalenhancementconfiguration.manager.SignalEnhancementConfigurationManager;
import gms.shared.signalenhancementconfiguration.service.ProcessingMaskDefinitionConfiguration;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfiguration;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfigurationService;
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
import java.util.Map.Entry;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.Assertions;
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
import org.springframework.http.HttpStatus;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockitoExtension.class)
class SignalEnhancementConfigurationManagerTest {

  private static final String WILD_CARD = "*";
  private ConfigurationConsumerUtility configurationConsumerUtility;
  private static final int HTTP_200_OK_RESPONSE_CODE = 200;
  private static final int CUSTOM_PARTIAL_RESPONSE_CODE = 209;

  SignalEnhancementConfigurationManager signalEnhancementConfigurationManager;
  SignalEnhancementConfiguration signalEnhancementFilterConfiguration;
  ConfigurationTestUtility testUtility;
  SignalEnhancementConfigurationService signalEnhancementConfigurationService;
  Map<String, FilterDefinition> filterDefinitionMap;
  ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;

  @Mock StationDefinitionFacetingUtility stationDefinitionFacetingUtility;

  @Mock SignalDetectionFacetingUtility signalDetectionFacetingUtility;

  @Mock StationDefinitionAccessor stationDefinitionAccessor;

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
    signalEnhancementFilterConfiguration.signalEnhancementBeamformingConfig =
        "global.beamforming-configuration";

    testUtility = new ConfigurationTestUtility(configurationConsumerUtility);
    signalEnhancementConfigurationService =
        new SignalEnhancementConfigurationService(
            signalEnhancementFilterConfiguration,
            stationDefinitionFacetingUtility,
            signalDetectionFacetingUtility);
    filterDefinitionMap = testUtility.filterDefinitionMap();

    signalEnhancementConfigurationManager =
        new SignalEnhancementConfigurationManager(signalEnhancementConfigurationService);
  }

  @Test
  void testGetBeamformingTemplate() {
    Station s = BeamTestFixtures.TXAR_STATION;
    PhaseType pt = BeamTestFixtures.TXAR_BEAMFORMING_TEMPLATE.getBeamDescription().getPhase();
    BeamType bt = BeamTestFixtures.TXAR_BEAMFORMING_TEMPLATE.getBeamDescription().getBeamType();
    var request =
        BeamformingTemplatesRequest.builder()
            .setStations(List.of(s))
            .setBeamType(bt)
            .setPhases(List.of(pt))
            .build();
    var result =
        signalEnhancementConfigurationManager
            .getBeamformingTemplates(request)
            .getBody()
            .get(s.getName())
            .get(pt.toString());
    Assertions.assertEquals(BeamTestFixtures.TXAR_BEAMFORMING_TEMPLATE, result);
  }

  @Test
  void testGetFkReviewablePhases() {
    var asarStation = Station.createEntityReference("ASAR");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var secServiceMock = Mockito.mock(SignalEnhancementConfigurationService.class);

    var request = new FkReviewablePhasesRequest(List.of(asarStation), activity);
    var reviewablePhasesMap = Map.of(asarStation, Set.of(PhaseType.P));
    Mockito.when(secServiceMock.getFkReviewablePhases(request)).thenReturn(reviewablePhasesMap);

    var result =
        new SignalEnhancementConfigurationManager(secServiceMock).getFkReviewablePhases(request);
    var expectedBody =
        reviewablePhasesMap.entrySet().stream()
            .collect(Collectors.toMap(entry -> entry.getKey().getName(), Entry::getValue));

    assertEquals(HTTP_200_OK_RESPONSE_CODE, result.getStatusCode().value());
    assertEquals(expectedBody, result.getBody());
  }

  @Test
  void testGetFkReviewablePhasesPartialResponse() {
    var asarStation = Station.createEntityReference("ASAR");
    var pdarStation = Station.createEntityReference("PDAR");
    var txarStation = Station.createEntityReference("TXAR");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var secServiceMock = Mockito.mock(SignalEnhancementConfigurationService.class);

    var request =
        new FkReviewablePhasesRequest(List.of(asarStation, pdarStation, txarStation), activity);
    var partialReviewablePhasesMap =
        Map.of(asarStation, Set.of(PhaseType.P), txarStation, Set.of(PhaseType.P, PhaseType.S));
    Mockito.when(secServiceMock.getFkReviewablePhases(request))
        .thenReturn(partialReviewablePhasesMap);

    var result =
        new SignalEnhancementConfigurationManager(secServiceMock).getFkReviewablePhases(request);
    var expectedBody =
        partialReviewablePhasesMap.entrySet().stream()
            .collect(Collectors.toMap(entry -> entry.getKey().getName(), Entry::getValue));

    assertEquals(CUSTOM_PARTIAL_RESPONSE_CODE, result.getStatusCode().value());
    assertEquals(expectedBody, result.getBody());
  }

  @Test
  void testGetFkReviewablePhasesRequestDuplicates200OK() {
    var asarStation = Station.createEntityReference("ASAR");
    var pdarStation = Station.createEntityReference("PDAR");
    var activity = WorkflowDefinitionId.from("Some Activity");
    var secServiceMock = Mockito.mock(SignalEnhancementConfigurationService.class);

    var requestWithDupes =
        new FkReviewablePhasesRequest(List.of(asarStation, pdarStation, asarStation), activity);
    var partialReviewablePhasesMap =
        Map.of(asarStation, Set.of(PhaseType.P), pdarStation, Set.of(PhaseType.P, PhaseType.S));
    Mockito.when(secServiceMock.getFkReviewablePhases(requestWithDupes))
        .thenReturn(partialReviewablePhasesMap);

    var result =
        new SignalEnhancementConfigurationManager(secServiceMock)
            .getFkReviewablePhases(requestWithDupes);
    var expectedBody =
        partialReviewablePhasesMap.entrySet().stream()
            .collect(Collectors.toMap(entry -> entry.getKey().getName(), Entry::getValue));

    assertEquals(HTTP_200_OK_RESPONSE_CODE, result.getStatusCode().value());
    assertEquals(expectedBody, result.getBody());
  }

  @Test
  void testResolveFilterListDefinition() {
    FilterListDefinition filterListDefinition =
        signalEnhancementConfigurationManager.getFilterListsDefinition();

    List<FilterList> actualFilterList =
        filterListDefinition.getFilterLists().stream().collect(Collectors.toUnmodifiableList());

    List<FilterList> expectedFilterList =
        testUtility.filterListMap().values().stream().collect(Collectors.toUnmodifiableList());

    Assertions.assertEquals(expectedFilterList, actualFilterList);
  }

  @Test
  void testGetProcessingMaskDefinitionsGoodChannel() {

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

    var stationGroup = StationGroup.createEntityReference("Primary");

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.eq(channelVersion1),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(mockPopulatedChannel1);

    var responseEntity =
        signalEnhancementConfigurationManager.getProcessingMaskDefinitions(
            ProcessingMaskDefinitionRequest.create(
                stationGroup,
                Set.of("AMPLITUDE_MEASUREMENT_BEAM"),
                Set.of(channelVersion1),
                Set.of("P", "S")));

    Assertions.assertEquals(200, responseEntity.getStatusCode().value());

    var result = responseEntity.getBody();

    Assertions.assertNotNull(result);
    Assertions.assertEquals(1, result.getProcessingMaskDefinitionByPhaseByChannel().size());

    result
        .getProcessingMaskDefinitionByPhaseByChannel()
        .get(0)
        .getProcessingMaskDefinitionByPhase()
        .forEach(
            (phase, pmdList) ->
                pmdList.forEach(
                    actual -> {
                      // Use the assumed-to-be-tested configuration utility as the
                      // source of truth and compare against it.
                      var expected =
                          signalEnhancementFilterConfiguration.getProcessingMaskDefinition(
                              actual.getProcessingOperation(),
                              stationGroup,
                              mockPopulatedChannel1,
                              phase);
                      Assertions.assertEquals(expected, actual);
                    }));
  }

  @Test
  void testGetProcessingMaskDefinitionsCustomResponseCode() {

    var channelVersion1 = Channel.createVersionReference("BHZ", Instant.EPOCH);

    var stationGroup = StationGroup.createEntityReference("Primary");

    var invalidPhaseResponseEntity =
        signalEnhancementConfigurationManager.getProcessingMaskDefinitions(
            ProcessingMaskDefinitionRequest.create(
                stationGroup,
                Set.of("AMPLITUDE_MEASUREMENT_BEAM"),
                Set.of(channelVersion1),
                Set.of("P", "JK")));

    Assertions.assertEquals(209, invalidPhaseResponseEntity.getStatusCode().value());

    var invalidOperationResponseEntity =
        signalEnhancementConfigurationManager.getProcessingMaskDefinitions(
            ProcessingMaskDefinitionRequest.create(
                stationGroup, Set.of("NOPE"), Set.of(channelVersion1), Set.of("P")));

    Assertions.assertEquals(209, invalidOperationResponseEntity.getStatusCode().value());
  }

  @Test
  void testGetProcessingMaskDefinitionsBadChannel() {

    var channelVersion1 = Channel.createVersionReference("BHZ", Instant.EPOCH);

    var stationGroup = StationGroup.createEntityReference("Primary");

    Mockito.when(
            stationDefinitionFacetingUtility.populateFacets(
                Mockito.eq(channelVersion1),
                Mockito.any(FacetingDefinition.class),
                Mockito.any(Instant.class)))
        .thenReturn(null);

    var responseEntity =
        signalEnhancementConfigurationManager.getProcessingMaskDefinitions(
            ProcessingMaskDefinitionRequest.create(
                stationGroup,
                Set.of("AMPLITUDE_MEASUREMENT_BEAM"),
                Set.of(channelVersion1),
                Set.of("P", "S")));

    Assertions.assertEquals(209, responseEntity.getStatusCode().value());

    var result = responseEntity.getBody();

    Assertions.assertNotNull(result);
    Assertions.assertEquals(1, result.getProcessingMaskDefinitionByPhaseByChannel().size());

    Assertions.assertTrue(
        result
            .getProcessingMaskDefinitionByPhaseByChannel()
            .get(0)
            .getProcessingMaskDefinitionByPhase()
            .isEmpty());
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
        signalEnhancementConfigurationManager.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);

    Assertions.assertEquals(CUSTOM_PARTIAL_RESPONSE_CODE, actual.getStatusCode().value());

    assertTrue(actual.hasBody());

    var responseBody = actual.getBody();
    if (responseBody != null) {
      var filterDefinitionByUsageByChannelSegment =
          responseBody.getFilterDefinitionByUsageByChannelSegment();
      assertTrue(filterDefinitionByUsageByChannelSegment.isEmpty());
    }
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
        signalEnhancementConfigurationManager
            .getByDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(request);

    Assertions.assertEquals(CUSTOM_PARTIAL_RESPONSE_CODE, actual.getStatusCode().value());

    assertTrue(actual.hasBody());

    var responseBody = actual.getBody();
    if (responseBody != null) {
      var filterDefinitionByUsageByChannelSegment =
          responseBody.getFilterDefinitionByUsageBySignalDetectionHypothesis();
      assertTrue(filterDefinitionByUsageByChannelSegment.isEmpty());
    }
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
        signalEnhancementConfigurationManager
            .getByDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(request);

    Assertions.assertEquals(CUSTOM_PARTIAL_RESPONSE_CODE, actual.getStatusCode().value());

    assertTrue(actual.hasBody());

    var responseBody = actual.getBody();
    if (responseBody != null) {
      var filterDefinitionByUsageByChannelSegment =
          responseBody.getFilterDefinitionByUsageBySignalDetectionHypothesis();
      assertTrue(filterDefinitionByUsageByChannelSegment.isEmpty());
    }
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
    // TODO verify whether maskedBy is needed.  currently set for parameterized tests
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
        signalEnhancementConfigurationManager
            .getByDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(request);
    var expected = getSigDetFilterMap(sdh.toEntityReference(), expectedFilterDefinitionsPairs);

    Assertions.assertEquals(expected, actual.getBody());
    Assertions.assertEquals(HttpStatus.OK.value(), actual.getStatusCode().value());
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
            maskedBy);
    var eventHypothesis =
        ConfigurationTestUtility.buildEventHypothesis(
            Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request =
        FilterDefinitionByUsageForChannelSegmentsRequest.builder()
            .setChannelSegments(List.of(cs))
            .setEventHypothesis(eventHypothesis)
            .build();
    var actual =
        signalEnhancementConfigurationManager.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);
    var expected = getChanSegFilterMap(cs, expectedFilterDefinitionsPairs);

    Assertions.assertEquals(expected, actual.getBody());
    Assertions.assertEquals(HttpStatus.OK.value(), actual.getStatusCode().value());
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
            "AS31",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -23.665,
            133.905,
            PhaseType.P,
            List.of(),
            -23.665,
            134.905,
            List.of(
                Pair.of(
                    FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL),
                Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL),
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
      ChannelSegment<Waveform> chanSeg,
      List<Pair<FilterDefinitionUsage, FilterName>> filterDefintionByFilterDefinitionUsuagePairs) {
    FilterDefinitionByFilterDefinitionUsage filterDefinitionByFilterDefinitionUsage =
        FilterDefinitionByFilterDefinitionUsage.from(
            filterDefintionByFilterDefinitionUsuagePairs.stream()
                .map(
                    pair ->
                        Pair.of(
                            pair.getLeft(), filterDefinitionMap.get(pair.getRight().toString())))
                .collect(Collectors.toMap(pair -> pair.getLeft(), pair -> pair.getRight())));
    return FilterDefinitionByUsageByChannelSegment.from(
        List.of(
            ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.builder()
                .setChannelSegment(chanSeg)
                .setFilterDefinitionByFilterDefinitionUsage(filterDefinitionByFilterDefinitionUsage)
                .build()));
  }
}
