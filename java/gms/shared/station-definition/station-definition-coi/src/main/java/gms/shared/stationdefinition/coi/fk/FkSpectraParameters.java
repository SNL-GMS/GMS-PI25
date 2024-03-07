package gms.shared.stationdefinition.coi.fk;

import com.google.common.base.Preconditions;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import java.time.Duration;
import java.util.Optional;

public record FkSpectraParameters(
    PhaseType phaseType,
    Optional<FilterDefinition> preFilter,
    SlownessGrid slownessGrid,
    TaperFunction fftTaperFunction,
    FkWindow fkSpectrumWindow,
    FkFrequencyRange frequencyRange,
    FkUncertaintyOption fkUncertaintyOption,
    FkWaveformSampleRate waveformSampleRate,
    Duration spectrumStepDuration,
    double orientationAngleToleranceDeg,
    int minimumWaveformsForSpectra,
    boolean normalizeWaveforms,
    boolean twoDimensional,
    double fftTaperPercent) {

  private static final double MAX_DEGREES = 360;
  private static final double MAX_PERCENT = 100;

  public FkSpectraParameters {

    Preconditions.checkArgument(
        !spectrumStepDuration.isNegative() && !spectrumStepDuration.isZero(),
        "Spectrum step duration must be greater than zero.");

    Preconditions.checkArgument(
        orientationAngleToleranceDeg >= 0 && orientationAngleToleranceDeg <= MAX_DEGREES,
        "Orientation angle tolerance in degrees must be greater than or equal to zero and less than"
            + " or equal to "
            + MAX_DEGREES);

    Preconditions.checkArgument(
        minimumWaveformsForSpectra > 0,
        "Minimum waveforms for a spectra must be greater than zero.");

    Preconditions.checkArgument(
        fftTaperPercent >= 0 && fftTaperPercent <= MAX_PERCENT,
        "FFT taper percent must be greater than or equal to "
            + "zero and less than or equal to "
            + MAX_PERCENT);
  }

  public Builder toBuilder() {
    return new Builder(this);
  }

  public static final class Builder {

    PhaseType phaseType;
    Optional<FilterDefinition> preFilter = Optional.empty();
    SlownessGrid slownessGrid;
    TaperFunction fftTaperFunction;
    FkWindow fkSpectrumWindow;
    FkFrequencyRange frequencyRange;
    FkUncertaintyOption fkUncertaintyOption;
    FkWaveformSampleRate waveformSampleRate;
    Duration spectrumStepDuration;
    double orientationAngleToleranceDeg;
    int minimumWaveformsForSpectra;
    boolean normalizeWaveforms;
    boolean twoDimensional;
    double fftTaperPercent;

    public Builder() {}

    public Builder setPhaseType(PhaseType phaseType) {
      this.phaseType = phaseType;
      return this;
    }

    public Builder setPreFilter(FilterDefinition preFilter) {
      this.preFilter = Optional.of(preFilter);
      return this;
    }

    public Builder setSlownessGrid(SlownessGrid slownessGrid) {
      this.slownessGrid = slownessGrid;
      return this;
    }

    public Builder setFftTaperFunction(TaperFunction ffTaperFunction) {
      this.fftTaperFunction = ffTaperFunction;
      return this;
    }

    public Builder setFkSpectrumWindow(FkWindow fkSpectrumWindow) {
      this.fkSpectrumWindow = fkSpectrumWindow;
      return this;
    }

    public Builder setFrequencyRange(FkFrequencyRange frequencyRange) {
      this.frequencyRange = frequencyRange;
      return this;
    }

    public Builder setFkUncertaintyOption(FkUncertaintyOption fkUncertaintyOption) {
      this.fkUncertaintyOption = fkUncertaintyOption;
      return this;
    }

    public Builder setFkWaveformSampleRate(FkWaveformSampleRate waveformSampleRate) {
      this.waveformSampleRate = waveformSampleRate;
      return this;
    }

    public Builder setSpectrumStepDuration(Duration spectrumStepDuration) {
      this.spectrumStepDuration = spectrumStepDuration;
      return this;
    }

    public Builder setOrientationAngleTolerance(double orientationAngleTolerance) {
      this.orientationAngleToleranceDeg = orientationAngleTolerance;
      return this;
    }

    public Builder setMinimumWaveformsForSpectra(int minimumWaveformsForSpectra) {
      this.minimumWaveformsForSpectra = minimumWaveformsForSpectra;
      return this;
    }

    public Builder setNormalizeWaveforms(boolean normalizeWaveforms) {
      this.normalizeWaveforms = normalizeWaveforms;
      return this;
    }

    public Builder setTwoDimensional(boolean twoDimensional) {
      this.twoDimensional = twoDimensional;
      return this;
    }

    public Builder setFftTaperPercent(double fftTaperPercent) {
      this.fftTaperPercent = fftTaperPercent;
      return this;
    }

    public FkSpectraParameters build() {

      return new FkSpectraParameters(
          phaseType,
          preFilter,
          slownessGrid,
          fftTaperFunction,
          fkSpectrumWindow,
          frequencyRange,
          fkUncertaintyOption,
          waveformSampleRate,
          spectrumStepDuration,
          orientationAngleToleranceDeg,
          minimumWaveformsForSpectra,
          normalizeWaveforms,
          twoDimensional,
          fftTaperPercent);
    }

    private Builder(FkSpectraParameters source) {

      this.phaseType = source.phaseType;
      this.preFilter = source.preFilter;
      this.slownessGrid = source.slownessGrid;
      this.fftTaperFunction = source.fftTaperFunction;
      this.fkSpectrumWindow = source.fkSpectrumWindow;
      this.frequencyRange = source.frequencyRange;
      this.fkUncertaintyOption = source.fkUncertaintyOption;
      this.waveformSampleRate = source.waveformSampleRate;
      this.spectrumStepDuration = source.spectrumStepDuration;
      this.orientationAngleToleranceDeg = source.orientationAngleToleranceDeg;
      this.minimumWaveformsForSpectra = source.minimumWaveformsForSpectra;
      this.normalizeWaveforms = source.normalizeWaveforms;
      this.twoDimensional = source.twoDimensional;
      this.fftTaperPercent = source.fftTaperPercent;
    }
  }
}
