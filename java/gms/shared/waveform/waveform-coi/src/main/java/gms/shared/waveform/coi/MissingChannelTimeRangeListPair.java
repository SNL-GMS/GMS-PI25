package gms.shared.waveform.coi;

import com.google.common.collect.Range;
import gms.shared.stationdefinition.coi.channel.Channel;
import java.time.Instant;
import java.util.List;

public record MissingChannelTimeRangeListPair(Channel channel, List<Range<Instant>> timeRanges) {}
