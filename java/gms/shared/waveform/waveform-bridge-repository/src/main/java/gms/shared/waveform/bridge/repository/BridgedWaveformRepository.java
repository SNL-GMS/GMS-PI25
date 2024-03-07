package gms.shared.waveform.bridge.repository;

import static gms.shared.stationdefinition.facet.FacetingTypes.CHANNEL_TYPE;

import com.google.common.collect.LinkedListMultimap;
import com.google.common.collect.Multimap;
import gms.shared.frameworks.systemconfig.SystemConfig;
import gms.shared.spring.utilities.aspect.Timing;
import gms.shared.spring.utilities.framework.RetryService;
import gms.shared.stationdefinition.api.channel.util.ChannelsTimeFacetRequest;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.dao.css.SiteChanKey;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.stationdefinition.database.connector.WfdiscDatabaseConnector;
import gms.shared.stationdefinition.repository.util.StationDefinitionIdUtility;
import gms.shared.utilities.logging.TimingLogger;
import gms.shared.waveform.api.WaveformRepository;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.converter.ChannelSegmentConverter;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.commons.lang3.Validate;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.ignite.IgniteCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/** * A {@link WaveformRepository} implementation that uses a bridged database */
@Component
public class BridgedWaveformRepository implements WaveformRepository {

  private static final Logger LOGGER = LoggerFactory.getLogger(BridgedWaveformRepository.class);
  private static final TimingLogger<Collection<ChannelSegment<Waveform>>> channelSegmentLogger =
      TimingLogger.create(LOGGER);
  private static final TimingLogger<List<WfdiscDao>> wfdiscsLogger = TimingLogger.create(LOGGER);
  private static final TimingLogger<Map<ChannelSegmentDescriptor, List<ProcessingMask>>>
      procMasksLogger = TimingLogger.create(LOGGER);

  private static final String STATION_DEFINITION_SERVICE_URL =
      "http://station-definition-service:8080/station-definition-service/station-definition/channels/query/names";

  private Environment environment;
  private final WfdiscDatabaseConnector wfdiscDatabaseConnector;
  private final ChannelSegmentConverter converter;
  private final RetryService retryService;
  private IgniteCache<ChannelSegmentDescriptor, List<Long>> channelSegmentDescriptorWfidsCache;
  private final ProcessingMaskLoader processingMaskLoader;

  @Autowired
  public BridgedWaveformRepository(
      WfdiscDatabaseConnector wfdiscDatabaseConnector,
      ChannelSegmentConverter converter,
      RetryService retryService,
      IgniteCache<ChannelSegmentDescriptor, List<Long>> channelSegmentDescriptorWfidsCache,
      SystemConfig systemConfig,
      ProcessingMaskLoader processingMaskLoader,
      Environment environment) {
    this.wfdiscDatabaseConnector = wfdiscDatabaseConnector;
    this.converter = converter;
    this.retryService = retryService;
    this.channelSegmentDescriptorWfidsCache = channelSegmentDescriptorWfidsCache;
    this.processingMaskLoader = processingMaskLoader;
    this.environment = environment;
  }

