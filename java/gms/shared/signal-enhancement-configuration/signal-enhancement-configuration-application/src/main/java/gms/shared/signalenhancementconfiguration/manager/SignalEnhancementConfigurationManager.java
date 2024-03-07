package gms.shared.signalenhancementconfiguration.manager;

import static gms.shared.frameworks.common.ContentType.MSGPACK_NAME;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.signalenhancementconfiguration.api.BeamformingTemplatesRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskDefinitionByPhaseByChannel;
import gms.shared.signalenhancementconfiguration.api.ProcessingMaskDefinitionRequest;
import gms.shared.signalenhancementconfiguration.api.webclient.FkReviewablePhasesRequest;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfigurationService;
import gms.shared.stationdefinition.coi.station.Station;
import io.swagger.v3.oas.annotations.Operation;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(
    value = "/signal-enhancement-configuration",
    produces = {MediaType.APPLICATION_JSON_VALUE, MSGPACK_NAME})
public class SignalEnhancementConfigurationManager {

  private static final int CUSTOM_PARTIAL_RESPONSE_CODE = 209;

  private final SignalEnhancementConfigurationService signalEnhancementConfigurationService;

  @Autowired
  public SignalEnhancementConfigurationManager(
      SignalEnhancementConfigurationService signalEnhancementConfigurationService) {
    this.signalEnhancementConfigurationService = signalEnhancementConfigurationService;
  }

  /**
   * Finds {@link FilterListDefinition} and returns serialized json response
   *
   * @return
   */
  @GetMapping(value = "/filter-lists-definition")
  @Operation(summary = "retrieves filter lists definition")
  public FilterListDefinition getFilterListsDefinition() {
    return signalEnhancementConfigurationService.filterListDefinition();
  }

