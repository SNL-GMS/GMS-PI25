package gms.shared.signalenhancementconfiguration.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableList;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import java.util.Collection;
import java.util.Optional;
import org.apache.commons.lang3.Validate;

@AutoValue
@JsonSerialize(as = FilterDefinitionByUsageForChannelSegmentsRequest.class)
@JsonDeserialize(builder = AutoValue_FilterDefinitionByUsageForChannelSegmentsRequest.Builder.class)
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class FilterDefinitionByUsageForChannelSegmentsRequest {

  public abstract ImmutableList<ChannelSegment<Waveform>> getChannelSegments();

  public abstract Optional<EventHypothesis> getEventHypothesis();

  public static FilterDefinitionByUsageForChannelSegmentsRequest.Builder builder() {
    return new AutoValue_FilterDefinitionByUsageForChannelSegmentsRequest.Builder();
  }

  public abstract FilterDefinitionByUsageForChannelSegmentsRequest.Builder toBuilder();

  @AutoValue.Builder
  @JsonPOJOBuilder(withPrefix = "set")
  public interface Builder {

    FilterDefinitionByUsageForChannelSegmentsRequest.Builder setChannelSegments(
        ImmutableList<ChannelSegment<Waveform>> channelSegments);

    default FilterDefinitionByUsageForChannelSegmentsRequest.Builder setChannelSegments(
        Collection<ChannelSegment<Waveform>> channelSegments) {
      return setChannelSegments(ImmutableList.copyOf(channelSegments));
    }

    FilterDefinitionByUsageForChannelSegmentsRequest.Builder setEventHypothesis(
        Optional<EventHypothesis> eventHypothesis);

    default FilterDefinitionByUsageForChannelSegmentsRequest.Builder setEventHypothesis(
        EventHypothesis eventHypothesis) {
      return setEventHypothesis(Optional.ofNullable(eventHypothesis));
    }

    FilterDefinitionByUsageForChannelSegmentsRequest autoBuild();

    default FilterDefinitionByUsageForChannelSegmentsRequest build() {
      var filterDefinitionByUsageForChannelSegmentsRequest = autoBuild();
      Validate.notEmpty(
          filterDefinitionByUsageForChannelSegmentsRequest.getChannelSegments(),
          "Request must contain at least one Channel Segment");
      return filterDefinitionByUsageForChannelSegmentsRequest;
    }
  }
}
