package gms.shared.signalenhancementconfiguration.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableList;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import java.util.Collection;
import java.util.Optional;
import org.apache.commons.lang3.Validate;

@AutoValue
@JsonSerialize(as = FilterDefinitionByUsageForSignalDetectionHypothesesRequest.class)
@JsonDeserialize(
    builder = AutoValue_FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder.class)
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class FilterDefinitionByUsageForSignalDetectionHypothesesRequest {

  public abstract ImmutableList<SignalDetectionHypothesis> getSignalDetectionsHypotheses();

  public abstract Optional<EventHypothesis> getEventHypothesis();

  public static FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder builder() {
    return new AutoValue_FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder();
  }

  public abstract FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder toBuilder();

  @AutoValue.Builder
  @JsonPOJOBuilder(withPrefix = "set")
  public interface Builder {

    FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder
        setSignalDetectionsHypotheses(
            ImmutableList<SignalDetectionHypothesis> signalDetectionHypotheses);

    default FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder
        setSignalDetectionsHypotheses(
            Collection<SignalDetectionHypothesis> signalDetectionHypotheses) {
      return setSignalDetectionsHypotheses(ImmutableList.copyOf(signalDetectionHypotheses));
    }

    FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder setEventHypothesis(
        Optional<EventHypothesis> eventHypothesis);

    default FilterDefinitionByUsageForSignalDetectionHypothesesRequest.Builder setEventHypothesis(
        EventHypothesis eventHypothesis) {
      return setEventHypothesis(Optional.ofNullable(eventHypothesis));
    }

    FilterDefinitionByUsageForSignalDetectionHypothesesRequest autoBuild();

    default FilterDefinitionByUsageForSignalDetectionHypothesesRequest build() {
      var filterDefinitionByUsuageForSignalDetectionHypothesesRequest = autoBuild();
      Validate.notEmpty(
          filterDefinitionByUsuageForSignalDetectionHypothesesRequest
              .getSignalDetectionsHypotheses(),
          "Request must contain at least one Signal Detection Hypothesis");
      return filterDefinitionByUsuageForSignalDetectionHypothesesRequest;
    }
  }
}
