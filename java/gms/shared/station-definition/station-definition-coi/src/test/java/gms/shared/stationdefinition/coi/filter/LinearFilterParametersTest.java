package gms.shared.stationdefinition.coi.filter;

import gms.shared.stationdefinition.coi.filter.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Test;

class LinearFilterParametersTest {

  @Test
  void testSerializationLinearFilterParameters() {
    TestUtilities.assertSerializes(
        FilterFixtures.LINEAR_FILTER_PARAMETERS, LinearFilterParameters.class);
  }
}
