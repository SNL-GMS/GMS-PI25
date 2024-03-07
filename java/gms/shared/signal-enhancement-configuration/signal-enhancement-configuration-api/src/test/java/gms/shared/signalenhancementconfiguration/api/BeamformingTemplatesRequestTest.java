package gms.shared.signalenhancementconfiguration.api;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.utilities.test.TestUtilities;
import java.util.List;
import org.junit.jupiter.api.Test;

class BeamformingTemplatesRequestTest {
  @Test
  void testSerialization() {
    var request =
        BeamformingTemplatesRequest.builder()
            .setBeamType(BeamType.CONTINUOUS_LOCATION)
            .setPhases(List.of(PhaseType.P))
            .setStations(List.of(Station.createEntityReference("Hello Tokyo")))
            .build();
    TestUtilities.assertSerializes(request, BeamformingTemplatesRequest.class);
  }
}
