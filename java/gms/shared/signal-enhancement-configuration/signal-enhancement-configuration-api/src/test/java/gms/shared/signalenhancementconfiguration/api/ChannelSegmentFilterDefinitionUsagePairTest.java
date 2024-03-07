package gms.shared.signalenhancementconfiguration.api;

import com.google.common.collect.ImmutableMap;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.utils.FilterFixtures;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.utilities.test.TestUtilities;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ChannelSegmentFilterDefinitionUsagePairTest {
  @Test
  void testSerialization() {
    Channel channel =
        Channel.builder().setName("Test Channel").setEffectiveAt(Instant.EPOCH).build();
    ChannelSegment cs =
        ChannelSegment.builder()
            .setId(
                ChannelSegmentDescriptor.from(
                    channel, Instant.EPOCH.plusSeconds(10), Instant.EPOCH, Instant.EPOCH))
            .build();
    ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair
        channelSegmentDescriptorFilterDefinitionUsagePair =
            ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.create(
                cs, getFilterDefinitionByFilterDefinitionUsage());

    TestUtilities.assertSerializes(
        channelSegmentDescriptorFilterDefinitionUsagePair,
        ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.class);
  }

  private FilterDefinitionByFilterDefinitionUsage getFilterDefinitionByFilterDefinitionUsage() {
    Map<FilterDefinitionUsage, FilterDefinition> map = new HashMap<>();
    map.put(FilterDefinitionUsage.FK, FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ);

    return FilterDefinitionByFilterDefinitionUsage.from(ImmutableMap.copyOf(map));
  }
}