  /**
   * Resolves default FilterDefinitions for each of the provided ChannelSegment objects for each
   * FilterDefinitionUsage literal
   *
   * @param request
   * @return {@link FilterDefinitionByUsageByChannelSegments}
   */
  @PostMapping(value = "/default-filter-definitions-for-channel-segments")
  @Operation(summary = "retrieves filter lists definition")
  public ResponseEntity<FilterDefinitionByUsageByChannelSegment>
      getDefaultFilterDefinitionByUsageForChannelSegments(
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
                  description = "List of Channel Segments and an optional event hypothesis")
              @RequestBody
              FilterDefinitionByUsageForChannelSegmentsRequest request) {

    var pair =
        signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(
            request);

    var responseCode =
        Boolean.TRUE.equals(pair.getValue()) ? CUSTOM_PARTIAL_RESPONSE_CODE : HttpStatus.OK.value();

    return ResponseEntity.status(responseCode).body(pair.getLeft());
  }

  /**
   * Resolves default FilterDefinitions for each of the provided SignalDetectionHypothesis objects
   * for each FilterDefinitionUsage literal
   *
   * @param request
   * @return {@link FilterDefinitionByUsageBySignalDetectionHypothesis}
   */
  @PostMapping("/default-filter-definitions-for-signal-detection-hypotheses")
  @Operation(
      summary =
          "Resolves default FilterDefinitions for each of the "
              + "provided SignalDetectionHypothesis objects for each "
              + "FilterDefinitionUsage literal")
  public ResponseEntity<FilterDefinitionByUsageBySignalDetectionHypothesis>
      getByDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
                  description =
                      "List of Signal Detection Hypotheses and an optional event hypothesis")
              @RequestBody
              FilterDefinitionByUsageForSignalDetectionHypothesesRequest request) {

    var pair =
        signalEnhancementConfigurationService
            .getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    var responseCode =
        Boolean.TRUE.equals(pair.getValue()) ? CUSTOM_PARTIAL_RESPONSE_CODE : HttpStatus.OK.value();

    return ResponseEntity.status(responseCode).body(pair.getLeft());
  }

  /**
   * Finds a collection of ProcessingMaskDefinitions
   *
   * @param request {@link ProcessingMaskDefinitionsRequest}
   * @return {@link ProcessingMaskDefinitionByPhaseByChannel}
   */
  @PostMapping(value = "/processing-mask-definitions")
  @Operation(
      summary =
          "Retrieves processing mask definitions based on the Channels, "
              + "PhaseTypes, and Operations in the request")
  public ResponseEntity<ProcessingMaskDefinitionByPhaseByChannel> getProcessingMaskDefinitions(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Channels, PhaseTypes, and Processing Operations")
          @RequestBody
          ProcessingMaskDefinitionRequest request) {

    var processingMaskDefinitionByPhaseByChannel =
        signalEnhancementConfigurationService.getProcessingMaskDefinitions(request);

    int responseCode = HttpStatus.OK.value();

    if (!request.getInvalidPhaseTypes().isEmpty()
        || !request.getInvalidProcessingOperations().isEmpty()
        || processingMaskDefinitionByPhaseByChannel
            .getProcessingMaskDefinitionByPhaseByChannel()
            .stream()
            .parallel()
            .anyMatch(item -> item.getProcessingMaskDefinitionByPhase().isEmpty())) {
      responseCode = CUSTOM_PARTIAL_RESPONSE_CODE;
    }

    return ResponseEntity.status(responseCode).body(processingMaskDefinitionByPhaseByChannel);
  }

  /**
   * Finds a collection of BeamformingTemplates
   *
   * @param request {@link BeamformingTemplatesRequest}
   * @return {@link Collection<BeamformingTemplateTuple>>}
   */
  @PostMapping(value = "/beamforming-template")
  @Operation(summary = "retrieves beamforming templates by station, phase type and beam type")
  public ResponseEntity<Map<String, Map<String, BeamformingTemplate>>> getBeamformingTemplates(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Station, PhaseTypes and BeamTypes")
          @RequestBody
          BeamformingTemplatesRequest request) {
    var beamformingTemplates =
        signalEnhancementConfigurationService.getBeamformingTemplates(request);

    var responseCode =
        (request.getStations().size() * request.getPhases().size()) == beamformingTemplates.size()
            ? HttpStatus.OK.value()
            : CUSTOM_PARTIAL_RESPONSE_CODE;

    var response =
        beamformingTemplates.stream()
            .collect(
                Collectors.groupingBy(
                    template -> template.getStation().getName(),
                    Collectors.toMap(
                        t -> t.getBeamDescription().getPhase().toString(), item -> item)));

    return ResponseEntity.status(responseCode).body(response);
  }

  /**
   * Resolves a mapping of {@link Station} names to reviewable {@link PhaseType}s given {@link
   * Station}s and an activity {@link gms.shared.workflow.coi.WorkflowDefinitionId}
   *
   * @param request {@link FkReviewablePhasesRequest}
   * @return A mapping of {@link Station} names to reviewable {@link PhaseType}s
   */
  @PostMapping(value = "/fk-reviewable-phases")
  @Operation(summary = "retrieves FK reviewable phases by station for given stations and activity")
  public ResponseEntity<Map<String, Set<PhaseType>>> getFkReviewablePhases(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Station, Activity ID (WorkflowDefinitionId)")
          @RequestBody
          FkReviewablePhasesRequest request) {
    var fkReviewablePhases = signalEnhancementConfigurationService.getFkReviewablePhases(request);

    var requestedStationEntities =
        request.stations().stream().map(Station::toEntityReference).collect(Collectors.toSet());
    var resolvedStationEntities =
        fkReviewablePhases.keySet().stream()
            .map(Station::toEntityReference)
            .collect(Collectors.toSet());
    var responseCode =
        requestedStationEntities.equals(resolvedStationEntities)
            ? HttpStatus.OK.value()
            : CUSTOM_PARTIAL_RESPONSE_CODE;

    var response =
        fkReviewablePhases.entrySet().stream()
            .collect(Collectors.toMap(entry -> entry.getKey().getName(), Entry::getValue));

    return ResponseEntity.status(responseCode).body(response);
  }
}
