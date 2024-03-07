package gms.shared.stationdefinition.accessor;

import gms.shared.frameworks.systemconfig.SystemConfig;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.api.channel.util.ChannelGroupsTimeFacetRequest;
import gms.shared.stationdefinition.api.channel.util.ChannelGroupsTimeRangeRequest;
import gms.shared.stationdefinition.api.channel.util.ChannelGroupsTimeRequest;
import gms.shared.stationdefinition.api.channel.util.ChannelsTimeFacetRequest;
import gms.shared.stationdefinition.api.channel.util.ChannelsTimeRangeRequest;
import gms.shared.stationdefinition.api.channel.util.ChannelsTimeRequest;
import gms.shared.stationdefinition.api.channel.util.ResponseTimeFacetRequest;
import gms.shared.stationdefinition.api.channel.util.ResponseTimeRangeRequest;
import gms.shared.stationdefinition.api.station.util.StationChangeTimesRequest;
import gms.shared.stationdefinition.api.station.util.StationGroupsTimeFacetRequest;
import gms.shared.stationdefinition.api.station.util.StationGroupsTimeRangeRequest;
import gms.shared.stationdefinition.api.station.util.StationGroupsTimeRequest;
import gms.shared.stationdefinition.api.station.util.StationsTimeFacetRequest;
import gms.shared.stationdefinition.api.station.util.StationsTimeRangeRequest;
import gms.shared.stationdefinition.api.station.util.StationsTimeRequest;
import gms.shared.stationdefinition.api.util.Request;
import gms.shared.stationdefinition.api.util.TimeRangeRequest;
import gms.shared.stationdefinition.cache.RequestCache;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelGroup;
import gms.shared.stationdefinition.coi.channel.Response;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * A {@link StationDefinitionAccessor} implementation that allows for RequestCaching. This is
 * intended to be used as member in a chain of command where cache misses passed to the delegate.
 */
@Primary
@Profile("!disable-caching")
@Component("requestCacheAccessor")
public class RequestCachingStationDefinitionAccessor implements StationDefinitionAccessor {

  private final StationDefinitionFacetingUtility stationDefinitionFacetingUtility;
  private final StationDefinitionAccessor delegate;
  private final RequestCache requestCache;

  @Autowired
  public RequestCachingStationDefinitionAccessor(
      SystemConfig systemConfig,
      @Qualifier("entityCacheAccessor") StationDefinitionAccessor delegate,
      @Qualifier("stationDefinitionRequestCache") RequestCache requestCache) {
    this.delegate = delegate;
    this.requestCache = requestCache;
    this.stationDefinitionFacetingUtility = StationDefinitionFacetingUtility.create(this);
  }

