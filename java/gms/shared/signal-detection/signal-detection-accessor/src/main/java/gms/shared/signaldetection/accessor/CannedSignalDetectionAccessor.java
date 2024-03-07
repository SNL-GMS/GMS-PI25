package gms.shared.signaldetection.accessor;

import com.google.common.base.Preconditions;
import gms.shared.signaldetection.api.SignalDetectionAccessor;
import gms.shared.signaldetection.api.SignalDetectionRepository;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.api.response.SignalDetectionsWithChannelSegments;
import gms.shared.signaldetection.coi.detection.FeatureMeasurement;
import gms.shared.signaldetection.coi.detection.SignalDetection;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisId;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.webclient.SignalEnhancementConfigurationClient;
import gms.shared.stationdefinition.api.StationDefinitionAccessor;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.facet.FacetingTypes;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessor;
import gms.shared.waveform.api.facet.WaveformFacetingUtility;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Canned SignalDetectionAccessor providing support for the findFilterDefinitionsForSignalDetections
 * method TODO This Canned accessor will be removed when full endpoint is available.
 */
@Component
public class CannedSignalDetectionAccessor implements SignalDetectionAccessor {

  private static final Logger LOGGER = LoggerFactory.getLogger(CannedSignalDetectionAccessor.class);
  private static final String NOT_IMPLIMENTED = "Method not avaiable in canned accessor";
  private static final String STATION = "station";
  private static final FacetingDefinition stationFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(FacetingTypes.STATION_TYPE.getValue())
          .setPopulated(false)
          .setFacetingDefinitions(Map.of())
          .build();
  private static final FacetingDefinition channelFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(FacetingTypes.CHANNEL_TYPE.getValue())
          .setPopulated(false)
          .setFacetingDefinitions(Map.of())
          .build();
  private static final FacetingDefinition featureMeasurementFacetingDefinition =
      FacetingDefinition.builder()
          .setClassType(FeatureMeasurement.class.getSimpleName())
          .setPopulated(true)
          .addFacetingDefinitions("channel", channelFacetingDefinition)
          .build();

  private final SignalEnhancementConfigurationClient secClient;
  private SignalDetectionFacetingUtility signalDetectionFacetingUtility;
  private final SignalDetectionRepository signalDetectionRepository;

  @Autowired
  public CannedSignalDetectionAccessor(
      SignalEnhancementConfigurationClient secClient,
      @Qualifier("bridgedSignalDetectionRepository") SignalDetectionRepository signalDetectionRepository,
      WaveformAccessor waveformAccessor,
      @Qualifier("bridgedStationDefinitionAccessor") StationDefinitionAccessor stationDefinitionAccessorImpl) {
    this.signalDetectionRepository = signalDetectionRepository;
    this.secClient = secClient;
    this.signalDetectionFacetingUtility =
        SignalDetectionFacetingUtility.create(
            this,
            new WaveformFacetingUtility(waveformAccessor, stationDefinitionAccessorImpl),
            StationDefinitionFacetingUtility.create(stationDefinitionAccessorImpl));
  }

  public void setSignalDetectionFacetingUtility(
      SignalDetectionFacetingUtility signalDetectionFacetingUtility) {
    Objects.requireNonNull(signalDetectionFacetingUtility);

    this.signalDetectionFacetingUtility = signalDetectionFacetingUtility;
  }

