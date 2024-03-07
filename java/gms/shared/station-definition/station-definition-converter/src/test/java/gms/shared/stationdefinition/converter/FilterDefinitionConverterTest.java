package gms.shared.stationdefinition.converter;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import gms.shared.stationdefinition.dao.FilterDaoFixtures;
import gms.shared.stationdefinition.dao.FilterGroupDaoFixtures;
import gms.shared.stationdefinition.dao.util.FilterDataNode;
import gms.shared.stationdefinition.dao.util.FilterDataNodeFixtures;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FilterDefinitionConverterTest {

  @ParameterizedTest
  @MethodSource("linearFilterDefinitionConversionSource")
  void testConvertLinearFilterDefinition(FilterDataNode filterDataNode, boolean shouldConvert) {
    assertEquals(shouldConvert, FilterDefinitionConverter.convert(filterDataNode).isPresent());
  }

  private static Stream<Arguments> linearFilterDefinitionConversionSource() {
    var builder = FilterDataNode.builder();
    return Stream.of(
        Arguments.arguments(
            builder.setFilterRecord(FilterDaoFixtures.linearButterworthBpCausal).build(), true),
        Arguments.arguments(
            builder.setFilterRecord(FilterDaoFixtures.linearButterworthBpNonCausal).build(), true),
        Arguments.arguments(
            builder.setFilterRecord(FilterDaoFixtures.linearHammingBpCausal).build(), false));
  }

  @Test
  void testConvertFilterDefinitionRejectChildFilter() {
    // Linear
    assertTrue(
        FilterDefinitionConverter.convert(FilterDataNodeFixtures.cascadeCausal_LbBPcChild_node1)
            .isEmpty());
    // Cascade
    assertTrue(
        FilterDefinitionConverter.convert(
                FilterDataNodeFixtures.cascadeCausalTree.toBuilder()
                    .setFilterGroup(FilterGroupDaoFixtures.cascadeSingle_CcChild_seq1)
                    .build())
            .isEmpty());
  }

  @Test
  void testConvertCascadeFilterDefinitionCausal() {

    var result =
        Assertions.assertDoesNotThrow(
                () -> FilterDefinitionConverter.convert(FilterDataNodeFixtures.cascadeCausalTree))
            .orElseThrow();

    assertEquals(FilterType.CASCADE, result.getFilterDescription().getFilterType());

    var cascadeFd = (CascadeFilterDescription) result.getFilterDescription();

    assertEquals(2, cascadeFd.getFilterDescriptions().size());

    assertAll(
        "Causal relationship was applied properly, and descriptions are properly ordered",
        () -> assertTrue(cascadeFd.isCausal()),
        () -> assertTrue(cascadeFd.getFilterDescriptions().get(0).isCausal()),
        () -> assertTrue(cascadeFd.getFilterDescriptions().get(1).isCausal()));
  }

  @Test
  void testConvertCascadeFilterDefinitionNonCausal() {

    var result =
        Assertions.assertDoesNotThrow(
                () ->
                    FilterDefinitionConverter.convert(FilterDataNodeFixtures.cascadeNonCausalTree))
            .orElseThrow();

    assertEquals(FilterType.CASCADE, result.getFilterDescription().getFilterType());

    var cascadeFd = (CascadeFilterDescription) result.getFilterDescription();

    assertEquals(2, cascadeFd.getFilterDescriptions().size());

    assertAll(
        "Causal relationship was applied properly",
        () -> assertFalse(cascadeFd.isCausal()),
        () -> assertTrue(cascadeFd.getFilterDescriptions().get(0).isCausal()),
        () -> assertFalse(cascadeFd.getFilterDescriptions().get(1).isCausal()));
  }

  @Test
  void testConvertCascadeFilterDefinitionSingleLinear() {

    var cascadeSingle_LbBPcChild_node1 =
        FilterDataNode.builder()
            .setFilterRecord(FilterDaoFixtures.linearButterworthBpCausal)
            .setFilterGroup(FilterGroupDaoFixtures.cascadeSingle_LbBPcChild_seq1)
            .build();

    var cascadeSingleTree =
        FilterDataNode.builder()
            .setFilterRecord(FilterDaoFixtures.cascadeSingleLinear)
            .setChildFilters(List.of(cascadeSingle_LbBPcChild_node1))
            .build();

    var result =
        Assertions.assertDoesNotThrow(() -> FilterDefinitionConverter.convert(cascadeSingleTree))
            .orElseThrow();

    assertEquals(FilterType.IIR_BUTTERWORTH, result.getFilterDescription().getFilterType());

    var linearFd = (LinearFilterDescription) result.getFilterDescription();

    assertAll(
        "Stored \"Cascade\" filter description with single linear child filter was converted to a"
            + " linear filter description",
        () -> assertEquals(FilterType.IIR_BUTTERWORTH, linearFd.getFilterType()),
        () -> assertEquals(PassBandType.BAND_PASS, linearFd.getPassBandType()));
  }

  @ParameterizedTest
  @MethodSource("singleCascadeSource")
  void testConvertCascadeFilterDefinitionSingleCascade(String filterString) {

    var cascadeSingle_CcChild_node1 =
        FilterDataNodeFixtures.cascadeCausalTree.toBuilder()
            .setFilterGroup(FilterGroupDaoFixtures.cascadeSingle_CcChild_seq1)
            .build();

    var cascadeSingleTree =
        FilterDataNode.builder()
            .setFilterRecord(
                FilterDaoFixtures.cascadeSingleCascade.toBuilder()
                    .setFilterString(filterString)
                    .setFilterHash(String.valueOf(filterString.hashCode()))
                    .build())
            .setChildFilters(List.of(cascadeSingle_CcChild_node1))
            .build();

    var result =
        Assertions.assertDoesNotThrow(() -> FilterDefinitionConverter.convert(cascadeSingleTree))
            .orElseThrow();

    assertEquals(FilterType.CASCADE, result.getFilterDescription().getFilterType());

    var cascadeFd = (CascadeFilterDescription) result.getFilterDescription();

    assertEquals(2, cascadeFd.getFilterDescriptions().size());

    assertAll(
        "Stored \"Cascade\" filter description with single cascade child filter was converted to a"
            + " simple cascade filter description",
        () -> assertTrue(cascadeFd.isCausal()),
        () -> assertTrue(cascadeFd.getFilterDescriptions().get(0).isCausal()),
        () -> assertTrue(cascadeFd.getFilterDescriptions().get(1).isCausal()));
  }

  private static Stream<Arguments> singleCascadeSource() {
    return Stream.of(
        Arguments.arguments(FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll("\\s\\/\\s", "\\/")),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll(
                "\\s\\/\\s", "       \\/       ")),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll("\\s\\/\\s", " \\/")),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll("\\s\\/\\s", "       \\/")),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll("\\s\\/\\s", "\\/ ")),
        Arguments.arguments(
            FilterDaoFixtures.CASCADE_FILTER_STRING_CAUSAL.replaceAll("\\s\\/\\s", "\\/       ")));
  }

  @ParameterizedTest
  @MethodSource("cascadeConversionFailureSource")
  void testCascadeConversionFailure(FilterDataNode filterDataNode) {
    assertTrue(FilterDefinitionConverter.convert(filterDataNode).isEmpty());
  }

  private static Stream<Arguments> cascadeConversionFailureSource() {
    return Stream.of(
        // Cascade with invalid compound_filter
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeTemplate().setCompoundFilter('n').build())
                .build()),
        // Cascade with empty child filters list
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeCausal)
                .setChildFilters(Collections.emptyList())
                .build()),
        // Cascade with no child filters list
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeCausal)
                .setChildFilters(Optional.empty())
                .build()),
        // Cascade with child filter that's missing its associating filter group
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeNonCausal)
                .setChildFilters(
                    List.of(
                        FilterDataNodeFixtures.cascadeNonCausal_LbBPcChild_node1,
                        FilterDataNodeFixtures.cascadeNonCausal_LbBPncChild_node2.toBuilder()
                            .setFilterGroup(Optional.empty())
                            .build()))
                .build()),
        // Cascade of Cascades not supported
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeOfCascades)
                .setChildFilters(
                    List.of(
                        FilterDataNodeFixtures.cascadeCausalTree.toBuilder()
                            .setFilterGroup(FilterGroupDaoFixtures.cascadeOfCascades_cc_seq1)
                            .build(),
                        FilterDataNodeFixtures.cascadeNonCausalTree.toBuilder()
                            .setFilterGroup(FilterGroupDaoFixtures.cascadeOfCascades_cnc_seq2)
                            .build()))
                .build()),
        // Sequencing failure: Not starting at 1
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeCausal)
                .setChildFilters(
                    List.of(
                        FilterDataNodeFixtures.cascadeCausal_LbHPcChild_node2,
                        FilterDataNodeFixtures.cascadeCausal_LbHPcChild_node3))
                .build(),
            false),
        // Sequencing failure: Gap in sequence
        Arguments.arguments(
            FilterDataNode.builder()
                .setFilterRecord(FilterDaoFixtures.cascadeCausal)
                .setChildFilters(
                    List.of(
                        FilterDataNodeFixtures.cascadeCausal_LbBPcChild_node1,
                        FilterDataNodeFixtures.cascadeCausal_LbHPcChild_node3))
                .build()));
  }
}
