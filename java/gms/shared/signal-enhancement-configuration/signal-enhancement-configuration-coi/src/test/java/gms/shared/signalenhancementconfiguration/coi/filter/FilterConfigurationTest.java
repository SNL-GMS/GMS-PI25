package gms.shared.signalenhancementconfiguration.coi.filter;

import gms.shared.signalenhancementconfiguration.coi.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Test;

class FilterConfigurationTest {
  @Test
  void testSerialization() {
    FilterConfiguration filterConfiguration =
        FilterConfiguration.from(FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    TestUtilities.assertSerializes(filterConfiguration, FilterConfiguration.class);
  }
}