  @Override
  @Timing
  public Collection<ChannelSegment<Waveform>> findByChannelsAndTimeRange(
      Set<Channel> channels, Instant startTime, Instant endTime) {

    // load wfdisc associated with channels and timerange parameter list
    List<SiteChanKey> siteChanList =
        channels.stream()
            .map(siteChan -> StationDefinitionIdUtility.getCssKeyFromName(siteChan.getName()))
            .toList();

    List<WfdiscDao> wfDiscDaos =
        wfdiscDatabaseConnector.findWfdiscsByNameAndTimeRange(siteChanList, startTime, endTime);

    Map<Instant, List<WfdiscDao>> wfDiscsByTime =
        wfDiscDaos.stream().collect(Collectors.groupingBy(WfdiscDao::getTime));
    Multimap<Channel, WfdiscDao> channelWfdiscDaoMultimap = LinkedListMultimap.create();

    Map<Channel, List<WfdiscDao>> channelListMap =
        wfDiscsByTime.entrySet().stream()
            .parallel()
            .map(wfDiscs -> getChannelNamesForTime(wfDiscs, channels))
            .map(
                pair ->
                    Pair.of(
                        getChannelsByName(pair.getLeft(), pair.getRight()),
                        wfDiscsByTime.get(pair.getLeft())))
            .map(
                pair ->
                    Pair.of(
                        pair.getLeft(),
                        pair.getRight().stream()
                            .collect(
                                Collectors.toMap(
                                    wfDisc ->
                                        StationDefinitionIdUtility.createStationChannelCode(
                                            wfDisc.getStationCode(), wfDisc.getChannelCode()),
                                    Function.identity()))))
            .flatMap(
                pair ->
                    pair.getLeft().stream()
                        .map(
                            channel ->
                                Pair.of(
                                    Channel.createVersionReference(
                                        channel.getName(), channel.getEffectiveAt().get()),
                                    pair.getRight()
                                        .get(
                                            StationDefinitionIdUtility
                                                .getStationChannelCodeFromChannel(channel)))))
            .collect(
                Collectors.groupingBy(
                    Pair::getLeft, Collectors.mapping(Pair::getRight, Collectors.toList())));
    channelListMap.forEach(channelWfdiscDaoMultimap::putAll);
    var waveforms =
        channelSegmentLogger.apply(
            this.getClass().getSimpleName() + "::createWaveforms",
            () -> createWaveforms(channelWfdiscDaoMultimap, startTime, endTime),
            environment.getActiveProfiles());

    LOGGER.info("Returning {} waveforms", waveforms.size());
    return waveforms;
  }

  /**
   * converts Channel, WfDisc map to ChannelSegment<Waveform> must be public to allow Timing aspect
   *
   * @param channelWfdiscDaoMultimap map containing channels to wfdisc
   * @param startTime time to start the waveform
   * @param endTime time to end the waveform
   * @return
   */
  public Collection<ChannelSegment<Waveform>> createWaveforms(
      Multimap<Channel, WfdiscDao> channelWfdiscDaoMultimap, Instant startTime, Instant endTime) {

    return channelWfdiscDaoMultimap.keySet().stream()
        .map(
            channel ->
                converter.convert(
                    channel,
                    new ArrayList<>(channelWfdiscDaoMultimap.get(channel)),
                    startTime,
                    endTime))
        .toList();
  }

  /**
   * maps wfdisc for a given time to Channels for the given time
   *
   * @param wfDiscs wfdisc for a given time
   * @param channels channels for a given time
   * @return list of channelNames for a given Time
   */
  private static Pair<Instant, List<String>> getChannelNamesForTime(
      Map.Entry<Instant, List<WfdiscDao>> wfDiscs, Set<Channel> channels) {
    // stores stationChannel code to channel names for populating ChannelsTimeFacetRequest for a
    // specific wfdisc
    Map<String, String> staChanCodeChannelMap =
        channels.stream()
            .collect(
                Collectors.toMap(
                    StationDefinitionIdUtility::getStationChannelCodeFromChannel,
                    Channel::getName));

    return Pair.of(
        wfDiscs.getKey(),
        wfDiscs.getValue().stream()
            .map(
                wfDisc ->
                    staChanCodeChannelMap.get(
                        StationDefinitionIdUtility.createStationChannelCode(
                            wfDisc.getStationCode(), wfDisc.getChannelCode())))
            .toList());
  }

  /**
   * calls station definition to get all channels for an effective time
   *
   * @param effectiveTime time to find associated channels
   * @param channelNames list of channels to load
   * @return List of Channels at effective at the given time
   */
  private List<Channel> getChannelsByName(Instant effectiveTime, List<String> channelNames) {
    var request =
        ChannelsTimeFacetRequest.builder()
            .setChannelNames(channelNames)
            .setEffectiveTime(effectiveTime)
            .setFacetingDefinition(
                FacetingDefinition.builder()
                    .setPopulated(true)
                    .setClassType(CHANNEL_TYPE.getValue())
                    .build())
            .build();
    List<Channel> channelList =
        retryService.retry(
            STATION_DEFINITION_SERVICE_URL,
            HttpMethod.POST,
            new HttpEntity<>(request),
            new ParameterizedTypeReference<List<Channel>>() {});
    if (channelList.isEmpty()) {
      LOGGER.info("No matching channels found for {}", channelNames);
      return new ArrayList<>();
    }
    return channelList;
  }

