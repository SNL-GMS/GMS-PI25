package gms.shared.waveform.config;

import gms.shared.frameworks.cache.utils.CacheInfo;
import gms.shared.frameworks.cache.utils.IgniteConnectionManager;
import gms.shared.frameworks.systemconfig.SystemConfig;
import gms.shared.stationdefinition.cache.configuration.CacheAccessorConfiguration;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import java.util.List;
import java.util.Optional;
import org.apache.ignite.IgniteCache;
import org.apache.ignite.cache.CacheAtomicityMode;
import org.apache.ignite.cache.CacheMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@ComponentScan(
    basePackages = {"gms.shared.spring", "gms.shared.emf.qc", "gms.shared.stationdefinition"})
@Import(CacheAccessorConfiguration.class)
public class WaveformConfiguration {

  private static final Logger LOGGER = LoggerFactory.getLogger(WaveformConfiguration.class);

  public static final CacheInfo CHANNEL_SEGMENT_DESCRIPTOR_WFIDS_CACHE =
      new CacheInfo(
          "channel-segment-descriptor-wfids-cache",
          CacheMode.PARTITIONED,
          CacheAtomicityMode.ATOMIC,
          true,
          Optional.empty());

  @Bean
  public IgniteCache<ChannelSegmentDescriptor, List<Long>> channelSegmentDescriptorWfidsCache(
      @Autowired SystemConfig systemConfig) {

    try {
      IgniteConnectionManager.initialize(
          systemConfig, List.of(CHANNEL_SEGMENT_DESCRIPTOR_WFIDS_CACHE));
    } catch (IllegalStateException ex) {
      LOGGER.warn("Channel Segment cache already initialized", ex);
    }
    return IgniteConnectionManager.getOrCreateCache(CHANNEL_SEGMENT_DESCRIPTOR_WFIDS_CACHE);
  }
}
