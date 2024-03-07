package gms.shared.signalenhancementconfiguration.api;

import gms.shared.event.coi.EventHypothesis;
import gms.shared.signalenhancementconfiguration.utils.EventFixture;
import gms.shared.signalenhancementconfiguration.utils.SignalDetectionFixture;
import gms.shared.utilities.test.TestUtilities;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;

class FilterDefinitionUsageForChannelSegmentsRequestTest {
  @Test
  void testSerialization() {
    EventHypothesis eventHypothesis =
        EventFixture.generateDummyEventHypothesisForFilterTest(10, 10);
    Collection<ChannelSegment<Waveform>> channelSegments =
        List.of(SignalDetectionFixture.ARRIVAL_CHANNEL_SEGMENT);
    FilterDefinitionByUsageForChannelSegmentsRequest
        filterDefinitionByUsuageForChannelSegmentsRequest =
            FilterDefinitionByUsageForChannelSegmentsRequest.builder()
                .setEventHypothesis(eventHypothesis)
                .setChannelSegments(channelSegments)
                .build();

    TestUtilities.assertSerializes(
        filterDefinitionByUsuageForChannelSegmentsRequest,
        FilterDefinitionByUsageForChannelSegmentsRequest.class);
  }
}
