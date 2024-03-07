package gms.shared.derivedchannel.coi;

import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Test;

class BeamformingConfigurationTest {

  @Test
  void testSerialization() {
    var beamformingConf = BeamTestFixtures.getBeamformingConfiguration();

    TestUtilities.assertSerializes(beamformingConf, BeamformingConfiguration.class);
  }
}
