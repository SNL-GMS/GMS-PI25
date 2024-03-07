package gms.shared.stationdefinition.coi.fk;

import com.google.common.base.Preconditions;

/** This class stores the allowable frequency range for waveforms used to calculate fk */
public record FkFrequencyRange(double lowFrequency, double highFrequency) {
  public FkFrequencyRange {

    Preconditions.checkArgument(
        lowFrequency > 0, "Lower frequency bound must be greater than zero.");
    Preconditions.checkArgument(
        highFrequency > lowFrequency,
        "High frequency bound must be higher than low frequency bound.");
  }
}
