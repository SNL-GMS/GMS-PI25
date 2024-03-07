package gms.shared.stationdefinition.coi.filter;

import gms.shared.stationdefinition.coi.filter.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Test;

class CascadeFilterParametersTest {

  @Test
  void testSerializationCascadeFiltersParameters() {
    TestUtilities.assertSerializes(
        FilterFixtures.CASCADED_FILTERS_PARAMETERS, CascadeFilterParameters.class);
  }
}
