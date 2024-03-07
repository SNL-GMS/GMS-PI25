package gms.shared.waveform.bridge.repository;

import static gms.shared.stationdefinition.testfixtures.CSSDaoTestFixtures.WFDISC_DAO_1;
import static gms.shared.stationdefinition.testfixtures.CSSDaoTestFixtures.WFDISC_TEST_DAO_1;
import static gms.shared.stationdefinition.testfixtures.CSSDaoTestFixtures.WFDISC_TEST_DAO_3;
import static gms.shared.stationdefinition.testfixtures.CSSDaoTestFixtures.WFDISC_TEST_DAO_4;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.WAVEFORM_CHANNEL;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.WAVEFORM_CHANNEL_2;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.WAVEFORM_CHANNEL_LATER_ON_DATE;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelSegmentDescriptor;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelsTimeFacetRequest;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelsTimeFacetRequest2;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelsTimeFacetRequest3;
import static gms.shared.waveform.testfixture.WaveformTestFixtures.randomSamples0To1;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.refEq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.google.common.collect.Range;
import gms.shared.frameworks.systemconfig.SystemConfig;
import gms.shared.spring.utilities.framework.RetryService;
import gms.shared.stationdefinition.api.channel.util.ChannelsTimeFacetRequest;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.utils.Units;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.stationdefinition.database.connector.WfdiscDatabaseConnector;
import gms.shared.waveform.api.util.ChannelSegmentDescriptorRequest;
import gms.shared.waveform.api.util.ChannelTimeRangeRequest;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Timeseries;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.converter.ChannelSegmentConvertImpl;
import gms.shared.waveform.converter.ChannelSegmentConverter;
import gms.shared.waveform.testfixture.ChannelSegmentTestFixtures;
import gms.shared.waveform.testfixture.WaveformRequestTestFixtures;
import gms.shared.waveform.testfixture.WaveformTestFixtures;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.ignite.IgniteCache;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;

@ExtendWith(MockitoExtension.class)
class BridgedWaveformRepositoryTest {

  @InjectMocks BridgedWaveformRepository bridgedWaveformRepository;
  @Mock private WfdiscDatabaseConnector wfdiscDatabaseConnector;
  @Mock private ChannelSegmentConvertImpl channelSegmentConverter;
  @Mock private RetryService retryService;
  @Mock private Environment environment;

  @Mock
  private IgniteCache<ChannelSegmentDescriptor, List<Long>> channelSegmentDescriptorWfidsCache;

  @Mock private ProcessingMaskLoader processingMaskLoader;

  @Mock private SystemConfig systemConfig;

  static Stream<Arguments> getFindByChannelsAndTimeRangeArguments() {
    return Stream.of(
        arguments(
            WaveformRequestTestFixtures.channelTimeRangeRequest,
            List.of(WFDISC_DAO_1),
            List.of(Pair.of(List.of(WAVEFORM_CHANNEL), channelsTimeFacetRequest)),
            1),
        arguments(
            WaveformRequestTestFixtures.channelTimeRangeRequest,
            List.of(WFDISC_TEST_DAO_1, WFDISC_TEST_DAO_4),
            List.of(
                Pair.of(List.of(WAVEFORM_CHANNEL), channelsTimeFacetRequest),
                Pair.of(List.of(WAVEFORM_CHANNEL_LATER_ON_DATE), channelsTimeFacetRequest3)),
            2),
        arguments(
            WaveformRequestTestFixtures.channelTimeRangeRequest2Channels,
            List.of(WFDISC_TEST_DAO_1, WFDISC_TEST_DAO_3),
            List.of(
                Pair.of(List.of(WAVEFORM_CHANNEL, WAVEFORM_CHANNEL_2), channelsTimeFacetRequest2)),
            2));
  }

  static Stream<Arguments> getValidateChannelSegmentDescriptorArguments() {
    return Stream.of(
        // test Validate.isTrue(x.getStartTime().isBefore(x.getEndTime()));
        arguments(
            IllegalArgumentException.class,
            ChannelSegmentDescriptorRequest.builder()
                .setChannelSegmentDescriptors(
                    List.of(
                        ChannelSegmentDescriptor.from(
                            WAVEFORM_CHANNEL,
                            Instant.EPOCH.plus(10, ChronoUnit.MINUTES),
                            Instant.EPOCH,
                            Instant.EPOCH.plus(10, ChronoUnit.MINUTES))))
                .build()),
        // Validate.isTrue(x.getChannel().getEffectiveAt().isPresent());
        arguments(
            IllegalArgumentException.class,
            ChannelSegmentDescriptorRequest.builder()
                .setChannelSegmentDescriptors(
                    List.of(
                        ChannelSegmentDescriptor.from(
                            Channel.builder().setName("EntityRefOnly").build(),
                            Instant.EPOCH,
                            Instant.EPOCH,
                            Instant.EPOCH)))
                .build()),
        // test Validate.isTrue(x.getChannel().getEffectiveAt().get().isBefore(x.getEndTime()));
        arguments(
            IllegalArgumentException.class,
            ChannelSegmentDescriptorRequest.builder()
                .setChannelSegmentDescriptors(
                    List.of(
                        ChannelSegmentDescriptor.from(
                            WAVEFORM_CHANNEL,
                            Instant.EPOCH.plus(10, ChronoUnit.MINUTES),
                            Instant.EPOCH.minus(10, ChronoUnit.MINUTES),
                            Instant.EPOCH)))
                .build()));
  }

