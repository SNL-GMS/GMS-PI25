package gms.shared.workflow.manager.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.auto.value.AutoValue;
import gms.shared.workflow.coi.IntervalId;
import gms.shared.workflow.coi.IntervalStatus;
import java.time.Instant;

/**
 * Request body class for the WorkflowManager.updateInteractiveAnalysisStageIntervalStatus()
 * endpoint
 */
@AutoValue
@JsonSerialize(as = UpdateInteractiveAnalysisStageIntervalStatusRequest.class)
@JsonDeserialize(
    builder = AutoValue_UpdateInteractiveAnalysisStageIntervalStatusRequest.Builder.class)
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class UpdateInteractiveAnalysisStageIntervalStatusRequest implements UserRequest {

  /**
   * Gets the {@link IntervalId} of the {@link gms.shared.workflow.coi.StageInterval} to update
   *
   * @return The {@link IntervalId} of the {@link gms.shared.workflow.coi.StageInterval} to update
   */
  public abstract IntervalId getStageIntervalId();

  /**
   * Gets the {@link IntervalStatus} to apply to the specified {@link
   * gms.shared.workflow.coi.StageInterval}
   *
   * @return The {@link IntervalStatus} to apply to the specified {@link
   *     gms.shared.workflow.coi.StageInterval}
   */
  public abstract IntervalStatus getStatus();

  /**
   * Creates and returns a new, empty Builder
   *
   * @return A new, empty Builder
   */
  public static Builder builder() {
    return new AutoValue_UpdateInteractiveAnalysisStageIntervalStatusRequest.Builder();
  }

  /**
   * Creates and returns a new Builder with the properties of this instance set
   *
   * @return A new Builder with the properties of this instance set
   */
  public abstract Builder toBuilder();

  /** Builder for UpdateInteractiveAnalysisStageIntervalStatusRequest */
  @AutoValue.Builder
  @JsonPOJOBuilder(withPrefix = "set")
  public abstract static class Builder {

    /**
     * Sets the username of the user who initiated the request
     *
     * @param userName The user who initiated the request
     * @return Builder with username set
     */
    public abstract Builder setUserName(String userName);

    /**
     * Sets the time the request was initiated
     *
     * @param time Time the request was initiated
     * @return Builder with time set
     */
    public abstract Builder setTime(Instant time);

    /**
     * Sets stageIntervalId
     *
     * @param stageIntervalId IntervalId of the StageInterval containing the ActivityInterval to
     *     update
     * @return Builder with stageIntervalId set
     */
    public abstract Builder setStageIntervalId(IntervalId stageIntervalId);

    /**
     * Sets status
     *
     * @param status IntervalStatus to apply to the specified ActivityInterval
     * @return Builder with status set
     */
    public abstract Builder setStatus(IntervalStatus status);

    /**
     * Builds and returns a new UpdateInteractiveAnalysisStageIntervalStatusRequest with the set
     * values
     *
     * @return New UpdateInteractiveAnalysisStageIntervalStatusRequest with the set values
     */
    public abstract UpdateInteractiveAnalysisStageIntervalStatusRequest build();
  }
}
