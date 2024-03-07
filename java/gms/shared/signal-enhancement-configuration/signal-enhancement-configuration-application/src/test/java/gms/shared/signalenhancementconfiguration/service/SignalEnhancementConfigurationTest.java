package gms.shared.signalenhancementconfiguration.service;

import static com.google.common.base.Preconditions.checkNotNull;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.event.coi.EventTestFixtures;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterList;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.utils.CascadeFilterName;
import gms.shared.signalenhancementconfiguration.utils.ConfigurationTestUtility;
import gms.shared.signalenhancementconfiguration.utils.FilterDescriptionName;
import gms.shared.signalenhancementconfiguration.utils.FilterListName;
import gms.shared.signalenhancementconfiguration.utils.FilterName;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelBandType;
import gms.shared.stationdefinition.coi.channel.ChannelInstrumentType;
import gms.shared.stationdefinition.coi.channel.ChannelOrientationType;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategoryAndType;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.io.File;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
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
import org.mockito.junit.jupiter.MockitoExtension;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockitoExtension.class)
class SignalEnhancementConfigurationTest {

  private static final String STATION_NAME_SELECTOR = "station";
  private static final String CHANNEL_GROUP_NAME_SELECTOR = "channelGroup";
  private static final String CHANNEL_BAND_NAME_SELECTOR = "channelBand";
  private static final String CHANNEL_INSTRUMENT_NAME_SELECTOR = "channelInstrument";
  private static final String CHANNEL_ORIENTATION_NAME_SELECTOR = "channelOrientation";
  private static final String PHASE_NAME_SELECTOR = "phase";
  private static final String DISTANCE_NAME_SELECTOR = "distance";
  private static final Location PROCESSING_MASK_LOCATION =
      Location.from(35.0, -125.0, 100.0, 5500.0);

  private static final String WILD_CARD = "*";

  private ConfigurationConsumerUtility configurationConsumerUtility;

  private ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;

  @Mock private StationDefinitionAccessor stationDefinitionAccessor;

