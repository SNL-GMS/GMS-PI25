package gms.shared.stationdefinition.coi.filter;

import static com.google.common.base.Preconditions.checkArgument;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import java.util.Optional;

@AutoValue
public abstract class LinearFilterDescription implements FilterDescription {

  public abstract Optional<Double> getLowFrequency();

  public abstract Optional<Double> getHighFrequency();

  public abstract int getOrder();

  public abstract boolean isZeroPhase();

  public abstract PassBandType getPassBandType();

  public abstract Optional<LinearFilterParameters> getParameters();

  @JsonCreator
  public static LinearFilterDescription from(
      @JsonProperty("comments") Optional<String> comments,
      @JsonProperty("isCausal") boolean isCausal,
      @JsonProperty("filterType") FilterType filterType,
      @JsonProperty("lowFrequency") Optional<Double> lowFrequency,
      @JsonProperty("highFrequency") Optional<Double> highFrequency,
      @JsonProperty("order") int order,
      @JsonProperty("zeroPhase") boolean zeroPhase,
      @JsonProperty("passBandType") PassBandType passBandType,
      @JsonProperty("parameters") Optional<LinearFilterParameters> parameters) {

    validate(filterType, order, passBandType);

    if (PassBandType.HIGH_PASS == passBandType) {
      highFrequency = Optional.empty();
      checkFrequencyState(lowFrequency);
    } else if (PassBandType.LOW_PASS == passBandType) {
      lowFrequency = Optional.empty();
      checkFrequencyState(highFrequency);
    } else {
      checkFrequencyState(highFrequency);
      checkFrequencyState(lowFrequency);
    }

    if (zeroPhase) {
      isCausal = false;
    }

    return new AutoValue_LinearFilterDescription(
        comments,
        isCausal,
        filterType,
        lowFrequency,
        highFrequency,
        order,
        zeroPhase,
        passBandType,
        parameters);
  }

  private static void validate(FilterType filterType, int order, PassBandType passBandType) {
    checkArgument(
        FilterType.FIR_HAMMING == filterType || FilterType.IIR_BUTTERWORTH == filterType,
        "Linear filter are only of the FIR_HAMMING type or the IRR_BUTTERWORTH type");
    checkArgument(order >= 1, "Filter order must be at greater or equal than one");
    checkArgument(passBandType != null, "Filter Pass Band type must be provided");
  }

  private static void checkFrequencyState(Optional<Double> frequency) {
    checkArgument(frequency.filter(d -> d >= 0.0).isPresent(), "Frequency values must be positive");
  }
}
