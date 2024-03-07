package gms.shared.signalenhancementconfiguration.api;

import com.google.common.collect.ImmutableMap;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisId;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.utils.FilterFixtures;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.utilities.test.TestUtilities;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class FilterDefinitionByUsageBySignalDetectionHypothesisTest {

  @Test
  void testSerialization() {
    FilterDefinitionByUsageBySignalDetectionHypothesis
        filterDefinitionByUsageForSignalDetectionHypothesis =
            FilterDefinitionByUsageBySignalDetectionHypothesis.from(
                List.of(getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair()));

    TestUtilities.assertSerializes(
        filterDefinitionByUsageForSignalDetectionHypothesis,
        FilterDefinitionByUsageBySignalDetectionHypothesis.class);
  }

  @Test
  void testSignalDetectionHypothesisByFilterDefinitionByFilterDefinitionUsageMap() {
    FilterDefinitionByUsageBySignalDetectionHypothesis
        filterDefinitionByUsageForSignalDetectionHypothesis =
            FilterDefinitionByUsageBySignalDetectionHypothesis.from(
                List.of(getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair()));

    Map<SignalDetectionHypothesis, FilterDefinitionByFilterDefinitionUsage>
        signalDetectionHypothesisByFilterDefinitionByFilterDefinitionUsage =
            filterDefinitionByUsageForSignalDetectionHypothesis
                .getSignalDetectionHypothesisByFilterDefinitionByFilterDefinitionUsage();

    Assertions.assertFalse(
        signalDetectionHypothesisByFilterDefinitionByFilterDefinitionUsage.isEmpty());
  }

  @Test
  void testSignalDetectionHypothesisByFilterDefinitionUsageMap() {
    FilterDefinitionByUsageBySignalDetectionHypothesis
        filterDefinitionByUsageForSignalDetectionHypothesis =
            FilterDefinitionByUsageBySignalDetectionHypothesis.from(
                List.of(
                    getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair(),
                    getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair()));

    Map<SignalDetectionHypothesis, List<FilterDefinitionUsage>>
        signalDetectionHypothesisByFilterDefinitionUsageMap =
            filterDefinitionByUsageForSignalDetectionHypothesis
                .getSignalDetectionHypothesisByFilterDefinitionUsage();

    Assertions.assertEquals(2, signalDetectionHypothesisByFilterDefinitionUsageMap.size());

    List<FilterDefinitionUsage> filterDefinitionUsages =
        signalDetectionHypothesisByFilterDefinitionUsageMap.values().stream()
            .flatMap(List::stream)
            .collect(Collectors.toList());

    Assertions.assertTrue(filterDefinitionUsages.contains(FilterDefinitionUsage.FK));
  }

  @Test
  void testSignalDetectionHypothesisByFilterDefinitionMap() {
    FilterDefinitionByUsageBySignalDetectionHypothesis
        filterDefinitionByUsageForSignalDetectionHypothesis =
            FilterDefinitionByUsageBySignalDetectionHypothesis.from(
                List.of(
                    getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair(),
                    getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair()));

    Map<SignalDetectionHypothesis, List<FilterDefinition>>
        signalDetectionHypothesisByFilterDefinitionUsageMap =
            filterDefinitionByUsageForSignalDetectionHypothesis
                .getSignalDetectionHypothesisByFilterDefinition();

    Assertions.assertEquals(2, signalDetectionHypothesisByFilterDefinitionUsageMap.size());

    List<FilterDefinition> filterDefinitionUsages =
        signalDetectionHypothesisByFilterDefinitionUsageMap.values().stream()
            .flatMap(List::stream)
            .collect(Collectors.toList());

    Assertions.assertEquals("HAM FIR BP 0.40-3.50 Hz", filterDefinitionUsages.get(0).getName());
  }

  private FilterDefinitionByFilterDefinitionUsage getFilterDefinitionByFilterDefinitionUsage() {
    Map<FilterDefinitionUsage, FilterDefinition> map = new HashMap<>();
    map.put(FilterDefinitionUsage.FK, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);
    map.put(FilterDefinitionUsage.ONSET, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);
    map.put(
        FilterDefinitionUsage.DETECTION, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    return FilterDefinitionByFilterDefinitionUsage.from(ImmutableMap.copyOf(map));
  }

  private SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair
      getDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair() {

    return SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.create(
        getSignalDetectionHypothesis(), getFilterDefinitionByFilterDefinitionUsage());
  }

  private SignalDetectionHypothesis getSignalDetectionHypothesis() {
    UUID id = UUID.randomUUID();
    UUID id5 = UUID.randomUUID();

    return SignalDetectionHypothesis.builder()
        .setId(SignalDetectionHypothesisId.from(id, id5))
        .build();
  }
}
