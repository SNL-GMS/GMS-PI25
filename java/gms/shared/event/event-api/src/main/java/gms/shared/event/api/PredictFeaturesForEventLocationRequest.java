package gms.shared.event.api;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.event.coi.EventLocation;
import java.util.List;

/** Defines the request body for EventManager.EventLocationSolutionFeaturePredictionRequest() */
@AutoValue
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class PredictFeaturesForEventLocationRequest {

  public abstract EventLocation getSourceLocation();

  public abstract List<PhaseType> getPhases();

  public abstract List<ReceiverLocationsAndTypes> getReceivers();

  @JsonCreator
  public static PredictFeaturesForEventLocationRequest from(
      @JsonProperty("sourceLocation") EventLocation sourceLocation,
      @JsonProperty("phases") List<PhaseType> phases,
      @JsonProperty("receivers") List<ReceiverLocationsAndTypes> receivers) {

    return new AutoValue_PredictFeaturesForEventLocationRequest(sourceLocation, phases, receivers);
  }
}
