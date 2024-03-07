package gms.shared.signalenhancementconfiguration.api.webclient;

import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.util.Collection;

/**
 * Request body structure for the "FK Reviewable Phases" Endpoint
 *
 * @param stations {@link Station}s to be matched against configuration
 * @param activity Activity {@link WorkflowDefinitionId} to be matched against configuration
 */
public record FkReviewablePhasesRequest(
    Collection<Station> stations, WorkflowDefinitionId activity) {}
