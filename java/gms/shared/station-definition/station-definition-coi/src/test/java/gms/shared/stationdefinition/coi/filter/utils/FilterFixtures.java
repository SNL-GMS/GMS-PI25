package gms.shared.stationdefinition.coi.filter.utils;

import com.google.common.collect.ImmutableList;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.CascadeFilterParameters;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterParameters;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Filter fixtures used for tests and signal enhancement configuration */
public class FilterFixtures {

  private FilterFixtures() {}

  private static final String FILTER_COMMENTS = "filter comments";
  public static final String SEISMIC = "SEISMIC";
  public static final String LONG_PERIOD = "LONG-PERIOD";
  public static final String HYDRO = "HYDRO";

  public static final String FILTER1_COMMENTS = "Filter 1 comments";
  public static final String FILTER2_COMMENTS = "Filter 2 comments";
  public static final String FILTER3_COMMENTS = "Filter 3 comments";
  public static final String FILTER4_COMMENTS = "Filter 4 comments";
  public static final String FILTER5_COMMENTS = "Filter 5 comments";
  public static final String FILTER6_COMMENTS = "Filter 6 comments";
  public static final String FILTER7_COMMENTS = "Filter 7 comments";
  public static final String FILTER8_COMMENTS = "Filter 8 comments";
  public static final String FILTER9_COMMENTS = "Filter 9 comments";
  public static final String FILTER10_COMMENTS = "Filter 10 comments";
  public static final String FILTER11_COMMENTS = "Filter 11 comments";
  public static final String FILTER12_COMMENTS = "Filter 12 comments";
  public static final String FILTER13_COMMENTS = "Filter 13 comments";
  public static final String FILTER14_COMMENTS = "Filter 14 comments";
  public static final String FILTER15_COMMENTS = "Filter 15 comments";

  public static final String CASCADE_FILTER_1 = "Cascade Filter 1";
  public static final String CASCADE_FILTER_2 = "Cascade Filter 2";
  public static final String CASCADE_FILTER_3 = "Cascade Filter 3";

  public static final String HAM_FIR_BP_0_70_2_00_HZ = "HAM FIR BP 0.70-2.00 Hz";
  public static final String HAM_FIR_BP_1_00_3_00_HZ = "HAM FIR BP 1.00-3.00 Hz";
  public static final String HAM_FIR_BP_4_00_8_00_HZ = "HAM FIR BP 4.00-8.00 Hz";
  public static final String HAM_FIR_BP_0_40_3_50_HZ = "HAM FIR BP 0.40-3.50 Hz";
  public static final String HAM_FIR_BP_0_50_4_00_HZ = "HAM FIR BP 0.50-4.00 Hz";
  public static final String HAM_FIR_BP_2_00_5_00_HZ = "HAM FIR BP 2.00-5.00 Hz";
  public static final String HAM_FIR_BP_1_50_3_00_HZ = "HAM FIR BP 1.50-3.00 Hz";
  public static final String HAM_FIR_BP_1_00_5_00_HZ = "HAM FIR BP 1.00-5.00 Hz";
  public static final String HAM_FIR_BP_0_50_2_50_HZ = "HAM FIR BP 0.50-2.50 Hz";
  public static final String HAM_FIR_BP_1_50_3_50_HZ = "HAM FIR BP 1.50-3.50 Hz";
  public static final String HAM_FIR_BP_1_70_3_20_HZ = "HAM FIR BP 1.70-3.20 Hz";
  public static final String HAM_FIR_LP_4_20_HZ = "HAM FIR LP 4.20 Hz";
  public static final String HAM_FIR_BP_0_50_1_50_HZ = "HAM FIR BP 0.50-1.50 Hz";
  public static final String HAM_FIR_BP_2_00_4_00_HZ = "HAM FIR BP 2.00-4.00 Hz";
  public static final String HAM_FIR_HP_0_30_HZ = "HAM FIR HP 0.30 Hz";
  public static final String HAM_FIR_BP_0_50_4_00_HZ_NON_CAUSAL =
      "HAM FIR BP 0.50-4.00 HZ non causal";

