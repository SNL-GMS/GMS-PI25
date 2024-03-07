package gms.shared.stationdefinition.coi.qc;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import java.time.Duration;
import java.util.Set;

/** Lowest level data container used fro retrieval from the ConfigurationConsumerUtility */
@AutoValue
public abstract class ProcessingMaskConfigurationObject {

  public abstract Duration getMaskedSegmentMergeThreshold();

  public abstract Set<QcSegmentCategoryAndType> getAppliedQcSegmentCategoryAndTypes();

  /**
   * Creates the {@link ProcessingMaskConfigurationObject} data container object
   *
   * @param maskedSegmentMergeThreshold Duration threshold value
   * @param appliedQcSegmentCategoryAndTypes Set of {@link QcSegmentCategoryAndType} containing
   * @return {@link ProcessingMaskConfigurationObject} populated data container
   */
  @JsonCreator
  public static ProcessingMaskConfigurationObject create(
      @JsonProperty("maskedSegmentMergeThreshold") Duration maskedSegmentMergeThreshold,
      @JsonProperty("appliedQcSegmentCategoryAndTypes")
          Set<QcSegmentCategoryAndType> appliedQcSegmentCategoryAndTypes) {
    return new AutoValue_ProcessingMaskConfigurationObject(
        maskedSegmentMergeThreshold, appliedQcSegmentCategoryAndTypes);
  }
}
