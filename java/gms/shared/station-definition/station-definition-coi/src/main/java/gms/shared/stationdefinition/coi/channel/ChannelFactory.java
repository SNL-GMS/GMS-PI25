package gms.shared.stationdefinition.coi.channel;

import static com.google.common.base.Preconditions.checkArgument;
import static com.google.common.base.Preconditions.checkNotNull;
import static com.google.common.base.Preconditions.checkState;

import com.google.common.collect.ImmutableList;
import gms.shared.fk.coi.FkSpectraDefinition;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.FieldMapUtilities;
import gms.shared.stationdefinition.coi.utils.Units;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Utility to create {@link Channel}s */
public final class ChannelFactory {

  private static final Logger LOGGER = LoggerFactory.getLogger(ChannelFactory.class);

  private ChannelFactory() {
    // Hide implicit public constructor
  }

  /**
   * Creates an FK {@link Channel} from a list of input {@link Channel}s from a given {@link
   * Station} based on an {@link FkSpectraDefinition}
   *
   * @param station a non-null, fully-populated {@link Station}
   * @param inputChannels a non-null, non-empty list of populated input {@link Channel}s
   * @param fkSpectraDefinition the non-null {@link FkSpectraDefinition} to be applied
   * @return the derived FK {@link Channel}
   */
  public static Channel createFkChannel(
      Station station, List<Channel> inputChannels, FkSpectraDefinition fkSpectraDefinition) {
    checkNotNull(station, "Cannot create FK Channel from null Station");
    checkNotNull(inputChannels, "Cannot create FK Channel from null input Channels");
    checkNotNull(fkSpectraDefinition, "Cannot create FK Channel from null FkSpectraDefinition");
    checkArgument(station.isPresent(), "Cannot create FK Channel from faceted Station");
    checkArgument(!inputChannels.isEmpty(), "Cannot create FK Channel from empty input Channels");

    List<Channel> populatedChannels =
        inputChannels.stream().filter(Channel::isPresent).collect(Collectors.toList());

    checkState(
        populatedChannels.size() == inputChannels.size(),
        "Cannot create FK Channel from faceted input Channels");
    List<String> stationNames =
        populatedChannels.stream()
            .map(Channel::getData)
            .flatMap(Optional::stream)
            .map(Channel.Data::getStation)
            .map(Station::getName)
            .filter(stationName -> !stationName.equals(station.getName()))
            .distinct()
            .collect(Collectors.toList());

    checkState(
        stationNames.isEmpty(), "Cannot create FK Channel from Channels from multiple Stations");

    var baseChannel = populatedChannels.get(0);
    var data = baseChannel.getData().orElseThrow();

    List<Channel> configuredInputs =
        populatedChannels.stream().map(Channel::toEntityReference).collect(Collectors.toList());

    Map<ChannelProcessingMetadataType, Object> metadata =
        new EnumMap<>(ChannelProcessingMetadataType.class);
    metadata.putAll(metadata);
    metadata.put(ChannelProcessingMetadataType.CHANNEL_GROUP, "fk");

    var orientationType = data.getChannelOrientationType();

    Orientation orientation;

    if (orientationType == ChannelOrientationType.VERTICAL) {
      // TODO: The individual angles within the orientation object should be optionals.
      // once that change is made, the horizontal angle for this case should be an emtpy optional
      orientation = Orientation.from(Optional.of(Double.NaN), Optional.of(0.0));
    } else if (orientationType == ChannelOrientationType.NORTH_SOUTH) {
      orientation = Orientation.from(Optional.of(0.0), Optional.of(90.0));
    } else if (orientationType == ChannelOrientationType.EAST_WEST) {
      orientation = Orientation.from(Optional.of(90.0), Optional.of(90.0));
    } else {
      orientation = Orientation.from(Optional.of(Double.NaN), Optional.of(Double.NaN));
    }

    Optional<Instant> possibleEffectiveAt =
        inputChannels.stream()
            .map(Channel::getEffectiveAt)
            .flatMap(Optional::stream)
            .max(Instant::compareTo);

    // Previous checks guarantee that all channels will have an effectiveAt
    Instant effectiveAt = possibleEffectiveAt.orElse(null);

    Optional<Instant> possibleEffectiveUntil =
        inputChannels.stream()
            .map(Channel::getEffectiveUntil)
            .flatMap(Optional::stream)
            .min(Instant::compareTo);

    var updatedData =
        data.toBuilder()
            .setStation(station.toEntityReference())
            .setNominalSampleRateHz(fkSpectraDefinition.getSampleRateHz())
            .setConfiguredInputs(configuredInputs)
            .setLocation(station.getLocation())
            .setUnits(Units.NANOMETERS_SQUARED_PER_SECOND)
            .setProcessingMetadata(metadata)
            .setOrientationAngles(orientation)
            .setEffectiveUntil(possibleEffectiveUntil)
            .setResponse(Optional.empty())
            .build();

    Channel derived =
        baseChannel.toBuilder().setEffectiveAt(effectiveAt).setData(updatedData).build();

    String name = ChannelNameUtilities.createName(derived);
    return derived.toBuilder().setName(name).build();
  }