  @Override
  @Timing
  public Collection<ChannelSegment<Waveform>> findByChannelSegmentDescriptors(
      Collection<ChannelSegmentDescriptor> channelSegmentDescriptors) {

    channelSegmentDescriptors.forEach(
        (var csd) -> {
          Validate.isTrue(
              csd.getStartTime().isBefore(csd.getEndTime()),
              "ChannelSegmentDescriptor startTime must be before the ChannelSegmentDescriptor"
                  + " endTime");
          Validate.isTrue(
              csd.getChannel().getEffectiveAt().isPresent(),
              "Channels must have an effectiveDate (must be version reference)");
          Validate.isTrue(
              csd.getChannel().getEffectiveAt().get().isBefore(csd.getEndTime()),
              "The Channel effectiveAt Date must be before the ChannelSegmentDescriptor endTime");
        });

    Map<ChannelSegmentDescriptor, List<ProcessingMask>> processingMaskMap =
        procMasksLogger.apply(
            this.getClass().getSimpleName() + "::loadProcessingMasks",
            () -> loadProcessingMasks(channelSegmentDescriptors),
            environment.getActiveProfiles());

    Map<ChannelSegmentDescriptor, List<Long>> cachedWfidsByCsd =
        channelSegmentDescriptors.stream()
            .parallel()
            .filter(channelSegmentDescriptorWfidsCache::containsKey)
            .map(csd -> Pair.of(csd, channelSegmentDescriptorWfidsCache.get(csd)))
            .collect(Collectors.toMap(Pair::getKey, Pair::getValue));

    var wfdiscs =
        wfdiscsLogger.apply(
            this.getClass().getSimpleName() + "::getChannelSegments",
            () ->
                wfdiscDatabaseConnector.findWfdiscsByWfids(
                    cachedWfidsByCsd.values().stream().flatMap(List::stream).distinct().toList()),
            environment.getActiveProfiles());

    return channelSegmentLogger.apply(
        this.getClass().getSimpleName() + "::getChannelSegments",
        () -> getChannelSegments(cachedWfidsByCsd, wfdiscs, processingMaskMap),
        environment.getActiveProfiles());
  }

  private Map<ChannelSegmentDescriptor, List<ProcessingMask>> loadProcessingMasks(
      Collection<ChannelSegmentDescriptor> channelSegmentDescriptors) {
    return channelSegmentDescriptors.stream()
        .map(
            descriptor ->
                Map.entry(
                    descriptor,
                    processingMaskLoader.loadProcessingMasks(
                        descriptor.getChannel(),
                        descriptor.getStartTime(),
                        descriptor.getEndTime())))
        .collect(Collectors.toMap(Entry::getKey, Entry::getValue));
  }

  private Collection<ChannelSegment<Waveform>> getChannelSegments(
      Map<ChannelSegmentDescriptor, List<Long>> cachedWfidsByCsd,
      List<WfdiscDao> wfdiscs,
      Map<ChannelSegmentDescriptor, List<ProcessingMask>> processingMaskMap) {
    return cachedWfidsByCsd.entrySet().stream()
        .parallel()
        .map(
            csdWfidsEntry ->
                convertAndMaskChannelSegment(
                    csdWfidsEntry.getKey(),
                    wfdiscs.stream()
                        .filter(wfdisc -> csdWfidsEntry.getValue().contains(wfdisc.getId()))
                        .toList(),
                    processingMaskMap))
        .flatMap(Optional::stream)
        .toList();
  }

  private Optional<ChannelSegment<Waveform>> convertAndMaskChannelSegment(
      ChannelSegmentDescriptor csd,
      List<WfdiscDao> wfdiscs,
      Map<ChannelSegmentDescriptor, List<ProcessingMask>> processingMaskMap) {
    return Optional.ofNullable(converter.convert(csd, wfdiscs))
        .map(
            (var segment) -> {
              var data =
                  segment.getData().get().toBuilder()
                      .setMaskedBy(processingMaskMap.get(csd))
                      .build();
              return segment.toBuilder().setData(data).build();
            });
  }
}
