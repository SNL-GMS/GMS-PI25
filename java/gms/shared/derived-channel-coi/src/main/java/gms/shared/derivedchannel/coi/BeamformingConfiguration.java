package gms.shared.derivedchannel.coi;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableList;
import java.time.Duration;

@AutoValue
@JsonSerialize(as = BeamformingConfiguration.class)
public abstract class BeamformingConfiguration {

  public abstract Duration getLeadDuration();

  public abstract Duration getBeamDuration();

  public abstract Double getOrientationAngleToleranceDeg();

  public abstract Double getSampleRateToleranceHz();

  public abstract Integer getMinWaveformsToBeam();

  public abstract String getStation();

  public abstract ImmutableList<String> getInputChannelGroups();

  public abstract ImmutableList<String> getInputChannels();

  public abstract BeamDescription getBeamDescription();

  @JsonCreator
  public static BeamformingConfiguration from(
      @JsonProperty("leadDuration") Duration leadDuration,
      @JsonProperty("beamDuration") Duration beamDuration,
      @JsonProperty("orientationAngleToleranceDeg") Double orientationAngleToleranceDeg,
      @JsonProperty("sampleRateToleranceHz") Double sampleRateToleranceHz,
      @JsonProperty("minWaveformsToBeam") Integer minWaveformsToBeam,
      @JsonProperty("station") String station,
      @JsonProperty("inputChannelGroups") ImmutableList<String> inputChannelGroups,
      @JsonProperty("inputChannels") ImmutableList<String> inputChannels,
      @JsonProperty("beamDescription") BeamDescription beamDescription) {

    return new AutoValue_BeamformingConfiguration(
        leadDuration,
        beamDuration,
        orientationAngleToleranceDeg,
        sampleRateToleranceHz,
        minWaveformsToBeam,
        station,
        inputChannelGroups,
        inputChannels,
        beamDescription);
  }
}
