package gms.shared.waveform.manager;

import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelSegmentDescriptorRequest;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.channelTimeRangeRequest;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.facetedChannelSegmentDescriptorRequest;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.facetedChannelTimeRangeRequest;
import static gms.shared.waveform.testfixture.WaveformRequestTestFixtures.unfacetedChannelTimeRangeRequest;
import static org.mockito.Mockito.times;

import gms.shared.frameworks.systemconfig.SystemConfig;
import gms.shared.spring.utilities.framework.SpringTestBase;
import gms.shared.waveform.api.WaveformAccessor;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;

@WebMvcTest(WaveformManager.class)
class WaveformManagerTest extends SpringTestBase {

  @MockBean private SystemConfig systemConfig;

  @MockBean private WaveformAccessor waveformAccessorImpl;

  @Test
  void testFindWaveformsByChannelsAndTimeRangeWithoutFacet() throws Exception {

    MockHttpServletResponse response =
        postResult(
            "/waveform/channel-segment/query/channel-timerange",
            channelTimeRangeRequest,
            HttpStatus.OK);

    Mockito.verify(waveformAccessorImpl, times(1))
        .findByChannelsAndTimeRange(
            channelTimeRangeRequest.getChannels(),
            channelTimeRangeRequest.getStartTime(),
            channelTimeRangeRequest.getEndTime());
  }

  @Test
  void testFindWaveformsByChannelsAndTimeRangeWithFacet() throws Exception {

    MockHttpServletResponse response =
        postResult(
            "/waveform/channel-segment/query/channel-timerange",
            facetedChannelTimeRangeRequest,
            HttpStatus.OK);

    Mockito.verify(waveformAccessorImpl, times(1))
        .findByChannelsAndTimeRange(
            facetedChannelTimeRangeRequest.getChannels(),
            facetedChannelTimeRangeRequest.getStartTime(),
            facetedChannelTimeRangeRequest.getEndTime(),
            facetedChannelTimeRangeRequest.getFacetingDefinition().get());
  }

  @Test
  void testFindWaveformsByChannelSegmentDescriptorsWithoutFacet() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/channel-segment/query/channel-segment-descriptors",
            channelSegmentDescriptorRequest,
            HttpStatus.OK);

    Mockito.verify(waveformAccessorImpl, times(1))
        .findByChannelSegmentDescriptors(
            channelSegmentDescriptorRequest.getChannelSegmentDescriptors());
  }

  @Test
  void testFindWaveformsByChannelSegmentDescriptorsWithFacet() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/channel-segment/query/channel-segment-descriptors",
            facetedChannelSegmentDescriptorRequest,
            HttpStatus.OK);

    Mockito.verify(waveformAccessorImpl, times(1))
        .findByChannelNamesAndSegmentDescriptor(
            facetedChannelSegmentDescriptorRequest.getChannelSegmentDescriptors(),
            facetedChannelSegmentDescriptorRequest.getFacetingDefinition().get());
  }

  @Test
  void testFindQcSegmentsByChannelsandTimeRangeCanned() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/qc-segment/query/channel-timerange/canned",
            channelTimeRangeRequest,
            HttpStatus.OK);

    Mockito.verify(waveformAccessorImpl, times(1))
        .findQcSegmentsByChannelsandTimeRangeCanned(
            channelTimeRangeRequest.getChannels(),
            channelTimeRangeRequest.getStartTime(),
            channelTimeRangeRequest.getEndTime());
  }

  @Test
  void testFindQcSegmentsByChannelsandTimeRangeCannedWithFacet() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/qc-segment/query/channel-timerange/canned",
            facetedChannelTimeRangeRequest,
            HttpStatus.OK);

    Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());

    Mockito.verify(waveformAccessorImpl, times(1))
        .findQcSegmentsByChannelsandTimeRangeCanned(
            facetedChannelTimeRangeRequest.getChannels(),
            facetedChannelTimeRangeRequest.getStartTime(),
            facetedChannelTimeRangeRequest.getEndTime(),
            facetedChannelTimeRangeRequest.getFacetingDefinition().get());
  }

  @Test
  void testFindQcSegmentsByChannelsandTimeRangeWitFacet() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/qc-segment/query/channel-timerange",
            facetedChannelTimeRangeRequest,
            HttpStatus.OK);

    Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());

    Mockito.verify(waveformAccessorImpl, times(1))
        .findQcSegmentsByChannelsandTimeRangeCanned(
            facetedChannelTimeRangeRequest.getChannels(),
            facetedChannelTimeRangeRequest.getStartTime(),
            facetedChannelTimeRangeRequest.getEndTime(),
            facetedChannelTimeRangeRequest.getFacetingDefinition().get());
  }

  @Test
  void testFindQcSegmentsByChannelsandTimeRangeWithoutFacet() throws Exception {
    MockHttpServletResponse response =
        postResult(
            "/waveform/qc-segment/query/channel-timerange",
            unfacetedChannelTimeRangeRequest,
            HttpStatus.OK);

    Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());

    Mockito.verify(waveformAccessorImpl, times(1))
        .findQcSegmentsByChannelsAndTimeRange(
            unfacetedChannelTimeRangeRequest.getChannels(),
            unfacetedChannelTimeRangeRequest.getStartTime(),
            unfacetedChannelTimeRangeRequest.getEndTime());
  }
}
