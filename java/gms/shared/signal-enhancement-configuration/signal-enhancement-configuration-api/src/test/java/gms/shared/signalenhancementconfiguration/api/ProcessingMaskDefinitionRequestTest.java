package gms.shared.signalenhancementconfiguration.api;

import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.utilities.test.TestUtilities;
import gms.shared.waveform.testfixture.ChannelSegmentTestFixtures;
import java.util.Set;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class ProcessingMaskDefinitionRequestTest {

  @Test
  void testSerialization() {

    var request =
        ProcessingMaskDefinitionRequest.create(
            StationGroup.createEntityReference("Group"),
            Set.of("DISPLAY_FILTER"),
            Set.of(ChannelSegmentTestFixtures.getTestChannel("Channel")),
            Set.of("P"));

    TestUtilities.assertSerializes(request, ProcessingMaskDefinitionRequest.class);
  }

  @Test
  void testInvalidEntries() {

    var request =
        ProcessingMaskDefinitionRequest.create(
            StationGroup.createEntityReference("Group"),
            Set.of("DISPLAY_FILTER", "NOPE"),
            Set.of(ChannelSegmentTestFixtures.getTestChannel("Channel")),
            Set.of("P", "JK"));

    Assertions.assertEquals(Set.of("JK"), request.getInvalidPhaseTypes());
    Assertions.assertEquals(Set.of("NOPE"), request.getInvalidProcessingOperations());
  }
}