  @ParameterizedTest
  @MethodSource("getFindByChannelsAndTimeRangeArguments")
  void testFindByChannelsAndTimeRange(
      ChannelTimeRangeRequest request,
      List<WfdiscDao> wfDiscList,
      List<Pair<List<Channel>, ChannelsTimeFacetRequest>> findChannelsByNameAndTimeArgs,
      int expectedResult) {

    doReturn(wfDiscList)
        .when(wfdiscDatabaseConnector)
        .findWfdiscsByNameAndTimeRange(
            any(Collection.class), eq(request.getStartTime()), eq(request.getEndTime()));

    findChannelsByNameAndTimeArgs.stream()
        .forEach(
            channelRequestPair -> {
              List<Channel> channel = channelRequestPair.getLeft();
              assertNotNull(channel);

              doReturn(channelRequestPair.getLeft())
                  .when(retryService)
                  .retry(
                      anyString(),
                      any(HttpMethod.class),
                      eq(new HttpEntity<>(channelRequestPair.getRight())),
                      ArgumentMatchers.<ParameterizedTypeReference<List<Channel>>>any());

              for (int i = 0; i < channelRequestPair.getLeft().size(); i++) {
                Channel channelRequest = channelRequestPair.getLeft().get(i);

                // channelRequestPair.getLeft().forEach(channelRequest -> {
                ChannelSegment<Waveform> channelSegment =
                    ChannelSegment.<Waveform>builder()
                        .setId(
                            ChannelSegmentDescriptor.from(
                                channelRequest,
                                request.getStartTime(),
                                request.getEndTime(),
                                Instant.EPOCH))
                        .setData(
                            ChannelSegment.Data.<Waveform>builder()
                                .setMaskedBy(List.of()) // Defaulting processing mask to empty list
                                .setUnits(Units.MICROPASCALS)
                                .setTimeseriesType(Timeseries.Type.WAVEFORM)
                                .setTimeseries(
                                    List.of(
                                        randomSamples0To1(
                                            request.getStartTime(), request.getEndTime(), 40)))
                                .setMissingInputChannels(Set.of())
                                .build())
                        .build();
                doReturn(channelSegment)
                    .when(channelSegmentConverter)
                    .convert(refEq(channel.get(i), "data"), any(), any(), any());
              }
            });
    doReturn(new String[] {}).when(environment).getActiveProfiles();

    Collection<ChannelSegment<Waveform>> channelSegResult =
        bridgedWaveformRepository.findByChannelsAndTimeRange(
            request.getChannels(), request.getStartTime(), request.getEndTime());

    assertNotNull(channelSegResult);
    assertEquals(expectedResult, channelSegResult.size());
    channelSegResult.forEach(
        channelSegment -> {
          ChannelSegmentDescriptor descriptor = channelSegment.getId();
          assertTrue(
              Range.closed(request.getStartTime(), request.getEndTime())
                  .encloses(Range.closed(descriptor.getStartTime(), descriptor.getEndTime())));
        });
  }

  @ParameterizedTest
  @MethodSource("getFindByChannelSegmentDescriptorArguments")
  void testFindByChannelSegmentDescriptors(
      Collection<ChannelSegment<Waveform>> expected,
      Collection<ChannelSegmentDescriptor> channelSegmentDescriptors,
      TriConsumer<
              IgniteCache<ChannelSegmentDescriptor, List<Long>>,
              WfdiscDatabaseConnector,
              ChannelSegmentConverter>
          mockSetup,
      TriConsumer<
              IgniteCache<ChannelSegmentDescriptor, List<Long>>,
              WfdiscDatabaseConnector,
              ChannelSegmentConverter>
          mockVerification) {

    doReturn(new String[] {}).when(environment).getActiveProfiles();
    mockSetup.accept(
        channelSegmentDescriptorWfidsCache, wfdiscDatabaseConnector, channelSegmentConverter);
    Collection<ChannelSegment<Waveform>> actual =
        bridgedWaveformRepository.findByChannelSegmentDescriptors(channelSegmentDescriptors);

    // Remove the canned processing masks. The ChannelSegmentDescriptors used for
    // this test have times offset from now (why??), meaning the canned processing
    // masks will not be deterministic.
    // TODO: Dont use now, or figure out some other way not to need this.
    actual =
        actual.stream()
            .map(
                segment -> {
                  var newData = segment.getData().get().toBuilder().setMaskedBy(List.of()).build();
                  return segment.toBuilder().setData(newData).build();
                })
            .collect(Collectors.toList());
    assertEquals(expected, actual);

    mockVerification.accept(
        channelSegmentDescriptorWfidsCache, wfdiscDatabaseConnector, channelSegmentConverter);
    verifyNoInteractions(retryService);
  }