  @Override
  public SignalDetectionsWithChannelSegments findWithSegmentsByStationsAndTime(
      List<Station> stations,
      Instant startTime,
      Instant endTime,
      WorkflowDefinitionId stageId,
      List<SignalDetection> excludedSignalDetections) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  @Override
  public List<SignalDetection> findByStationsAndTime(
      List<Station> stations,
      Instant startTime,
      Instant endTime,
      WorkflowDefinitionId stageId,
      List<SignalDetection> excludedSignalDetections,
      FacetingDefinition facetingDefinition) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  @Override
  public List<SignalDetection> findByIds(
      List<UUID> ids, WorkflowDefinitionId stageId, FacetingDefinition facetingDefinition) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  @Override
  public List<SignalDetectionHypothesis> findHypothesesByIds(
      List<SignalDetectionHypothesisId> ids, FacetingDefinition facetingDefinition) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  @Override
  public SignalDetectionsWithChannelSegments findWithSegmentsByIds(
      List<UUID> signalDetectionIds, WorkflowDefinitionId stageId) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  @Override
  public Mono<Pair<FilterDefinitionByUsageBySignalDetectionHypothesis, Boolean>>
      findFilterDefinitionsForSignalDetections(
          List<SignalDetection> signalDetections, WorkflowDefinitionId stageId) {
    var sdWithSimpleHypothesesDefinition =
        FacetingDefinition.builder()
            .setClassType(SignalDetection.class.getSimpleName())
            .setPopulated(true)
            .addFacetingDefinitions(STATION, stationFacetingDefinition)
            .addFacetingDefinitions(
                "signalDetectionHypotheses",
                FacetingDefinition.builder()
                    .setClassType(SignalDetectionHypothesis.class.getSimpleName())
                    // TODO: Faceting utility doesn't seem to properly handle when we only want
                    // hypotheses as entity refrences
                    .setPopulated(true)
                    .addFacetingDefinitions(STATION, stationFacetingDefinition)
                    .addFacetingDefinitions(
                        "featureMeasurements", featureMeasurementFacetingDefinition)
                    .build())
            .build();

    return Mono.just(signalDetections)
        .map(
            (List<SignalDetection> sds) -> {
              Preconditions.checkArgument(
                  !signalDetections.isEmpty(), "Must provide at least one signal detection");
              return sds;
            })
        .map(
            sds ->
                FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
                    .setSignalDetectionsHypotheses(
                        resolveHypotheses(sds, sdWithSimpleHypothesesDefinition, stageId))
                    .build())
        .flatMap(secClient::queryDefaultFilterDefByUsageForSDHs)
        .map(queryResult -> Pair.of(queryResult, false));
  }

  @Override
  public List<SignalDetection> findByIds(List<UUID> ids, WorkflowDefinitionId stageId) {
    return signalDetectionRepository.findByIds(ids, stageId);
  }

  @Override
  public List<SignalDetectionHypothesis> findHypothesesByIds(
      List<SignalDetectionHypothesisId> ids) {
    return signalDetectionRepository.findHypothesesByIds(ids);
  }

  @Override
  public List<SignalDetection> findByStationsAndTime(
      List<Station> stations,
      Instant startTime,
      Instant endTime,
      WorkflowDefinitionId stageId,
      List<SignalDetection> excludedSignalDetections) {
    throw new UnsupportedOperationException(NOT_IMPLIMENTED);
  }

  private List<SignalDetectionHypothesis> resolveHypotheses(
      List<SignalDetection> sds, FacetingDefinition definition, WorkflowDefinitionId stageId) {
    var hypotheses =
        sds.stream()
            .map(
                sd ->
                    Optional.ofNullable(
                            sd.isPresent()
                                ? sd
                                : signalDetectionFacetingUtility.populateFacets(
                                    sd, definition, stageId))
                        .or(
                            () -> {
                              LOGGER.warn(
                                  "Faceting utility returned null for faceted" + " detection {}",
                                  sd.getId());
                              return Optional.empty();
                            }))
            .flatMap(Optional::stream)
            .map(
                (SignalDetection sd) -> {
                  var sdhs = sd.getSignalDetectionHypotheses();
                  if (sdhs.isEmpty()) {
                    LOGGER.warn(
                        "Provided signal detection {} did not resolve" + " any of its hypotheses",
                        sd.getId());
                  }
                  return sdhs;
                })
            .flatMap(List::stream)
            .collect(Collectors.toList());
    Preconditions.checkArgument(
        !hypotheses.isEmpty(),
        "Signal detections provided must collectively resolve at least"
            + " one signal detection hypothesis");
    return hypotheses;
  }
}
