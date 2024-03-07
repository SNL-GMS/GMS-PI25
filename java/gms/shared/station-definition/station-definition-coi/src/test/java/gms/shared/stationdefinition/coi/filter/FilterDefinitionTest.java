package gms.shared.stationdefinition.coi.filter;

import gms.shared.stationdefinition.coi.filter.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class FilterDefinitionTest {

  @Test
  void testSerializationLinearFilterDescription() {
    TestUtilities.assertSerializes(
        FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ, FilterDefinition.class);
  }

  @Test
  void testSerializationCascadeFilterDescription() {
    FilterDefinition filterDefinition =
        FilterDefinition.from(
            "Filter definition example",
            Optional.of("this is a test comment"),
            FilterFixtures.CASCADED_FILTERS_1_DESCRIPTION);

    TestUtilities.assertSerializes(filterDefinition, FilterDefinition.class);
  }
}