  public static final String HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION =
      "HAM FIR BP 0.70-2.00 Hz Description";
  public static final String HAM_FIR_BP_1_00_3_00_HZ_DESCRIPTION =
      "HAM FIR BP 1.00-3.00 Hz Description";
  public static final String HAM_FIR_BP_4_00_8_00_HZ_DESCRIPTION =
      "HAM FIR BP 4.00-8.00 Hz Description";
  public static final String HAM_FIR_BP_0_40_3_50_HZ_DESCRIPTION =
      "HAM FIR BP 0.40-3.50 Hz Description";
  public static final String HAM_FIR_BP_0_50_4_00_HZ_DESCRIPTION =
      "HAM FIR BP 0.50-4.00 Hz Description";
  public static final String HAM_FIR_BP_2_00_5_00_HZ_DESCRIPTION =
      "HAM FIR BP 2.00-5.00 Hz Description";
  public static final String HAM_FIR_BP_1_50_3_00_HZ_DESCRIPTION =
      "HAM FIR BP 1.50-3.00 Hz Description";
  public static final String HAM_FIR_BP_1_00_5_00_HZ_DESCRIPTION =
      "HAM FIR BP 1.00-5.00 Hz Description";
  public static final String HAM_FIR_BP_0_50_2_50_HZ_DESCRIPTION =
      "HAM FIR BP 0.50-2.50 Hz Description";
  public static final String HAM_FIR_BP_1_50_3_50_HZ_DESCRIPTION =
      "HAM FIR BP 1.50-3.50 Hz Description";
  public static final String HAM_FIR_BP_1_70_3_20_HZ_DESCRIPTION =
      "HAM FIR BP 1.70-3.20 Hz Description";
  public static final String HAM_FIR_LP_4_20_HZ_DESCRIPTION = "HAM FIR LP 4.20 Hz Description";
  public static final String HAM_FIR_BP_0_50_1_50_HZ_DESCRIPTION =
      "HAM FIR BP 0.50-1.50 Hz Description";
  public static final String HAM_FIR_BP_2_00_4_00_HZ_DESCRIPTION =
      "HAM FIR BP 2.00-4.00 Hz Description";
  public static final String HAM_FIR_HP_0_30_HZ_DESCRIPTION = "HAM FIR HP 0.30 Hz Description";
  public static final String HAM_FIR_BP_0_50_4_00_HZ_NON_CAUSAL_DESCRIPTION =
      "HAM FIR BP 0.50-4.00 HZ non causal Description";
  public static final String IIR_BUTTERWORTH_DESCRIPTION = "IIR BUTTERWORTH Description";

  public static final LinearFilterParameters LINEAR_FILTER_PARAMETERS =
      LinearFilterParameters.from(
          3.5,
          2.2,
          ImmutableList.copyOf(List.of(3.5)),
          ImmutableList.copyOf(List.of(3.5)),
          Duration.parse("PT1212.5273S"));
  public static final CascadeFilterParameters CASCADED_FILTERS_PARAMETERS =
      CascadeFilterParameters.from(3.4, 2, Optional.of(Duration.parse("PT1212.5273S")));

