package gms.shared.stationdefinition.coi.channel;

import static gms.shared.fk.testfixtures.FkTestFixtures.DEFINITION;
import static gms.shared.stationdefinition.coi.filter.utils.FilterFixtures.HAM_FIR_BP_0_40_3_50_HZ;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.STATION;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.STATION_2;
import static gms.shared.waveform.testfixture.ProcessingMaskTestFixtures.PROC_MASK_DEF_ANALYST;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import gms.shared.fk.coi.FkSpectraDefinition;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.utils.FilterFixtures;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.FieldMapUtilities;
import gms.shared.stationdefinition.coi.utils.Units;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ChannelFactoryTest {

  @ParameterizedTest
  @MethodSource("getCreateFkChannelValidationArguments")
  void testCreateFkChannelValidation(
      Class<? extends Exception> expectedException,
      String expectedMessage,
      Station station,
      List<Channel> inputChannels,
      FkSpectraDefinition fkSpectraDefinition) {

    Exception ex =
        assertThrows(
            expectedException,
            () -> ChannelFactory.createFkChannel(station, inputChannels, fkSpectraDefinition));
    assertEquals(expectedMessage, ex.getMessage());
  }

  static Stream<Arguments> getCreateFkChannelValidationArguments() {
    Channel channel2 =
        CHANNEL.toBuilder()
            .setData(CHANNEL.getData().map(data -> data.toBuilder().setStation(STATION_2).build()))
            .build();

    return Stream.of(
        arguments(
            NullPointerException.class,
            "Cannot create FK Channel from null Station",
            null,
            List.of(CHANNEL),
            DEFINITION),
        arguments(
            NullPointerException.class,
            "Cannot create FK Channel from null input Channels",
            STATION,
            null,
            DEFINITION),
        arguments(
            NullPointerException.class,
            "Cannot create FK Channel from null FkSpectraDefinition",
            STATION,
            List.of(CHANNEL),
            null),
        arguments(
            IllegalArgumentException.class,
            "Cannot create FK Channel from faceted Station",
            STATION.toEntityReference(),
            List.of(CHANNEL),
            DEFINITION),
        arguments(
            IllegalArgumentException.class,
            "Cannot create FK Channel from empty input Channels",
            STATION,
            List.of(),
            DEFINITION),
        arguments(
            IllegalStateException.class,
            "Cannot create FK Channel from faceted input Channels",
            STATION,
            List.of(CHANNEL.toEntityReference()),
            DEFINITION),
        arguments(
            IllegalStateException.class,
            "Cannot create FK Channel from Channels from multiple Stations",
            STATION,
            List.of(CHANNEL, channel2),
            DEFINITION));
  }

  @ParameterizedTest
  @MethodSource("getCreateFkChannelArguments")
  void testCreateFkChannel(
      Channel expectedChannel,
      Station station,
      List<Channel> inputChannels,
      FkSpectraDefinition fkSpectraDefinition) {
    Channel actualChannel =
        assertDoesNotThrow(
            () -> ChannelFactory.createFkChannel(station, inputChannels, fkSpectraDefinition));
    assertEquals(expectedChannel, actualChannel);
  }

  static Stream<Arguments> getCreateFkChannelArguments() {
    Channel verticalInputChannel =
        CHANNEL.toBuilder()
            .setData(CHANNEL.getData().map(data -> data.toBuilder().setStation(STATION).build()))
            .build();

    Channel northInputChannel =
        verticalInputChannel.toBuilder()
            .setData(
                verticalInputChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setChannelOrientationType(ChannelOrientationType.NORTH_SOUTH)
                                .setChannelOrientationCode(
                                    ChannelOrientationType.NORTH_SOUTH.getCode())
                                .build()))
            .build();

    Channel eastInputChannel =
        northInputChannel.toBuilder()
            .setData(
                northInputChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setChannelOrientationType(ChannelOrientationType.EAST_WEST)
                                .setChannelOrientationCode(
                                    ChannelOrientationType.EAST_WEST.getCode())
                                .build()))
            .build();

    Channel unknownInputChannel =
        eastInputChannel.toBuilder()
            .setData(
                eastInputChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setChannelOrientationType(ChannelOrientationType.UNKNOWN)
                                .setChannelOrientationCode(ChannelOrientationType.UNKNOWN.getCode())
                                .build()))
            .build();

    Map<ChannelProcessingMetadataType, Object> fkMetadata =
        new EnumMap<>(CHANNEL.getProcessingMetadata());
    fkMetadata.put(ChannelProcessingMetadataType.CHANNEL_GROUP, "fk");
    Channel expectedVerticalChannel =
        verticalInputChannel.toBuilder()
            .setData(
                verticalInputChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setConfiguredInputs(
                                    List.of(verticalInputChannel.toEntityReference()))
                                .setProcessingMetadata(fkMetadata)
                                .setOrientationAngles(
                                    Orientation.from(Optional.of(Double.NaN), Optional.of(0.0)))
                                .setUnits(Units.NANOMETERS_SQUARED_PER_SECOND)
                                .setLocation(STATION.getLocation())
                                .setNominalSampleRateHz(DEFINITION.getSampleRateHz())
                                .setStation(STATION.toEntityReference())
                                .setResponse(Optional.empty())
                                .build()))
            .setName("STA.fk.BHZ/25d7911d09bc53eae87815c9f8d23acb4169a91d4e8bbd62ccbebe7d6f47957c")
            .build();

    Channel expectedNorthChannel =
        expectedVerticalChannel.toBuilder()
            .setData(
                expectedVerticalChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setConfiguredInputs(List.of(northInputChannel.toEntityReference()))
                                .setChannelOrientationType(ChannelOrientationType.NORTH_SOUTH)
                                .setChannelOrientationCode(
                                    ChannelOrientationType.NORTH_SOUTH.getCode())
                                .setOrientationAngles(
                                    Orientation.from(Optional.of(0.0), Optional.of(90.0)))
                                .build()))
            .setName("STA.fk.BHN/4c03295a4acff0f9706c429b19535249576116f89c845709d6f0afbdfa5f934f")
            .build();

    Channel expectedEastChannel =
        expectedNorthChannel.toBuilder()
            .setData(
                expectedNorthChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setConfiguredInputs(List.of(eastInputChannel.toEntityReference()))
                                .setChannelOrientationType(ChannelOrientationType.EAST_WEST)
                                .setChannelOrientationCode(
                                    ChannelOrientationType.EAST_WEST.getCode())
                                .setOrientationAngles(
                                    Orientation.from(Optional.of(90.0), Optional.of(90.0)))
                                .build()))
            .setName("STA.fk.BHE/7a03271670e7aef0dfda3936a2b87305a70880700a9e707e00fac753d31e4972")
            .build();

    Channel expectedUnknownChannel =
        expectedEastChannel.toBuilder()
            .setData(
                expectedEastChannel
                    .getData()
                    .map(
                        data ->
                            data.toBuilder()
                                .setConfiguredInputs(
                                    List.of(unknownInputChannel.toEntityReference()))
                                .setChannelOrientationType(ChannelOrientationType.UNKNOWN)
                                .setChannelOrientationCode(ChannelOrientationType.UNKNOWN.getCode())
                                .setOrientationAngles(
                                    Orientation.from(
                                        Optional.of(Double.NaN), Optional.of(Double.NaN)))
                                .build()))
            .setName("STA.fk.BH-/16f6d27c8dd7fdbb5968e73332fdf6b14d3e074f1145c81491bb5b0903b875d5")
            .build();

    return Stream.of(
        arguments(expectedVerticalChannel, STATION, List.of(verticalInputChannel), DEFINITION),
        arguments(expectedNorthChannel, STATION, List.of(northInputChannel), DEFINITION),
        arguments(expectedEastChannel, STATION, List.of(eastInputChannel), DEFINITION),
        arguments(expectedUnknownChannel, STATION, List.of(unknownInputChannel), DEFINITION));
  }

  @Test
  void testCreateFilteredPreconditions() {

    Channel noDataChannel = Channel.builder().setName("TestNoDataChannel").build();

    assertThrows(NullPointerException.class, () -> ChannelFactory.createFiltered(null, null));
    assertThrows(
        NullPointerException.class, () -> ChannelFactory.createFiltered(noDataChannel, null));
    assertThrows(
        NullPointerException.class,
        () ->
            ChannelFactory.createFiltered(
                null, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ));
    assertThrows(
        IllegalStateException.class,
        () ->
            ChannelFactory.createFiltered(
                noDataChannel, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ));
  }

  @Test
  void testCreateFilteredLinearFilter() {
    var filteredChannel =
        ChannelFactory.createFiltered(
            CHANNEL, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    compareChannels(
        CHANNEL, filteredChannel, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    var expectedFilterDescription =
        (LinearFilterDescription)
            FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ.getFilterDescription();
    var actualFilterDescription =
        (Map<String, Object>) filteredChannel.getProcessingDefinition().get("filterDescription");

    compareLinearFilters(expectedFilterDescription, actualFilterDescription);
    assertTrue(Channel.isDerivedChannel(filteredChannel), "Expected Derived Channel");
  }

  @Test
  void testCreateFilteredCascadeFilter() {
    var cascadeFilterDefinition =
        FilterDefinition.from(
            HAM_FIR_BP_0_40_3_50_HZ,
            Optional.empty(),
            FilterFixtures.CASCADED_FILTERS_1_DESCRIPTION);

    var filteredChannel = ChannelFactory.createFiltered(CHANNEL, cascadeFilterDefinition);

    compareChannels(CHANNEL, filteredChannel, cascadeFilterDefinition);

    var expectedFilterDescription =
        (CascadeFilterDescription) cascadeFilterDefinition.getFilterDescription();
    var actualFilterDescriptions =
        (Map<String, Object>) filteredChannel.getProcessingDefinition().get("filterDescription");

    assertEquals(
        expectedFilterDescription.getComments().get(),
        actualFilterDescriptions.get("comments"),
        "The description comments should be the same");
    assertEquals(
        expectedFilterDescription.isCausal(),
        actualFilterDescriptions.get("causal"),
        "The description isCasual should be the same");

    var efd1 = (LinearFilterDescription) expectedFilterDescription.getFilterDescriptions().get(0);
    var efd2 = (LinearFilterDescription) expectedFilterDescription.getFilterDescriptions().get(1);
    var afd = (ArrayList<Map<String, Object>>) actualFilterDescriptions.get("filterDescriptions");

    compareLinearFilters(efd1, afd.get(0));
    compareLinearFilters(efd2, afd.get(1));

    assertNull(afd.get(0).get("parameters"), "The subfilter parameters should be null");
    assertNull(afd.get(1).get("parameters"), "The subfilter parameters should be null");

    assertTrue(Channel.isDerivedChannel(filteredChannel), "Expected Derived Channel");
  }

  @Test
  void testCreateFilteredWithFullName() {
    String name = CHANNEL.getName();

    Channel inputChannel =
        CHANNEL.toBuilder()
            .setName(
                name
                    + "/procData,procValue/84feb2330557db419c22b36938ed25315cc7491c89eddb3ddfedc67ce7f88042")
            .build();

    var filteredChannel =
        ChannelFactory.createFiltered(
            inputChannel, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    String actualCanonicalName = filteredChannel.getCanonicalName();
    String actualName = filteredChannel.getName();

    compareChannels(
        inputChannel, filteredChannel, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);
    assertFalse(
        actualName.contains("/84feb2330557db419c22b36938ed25315cc7491c89eddb3ddfedc67ce7f88042"),
        "The old hash should not be in the name");

    assertTrue(Channel.isDerivedChannel(filteredChannel), "Expected Derived Channel");
  }

  @Test
  void testCreateFilteredUnknownFilterType() {

    class UnknownFilterType implements FilterDescription {
      @Override
      public Optional<String> getComments() {
        return Optional.of("Unknown Comment");
      }

      @Override
      public boolean isCausal() {
        return true;
      }

      @Override
      public FilterType getFilterType() {
        return FilterType.IIR_BUTTERWORTH;
      }
    }

    var cascadeFilterDefinition =
        FilterDefinition.from(HAM_FIR_BP_0_40_3_50_HZ, Optional.empty(), new UnknownFilterType());

    var filteredChannel =
        ChannelFactory.createFiltered(UtilsTestFixtures.CHANNEL, cascadeFilterDefinition);

    var expected = FieldMapUtilities.toFieldMap(cascadeFilterDefinition.getFilterDescription());
    var actual =
        (Map<String, Object>) filteredChannel.getProcessingDefinition().get("filterDescription");

    for (String key : expected.keySet()) {
      assertTrue(actual.keySet().contains(key));
      assertEquals(expected.get(key), actual.get(key));
    }

    for (String key : actual.keySet()) {
      assertTrue(expected.keySet().contains(key));
    }
  }

  private void compareChannels(
      Channel expected, Channel actual, FilterDefinition filterDefinition) {

    // Straight copies
    assertEquals(
        expected.getChannelBandType(),
        actual.getChannelBandType(),
        "Band type should be unchanged");
    assertEquals(
        expected.getChannelOrientationCode(),
        actual.getChannelOrientationCode(),
        "The channel orientation code should be unchanged");
    assertEquals(
        List.of(Channel.createVersionReference(expected)),
        actual.getConfiguredInputs(),
        "The configured inputs should be a reference version of the input channel");
    assertEquals(
        expected.getChannelDataType(),
        actual.getChannelDataType(),
        "The channel data type should be unchanged");
    assertEquals(
        expected.getDescription()
            + Channel.DESCRIPTION_SEPARATOR
            + "Filtered using a "
            + filterDefinition.getName()
            + " filter.",
        actual.getDescription(),
        "The description should be appended with the filter name");
    assertEquals(
        expected.getEffectiveAt(),
        actual.getEffectiveAt(),
        "The effectiveAt time should be unchanged");
    assertEquals(
        expected.getEffectiveUntil(),
        actual.getEffectiveUntil(),
        "The effectiveUntil time should be unchanged");
    assertEquals(
        expected.getChannelInstrumentType(),
        actual.getChannelInstrumentType(),
        "The channel instrument type should be unchanged");
    assertEquals(expected.getLocation(), actual.getLocation(), "The location should be unchanged");
    assertEquals(
        expected.getNominalSampleRateHz(),
        actual.getNominalSampleRateHz(),
        "The nomialsample rate should be unchanged");
    assertEquals(
        expected.getOrientationAngles(),
        actual.getOrientationAngles(),
        "The orientation angles should be unchanged");
    assertEquals(
        expected.getChannelOrientationType(),
        actual.getChannelOrientationType(),
        "The orientation type should be unchanged");
    assertEquals(expected.getStation(), actual.getStation(), "The station should be unchanged");
    assertEquals(expected.getUnits(), actual.getUnits(), "The units should be unchanged");

    // Canonical name
    assertEquals(
        actual.getCanonicalName(),
        actual.getName(),
        "The name and canonical name should be the same");

    // Name
    String expectedStart = expected.getName();
    // Strip the existing hash, if it exists
    if (expectedStart.matches("^.*/[0-9a-fA-F]{64}$")) {
      expectedStart = expectedStart.substring(0, expectedStart.lastIndexOf("/"));
    }
    assertTrue(
        actual.getName().startsWith(expectedStart),
        "The name should start with the previous name through the end of [PROCESSING_ATTRIBUTES]");
    assertTrue(
        actual.getName().contains("/filter," + filterDefinition.getName()),
        "The name should be added to the name");
    assertTrue(
        actual.getName().matches("^.*/[0-9a-fA-F]{64}$"),
        "The name should end with /{SHA256 HASH}");

    // Processing definition
    assertEquals(
        filterDefinition.getComments().orElse(null),
        actual.getProcessingDefinition().get("comments"),
        "The processing definition comments should be the same");
    assertEquals(
        filterDefinition.getName(),
        actual.getProcessingDefinition().get("name"),
        "The processing definition names should be the same");
    assertNull(
        ((Map<String, Object>) actual.getProcessingDefinition().get("filterDescription"))
            .get("parameters"),
        "The processing definition description is undesigned so the parameters should be null");

    // Processing metadata
    var expectedMetadata = expected.getProcessingMetadata();
    var actualMetadata = actual.getProcessingMetadata();

    for (var key : expectedMetadata.keySet()) {
      assertTrue(
          actualMetadata.containsKey(key), "All expected keys should be actual keys: " + key);
      if (!(key.equals(ChannelProcessingMetadataType.FILTER_TYPE)
          || key.equals(ChannelProcessingMetadataType.FILTER_CAUSALITY))) {
        assertEquals(
            expectedMetadata.get(key),
            actualMetadata.get(key),
            "The processing metadata should be unchanged, except for possibly FILTER_TYPE and"
                + " FILTER_CAUSALITY");
      }
    }

    assertEquals(
        filterDefinition.getFilterDescription().getFilterType(),
        actualMetadata.get(ChannelProcessingMetadataType.FILTER_TYPE),
        "The FILTER_TYPE should be the filter definition filter type");

    assertEquals(
        filterDefinition.getFilterDescription().isCausal(),
        actualMetadata.get(ChannelProcessingMetadataType.FILTER_CAUSALITY),
        "The FILTER_CAUSAILTY should be the filter definition isCausal");

    // Response
    assertEquals(
        Optional.empty(), actual.getResponse(), "The response should be an empty optional");
  }

  private void compareLinearFilters(LinearFilterDescription expected, Map<String, Object> actual) {
    assertEquals(
        expected.getComments().get(),
        actual.get("comments"),
        "The description comments should be the same");
    assertEquals(
        expected.isCausal(), actual.get("causal"), "The description isCasual should be the same");
    assertEquals(
        expected.getFilterType().name(),
        actual.get("filterType"),
        "The description filter type should be the same");
    assertEquals(
        expected.getLowFrequency().get(),
        actual.get("lowFrequency"),
        "The lowFrequency should be the same");
    assertEquals(
        expected.getHighFrequency().get(),
        actual.get("highFrequency"),
        "The highFrequency should be the same");
    assertEquals(
        expected.getOrder(), actual.get("order"), "The description order should be the same");
    assertEquals(
        expected.isZeroPhase(),
        actual.get("zeroPhase"),
        "The description zeroPhase should be the same");
    assertEquals(
        expected.getPassBandType().name(),
        actual.get("passBandType"),
        "The passBandType should be the same");
  }

  @Test
  void testCreateMaskedPreconditions() {
    Channel noDataChannel = Channel.builder().setName("TestNoDataChannel").build();

    assertThrows(NullPointerException.class, () -> ChannelFactory.createMasked(null, null));
    assertThrows(
        NullPointerException.class, () -> ChannelFactory.createMasked(noDataChannel, null));
    assertThrows(
        NullPointerException.class, () -> ChannelFactory.createMasked(null, PROC_MASK_DEF_ANALYST));
    assertThrows(
        IllegalStateException.class,
        () -> ChannelFactory.createMasked(noDataChannel, PROC_MASK_DEF_ANALYST));
  }

  @Test
  void testCreateMasked() {
    var actualChannel = ChannelFactory.createMasked(CHANNEL, PROC_MASK_DEF_ANALYST);
    var actualData = actualChannel.getData().get();

    // Compare straight copies
    assertEquals(
        CHANNEL.getChannelBandType(),
        actualChannel.getChannelBandType(),
        "The bandType should be the same");
    assertEquals(
        CHANNEL.getChannelOrientationCode(),
        actualChannel.getChannelOrientationCode(),
        "The channelOrientationCode should be the same");
    assertEquals(
        CHANNEL.getChannelDataType(),
        actualChannel.getChannelDataType(),
        "The channelDataType should be the same");
    assertEquals(
        CHANNEL.getEffectiveAt(),
        actualChannel.getEffectiveAt(),
        "The effectiveAt should be the same");
    assertEquals(
        CHANNEL.getEffectiveUntil(),
        actualChannel.getEffectiveUntil(),
        "The effectiveUntil should be the same");
    assertEquals(
        CHANNEL.getChannelInstrumentType(),
        actualChannel.getChannelInstrumentType(),
        "The channelInstrumentType should be the same");
    assertEquals(
        CHANNEL.getLocation(), actualChannel.getLocation(), "The location should be the same");
    assertEquals(
        CHANNEL.getNominalSampleRateHz(),
        actualChannel.getNominalSampleRateHz(),
        "The nominalSampleRateHz should be the same");
    assertEquals(
        CHANNEL.getOrientationAngles(),
        actualChannel.getOrientationAngles(),
        "The orientationAngles should be the same");
    assertEquals(
        CHANNEL.getChannelOrientationType(),
        actualChannel.getChannelOrientationType(),
        "The channelOrientationType should be the same");
    assertEquals(
        CHANNEL.getProcessingMetadata(),
        actualChannel.getProcessingMetadata(),
        "The processingMetadata should be the same");
    assertEquals(
        CHANNEL.getStation(), actualChannel.getStation(), "The station should be the same");
    assertEquals(CHANNEL.getUnits(), actualChannel.getUnits(), "The unit should be the same");

    // Compare changed values
    assertEquals(
        actualChannel.getCanonicalName(),
        actualChannel.getName(),
        "The canonical name and channel name should be the same.");

    assertEquals(
        1, actualData.getConfiguredInputs().size(), "The configured inputs should have one entry");
    assertEquals(
        Channel.createVersionReference(CHANNEL),
        actualData.getConfiguredInputs().get(0),
        "The configured input should be a version reference of the input channel");

    assertTrue(
        actualChannel.getDescription().startsWith(CHANNEL.getDescription()),
        "The derived description should start with the input description");
    assertTrue(
        actualChannel
            .getDescription()
            .endsWith(Channel.DESCRIPTION_SEPARATOR + "Masked samples removed."),
        "The derived description should have the masked message appended to it");

    assertTrue(
        actualChannel.getName().contains("/masked"),
        "The new name should contain the '/masked' attribute");
    assertTrue(
        actualChannel.getName().matches("^.*/[0-9a-fA-F]{64}$"),
        "The new name should end with /{SHA256 HASH}");

    assertEquals(
        FieldMapUtilities.toFieldMap(PROC_MASK_DEF_ANALYST),
        actualChannel.getProcessingDefinition(),
        "The processing definition should be a field map of the input processing definition");

    assertEquals(
        Optional.empty(), actualChannel.getResponse(), "The response should be an empty Optional");

    assertTrue(Channel.isDerivedChannel(actualChannel), "Expected Derived Channel");
  }
}
