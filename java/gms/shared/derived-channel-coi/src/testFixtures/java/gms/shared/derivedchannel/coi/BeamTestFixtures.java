package gms.shared.derivedchannel.coi;

import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.ASAR_FACET_STATION;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL_FACET;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL_STA01_STA01_SHZ;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL_TWO_FACET;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.TXAR_TEST_STATION;

import com.google.common.collect.ImmutableList;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.types.BeamSummation;
import gms.shared.derivedchannel.types.SamplingType;
import gms.shared.event.coi.EventTestFixtures;
import gms.shared.event.coi.MagnitudeType;
import gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.channel.Orientation;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterParameters;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.DoubleValue;
import gms.shared.stationdefinition.coi.utils.Units;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

public class BeamTestFixtures {

  public static final UUID UUID_1 = UUID.fromString("505c377a-b6a4-478f-b3cd-5c934ee6b871");
  private static final Duration BEAM_DURATION = Duration.ofMinutes(5);
  private static final Duration LEAD_DURATION = Duration.ofSeconds(5);
  private static final Duration LEAD_DURATION_TWO = Duration.ofSeconds(10);
  public static final int MIN_WAVEFORMS_TO_BEAM = 2;
  public static final double SAMPLE_RATE_TOLERANCE = 0.5;
  public static final String STATION = "MKAR";
  public static final Channel MISSING_TXAR_CHANNEL =
      Channel.createVersionReference("TXAR.TX05.SHZ", Instant.EPOCH);
  public static final ImmutableList<String> CHANNEL_GROUPS = ImmutableList.of("MK01", "MK02");
  public static final ImmutableList<String> CHANNELS = ImmutableList.of("SHZ", "HZ");
  public static final double ORIENTATION_TOLERANCE = 5.0;
  public static final String FILTER1_COMMENTS = "Filter 1 comments";
  public static final String HAM_FIR_BP_0_70_2_00_HZ = "HAM FIR BP 0.70-2.00 Hz";
  public static final String IIR_BP_2_00_4_00 = "2.0 4.0 4 BP causal";
  public static final String FILTER2_COMMENTS =
      "Butterworth IIR band-pass, " + "2.0-4.0 Hz, order 4, causal";
  public static final String FILTER_DESCRIPTION_COMMENTS = "2.0 4.0 4 BP causal";