  SignalEnhancementConfiguration signalEnhancementFilterConfiguration;
  ConfigurationTestUtility testUtility;

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
    signalEnhancementFilterConfiguration.fkReviewablePhasesConfig = "global.fk-reviewable-phases";
    processingMaskDefinitionConfiguration.processingMaskDefinitionConfig =
        "global.processing-mask-definition";
    testUtility = new ConfigurationTestUtility(configurationConsumerUtility);
  }

  @Test
  void testResolveFilterDefinition() {
    List<FilterDefinition> filterDefinitionList = testUtility.filterDefinitionList();

    List<LinearFilterDescription> actualFilterDescriptions =
        filterDefinitionList.stream()
            .map(t -> (LinearFilterDescription) t.getFilterDescription())
            .collect(Collectors.toList());
    actualFilterDescriptions.sort(
        Comparator.comparing(
            LinearFilterDescription::getComments, Comparator.comparing(Optional::get)));

    List<LinearFilterDescription> expectedFilterDescriptions =
        testUtility.filterDescriptionList(FilterDescriptionName.values());
    expectedFilterDescriptions.sort(
        Comparator.comparing(
            LinearFilterDescription::getComments, Comparator.comparing(Optional::get)));

    Assertions.assertEquals(expectedFilterDescriptions, actualFilterDescriptions);
  }

  @Test
  void testResolveCascadeFilter() {
    Map<String, FilterDefinition> cascadeFilterDefinitionMap = testUtility.cascadeFilterMap();

    ImmutableList<FilterDescription> actualCascadedFilterDescriptions =
        ((CascadeFilterDescription)
                cascadeFilterDefinitionMap
                    .get(CascadeFilterName.CASCADE_FILTER_2.getFilterName())
                    .getFilterDescription())
            .getFilterDescriptions();

    List<LinearFilterDescription> expectedCascadedFilterDescriptions =
        testUtility.filterDescriptionList(
            FilterDescriptionName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL_DESCRIPTION,
            FilterDescriptionName.BW_IIR_BP_1_4_1_6_3_HZ_CAUSAL_DESCRIPTION);

    Assertions.assertEquals(expectedCascadedFilterDescriptions, actualCascadedFilterDescriptions);
  }

  @Test
  void testResolveFilterList() {
    Map<String, FilterList> filterListMap = testUtility.filterListMap();

    List<FilterDefinition> actualCascadedFilter =
        filterListMap.get(FilterListName.SEISMIC.getFilterName()).getFilters().stream()
            .filter(t -> t.getFilterDefinition().isPresent())
            .map(f -> f.getFilterDefinition().get())
            .filter(r -> r.getName().contains("Cascade"))
            .collect(Collectors.toUnmodifiableList());

    List<FilterDefinition> expectedCascadedFilter =
        testUtility.cascadeFilterMap().values().stream().collect(Collectors.toUnmodifiableList());

    Assertions.assertEquals(expectedCascadedFilter, actualCascadedFilter);
  }

  @Test
  void testResolveFilterListDefinition() {
    FilterListDefinition filterListDefinition =
        signalEnhancementFilterConfiguration.filterListDefinition();

    List<FilterList> actualFilterList =
        filterListDefinition.getFilterLists().stream().collect(Collectors.toUnmodifiableList());

    List<FilterList> expectedFilterList =
        testUtility.filterListMap().values().stream().collect(Collectors.toUnmodifiableList());

    Assertions.assertEquals(expectedFilterList, actualFilterList);
  }

  @ParameterizedTest
  @MethodSource("metadataInputs")
  void testMetadataInput(
      String station,
      String channelGroup,
      String channelBand,
      String channelInstrument,
      String channelOrientation,
      String phase,
      String distance,
      List<FilterName> expectedDefinitions) {
    Properties properties =
        getCriterionProperties(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            phase,
            distance);

    var actualFilterDefinitions =
        signalEnhancementFilterConfiguration.getFilterDefinitionUsageByFilterDefinitionMap(
            properties);

    var expectedFilterDefinitions = getExpectedMaps(expectedDefinitions);

    Assertions.assertEquals(expectedFilterDefinitions, actualFilterDefinitions);
  }

  static Stream<Arguments> metadataInputs() {
    return Stream.of(
        arguments(
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            List.of(
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            "2.0",
            List.of(
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            "S",
            WILD_CARD,
            List.of(
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            WILD_CARD,
            List.of(
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            WILD_CARD,
            "B",
            "H",
            "Z",
            WILD_CARD,
            WILD_CARD,
            List.of(
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            "AS31",
            "B",
            "H",
            "E",
            WILD_CARD,
            WILD_CARD,
            List.of(
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            WILD_CARD,
            "S",
            "H",
            WILD_CARD,
            WILD_CARD,
            "6.0",
            List.of(
                FilterName.BW_IIR_BP_0_7_2_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_7_2_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            WILD_CARD,
            "S",
            "H",
            WILD_CARD,
            WILD_CARD,
            "3.0",
            List.of(
                FilterName.BW_IIR_BP_4_0_8_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_4_0_8_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            "AS01",
            "S",
            "H",
            "Z",
            "P",
            "50.0",
            List.of(
                FilterName.BW_IIR_BP_1_0_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_7_2_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "LPAZ",
            WILD_CARD,
            "B",
            "H",
            "Z",
            "P",
            "8.0",
            List.of(
                FilterName.BW_IIR_BP_2_0_4_0_4_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "PDAR",
            WILD_CARD,
            "B",
            "H",
            WILD_CARD,
            WILD_CARD,
            "25.0",
            List.of(
                FilterName.BW_IIR_BP_2_0_4_0_4_HZ_CAUSAL,
                FilterName.BW_IIR_BR_4_09_4_39_4_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BR_4_09_4_39_4_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "TXAR",
            WILD_CARD,
            "B",
            WILD_CARD,
            WILD_CARD,
            "P",
            "55.0",
            List.of(
                FilterName.BW_IIR_HP_0_3_0_0_2_HZ_CAUSAL,
                FilterName.BW_IIR_HP_0_3_0_0_2_HZ_CAUSAL,
                FilterName.BW_IIR_HP_0_3_0_0_2_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)));
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputFilterDefinitionUsageForChannel(
      String station,
      String channelGroup,
      ChannelBandType channelBand,
      ChannelInstrumentType channelInstrument,
      ChannelOrientationType channelOrientation,
      double channelLatitude,
      double channelLongitude,
      PhaseType phaseType,
      double eventHypothesisLatitude,
      double eventHypothesisLongitude,
      List<FilterName> expectedFilterDefinitions) {

    Channel channel =
        UtilsTestFixtures.createTestChannelForFilterConfiguration(
            station,
            channelGroup,
            channelBand,
            channelInstrument,
            channelOrientation,
            channelLatitude,
            channelLongitude);

    EventHypothesis eventHypothesis =
        EventTestFixtures.generateDummyEventHypothesisForFilterTest(
            eventHypothesisLatitude, eventHypothesisLongitude);

    var actualFilterDefinitionByFilterDefinitionUsageMap =
        signalEnhancementFilterConfiguration
            .getDefaultFilterDefinitionByUsageForChannel(
                channel, Optional.of(eventHypothesis), Optional.of(phaseType))
            .getFilterDefinitionByFilterDefinitionUsage();

    var expectedFilterDefinitionByFilterDefinitionUsageMap =
        getExpectedMaps(expectedFilterDefinitions);

    Assertions.assertEquals(
        expectedFilterDefinitionByFilterDefinitionUsageMap,
        actualFilterDefinitionByFilterDefinitionUsageMap);
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
            -23.665,
            134.905,
            List.of(
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            "AS31",
            ChannelBandType.BROADBAND,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -23.665,
            133.905,
            PhaseType.P,
            -23.665,
            134.905,
            List.of(
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "ASAR",
            "AS01",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -23.665,
            133.905,
            PhaseType.P,
            -23.665,
            134.905,
            List.of(
                FilterName.BW_IIR_BP_1_0_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL,
                FilterName.BW_IIR_BP_4_0_8_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.S,
            -76.517,
            161.853,
            List.of(
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.P,
            -75.517,
            161.853,
            List.of(
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            "VNDA",
            "VNDA1",
            ChannelBandType.SHORT_PERIOD,
            ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
            ChannelOrientationType.VERTICAL,
            -77.517,
            161.853,
            PhaseType.P,
            -70.517,
            161.853,
            List.of(
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)),
        arguments(
            WILD_CARD,
            WILD_CARD,
            ChannelBandType.UNKNOWN,
            ChannelInstrumentType.UNKNOWN,
            ChannelOrientationType.UNKNOWN,
            -77.517,
            161.853,
            PhaseType.UNKNOWN,
            -70.517,
            161.853,
            List.of(
                FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL,
                FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL)));
  }

  @Test
  void testEmptyChannelProduceIllegalArgumentException() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, this::executeEntityReferenceChannel);

    Assertions.assertEquals("Channel is not populated.", thrown.getMessage());
  }

  private ImmutableMap<FilterDefinitionUsage, FilterDefinition> getExpectedMaps(
      List<FilterName> filterNames) {
    var filterDefinitions = getExpectedFilterDefinitions(filterNames);

    return ImmutableMap.copyOf(
        IntStream.range(0, 4)
            .boxed()
            .collect(
                Collectors.toMap(
                    i -> FilterDefinitionUsage.values()[((int) i)],
                    i -> filterDefinitions.get((int) i))));
  }

  private List<FilterDefinition> getExpectedFilterDefinitions(List<FilterName> filterNames) {
    return filterNames.stream()
        .map(t -> getFilterDefinition(t.getFilter()))
        .collect(Collectors.toList());
  }

  private Properties getCriterionProperties(
      String station,
      String channelGroup,
      String channelBand,
      String channelInstrument,
      String channelOrientation,
      String phase,
      String distance) {
    Properties properties = new Properties();

    properties.setProperty(STATION_NAME_SELECTOR, station);
    properties.setProperty(CHANNEL_GROUP_NAME_SELECTOR, channelGroup);
    properties.setProperty(CHANNEL_BAND_NAME_SELECTOR, channelBand);
    properties.setProperty(CHANNEL_INSTRUMENT_NAME_SELECTOR, channelInstrument);
    properties.setProperty(CHANNEL_ORIENTATION_NAME_SELECTOR, channelOrientation);
    properties.setProperty(PHASE_NAME_SELECTOR, phase);
    properties.setProperty(DISTANCE_NAME_SELECTOR, distance);

    return properties;
  }

  private FilterDefinition getFilterDefinition(String filterName) {
    List<FilterDefinition> filterDefinitionList = testUtility.filterDefinitionList();

    return filterDefinitionList.stream()
        .filter(f -> f.getName().equals(filterName))
        .collect(Collectors.toUnmodifiableList())
        .get(0);
  }

  private void executeEntityReferenceChannel() {
    signalEnhancementFilterConfiguration.getDefaultFilterDefinitionByUsageForChannel(
        CHANNEL.toEntityReference(), Optional.empty(), Optional.empty());
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

  @Test
  void testResolveFkReviewablePhases() {
    var phasesOpt =
        assertDoesNotThrow(
            () ->
                signalEnhancementFilterConfiguration.getFkReviewablePhases(
                    "ASAR", WorkflowDefinitionId.from("AL1 Event Review")));

    assertTrue(phasesOpt.isPresent());

    final int EXPECTED_PHASES_COUNT = 6;
    phasesOpt.ifPresentOrElse(
        phases -> assertEquals(EXPECTED_PHASES_COUNT, phases.size()),
        () -> fail("Phases not present"));
  }

  @Test
  void testResolveFkReviewablePhasesBadConfig() {
    var phasesOpt =
        assertDoesNotThrow(
            () ->
                signalEnhancementFilterConfiguration.getFkReviewablePhases(
                    "ASAR", WorkflowDefinitionId.from("BAD")));

    assertFalse(phasesOpt.isPresent());
  }

  @Test
  void testResolveFkReviewablePhasesNoConfig() {
    var phasesOpt =
        assertDoesNotThrow(
            () ->
                signalEnhancementFilterConfiguration.getFkReviewablePhases(
                    "NOPE", WorkflowDefinitionId.from("AL1 Event Review")));

    assertFalse(phasesOpt.isPresent());
  }
}
