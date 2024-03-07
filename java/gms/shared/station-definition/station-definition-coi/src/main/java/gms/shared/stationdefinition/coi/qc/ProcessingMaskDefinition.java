package gms.shared.stationdefinition.coi.qc;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import java.time.Duration;
import java.util.Set;

/** Data container {@link ProcessingMaskDefinition} */
@AutoValue
public abstract class ProcessingMaskDefinition {

  public abstract Duration getMaskedSegmentMergeThreshold();

  public abstract ProcessingOperation getProcessingOperation();

  public abstract Set<QcSegmentCategoryAndType> getAppliedQcSegmentCategoryAndTypes();

  /**
   * Creates the {@link ProcessingMaskDefinition}
   *
   * @param maskedSegmentMergeThreshold Duration threshold value
   * @param processingOperation {@link ProcessingOperation} of definition
   * @param appliedQcSegmentCategoryAndTypes Set of {@link QcSegmentCategoryAndType} containing
   *     QcSegmentCategory and QcSegmentType pairs
   * @return configured {@link ProcessingMaskDefinition}
   */
  @JsonCreator
  public static ProcessingMaskDefinition create(
      @JsonProperty("maskedSegmentMergeThreshold") Duration maskedSegmentMergeThreshold,
      @JsonProperty("processingOperation") ProcessingOperation processingOperation,
      @JsonProperty("appliedQcSegmentCategoryAndTypes")
          Set<QcSegmentCategoryAndType> appliedQcSegmentCategoryAndTypes) {
    return new AutoValue_ProcessingMaskDefinition(
        maskedSegmentMergeThreshold, processingOperation, appliedQcSegmentCategoryAndTypes);
  }

  public static ProcessingMaskDefinition convertConfigObject(
      ProcessingMaskConfigurationObject obj, ProcessingOperation processingOperation) {
    return create(
        obj.getMaskedSegmentMergeThreshold(),
        processingOperation,
        obj.getAppliedQcSegmentCategoryAndTypes());
  }
}
