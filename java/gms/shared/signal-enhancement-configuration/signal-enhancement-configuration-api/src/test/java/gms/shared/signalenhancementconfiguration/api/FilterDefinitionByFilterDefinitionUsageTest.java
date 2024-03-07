package gms.shared.signalenhancementconfiguration.api;

import com.google.common.collect.ImmutableMap;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.utils.FilterFixtures;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.utilities.test.TestUtilities;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FilterDefinitionByFilterDefinitionUsageTest {

  @Test
  void testSerialization() {

    TestUtilities.assertSerializes(
        getFilterDefinitionByFilterDefinitionUsage(),
        FilterDefinitionByFilterDefinitionUsage.class);
  }

  private FilterDefinitionByFilterDefinitionUsage getFilterDefinitionByFilterDefinitionUsage() {
    Map<FilterDefinitionUsage, FilterDefinition> map = new HashMap<>();
    map.put(FilterDefinitionUsage.FK, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    return FilterDefinitionByFilterDefinitionUsage.from(ImmutableMap.copyOf(map));
  }
}
