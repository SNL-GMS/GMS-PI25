package gms.shared.waveform.coi;

import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL;

import com.google.common.collect.Range;
import gms.shared.utilities.test.TestUtilities;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class MissingChannelTimeRangeListPairTest {
  @Test
  void testSerialization() {
    var channel = CHANNEL;
    Range<Instant> timeRange = Range.closed(Instant.EPOCH, Instant.EPOCH.plusSeconds(60));
    MissingChannelTimeRangeListPair missingChannelPair =
        new MissingChannelTimeRangeListPair(channel, List.of(timeRange));

    TestUtilities.assertSerializes(missingChannelPair, MissingChannelTimeRangeListPair.class);
  }
}