  static Stream<Arguments> getFindByChannelSegmentDescriptorArguments() {
    ArgumentCaptor<Collection<Long>> captor = ArgumentCaptor.forClass(Collection.class);

    ChannelSegment<Waveform> cacheHitResult =
        ChannelSegmentTestFixtures.createChannelSegment(
            channelSegmentDescriptor.getChannel(),
            List.of(
                WaveformTestFixtures.randomSamples0To1(
                    channelSegmentDescriptor.getStartTime(),
                    channelSegmentDescriptor.getEndTime(),
                    20)),
            channelSegmentDescriptor.getCreationTime());
    TriConsumer<
            IgniteCache<ChannelSegmentDescriptor, List<Long>>,
            WfdiscDatabaseConnector,
            ChannelSegmentConverter>
        cacheHitSetup =
            (cache, wfdiscDatabaseConnector, channelSegmentConverter) -> {
              when(cache.containsKey(channelSegmentDescriptor)).thenReturn(true);
              when(cache.get(channelSegmentDescriptor)).thenReturn(List.of(WFDISC_DAO_1.getId()));
              when(wfdiscDatabaseConnector.findWfdiscsByWfids(anyCollection()))
                  .thenReturn(List.of(WFDISC_DAO_1));
              when(channelSegmentConverter.convert(channelSegmentDescriptor, List.of(WFDISC_DAO_1)))
                  .thenReturn(cacheHitResult);
            };

    TriConsumer<
            IgniteCache<ChannelSegmentDescriptor, List<Long>>,
            WfdiscDatabaseConnector,
            ChannelSegmentConverter>
        cacheHitVerification =
            (cache, wfdiscDatabaseConnector, channelSegmentConverter) -> {
              verify(cache).containsKey(channelSegmentDescriptor);
              verify(cache).get(channelSegmentDescriptor);
              verify(wfdiscDatabaseConnector).findWfdiscsByWfids(captor.capture());
              assertTrue(captor.getValue().containsAll(Set.of(WFDISC_DAO_1.getId())));
              verify(channelSegmentConverter)
                  .convert(channelSegmentDescriptor, List.of(WFDISC_DAO_1));
              verifyNoMoreInteractions(cache, wfdiscDatabaseConnector, channelSegmentConverter);
            };

    TriConsumer<
            IgniteCache<ChannelSegmentDescriptor, List<Long>>,
            WfdiscDatabaseConnector,
            ChannelSegmentConverter>
        cacheMissSetup =
            (cache, wfdiscDatabaseConnector, channelSegmentConverter) ->
                when(cache.containsKey(channelSegmentDescriptor)).thenReturn(false);

    TriConsumer<
            IgniteCache<ChannelSegmentDescriptor, List<Long>>,
            WfdiscDatabaseConnector,
            ChannelSegmentConverter>
        cacheMissVerification =
            (cache, wfdiscDatabaseConnector, channelSegmentConverter) -> {
              verify(cache).containsKey(channelSegmentDescriptor);
              verify(wfdiscDatabaseConnector).findWfdiscsByWfids(captor.capture());
              assertTrue(captor.getValue().isEmpty());
              verifyNoMoreInteractions(cache, wfdiscDatabaseConnector, channelSegmentConverter);
            };

    return Stream.of(
        arguments(
            List.of(cacheHitResult),
            List.of(channelSegmentDescriptor),
            cacheHitSetup,
            cacheHitVerification),
        arguments(
            List.of(), List.of(channelSegmentDescriptor), cacheMissSetup, cacheMissVerification));
  }

  @ParameterizedTest
  @MethodSource("getValidateChannelSegmentDescriptorArguments")
  void testValidateChannelSegmentDescriptor(
      Class<? extends Exception> expectedException, ChannelSegmentDescriptorRequest csdRequest) {

    assertThrows(
        expectedException,
        () ->
            bridgedWaveformRepository.findByChannelSegmentDescriptors(
                csdRequest.getChannelSegmentDescriptors()));
  }

  @FunctionalInterface
  private static interface TriConsumer<A, B, C> {

    void accept(A first, B second, C third);
  }
}