  @Override
  public List<StationGroup> findStationGroupsByNameAndTime(
      List<String> stationGroupNames, Instant effectiveAt) {

    Instant effectiveTime;
    Request request;
    if (effectiveAt == null) {
      request = StationGroupsTimeRequest.builder().setStationGroupNames(stationGroupNames).build();
      effectiveTime = Instant.now();
    } else {
      request =
          StationGroupsTimeRequest.builder()
              .setStationGroupNames(stationGroupNames)
              .setEffectiveTime(effectiveAt)
              .build();
      effectiveTime = effectiveAt;
    }

    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<StationGroup> delegateResponse =
          delegate.findStationGroupsByNameAndTime(stationGroupNames, effectiveTime);

      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(StationGroup.class::isInstance)
          .map(StationGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<StationGroup> findStationGroupsByNameAndTime(
      List<String> stationGroupNames,
      Instant effectiveTime,
      FacetingDefinition facetingDefinition) {
    Request request =
        StationGroupsTimeFacetRequest.builder()
            .setStationGroupNames(stationGroupNames)
            .setFacetingDefinition(facetingDefinition)
            .setEffectiveTime(effectiveTime)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<StationGroup> delegateResponse =
          delegate.findStationGroupsByNameAndTime(
              stationGroupNames, effectiveTime, facetingDefinition);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(StationGroup.class::isInstance)
          .map(StationGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<StationGroup> findStationGroupsByNameAndTimeRange(
      List<String> stationGroupNames, Instant startTime, Instant endTime) {
    var timeRangeRequest =
        TimeRangeRequest.builder().setStartTime(startTime).setEndTime(endTime).build();
    Request request =
        StationGroupsTimeRangeRequest.builder()
            .setStationGroupNames(stationGroupNames)
            .setTimeRange(timeRangeRequest)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<StationGroup> delegateResponse =
          delegate.findStationGroupsByNameAndTimeRange(stationGroupNames, startTime, endTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(StationGroup.class::isInstance)
          .map(StationGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public void storeStationGroups(List<StationGroup> stationGroups) {
    delegate.storeStationGroups(stationGroups);
  }

  @Override
  public List<Station> findStationsByNameAndTime(List<String> stationNames, Instant effectiveAt) {
    Instant effectiveTime;
    Request request;
    if (effectiveAt == null) {
      request = StationsTimeRequest.builder().setStationNames(stationNames).build();
      effectiveTime = Instant.now();
    } else {
      request =
          StationsTimeRequest.builder()
              .setStationNames(stationNames)
              .setEffectiveTime(effectiveAt)
              .build();
      effectiveTime = effectiveAt;
    }

    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Station> delegateResponse =
          delegate.findStationsByNameAndTime(stationNames, effectiveTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Station.class::isInstance)
          .map(Station.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Station> findStationsByNameAndTime(
      List<String> stationNames, Instant effectiveTime, FacetingDefinition facetingDefinition) {
    Request request =
        StationsTimeFacetRequest.builder()
            .setStationNames(stationNames)
            .setFacetingDefinition(facetingDefinition)
            .setEffectiveTime(effectiveTime)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Station> delegateResponse =
          delegate.findStationsByNameAndTime(stationNames, effectiveTime, facetingDefinition);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Station.class::isInstance)
          .map(Station.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Station> findStationsByNameAndTimeRange(
      List<String> stationNames, Instant startTime, Instant endTime) {
    var timeRangeRequest =
        TimeRangeRequest.builder().setStartTime(startTime).setEndTime(endTime).build();
    Request request =
        StationsTimeRangeRequest.builder()
            .setStationNames(stationNames)
            .setTimeRange(timeRangeRequest)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Station> delegateResponse =
          delegate.findStationsByNameAndTimeRange(stationNames, startTime, endTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Station.class::isInstance)
          .map(Station.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Instant> determineStationChangeTimes(
      Station station, Instant startTime, Instant endTime) {
    var stationChangeTimesRequest = StationChangeTimesRequest.create(station, startTime, endTime);
    Collection<Object> cacheResponse = requestCache.retrieve(stationChangeTimesRequest);
    if (cacheResponse.isEmpty()) {
      List<Instant> delegateResponse =
          delegate.determineStationChangeTimes(station, startTime, endTime);
      requestCache.put(stationChangeTimesRequest, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Instant.class::isInstance)
          .map(Instant.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public void storeStations(List<Station> stations) {
    delegate.storeStations(stations);
  }

  @Override
  public List<ChannelGroup> findChannelGroupsByNameAndTime(
      List<String> channelGroupNames, Instant effectiveAt) {

    Instant effectiveTime;
    Request request;
    if (effectiveAt == null) {
      request = ChannelGroupsTimeRequest.builder().setChannelGroupNames(channelGroupNames).build();
      effectiveTime = Instant.now();
    } else {
      request =
          ChannelGroupsTimeRequest.builder()
              .setChannelGroupNames(channelGroupNames)
              .setEffectiveTime(effectiveAt)
              .build();
      effectiveTime = effectiveAt;
    }

    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<ChannelGroup> delegateResponse =
          delegate.findChannelGroupsByNameAndTime(channelGroupNames, effectiveTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(ChannelGroup.class::isInstance)
          .map(ChannelGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<ChannelGroup> findChannelGroupsByNameAndTime(
      List<String> channelGroupNames,
      Instant effectiveTime,
      FacetingDefinition facetingDefinition) {
    Request request =
        ChannelGroupsTimeFacetRequest.builder()
            .setChannelGroupNames(channelGroupNames)
            .setFacetingDefinition(facetingDefinition)
            .setEffectiveTime(effectiveTime)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<ChannelGroup> delegateResponse =
          delegate.findChannelGroupsByNameAndTime(
              channelGroupNames, effectiveTime, facetingDefinition);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(ChannelGroup.class::isInstance)
          .map(ChannelGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<ChannelGroup> findChannelGroupsByNameAndTimeRange(
      List<String> channelGroupNames, Instant startTime, Instant endTime) {
    var timeRangeRequest =
        TimeRangeRequest.builder().setStartTime(startTime).setEndTime(endTime).build();
    Request request =
        ChannelGroupsTimeRangeRequest.builder()
            .setChannelGroupNames(channelGroupNames)
            .setTimeRange(timeRangeRequest)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<ChannelGroup> delegateResponse =
          delegate.findChannelGroupsByNameAndTimeRange(channelGroupNames, startTime, endTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(ChannelGroup.class::isInstance)
          .map(ChannelGroup.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public void storeChannelGroups(List<ChannelGroup> channelGroups) {
    delegate.storeChannelGroups(channelGroups);
  }

  @Override
  public List<Channel> findChannelsByNameAndTime(List<String> channelNames, Instant effectiveAt) {
    Instant effectiveTime;
    Request request;
    if (effectiveAt == null) {
      request = ChannelsTimeRequest.builder().setChannelNames(channelNames).build();
      effectiveTime = Instant.now();
    } else {
      request =
          ChannelsTimeRequest.builder()
              .setChannelNames(channelNames)
              .setEffectiveTime(effectiveAt)
              .build();
      effectiveTime = effectiveAt;
    }

    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Channel> delegateResponse =
          delegate.findChannelsByNameAndTime(channelNames, effectiveTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Channel.class::isInstance)
          .map(Channel.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Channel> findChannelsByNameAndTime(
      List<String> channelNames, Instant effectiveAt, FacetingDefinition facetingDefinition) {
    Request request =
        ChannelsTimeFacetRequest.builder()
            .setChannelNames(channelNames)
            .setFacetingDefinition(facetingDefinition)
            .setEffectiveTime(effectiveAt)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Channel> delegateResponse =
          delegate.findChannelsByNameAndTime(channelNames, effectiveAt, facetingDefinition);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      // apply faceting to cached channels
      return cacheResponse.stream()
          .filter(Channel.class::isInstance)
          .map(Channel.class::cast)
          .map(
              channel ->
                  stationDefinitionFacetingUtility.populateFacets(
                      channel, facetingDefinition, effectiveAt))
          .filter(Objects::nonNull)
          .distinct()
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Channel> findChannelsByNameAndTimeRange(
      List<String> channelNames, Instant startTime, Instant endTime) {
    var timeRangeRequest =
        TimeRangeRequest.builder().setStartTime(startTime).setEndTime(endTime).build();
    Request request =
        ChannelsTimeRangeRequest.builder()
            .setChannelNames(channelNames)
            .setTimeRange(timeRangeRequest)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Channel> delegateResponse =
          delegate.findChannelsByNameAndTimeRange(channelNames, startTime, endTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Channel.class::isInstance)
          .map(Channel.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public void storeChannels(List<Channel> channels) {
    delegate.storeChannels(channels);
  }

  @Override
  public List<Response> findResponsesById(Collection<UUID> reponseIds, Instant effectiveTime) {

    Request request =
        ResponseTimeFacetRequest.builder()
            .setResponseIds(reponseIds)
            .setEffectiveTime(Optional.of(effectiveTime))
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);

    if (cacheResponse.isEmpty()) {
      List<Response> delegateReply = delegate.findResponsesById(reponseIds, effectiveTime);
      requestCache.put(request, new ArrayList<>(delegateReply));
      return delegateReply;
    } else {
      return cacheResponse.stream()
          .filter(Response.class::isInstance)
          .map(Response.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Response> findResponsesById(
      Collection<UUID> responseIds, Instant effectiveTime, FacetingDefinition facetingDefinition) {
    Request request =
        ResponseTimeFacetRequest.builder()
            .setResponseIds(responseIds)
            .setFacetingDefinition(Optional.of(facetingDefinition))
            .setEffectiveTime(Optional.of(effectiveTime))
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);

    if (cacheResponse.isEmpty()) {
      List<Response> delegateReply =
          delegate.findResponsesById(responseIds, effectiveTime, facetingDefinition);
      requestCache.put(request, new ArrayList<>(delegateReply));
      return delegateReply;
    } else {
      // apply faceting to cached responses
      return cacheResponse.stream()
          .filter(Response.class::isInstance)
          .map(Response.class::cast)
          .map(
              response ->
                  stationDefinitionFacetingUtility.populateFacets(
                      response, facetingDefinition, effectiveTime))
          .filter(Objects::nonNull)
          .distinct()
          .collect(Collectors.toList());
    }
  }

  @Override
  public List<Response> findResponsesByIdAndTimeRange(
      Collection<UUID> responseIds, Instant startTime, Instant endTime) {
    var timeRangeRequest =
        TimeRangeRequest.builder().setStartTime(startTime).setEndTime(endTime).build();
    Request request =
        ResponseTimeRangeRequest.builder()
            .setResponseIds(responseIds)
            .setTimeRange(timeRangeRequest)
            .build();
    Collection<Object> cacheResponse = requestCache.retrieve(request);
    if (cacheResponse.isEmpty()) {
      List<Response> delegateResponse =
          delegate.findResponsesByIdAndTimeRange(responseIds, startTime, endTime);
      requestCache.put(request, new ArrayList<>(delegateResponse));
      return delegateResponse;
    } else {
      return cacheResponse.stream()
          .filter(Response.class::isInstance)
          .map(Response.class::cast)
          .collect(Collectors.toList());
    }
  }

  @Override
  public Response loadResponseFromWfdisc(long wfdiscRecord) {
    return delegate.loadResponseFromWfdisc(wfdiscRecord);
  }

  @Override
  public void storeResponses(List<Response> responses) {
    delegate.storeResponses(responses);
  }

  @Override
  public void cache(List<String> stationGroupNames, Instant startTime, Instant endTime) {
    delegate.cache(stationGroupNames, startTime, endTime);
  }
}