  public static final LinearFilterDescription LINEAR_IIR_BUTTERWORTH_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER1_COMMENTS),
          true,
          FilterType.IIR_BUTTERWORTH,
          Optional.of(0.7),
          Optional.of(2.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));

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

  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_1_00_3_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER2_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(1.0),
          Optional.of(3.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_4_00_8_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER3_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(4.0),
          Optional.of(8.0),
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
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_0_50_4_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER5_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(0.5),
          Optional.of(4.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_2_00_5_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER6_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(2.0),
          Optional.of(5.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_1_50_3_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER7_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(1.5),
          Optional.of(3.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_1_00_5_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER8_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(1.0),
          Optional.of(5.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_0_50_2_50_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER9_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(0.5),
          Optional.of(2.5),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_1_50_3_50_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER10_COMMENTS),
          false,
          FilterType.FIR_HAMMING,
          Optional.of(1.5),
          Optional.of(3.5),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_1_70_3_20_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER11_COMMENTS),
          false,
          FilterType.FIR_HAMMING,
          Optional.of(1.7),
          Optional.of(3.2),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_LP_4_20_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER12_COMMENTS),
          false,
          FilterType.FIR_HAMMING,
          Optional.of(0.0),
          Optional.of(4.2),
          48,
          false,
          PassBandType.LOW_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_0_50_1_50_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER13_COMMENTS),
          false,
          FilterType.FIR_HAMMING,
          Optional.of(0.5),
          Optional.of(1.5),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_BP_2_00_4_00_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER14_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(2.0),
          Optional.of(4.0),
          48,
          false,
          PassBandType.BAND_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription LINEAR_HAM_FIR_HP_0_30_HZ_DESCRIPTION =
      LinearFilterDescription.from(
          Optional.of(FILTER15_COMMENTS),
          true,
          FilterType.FIR_HAMMING,
          Optional.of(0.3),
          Optional.of(0.0),
          48,
          false,
          PassBandType.HIGH_PASS,
          Optional.of(LINEAR_FILTER_PARAMETERS));
  public static final LinearFilterDescription
      LINEAR_HAM_FIR_BP_0_50_4_00_HZ_NON_CAUSAL_DESCRIPTION =
          LinearFilterDescription.from(
              Optional.of(FILTER5_COMMENTS),
              false,
              FilterType.FIR_HAMMING,
              Optional.of(0.5),
              Optional.of(4.0),
              48,
              false,
              PassBandType.HIGH_PASS,
              Optional.of(LINEAR_FILTER_PARAMETERS));

  public static final ImmutableList<FilterDescription> FILTER_DESCRIPTION_LIST_CAUSAL =
      ImmutableList.copyOf(
          Arrays.asList(
              LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION,
              LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION));

  public static final ImmutableList<FilterDescription> FILTER_DESCRIPTION_LIST_NON_CAUSAL =
      ImmutableList.copyOf(
          Arrays.asList(
              LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION,
              LINEAR_HAM_FIR_BP_0_50_1_50_HZ_DESCRIPTION));

  public static final CascadeFilterDescription CASCADED_FILTERS_1_DESCRIPTION =
      CascadeFilterDescription.from(
          Optional.of(CASCADE_FILTER_1),
          FILTER_DESCRIPTION_LIST_CAUSAL,
          Optional.of(CASCADED_FILTERS_PARAMETERS));
  public static final CascadeFilterDescription CASCADED_FILTERS_2_DESCRIPTION =
      CascadeFilterDescription.from(
          Optional.of(CASCADE_FILTER_2),
          FILTER_DESCRIPTION_LIST_NON_CAUSAL,
          Optional.of(CASCADED_FILTERS_PARAMETERS));
  public static final CascadeFilterDescription CASCADED_FILTERS_3_DESCRIPTION =
      CascadeFilterDescription.from(
          Optional.of(CASCADE_FILTER_3),
          FILTER_DESCRIPTION_LIST_CAUSAL,
          Optional.of(CASCADED_FILTERS_PARAMETERS));

  public static final FilterDefinition FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ =
      FilterDefinition.from(
          HAM_FIR_BP_0_40_3_50_HZ,
          Optional.of(FILTER_COMMENTS),
          LINEAR_HAM_FIR_BP_0_40_3_50_HZ_DESCRIPTION);

  public static final FilterDefinition FILTER_DEFINITION_HAM_FIR_BP_0_70_2_00_HZ =
      FilterDefinition.from(
          HAM_FIR_BP_0_70_2_00_HZ,
          Optional.of(FILTER_COMMENTS),
          LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION);
}
