package gms.shared.derivedchannel.coi;

import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Test;

class BeamDescriptionTest {

  @Test
  void testBuilderSerialization() {
    var beamDescription = BeamTestFixtures.getDefaultBeamDescription();

    TestUtilities.assertSerializes(beamDescription, BeamDescription.class);
  }
}