  /**
   * Augments a {@link Channel} with information from fields in a {@link FilterDefinition}.
   *
   * @param inputChannel the non-null starting {@link Channel} with populated data
   * @param filterDefinition a non-null {@link FilterDefinition} to be applied to the starting
   *     {@link Channel}
   * @return a filtered derived (@link Channel}
   */
  public static Channel createFiltered(Channel inputChannel, FilterDefinition filterDefinition) {

    checkNotNull(inputChannel, "Cannot create a filtered channel from a null input channel");
    checkNotNull(
        filterDefinition, "Cannot create a filtered channel from a null filter definition");
    checkState(
        inputChannel.getData().isPresent(),
        "Cannot create a derived channel unless the input channel has data");

    var updatedDescription = createUpdatedFilteredDescription(inputChannel, filterDefinition);

    var undesignedFilterDefinition =
        FilterDefinition.from(
            filterDefinition.getName(),
            filterDefinition.getComments(),
            createUndesignedFilterDescription(filterDefinition.getFilterDescription()));
    var processingDefinitionFieldMap = FieldMapUtilities.toFieldMap(undesignedFilterDefinition);

    var updatedProcessingMetadata = updateProcessingMetadata(inputChannel, filterDefinition);

    // inputChannel is guaranteed to have data based on the precondition check
    var updatedData =
        inputChannel.getData().orElseThrow().toBuilder()
            .setConfiguredInputs(List.of(Channel.createVersionReference(inputChannel)))
            .setDescription(updatedDescription)
            .setProcessingDefinition(processingDefinitionFieldMap)
            .setProcessingMetadata(updatedProcessingMetadata)
            .setResponse(Optional.empty())
            .build();

    var updatedChannel = inputChannel.toBuilder().setData(updatedData).build();

    String attribute =
        "filter," + filterDefinition.getName().replace(Channel.COMPONENT_SEPARATOR, "|");
    String derivedChannelName =
        ChannelNameUtilities.appendProcessingAttribute(updatedChannel, attribute);

    var finalData = updatedData.toBuilder().setCanonicalName(derivedChannelName).build();

    return updatedChannel.toBuilder().setData(finalData).setName(derivedChannelName).build();
  }