  public static final LinearFilterParameters LINEAR_FILTER_PARAMETERS =
      LinearFilterParameters.from(
          3.5,
          2.2,
          ImmutableList.copyOf(List.of(3.5)),
          ImmutableList.copyOf(List.of(3.5)),
          Duration.parse("PT1212.5273S"));

  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER1_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(0.7),
          Optional.of(2.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));

  public static final LinearFilterDescription LINEAR_IIR_BP_2_00_4_00_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(IIR_BP_2_00_4_00),
          true,
          FilterType.IIR_BUTTERWORTH,
          Optional.of(2.0),
          Optional.of(4.0),
          4,
          false,
          PassBandType.BAND_PASS,
          Optional.empty());

  public static final FilterDefinition FILTER_DEFINITION_HAM_FIR_BP_0_70_2_00_HZ =
      FilterDefinition.from(
          HAM_FIR_BP_0_70_2_00_HZ,
          Optional.of(FILTER1_COMMENTS),
          LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION);

  public static final FilterDefinition FILTER_DEFINITION_IIR_BP_2_00_4_00_HZ =
      FilterDefinition.from(
          IIR_BP_2_00_4_00, Optional.of(FILTER2_COMMENTS), LINEAR_IIR_BP_2_00_4_00_DESCRIPTION);

  private BeamTestFixtures() {}

  public static final Station TXAR_STATION =
      UtilsTestFixtures.getTXARStation(
          UtilsTestFixtures.getTXARChannelGroups(),
          UtilsTestFixtures.getTXARChannels(),
          UtilsTestFixtures.getTXARChannelPairs());

  public static final Station TXAR_STATION_WRONG_CHANNELS = TXAR_TEST_STATION;

  public static final List<Channel> getTXARChannels() {
    var channels = UtilsTestFixtures.getTXARChannels();
    channels.remove(MISSING_TXAR_CHANNEL);
    return channels;
  }

  public static final BeamDescription TXAR_BEAM_DESCRIPTION =
      BeamDescription.builder()
          .setBeamSummation(BeamSummation.COHERENT)
          .setBeamType(BeamType.EVENT)
          .setPhase(PhaseType.P)
          .setSamplingType(SamplingType.SNAPPED)
          .setTwoDimensional(true)
          .build();

  public static final BeamformingTemplate TXAR_BEAMFORMING_TEMPLATE =
      BeamformingTemplate.builder()
          .setOrientationAngleToleranceDeg(ORIENTATION_TOLERANCE)
          .setLeadDuration(LEAD_DURATION)
          .setBeamDuration(BEAM_DURATION)
          .setSampleRateToleranceHz(SAMPLE_RATE_TOLERANCE)
          .setMinWaveformsToBeam(MIN_WAVEFORMS_TO_BEAM)
          .setBeamDescription(TXAR_BEAM_DESCRIPTION)
          .setStation(
              Station.createVersionReference(
                  TXAR_STATION.getName(), TXAR_STATION.getEffectiveAt().get()))
          .setInputChannels(
              ImmutableList.copyOf(
                  getTXARChannels().stream()
                      .map(Channel::createVersionReference)
                      .collect(Collectors.toList())))
          .build();

  public static final BeamDescription CONTINUOUS_BEAM_DESCRIPTION =
      BeamDescription.builder()
          .setBeamSummation(BeamSummation.COHERENT)
          .setBeamType(BeamType.CONTINUOUS_LOCATION)
          .setPhase(PhaseType.WILD_CARD)
          .setSamplingType(SamplingType.SNAPPED)
          .setPreFilterDefinition(Optional.of(FILTER_DEFINITION_IIR_BP_2_00_4_00_HZ))
          .setTwoDimensional(true)
          .build();

  public static final BeamformingTemplate CONTINUOUS_BEAMFORMING_TEMPLATE =
      BeamformingTemplate.builder()
          .setLeadDuration(LEAD_DURATION_TWO)
          .setBeamDuration(BEAM_DURATION)
          .setSampleRateToleranceHz(SAMPLE_RATE_TOLERANCE)
          .setOrientationAngleToleranceDeg(ORIENTATION_TOLERANCE)
          .setMinWaveformsToBeam(MIN_WAVEFORMS_TO_BEAM)
          .setBeamDescription(CONTINUOUS_BEAM_DESCRIPTION)
          .setStation(
              Station.createVersionReference(
                  UtilsTestFixtures.TEST_STATION.getName(),
                  UtilsTestFixtures.TEST_STATION.getEffectiveAt().get()))
          .setInputChannels(
              ImmutableList.of(
                  Channel.createVersionReference(CHANNEL_STA01_STA01_SHZ.toEntityReference())))
          .build();

  public static BeamDescription getDefaultBeamDescription() {
    BeamDescription.Builder builder = BeamDescription.builder();
    builder.setBeamSummation(BeamSummation.RMS);
    builder.setTwoDimensional(true);
    builder.setPhase(PhaseType.PnPn);
    builder.setSamplingType(SamplingType.SNAPPED);
    builder.setBeamType(BeamType.EVENT);
    builder.setPreFilterDefinition(Optional.of(FILTER_DEFINITION_HAM_FIR_BP_0_70_2_00_HZ));
    return builder.build();
  }

  public static BeamParameters.Builder getDefaultBeamParametersBuilder() {
    var orientation = Orientation.from(Optional.of(180.0), Optional.of(90.0));
    BeamParameters.Builder builder = BeamParameters.builder();
    builder.setMinWaveformsToBeam(2);
    builder.setSampleRateHz(20.0);
    builder.setSampleRateToleranceHz(0.5);
    builder.setSlownessSecPerDeg(1.0);
    builder.setReceiverToSourceAzimuthDeg(90.0);
    builder.setOrientationAngleToleranceDeg(90.0);
    builder.setOrientationAngles(orientation);
    var eventHypothesis =
        EventTestFixtures.generateDummyEventHypothesis(
            UUID_1,
            3.3,
            Instant.EPOCH,
            MagnitudeType.MB,
            DoubleValue.from(3.3, Optional.empty(), Units.MAGNITUDE),
            List.of());
    var location = Location.from(100.0, 50.0, 50.0, 100.0);
    var signalDetectionHypothesis = SignalDetectionTestFixtures.SIGNAL_DETECTION_HYPOTHESIS_NO_MCS;
    builder.setEventHypothesis(Optional.of(eventHypothesis));
    builder.setLocation(Optional.of(location));
    builder.setSignalDetectionHypothesis(Optional.of(signalDetectionHypothesis));

    return builder;
  }

  public static BeamformingTemplate.Builder getDefaultBeamformingTemplateBuilder() {
    var beamDescription = getDefaultBeamDescription();

    BeamformingTemplate.Builder builder = BeamformingTemplate.builder();
    builder.setOrientationAngleToleranceDeg(ORIENTATION_TOLERANCE);
    builder.setBeamDuration(BEAM_DURATION);
    builder.setLeadDuration(LEAD_DURATION);
    builder.setBeamDescription(beamDescription);
    builder.setMinWaveformsToBeam(MIN_WAVEFORMS_TO_BEAM);
    builder.setSampleRateToleranceHz(SAMPLE_RATE_TOLERANCE);
    builder.setStation(ASAR_FACET_STATION);
    builder.setInputChannels(ImmutableList.of(CHANNEL_FACET, CHANNEL_TWO_FACET));

    return builder;
  }

  public static BeamformingConfiguration getBeamformingConfiguration() {
    return BeamformingConfiguration.from(
        LEAD_DURATION,
        BEAM_DURATION,
        ORIENTATION_TOLERANCE,
        SAMPLE_RATE_TOLERANCE,
        MIN_WAVEFORMS_TO_BEAM,
        STATION,
        CHANNEL_GROUPS,
        CHANNELS,
        getDefaultBeamDescription());
  }
}
