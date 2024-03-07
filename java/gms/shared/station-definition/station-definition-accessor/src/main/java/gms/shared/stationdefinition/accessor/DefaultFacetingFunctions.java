package gms.shared.stationdefinition.accessor;

import com.google.common.base.Functions;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelGroup;
import gms.shared.stationdefinition.coi.channel.RelativePositionChannelPair;
import gms.shared.stationdefinition.coi.channel.Response;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.station.StationGroup;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class DefaultFacetingFunctions {

  private static final Logger LOGGER = LoggerFactory.getLogger(DefaultFacetingFunctions.class);

  private DefaultFacetingFunctions() {
    // Hide implicit public constructor
  }

  public static UnaryOperator<List<StationGroup>> getStationGroupForTimeFacetingFunction(
      EntityCachingStationDefinitionAccessor accessor, Instant effectiveTime) {

    return stationGroups -> {
      List<String> stationNames =
          stationGroups.stream()
              .flatMap(stationGroup -> stationGroup.getStations().stream())
              .filter(station -> station.getEffectiveAt().isEmpty())
              .map(Station::getName)
              .distinct()
              .collect(Collectors.toList());

      Map<String, Station> versionReferenceStations;
      if (!stationNames.isEmpty()) {
        versionReferenceStations =
            accessor.findStationsByNameAndTimeEmptyData(stationNames, effectiveTime).stream()
                .collect(Collectors.toMap(Station::getName, Function.identity()));
      } else {
        versionReferenceStations = new HashMap<>();
      }

      return stationGroups.stream()
          .map(
              stationGroup -> {

                // ensure that all stations in station group have effective at time
                List<Station> stations =
                    stationGroup.getStations().stream()
                        .map(
                            station ->
                                versionReferenceStations
                                    .getOrDefault(station.getName(), station)
                                    .toBuilder()
                                    .setData(Optional.empty())
                                    .build())
                        .collect(Collectors.toList());

                return stationGroup.toBuilder()
                    .setData(
                        stationGroup.getData().orElseThrow().toBuilder()
                            .setStations(stations)
                            .build())
                    .build();
              })
          .collect(Collectors.toList());
    };
  }

  public static UnaryOperator<List<Station>> getStationsForTimeFacetingFunction(
      EntityCachingStationDefinitionAccessor accessor, Instant effectiveTime) {

    return stations -> {
      List<String> channelNames =
          stations.stream()
              .flatMap(station -> station.getAllRawChannels().stream())
              .filter(channel -> channel.getEffectiveAt().isEmpty())
              .map(Channel::getName)
              .collect(Collectors.toList());

      Map<String, Channel> versionReferenceChannels;
      if (!channelNames.isEmpty()) {
        versionReferenceChannels =
            accessor.findChannelsByNameAndTimeEmptyData(channelNames, effectiveTime).stream()
                .collect(Collectors.toMap(Channel::getName, Function.identity()));
      } else {
        versionReferenceChannels = new HashMap<>();
      }

      List<String> channelGroupNames =
          stations.stream()
              .flatMap(station -> station.getChannelGroups().stream())
              .filter(
                  channelGroup ->
                      channelGroup.getEffectiveAt().isEmpty()
                          || !channelGroupHasVersionChannels(channelGroup))
              .map(ChannelGroup::getName)
              .collect(Collectors.toList());

      Map<String, ChannelGroup> channelGroupFacets;
      if (!channelGroupNames.isEmpty()) {
        // The faceting for channel groups by time is the same as the faceting for channel groups
        // within stations by time
        channelGroupFacets =
            accessor.findChannelGroupsByNameAndTime(channelGroupNames, effectiveTime).stream()
                .collect(Collectors.toMap(ChannelGroup::getName, Function.identity()));
      } else {
        channelGroupFacets = new HashMap<>();
      }

      return stations.stream()
          .map(
              station -> {
                List<Channel> rawChannels =
                    station.getAllRawChannels().stream()
                        .map(
                            channel ->
                                versionReferenceChannels
                                    .getOrDefault(channel.getName(), channel)
                                    .toBuilder()
                                    .setData(Optional.empty())
                                    .build())
                        .collect(Collectors.toList());

                List<String> channelNamesForFiltering =
                    station.getAllRawChannels().stream()
                        .map(Channel::getName)
                        .collect(Collectors.toList());

                List<ChannelGroup> channelGroups =
                    station.getChannelGroups().stream()
                        .map(
                            channelGroup ->
                                channelGroupFacets.getOrDefault(
                                    channelGroup.getName(), channelGroup))
                        .filter(
                            channelGroup ->
                                channelNamesForFiltering.containsAll(
                                    channelGroup.getChannels().stream()
                                        .map(Channel::getName)
                                        .collect(Collectors.toList())))
                        .collect(Collectors.toList());

                // filter version reference channels using channel group raw channels
                List<Channel> filteredReferenceChannels =
                    filterVersionReferenceChannels(rawChannels, channelGroups);

                if (channelGroups.isEmpty() || filteredReferenceChannels.isEmpty()) {
                  LOGGER.warn(
                      "No channel group or channels found for station {}", station.getName());
                  return null;
                }

                Map<String, Channel> channelNameMap =
                    rawChannels.stream()
                        .collect(Collectors.toMap(Channel::getName, Functions.identity()));

                List<RelativePositionChannelPair> relPositions =
                    station.getRelativePositionChannelPairs().stream()
                        .map(
                            (RelativePositionChannelPair relPos) -> {
                              var posChan = channelNameMap.get(relPos.getChannel().getName());
                              if (posChan != null) {
                                relPos =
                                    RelativePositionChannelPair.create(
                                        relPos.getRelativePosition(), posChan);
                              }
                              return relPos;
                            })
                        .toList();

                return station.toBuilder()
                    .setData(
                        station.getData().orElseThrow().toBuilder()
                            .setAllRawChannels(filteredReferenceChannels)
                            .setChannelGroups(channelGroups)
                            .setRelativePositionChannelPairs(relPositions)
                            .build())
                    .build();
              })
          .filter(Objects::nonNull)
          .collect(Collectors.toList());
    };
  }

  private static boolean channelGroupHasVersionChannels(ChannelGroup channelGroup) {

    if (channelGroup.isPresent()) {
      var channels = channelGroup.getChannels();

      for (Channel channel : channels) {
        if (channel.getEffectiveAt().isEmpty()) {
          return false;
        }
      }

      return true;
    }
    return false;
  }

  public static UnaryOperator<List<Station>> getStationsForTimeRangeFacetingFunction(
      EntityCachingStationDefinitionAccessor accessor, Instant startTime, Instant endTime) {

    return stations ->
        stations.stream()
            .map(station -> getStationFacetedForTimeRange(station, accessor))
            .filter(Objects::nonNull)
            .toList();
  }

  private static Station getStationFacetedForTimeRange(
      Station station, EntityCachingStationDefinitionAccessor accessor) {

    List<String> channelNamesForFiltering =
        station.getAllRawChannels().stream().map(Channel::getName).collect(Collectors.toList());

    List<ChannelGroup> populatedChannelGroups =
        station.getChannelGroups().stream()
            .filter(chanGroup -> chanGroup.getEffectiveAt().isPresent() && chanGroup.isPresent())
            .collect(Collectors.toList());

    List<String> names =
        station.getChannelGroups().stream()
            .filter(chanGroup -> !chanGroup.getEffectiveAt().isPresent() || !chanGroup.isPresent())
            .map(ChannelGroup::getName)
            .toList();

    populatedChannelGroups.addAll(
        accessor.findChannelGroupsByNameAndTime(names, station.getEffectiveAt().orElseThrow()));

    // channel group used for stations in a range query is the version that exists at
    // the start of the station
    List<ChannelGroup> channelGroups =
        populatedChannelGroups.stream()
            .filter(Objects::nonNull)
            .filter(
                channelGroup ->
                    channelNamesForFiltering.containsAll(
                        channelGroup.getChannels().stream()
                            .map(Channel::getName)
                            .collect(Collectors.toList())))
            .map(
                channelGroup -> {
                  List<Channel> entityChannels =
                      channelGroup.getChannels().stream()
                          .map(Channel::toEntityReference)
                          .collect(Collectors.toList());

                  return channelGroup.toBuilder()
                      .setData(
                          channelGroup.getData().orElseThrow().toBuilder()
                              .setChannels(entityChannels)
                              .build())
                      .build();
                })
            .collect(Collectors.toList());

    List<Channel> rawChannels =
        station.getAllRawChannels().stream().map(Channel::toEntityReference).toList();

    // filter version reference channels using channel group raw channels
    List<Channel> filteredReferenceChannels =
        filterVersionReferenceChannels(rawChannels, channelGroups);

    if (channelGroups.isEmpty() || filteredReferenceChannels.isEmpty()) {
      return null;
    }

    return station.toBuilder()
        .setData(
            station.getData().orElseThrow().toBuilder()
                .setAllRawChannels(filteredReferenceChannels)
                .setChannelGroups(channelGroups)
                .build())
        .build();
  }

  public static UnaryOperator<List<ChannelGroup>> getChannelGroupForTimeFacetingFunction(
      EntityCachingStationDefinitionAccessor accessor, Instant effectiveTime) {

    return channelGroups -> {
      List<String> channelNames =
          channelGroups.stream()
              .flatMap(channelGroup -> channelGroup.getChannels().stream())
              .filter(channelGroup -> channelGroup.getEffectiveAt().isEmpty())
              .map(Channel::getName)
              .collect(Collectors.toList());

      Map<String, Channel> versionReferenceChannels;
      if (!channelNames.isEmpty()) {
        versionReferenceChannels =
            accessor.findChannelsByNameAndTimeEmptyData(channelNames, effectiveTime).stream()
                .collect(Collectors.toMap(Channel::getName, Function.identity()));
      } else {
        versionReferenceChannels = new HashMap<>();
      }

      return channelGroups.stream()
          .map(
              channelGroup -> {
                List<Channel> channels =
                    channelGroup.getChannels().stream()
                        .map(
                            channel ->
                                versionReferenceChannels
                                    .getOrDefault(channel.getName(), channel)
                                    .toBuilder()
                                    .setData(Optional.empty())
                                    .build())
                        .collect(Collectors.toList());

                if (channels.isEmpty()) {
                  return null;
                }

                return channelGroup.toBuilder()
                    .setData(
                        channelGroup.getData().orElseThrow().toBuilder()
                            .setChannels(channels)
                            .build())
                    .build();
              })
          .filter(Objects::nonNull)
          .collect(Collectors.toList());
    };
  }

  public static UnaryOperator<List<Channel>> getChannelsForTimeFacetingFunction(
      EntityCachingStationDefinitionAccessor accessor, Instant effectiveTime) {

    return channels -> {
      List<UUID> uuids =
          channels.stream()
              .map(Channel::getResponse)
              .filter(response -> response.isPresent() && !response.get().isPresent())
              .map(res -> res.get().getId())
              .collect(Collectors.toList());

      Map<UUID, Response> responseMap;
      if (!uuids.isEmpty()) {
        responseMap =
            accessor.findResponsesById(uuids, effectiveTime).stream()
                .collect(Collectors.toMap(Response::getId, Function.identity()));
      } else {
        responseMap = new HashMap<>();
      }

      List<String> stationNames =
          channels.stream()
              .map(Channel::getData)
              .flatMap(Optional::stream)
              .map(chanData -> chanData.getStation().getName())
              .distinct()
              .toList();

      UnaryOperator<List<Station>> versionFacet =
          (List<Station> stations) ->
              stations.stream().map(Station::createVersionReference).toList();

      Map<String, Station> stationNameMap =
          accessor.findStationsByNameAndTime(stationNames, effectiveTime, versionFacet).stream()
              .collect(Collectors.toMap(Station::getName, Functions.identity()));

      return channels.stream()
          .map(
              channel -> {
                var dataBuilder = channel.getData().orElseThrow().toBuilder();
                if (channel.getResponse().isPresent()) {
                  var res =
                      responseMap.getOrDefault(
                          channel.getResponse().get().getId(), channel.getResponse().get());
                  dataBuilder.setResponse(res);
                }
                var posStation = stationNameMap.get(channel.getStation().getName());
                if (posStation != null) {
                  dataBuilder.setStation(posStation);
                }

                return channel.toBuilder().setData(dataBuilder.build()).build();
              })
          .collect(Collectors.toList());
    };
  }

  /**
   * Filtering operation to remove version reference channels that don't exist in channel groups
   *
   * @param versionReferenceChannels list of version reference channels
   * @param channelGroups list of channel groups
   * @return filtered version reference channels
   */
  private static List<Channel> filterVersionReferenceChannels(
      Collection<Channel> versionReferenceChannels, List<ChannelGroup> channelGroups) {
    Set<String> rawChannels =
        channelGroups.stream()
            .map(ChannelGroup::getChannels)
            .flatMap(Collection::stream)
            .map(Channel::getName)
            .collect(Collectors.toSet());

    return versionReferenceChannels.stream()
        .filter(channel -> rawChannels.contains(channel.getName()))
        .collect(Collectors.toList());
  }
}