  /**
   * Creates a derived, masked {@link Channel} by applying a {@link ProcessingMaskDefinition} to a
   * raw input {@link Channel}
   *
   * @param inputChannel the non-null raw {@link Channel} to be masked
   * @param processingMaskDefinition the non-null {@link ProcessingMaskDefinition} to be applied
   * @return the derived, masked {@link Channel}
   */
  public static Channel createMasked(
      Channel inputChannel, ProcessingMaskDefinition processingMaskDefinition) {

    checkNotNull(inputChannel, "Cannot create a masked channel from a null input channel");
    checkNotNull(
        processingMaskDefinition,
        "Cannot create a masked channel from a null processing mask definition");
    checkState(
        inputChannel.getData().isPresent(),
        "Cannot create a masked channel unless the input channel has data");

    var configuredInputs = List.of(Channel.createVersionReference(inputChannel));
    var updatedDescription =
        new StringBuilder(inputChannel.getDescription())
            .append(Channel.DESCRIPTION_SEPARATOR)
            .append("Masked samples removed.")
            .toString();
    var fieldMapPmd = FieldMapUtilities.toFieldMap(processingMaskDefinition);

    // inputChannel is guaranteed to have data based on the precondition check
    var updatedData =
        inputChannel.getData().orElseThrow().toBuilder()
            .setConfiguredInputs(configuredInputs)
            .setDescription(updatedDescription)
            .setProcessingDefinition(fieldMapPmd)
            .setResponse(Optional.empty())
            .build();

    var updatedChannel = inputChannel.toBuilder().setData(updatedData).build();

    String derivedChannelName =
        ChannelNameUtilities.appendProcessingAttribute(updatedChannel, "masked");

    var finalData = updatedData.toBuilder().setCanonicalName(derivedChannelName).build();

    return updatedChannel.toBuilder().setName(derivedChannelName).setData(finalData).build();
  }

  /**
   * Creates an undesigned {@link FilterDescription} from the provided {@link FilterDescription} by
   * copying all attributes except for the filter parameters.
   *
   * <p>Cascade filters have each of their component descriptions recursively converted to
   * undesigned descriptions.
   *
   * @param filterDefinition a non-null Linear or Cascade {@link FilterDefinition}
   * @return the undesigned {@link FilterDefintion}, or the original filterDefinition if it was of
   *     an unknown type
   */
  private static FilterDescription createUndesignedFilterDescription(
      FilterDescription filterDescription) {

    FilterDescription undesignedFilterDescription;

    if (filterDescription instanceof LinearFilterDescription lfd) {
      undesignedFilterDescription =
          LinearFilterDescription.from(
              lfd.getComments(),
              lfd.isCausal(),
              lfd.getFilterType(),
              lfd.getLowFrequency(),
              lfd.getHighFrequency(),
              lfd.getOrder(),
              lfd.isZeroPhase(),
              lfd.getPassBandType(),
              Optional.empty());
    } else if (filterDescription instanceof CascadeFilterDescription cfd) {
      var componentFilterDescriptions = cfd.getFilterDescriptions();
      List<FilterDescription> undesignedComponents = new ArrayList<>();
      for (var componentFD : componentFilterDescriptions) {
        undesignedComponents.add(createUndesignedFilterDescription(componentFD));
      }
      undesignedFilterDescription =
          CascadeFilterDescription.from(
              cfd.getComments(), ImmutableList.copyOf(undesignedComponents), Optional.empty());
    } else {
      // filterDescription is never null due to the Precondition check
      var className = filterDescription.getClass().getSimpleName();
      LOGGER.warn(
          "Encountered unknown FilterDescription type: '{}'. Description left unmodified.",
          className);
      undesignedFilterDescription = filterDescription;
    }
    return undesignedFilterDescription;
  }

  private static Map<ChannelProcessingMetadataType, Object> updateProcessingMetadata(
      Channel inputChannel, FilterDefinition filterDefinition) {

    var updatedMap = new EnumMap<>(inputChannel.getProcessingMetadata());

    updatedMap.put(
        ChannelProcessingMetadataType.FILTER_TYPE,
        filterDefinition.getFilterDescription().getFilterType());
    updatedMap.put(
        ChannelProcessingMetadataType.FILTER_CAUSALITY,
        filterDefinition.getFilterDescription().isCausal());

    return updatedMap;
  }

  private static String createUpdatedFilteredDescription(
      Channel inputChannel, FilterDefinition filterDefinition) {
    return new StringBuilder(inputChannel.getDescription())
        .append(Channel.DESCRIPTION_SEPARATOR)
        .append("Filtered using a ")
        .append(filterDefinition.getName())
        .append(" filter.")
        .toString();
  }
}
