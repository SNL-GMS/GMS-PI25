package gms.shared.signalenhancementconfiguration.utils;

import com.google.common.collect.ImmutableList;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterParameters;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/** Filter fixtures used for tests and signal enhancement configuration */
public class FilterFixtures {

  private FilterFixtures() {}

  private static final String FILTER_COMMENTS = "filter comments";
  public static final String FILTER1_COMMENTS = "Filter 1 comments";

  public static final String HAM_FIR_BP_0_70_2_00_HZ = "HAM FIR BP 0.70-2.00 Hz";
  public static final String HAM_FIR_BP_0_40_3_50_HZ = "HAM FIR BP 0.40-3.50 Hz";

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

  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_0_40_3_50_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of("0.4 3.5 3 BP causal"),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(0.4),
          Optional.of(3.5),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));

  public static final FilterDefinition FILTER_DEFINITION_HAM_FIR_BP_0_70_2_00_HZ =
      FilterDefinition.from(
          HAM_FIR_BP_0_70_2_00_HZ,
          Optional.of(FILTER_COMMENTS),
          LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION);

  public static final FilterDefinition FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ =
      FilterDefinition.from(
          HAM_FIR_BP_0_40_3_50_HZ,
          Optional.of(FILTER_COMMENTS),
          LINEAR_HAM_FIR_BP_0_40_3_50_HZ_DESCRIPTION);
}
