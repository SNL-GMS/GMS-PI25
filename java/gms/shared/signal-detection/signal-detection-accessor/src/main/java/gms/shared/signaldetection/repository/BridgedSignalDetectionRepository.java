package gms.shared.signaldetection.repository;

import static com.google.common.base.Preconditions.checkNotNull;
import static gms.shared.signaldetection.database.connector.SignalDetectionDatabaseConnectorTypes.AMPLITUDE_CONNECTOR_TYPE;
import static gms.shared.signaldetection.database.connector.SignalDetectionDatabaseConnectorTypes.ARRIVAL_CONNECTOR_TYPE;
import static gms.shared.signaldetection.database.connector.SignalDetectionDatabaseConnectorTypes.ARRIVAL_DYN_PARS_INT_CONNECTOR_TYPE;
import static gms.shared.signaldetection.database.connector.SignalDetectionDatabaseConnectorTypes.ASSOC_CONNECTOR_TYPE;
import static java.util.stream.Collectors.collectingAndThen;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Functions;
import com.google.common.base.Preconditions;
import com.google.common.collect.HashMultimap;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Multimap;
import com.google.common.collect.SetMultimap;
import com.google.common.math.DoubleMath;
import gms.shared.signaldetection.api.SignalDetectionRepository;
import gms.shared.signaldetection.coi.detection.SignalDetection;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisConverterId;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisId;
import gms.shared.signaldetection.coi.detection.WaveformAndFilterDefinition;
import gms.shared.signaldetection.converter.detection.SignalDetectionConverter;
import gms.shared.signaldetection.converter.detection.SignalDetectionHypothesisConverter;
import gms.shared.signaldetection.dao.css.AmplitudeDao;
import gms.shared.signaldetection.dao.css.AridOridKey;
import gms.shared.signaldetection.dao.css.ArrivalDao;
import gms.shared.signaldetection.dao.css.ArrivalDynParsIntDao;
import gms.shared.signaldetection.dao.css.AssocDao;
import gms.shared.signaldetection.dao.css.enums.AmplitudeType;
import gms.shared.signaldetection.database.connector.AmplitudeDatabaseConnector;
import gms.shared.signaldetection.database.connector.ArrivalDatabaseConnector;
import gms.shared.signaldetection.database.connector.AssocDatabaseConnector;
import gms.shared.signaldetection.database.connector.config.SignalDetectionBridgeDefinition;
import gms.shared.signaldetection.repository.utils.AmplitudeDaoAndChannelAssociation;
import gms.shared.signaldetection.repository.utils.ArrivalDaoAndChannelAssociation;
import gms.shared.signaldetection.repository.utils.SignalDetectionComponents;
import gms.shared.signaldetection.repository.utils.SignalDetectionHypothesisArrivalIdComponents;
import gms.shared.signaldetection.repository.utils.SignalDetectionHypothesisAssocIdComponents;
import gms.shared.signaldetection.repository.utils.SignalDetectionIdUtility;
import gms.shared.signaldetection.util.FilterRecordIdsByUsage;
import gms.shared.signaldetection.util.SourcedWfdisc;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.spring.utilities.aspect.Timing;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.dao.css.SiteChanKey;
import gms.shared.stationdefinition.dao.css.SiteDao;
import gms.shared.stationdefinition.dao.css.StationChannelTimeKey;
import gms.shared.stationdefinition.dao.css.WfTagDao;
import gms.shared.stationdefinition.dao.css.WfTagKey;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.stationdefinition.database.connector.SiteDatabaseConnector;
import gms.shared.stationdefinition.database.connector.WfdiscDatabaseConnector;
import gms.shared.stationdefinition.database.connector.WftagDatabaseConnector;
import gms.shared.stationdefinition.repository.util.StationDefinitionIdUtility;
import gms.shared.utilities.logging.TimingLogger;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Timeseries;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.time.Instant;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.ignite.IgniteCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Bridged signal detection repository for querying legacy objects from previous and current stages
 * in order to build signal detection objects
 */
@Component
@Qualifier("bridgedSignalDetectionRepository") public class BridgedSignalDetectionRepository implements SignalDetectionRepository {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(BridgedSignalDetectionRepository.class);
  private static final TimingLogger<List<SignalDetectionHypothesisArrivalIdComponents>>
      arrivalIdLogger = TimingLogger.create(LOGGER);
  private static final TimingLogger<List<SignalDetectionHypothesisAssocIdComponents>> assocLogger =
      TimingLogger.create(LOGGER);
  private static final TimingLogger<List<SignalDetectionHypothesis>> sigDetectionHyothesisLogger =
      TimingLogger.create(LOGGER);
  private static final String STAGEID_DOES_NOT_EXIST =
      "Requested Stage ID {} not in definition. Returning empty signal detections.";
  private static final double DOUBLE_EQUALITY_EPSILON = 0.000000001D;

  private final SignalDetectionBridgeDatabaseConnectors signalDetectionBridgeDatabaseConnectors;
  private final SiteDatabaseConnector siteDatabaseConnector;
  private final WfdiscDatabaseConnector wfdiscDatabaseConnector;
  private final WftagDatabaseConnector wftagDatabaseConnector;
  private final SignalDetectionBridgeDefinition signalDetectionBridgeDefinition;
  private final SignalDetectionConverter signalDetectionConverter;
  private final SignalDetectionHypothesisConverter signalDetectionHypothesisConverter;
  private final SignalDetectionIdUtility signalDetectionIdUtility;
  private final IgniteCache<ChannelSegmentDescriptor, List<Long>>
      channelSegmentDescriptorWfidsCache;
  private final SdhBridgeHelperUtility sdhBridgeHelperUtility;
  private final Environment environment;

  @Autowired
  public BridgedSignalDetectionRepository(
      SignalDetectionBridgeDatabaseConnectors signalDetectionBridgeDatabaseConnectors,
      SiteDatabaseConnector siteDatabaseConnector,
      WfdiscDatabaseConnector wfdiscDatabaseConnector,
      WftagDatabaseConnector wftagDatabaseConnector,
      SignalDetectionBridgeDefinition signalDetectionBridgeDefinition,
      SdhBridgeHelperUtility sdhBridgeHelperUtility,
      SignalDetectionIdUtility signalDetectionIdUtility,
      SignalDetectionHypothesisConverter signalDetectionHypothesisConverter,
      SignalDetectionConverter signalDetectionConverter,
      IgniteCache<ChannelSegmentDescriptor, List<Long>> channelSegmentDescriptorWfidsCache,
      Environment environment) {

    // set the database connectors for signal detection
    this.signalDetectionBridgeDatabaseConnectors = signalDetectionBridgeDatabaseConnectors;
    this.siteDatabaseConnector = siteDatabaseConnector;
    this.wfdiscDatabaseConnector = wfdiscDatabaseConnector;
    this.wftagDatabaseConnector = wftagDatabaseConnector;

    // set the signal detection bridge definition, repository and id utility
    this.signalDetectionBridgeDefinition = signalDetectionBridgeDefinition;
    this.signalDetectionIdUtility = signalDetectionIdUtility;

    // create signal detection converter using feature measurement and hypothesis converters
    this.signalDetectionHypothesisConverter = signalDetectionHypothesisConverter;
    this.signalDetectionConverter = signalDetectionConverter;

    // create the arrivalChannel segment and wfids ignite cache
    this.channelSegmentDescriptorWfidsCache = channelSegmentDescriptorWfidsCache;

    this.sdhBridgeHelperUtility = sdhBridgeHelperUtility;

    this.environment = environment;
  }

  @Override
  @Timing
  public List<SignalDetection> findByIds(List<UUID> ids, WorkflowDefinitionId stageId) {
    checkNotNull(ids, "List of ids cannot be null");
    checkNotNull(stageId, "Stage cannot be null");

    if (!signalDetectionBridgeDefinition.getOrderedStages().contains(stageId)) {
      LOGGER.warn(STAGEID_DOES_NOT_EXIST, stageId.getName());
      return List.of();
    }

    var stageName = stageId.getName();
    Optional<WorkflowDefinitionId> previousStageOptional = getPreviousStage(stageId);

    // get the current connectors for arrival and assoc
    var arrivalDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var assocDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ASSOC_CONNECTOR_TYPE);

    // create arids using from id utility and signal detection objects
    Collection<Long> arids =
        ids.stream()
            .map(signalDetectionIdUtility::getAridForSignalDetectionUUID)
            .collect(Collectors.toList());

    // create map of current stage arrivals using arids as keys
    Map<Long, ArrivalDao> currentStageArrivals =
        findCurrentStageArrivals(arrivalDatabaseConnector, arids);
    // get the key sets of current stage arrivals used to query assocs
    var currentArids = new ArrayList<>(currentStageArrivals.keySet());
    // create map of current stage arrivals using arids as keys
    SetMultimap<Long, AssocDao> currentStageAssocs =
        findCurrentStageAssocs(assocDatabaseConnector, currentArids);

    // check if the previous connectors exists for arrival and assoc
    var prevArrivalDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var prevAssocDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ASSOC_CONNECTOR_TYPE);

    // if previous stage connector exists, create map of previous stage arrivals using arids as keys
    Map<Long, ArrivalDao> previousStageArrivals =
        prevArrivalDatabaseConnectorExists ? findPreviousStageArrivals(stageId, arids) : Map.of();
    var previousArids = new ArrayList<>(previousStageArrivals.keySet());

    // if previous arids exists and previous stage database connector exists query for previous
    // assocs
    SetMultimap<Long, AssocDao> previousStageAssocs =
        (!previousArids.isEmpty() && prevAssocDatabaseConnectorExists)
            ? findPreviousStageAssocs(stageId, previousArids)
            : HashMultimap.create();

    var signalDetectionList =
        findByIdsHelper(
            currentStageArrivals,
            currentStageAssocs,
            previousStageArrivals,
            previousStageAssocs,
            stageId);

    previousArids.removeAll(currentArids);

    // get signal detections for any remaining arids
    if (!previousArids.isEmpty() && previousStageOptional.isPresent()) {

      signalDetectionList.addAll(
          findByIdsHelper(previousStageArrivals, previousStageAssocs, previousStageOptional.get()));
    }

    return signalDetectionList;
  }

  private List<SignalDetection> findByIdsHelper(
      Map<Long, ArrivalDao> currentStageArrivals,
      SetMultimap<Long, AssocDao> currentStageAssocs,
      WorkflowDefinitionId currentStage) {

    var stageName = currentStage.getName();
    var currentArids = new ArrayList<>(currentStageArrivals.keySet());

    // check if the previous connectors exists for arrival and assoc
    var prevArrivalDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var prevAssocDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ASSOC_CONNECTOR_TYPE);

    // if previous stage connector exists, create map of previous stage arrivals using arids as keys
    Map<Long, ArrivalDao> previousStageArrivals =
        prevArrivalDatabaseConnectorExists
            ? findPreviousStageArrivals(currentStage, currentArids)
            : Map.of();
    var previousArids = new ArrayList<>(previousStageArrivals.keySet());

    // if previous arids exists and previous stage database connector exists query for previous
    // assocs
    SetMultimap<Long, AssocDao> previousStageAssocs =
        (!previousArids.isEmpty() && prevAssocDatabaseConnectorExists)
            ? findPreviousStageAssocs(currentStage, previousArids)
            : HashMultimap.create();

    return findByIdsHelper(
        currentStageArrivals,
        currentStageAssocs,
        previousStageArrivals,
        previousStageAssocs,
        currentStage);
  }

  private List<SignalDetection> findByIdsHelper(
      Map<Long, ArrivalDao> currentStageArrivals,
      SetMultimap<Long, AssocDao> currentStageAssocs,
      Map<Long, ArrivalDao> previousStageArrivals,
      SetMultimap<Long, AssocDao> previousStageAssocs,
      WorkflowDefinitionId currentStage) {

    var currentArids = new ArrayList<>(currentStageArrivals.keySet());
    var stageName = currentStage.getName();
    Optional<WorkflowDefinitionId> previousStageOptional = getPreviousStage(currentStage);

    var amplitudeDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, AMPLITUDE_CONNECTOR_TYPE);
    // get amplitude from current set of arids
    SetMultimap<Long, AmplitudeDao> amplitudeDaos =
        findCurrentStageAmplitudes(amplitudeDatabaseConnector, currentArids);

    return currentStageArrivals.entrySet().stream()
        .map(
            entry ->
                mapEntryToSignalDetectionBuilder(
                    entry,
                    previousStageArrivals,
                    currentStage,
                    currentStageAssocs,
                    previousStageAssocs,
                    amplitudeDaos))
        .map(sdBuilder -> sdBuilder.setPreviousStage(previousStageOptional).build())
        .map(signalDetectionConverter::convert)
        .flatMap(Optional::stream)
        .collect(Collectors.toList());
  }

  private SignalDetectionComponents.Builder mapEntryToSignalDetectionBuilder(
      Map.Entry<Long, ArrivalDao> entry,
      Map<Long, ArrivalDao> previousStageArrivals,
      WorkflowDefinitionId currentStage,
      SetMultimap<Long, AssocDao> currentStageAssocs,
      SetMultimap<Long, AssocDao> previousStageAssocs,
      SetMultimap<Long, AmplitudeDao> amplitudeDaos) {

    var station =
        StationDefinitionIdUtility.getStationEntityForSta(
            entry.getValue().getArrivalKey().getStationCode());

    Optional<ArrivalDao> previousArrival =
        Optional.ofNullable(previousStageArrivals.get(entry.getKey()));

    return SignalDetectionComponents.builder()
        .setCurrentStage(currentStage)
        .setCurrentArrival(entry.getValue())
        .setPreviousArrival(previousArrival)
        .setCurrentAssocs(currentStageAssocs.get(entry.getKey()))
        .setPreviousAssocs(previousStageAssocs.get(entry.getKey()))
        .setAmplitudeDaos(amplitudeDaos.get(entry.getKey()))
        .setStation(station)
        .setMonitoringOrganization(signalDetectionBridgeDefinition.getMonitoringOrganization());
  }

  @Override
  @Timing
  public List<SignalDetectionHypothesis> findHypothesesByIds(
      List<SignalDetectionHypothesisId> ids) {
    checkNotNull(ids, "List of ids cannot be null");

    // create list of sdh arrival id components
    List<SignalDetectionHypothesisArrivalIdComponents> arrivalIdComponents =
        arrivalIdLogger.apply(
            this.getClass().getSimpleName() + "::findArrivalIdComponents",
            () -> findArrivalIdComponents(ids),
            environment.getActiveProfiles());

    // create list of sdh assoc components
    List<SignalDetectionHypothesisAssocIdComponents> sdhAssocIdComponents =
        assocLogger.apply(
            this.getClass().getSimpleName() + "::findSdhAssocIdComponents",
            () -> findSdhAssocIdComponents(ids),
            environment.getActiveProfiles());

    // using the given list of arrival id components, query for signal detection hypotheses
    List<SignalDetectionHypothesis> hypotheses =
        sigDetectionHyothesisLogger.apply(
            this.getClass().getSimpleName() + "::findSignalDetectionHypothesis",
            () -> findSignalDetectionHypothesis(arrivalIdComponents),
            environment.getActiveProfiles());

    if (!sdhAssocIdComponents.isEmpty()) {
      // get the stage ids, arids and orids from the hypothesis ids
      Map<String, List<Pair<Long, Long>>> aridOridMap =
          sdhAssocIdComponents.stream()
              .filter(Objects::nonNull)
              .collect(
                  groupingBy(
                      SignalDetectionHypothesisAssocIdComponents::getLegacyDatabaseAccountId,
                      // create list of pairs of arid/orid values
                      collectingAndThen(
                          toList(),
                          list ->
                              list.stream()
                                  .map(idComp -> Pair.of(idComp.getArid(), idComp.getOrid()))
                                  .collect(toList()))));

      // using the arid/orid map build signal detection hypotheses accordingly
      hypotheses.addAll(
          aridOridMap.entrySet().stream()
              .map(
                  (var entry) -> {
                    Optional<WorkflowDefinitionId> stageId =
                        findStageIdFromDatabaseAccountByStage(entry.getKey());
                    List<Pair<Long, Long>> aridOridList = entry.getValue();

                    // need to build hypotheses with arids/orids
                    return stageId.isPresent()
                        ? buildHypothesesFromStageIdAridsAndOrids(stageId.get(), aridOridList)
                        : Collections.<SignalDetectionHypothesis>emptyList();
                  })
              .flatMap(List::stream)
              .collect(toList()));
    }

    return hypotheses;
  }

  private List<SignalDetectionHypothesis> findSignalDetectionHypothesis(
      List<SignalDetectionHypothesisArrivalIdComponents> arrivalIdComponents) {
    return arrivalIdComponents.stream()
        .filter(Objects::nonNull)
        .collect(
            groupingBy(
                SignalDetectionHypothesisArrivalIdComponents::getLegacyDatabaseAccountId,
                Collectors.mapping(
                    SignalDetectionHypothesisArrivalIdComponents::getArid, Collectors.toList())))
        .entrySet()
        .stream()
        .map(
            (var aridsByLegacyAccountIdEntry) -> {
              Optional<WorkflowDefinitionId> stageId =
                  findStageIdFromDatabaseAccountByStage(aridsByLegacyAccountIdEntry.getKey());
              return stageId.isPresent()
                  ? buildHypothesesFromStageIdAndArids(
                      stageId.get(), aridsByLegacyAccountIdEntry.getValue())
                  : Collections.<SignalDetectionHypothesis>emptyList();
            })
        .flatMap(List::stream)
        .collect(Collectors.toList());
  }

  private List<SignalDetectionHypothesisAssocIdComponents> findSdhAssocIdComponents(
      List<SignalDetectionHypothesisId> ids) {
    return ids.stream()
        .map(
            hypId ->
                signalDetectionIdUtility.getAssocIdComponentsFromSignalDetectionHypothesisId(
                    hypId.getId()))
        .toList();
  }

  private List<SignalDetectionHypothesisArrivalIdComponents> findArrivalIdComponents(
      List<SignalDetectionHypothesisId> ids) {

    return ids.stream()
        .map(
            hypId ->
                signalDetectionIdUtility.getArrivalIdComponentsFromSignalDetectionHypothesisId(
                    hypId.getId()))
        .toList();
  }

  @Override
  @Timing
  public List<SignalDetection> findByStationsAndTime(
      List<Station> stations,
      Instant startTime,
      Instant endTime,
      WorkflowDefinitionId stageId,
      List<SignalDetection> excludedSignalDetections) {
    checkNotNull(stations, "Stations cannot be null");
    checkNotNull(startTime, "Start time cannot be null");
    checkNotNull(endTime, "End time cannot be null");
    checkNotNull(stageId, "Stage id cannot be null");
    checkNotNull(excludedSignalDetections, "Excluded detections cannot be null");

    if (!signalDetectionBridgeDefinition.getOrderedStages().contains(stageId)) {
      LOGGER.warn(STAGEID_DOES_NOT_EXIST, stageId.getName());
      return List.of();
    }

    var stageName = stageId.getName();
    // get the current connectors for amplitude, arrival and assoc
    var amplitudeDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, AMPLITUDE_CONNECTOR_TYPE);
    var arrivalDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var assocDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ASSOC_CONNECTOR_TYPE);

    // check if the previous connectors exists for arrival and assoc
    var prevArrivalDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var prevAssocDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ASSOC_CONNECTOR_TYPE);

    // get lead/lag duration from the bridge definition
    var leadDuration = signalDetectionBridgeDefinition.getMeasuredWaveformLeadDuration();
    var lagDuration = signalDetectionBridgeDefinition.getMeasuredWaveformLagDuration();

    // create excluded arids using from id utility and signal detection objects
    Collection<Long> excludedArids =
        excludedSignalDetections.stream()
            .map(sd -> signalDetectionIdUtility.getAridForSignalDetectionUUID(sd.getId()))
            .collect(Collectors.toList());

    SetMultimap<String, String> channelGroupNames =
        findChannelGroupNamesFromStationsAndTimeRange(stations, startTime, endTime);

    return stations.stream()
        .map(
            (Station station) -> {
              var currentStageArrivals =
                  arrivalDatabaseConnector
                      .findArrivals(
                          new ArrayList<>(channelGroupNames.get(station.getName())),
                          excludedArids,
                          startTime,
                          endTime,
                          leadDuration,
                          lagDuration)
                      .stream()
                      .collect(Collectors.toMap(ArrivalDao::getId, Functions.identity()));

              return createListOfSignalDetections(
                  currentStageArrivals,
                  stageId,
                  prevArrivalDatabaseConnectorExists,
                  prevAssocDatabaseConnectorExists,
                  assocDatabaseConnector,
                  amplitudeDatabaseConnector);
            })
        .flatMap(List::stream)
        .collect(Collectors.toList());
  }

  private List<SignalDetection> createListOfSignalDetections(
      Map<Long, ArrivalDao> currentStageArrivals,
      WorkflowDefinitionId stageId,
      boolean prevArrivalDatabaseConnectorExists,
      boolean prevAssocDatabaseConnectorExists,
      AssocDatabaseConnector assocDatabaseConnector,
      AmplitudeDatabaseConnector amplitudeDatabaseConnector) {

    var currentArids = new ArrayList<>(currentStageArrivals.keySet());

    // query for previous stage arrivals using current stage and arids
    Map<Long, ArrivalDao> previousStageArrivals =
        prevArrivalDatabaseConnectorExists
            ? findPreviousStageArrivals(stageId, currentArids)
            : Map.of();
    var previousArids = previousStageArrivals.keySet();

    // query current stage assocs using current arids
    SetMultimap<Long, AssocDao> currentStageAssocs =
        findCurrentStageAssocs(assocDatabaseConnector, currentArids);

    // if previous arids exists and previous stage database connector exists querry for previous
    // assocs
    SetMultimap<Long, AssocDao> previousStageAssocs =
        (!previousArids.isEmpty() && prevAssocDatabaseConnectorExists)
            ? findPreviousStageAssocs(stageId, previousArids)
            : HashMultimap.create();

    SetMultimap<Long, AmplitudeDao> amplitudeDaos =
        findCurrentStageAmplitudes(amplitudeDatabaseConnector, currentArids);

    Optional<WorkflowDefinitionId> previousStageOptional = getPreviousStage(stageId);

    return currentStageArrivals.entrySet().stream()
        .map(
            entry ->
                mapEntryToSignalDetectionBuilder(
                    entry,
                    previousStageArrivals,
                    stageId,
                    currentStageAssocs,
                    previousStageAssocs,
                    amplitudeDaos))
        .map(sdBuilder -> sdBuilder.setPreviousStage(previousStageOptional).build())
        .map(signalDetectionConverter::convert)
        .flatMap(Optional::stream)
        .collect(Collectors.toList());
  }

  private SetMultimap<String, String> findChannelGroupNamesFromStationsAndTimeRange(
      List<Station> stations, Instant start, Instant end) {

    List<String> stationNames =
        stations.stream().map(Station::getName).collect(Collectors.toList());

    List<SiteDao> sites =
        siteDatabaseConnector.findSitesByReferenceStationAndTimeRange(stationNames, start, end);

    return sites.stream()
        .collect(
            HashMultimap::create,
            (mapper, site) -> mapper.put(site.getReferenceStation(), site.getId().getStationCode()),
            Multimap::putAll);
  }

  /**
   * Build hypotheses from stage id and arid from hypothesis id components
   *
   * @param stageId {@link WorkflowDefinitionId} for stage
   * @param arids long id representing arrival
   * @return list of {@link SignalDetectionHypothesis}
   */
  private List<SignalDetectionHypothesis> buildHypothesesFromStageIdAndArids(
      WorkflowDefinitionId stageId, List<Long> arids) {

    var stageName = stageId.getName();
    List<WorkflowDefinitionId> orderedStages = signalDetectionBridgeDefinition.getOrderedStages();
    int stageIndex = orderedStages.indexOf(stageId);
    Preconditions.checkState(stageIndex >= 0, "Requested stage does not exist: %s", stageId);

    // get the current connectors for amplitude, arrival and assoc
    var amplitudeDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, AMPLITUDE_CONNECTOR_TYPE);
    var arrivalDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var assocDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ASSOC_CONNECTOR_TYPE);

    // check if the previous connectors exists for arrival and assoc
    var prevArrivalDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ARRIVAL_CONNECTOR_TYPE);

    // current and previous stage arrivals
    List<ArrivalDao> currentStageArrivals = arrivalDatabaseConnector.findArrivalsByArids(arids);

    // if prevous stage connector exists, create map of previous stage arrivals using arids as keys
    Map<Long, ArrivalDao> previousStageArrivals =
        prevArrivalDatabaseConnectorExists ? findPreviousStageArrivals(stageId, arids) : Map.of();

    // get map of arids to assocs in same stage
    // this map is only used to check if assocs exist for given arid,
    // so ignoring the extra assocs associationed with an arid is intended
    Map<Long, AssocDao> currentStageAssocs =
        assocDatabaseConnector.findAssocsByArids(arids).stream()
            .collect(
                Collectors.toMap(
                    Functions.compose(AridOridKey::getArrivalId, AssocDao::getId),
                    Function.identity(),
                    (a, b) -> a));

    // current stage amplitude daos using arids
    SetMultimap<Long, AmplitudeDao> currentStageAmplitudes =
        findCurrentStageAmplitudes(amplitudeDatabaseConnector, arids);

    // mapping of arids to appropriate wfdiscDaos
    Map<Long, SourcedWfdisc> sourcedWfdiscsByArid =
        getSourcedWfdiscsByArid(currentStageArrivals, arids);

    // get the previous stage workflow id if it exists
    WorkflowDefinitionId previousStage = getPreviousStage(stageId).orElse(null);

    return signalDetectionHypothesesFromArrivals(
        sourcedWfdiscsByArid,
        currentStageArrivals,
        currentStageAssocs,
        currentStageAmplitudes,
        previousStageArrivals,
        stageId,
        previousStage);
  }

  /**
   * Return the associated {@link WorkflowDefinitionId} for the given legacy database account id
   * string
   *
   * @param legacyDatabaseAccountId String for legacy database account id
   * @return Optional of {@link WorkflowDefinitionId} stage id
   */
  private Optional<WorkflowDefinitionId> findStageIdFromDatabaseAccountByStage(
      String legacyDatabaseAccountId) {
    ImmutableMap<WorkflowDefinitionId, String> databaseAccountByStage =
        signalDetectionBridgeDefinition.getDatabaseAccountByStage();

    // first check that the account by stage map contains the given legacy db account id string
    if (databaseAccountByStage.containsValue(legacyDatabaseAccountId)) {
      for (Map.Entry<WorkflowDefinitionId, String> entry : databaseAccountByStage.entrySet()) {
        if (Objects.equals(entry.getValue(), legacyDatabaseAccountId)) {
          return Optional.of(entry.getKey());
        }
      }
    }

    return Optional.empty();
  }

  /**
   * Find current stage amplitudes using collection of arids
   *
   * @param amplitudeDatabaseConnector {@link AmplitudeDatabaseConnector}
   * @param arids collection of arids
   */
  private static SetMultimap<Long, AmplitudeDao> findCurrentStageAmplitudes(
      AmplitudeDatabaseConnector amplitudeDatabaseConnector, Collection<Long> arids) {
    return amplitudeDatabaseConnector.findAmplitudesByArids(arids).stream()
        .collect(HashMultimap::create, (m, i) -> m.put(i.getArrivalId(), i), Multimap::putAll);
  }

  /**
   * Find current stage arrivals using collection of arids
   *
   * @param arrivalDatabaseConnector {@link ArrivalDatabaseConnector}
   * @param arids collection of arids
   */
  private static Map<Long, ArrivalDao> findCurrentStageArrivals(
      ArrivalDatabaseConnector arrivalDatabaseConnector, Collection<Long> arids) {
    // create map of current stage arrivals using arids as keys
    return arrivalDatabaseConnector.findArrivalsByArids(arids).stream()
        .collect(Collectors.toMap(ArrivalDao::getId, Functions.identity()));
  }

  /**
   * Find current stage assocs using collection of arids
   *
   * @param assocDatabaseConnector {@link AssocDatabaseConnector}
   * @param arids collection of arids
   * @return multimap of long and {@link AssocDao}
   */
  private static SetMultimap<Long, AssocDao> findCurrentStageAssocs(
      AssocDatabaseConnector assocDatabaseConnector, Collection<Long> arids) {
    // create map of current stage arrivals using arids as keys
    return assocDatabaseConnector.findAssocsByArids(arids).stream()
        .collect(
            HashMultimap::create, (m, i) -> m.put(i.getId().getArrivalId(), i), Multimap::putAll);
  }

  /**
   * Find previous stage {@link ArrivalDao}s using list of arids and {@link WorkflowDefinitionId}
   *
   * @param stageId {@link WorkflowDefinitionId} stage id
   * @param arids list of arids to query
   * @return Map of long to {@link ArrivalDao}
   */
  private Map<Long, ArrivalDao> findPreviousStageArrivals(
      WorkflowDefinitionId stageId, Collection<Long> arids) {

    return signalDetectionBridgeDatabaseConnectors
        .getConnectorForPreviousStageOrThrow(stageId.getName(), ARRIVAL_CONNECTOR_TYPE)
        .findArrivalsByArids(arids)
        .stream()
        .collect(Collectors.toMap(ArrivalDao::getId, Functions.identity()));
  }

  /**
   * Find previous stage {@link AssocDao}s using list of arids and {@link WorkflowDefinitionId}
   *
   * @param stageId {@link WorkflowDefinitionId} stage id
   * @param arids list of arids to query
   * @return Map of long to {@link AssocDao}
   */
  private SetMultimap<Long, AssocDao> findPreviousStageAssocs(
      WorkflowDefinitionId stageId, Collection<Long> arids) {
    return signalDetectionBridgeDatabaseConnectors
        .getConnectorForPreviousStageOrThrow(stageId.getName(), ASSOC_CONNECTOR_TYPE)
        .findAssocsByArids(arids)
        .stream()
        .collect(
            HashMultimap::create, (m, i) -> m.put(i.getId().getArrivalId(), i), Multimap::putAll);
  }

  /**
   * Create a mapping from arid to a sourced pair of {@link WfdiscDao} and whether it was sourced
   * from a {@link WftagDao} or not, using current stage arrivals and corresponding list of arids
   *
   * @param currentStageArrivals list of current stage {@link ArrivalDao}s
   * @param arids list of ArrivalDao arids
   * @return Mapping from arid to a sourced pair of {@link WfdiscDao} and whether it was sourced
   *     from a {@link WftagDao} or not
   */
  private Map<Long, SourcedWfdisc> getSourcedWfdiscsByArid(
      List<ArrivalDao> currentStageArrivals, List<Long> arids) {

    // check if wftag record for an arrival exists and create hypotheses accordingly
    Map<Long, WfTagDao> wfTagDaosByArid =
        wftagDatabaseConnector.findWftagsByTagIds(arids).stream()
            .collect(
                Collectors.toMap(
                    Functions.compose(WfTagKey::getId, WfTagDao::getWfTagKey),
                    Function.identity()));
    Map<Long, Long> aridWfidMap =
        wfTagDaosByArid.entrySet().stream()
            .collect(
                Collectors.toMap(
                    Entry::getKey,
                    Functions.compose(
                        Functions.compose(WfTagKey::getWfId, WfTagDao::getWfTagKey),
                        Entry::getValue)));

    // create the wftag arrival daos and remaining arrival daos by matching tagids and arids
    List<ArrivalDao> wftagArrivalDaos =
        currentStageArrivals.stream()
            .filter(dao -> aridWfidMap.containsKey(dao.getId()))
            .collect(Collectors.toList());
    List<ArrivalDao> remainingArrivalDaos =
        currentStageArrivals.stream()
            .filter(dao -> !aridWfidMap.containsKey(dao.getId()))
            .collect(Collectors.toList());

    HashMap<Long, SourcedWfdisc> sourcedWfdiscsByArid = new HashMap<>();

    if (!wftagArrivalDaos.isEmpty()) {
      // Retrieve WFDISCs sourced from WFTAG records

      Map<Long, WfdiscDao> wfdiscDaoMap =
          wfdiscDatabaseConnector.findWfdiscsByWfids(new ArrayList<>(aridWfidMap.values())).stream()
              .collect(Collectors.toMap(WfdiscDao::getId, Functions.identity()));

      for (Map.Entry<Long, Long> aridWfid : aridWfidMap.entrySet()) {
        if (wfdiscDaoMap.containsKey(aridWfid.getValue())) {
          sourcedWfdiscsByArid.put(
              aridWfid.getKey(),
              SourcedWfdisc.create(
                  wfdiscDaoMap.get(aridWfid.getValue()), wfTagDaosByArid.get(aridWfid.getKey())));
        }
      }
    }

    if (!remainingArrivalDaos.isEmpty()) {
      // Retrieve WFDISCs sourced from arrival records using sta, chan and time attr

      var siteChanKeys =
          remainingArrivalDaos.stream()
              .map(
                  (ArrivalDao arrivalDao) -> {
                    StationChannelTimeKey key = arrivalDao.getArrivalKey();
                    return new SiteChanKey(
                        key.getStationCode(), key.getChannelCode(), key.getTime());
                  })
              .collect(Collectors.toList());

      // create map of arids to station/channel keys
      Map<Long, String> staChansByArid =
          remainingArrivalDaos.stream()
              .map(
                  (ArrivalDao arrivalDao) -> {
                    StationChannelTimeKey key = arrivalDao.getArrivalKey();
                    String staChanKey = key.getStationCode() + key.getChannelCode();
                    return new AbstractMap.SimpleImmutableEntry<>(arrivalDao.getId(), staChanKey);
                  })
              .collect(
                  Collectors.toMap(
                      AbstractMap.SimpleImmutableEntry::getKey,
                      AbstractMap.SimpleImmutableEntry::getValue));

      // query for wfdiscs using the sitechan keys and create map of station/channel keys to
      // sourcedWfdisc dao
      Map<String, WfdiscDao> wfdiscsByStaChan =
          wfdiscDatabaseConnector.findWfDiscVersionAfterEffectiveTime(siteChanKeys).stream()
              .map(
                  (WfdiscDao wfdiscDao) -> {
                    String staChanKey = wfdiscDao.getStationCode() + wfdiscDao.getChannelCode();
                    return new AbstractMap.SimpleImmutableEntry<>(staChanKey, wfdiscDao);
                  })
              .collect(
                  Collectors.toMap(
                      AbstractMap.SimpleImmutableEntry::getKey,
                      AbstractMap.SimpleImmutableEntry::getValue));

      for (Map.Entry<Long, String> aridStaChan : staChansByArid.entrySet()) {

        if (wfdiscsByStaChan.containsKey(aridStaChan.getValue())) {
          sourcedWfdiscsByArid.put(
              aridStaChan.getKey(),
              SourcedWfdisc.create(wfdiscsByStaChan.get(aridStaChan.getValue())));
        }
      }
    }
    return sourcedWfdiscsByArid;
  }

  /**
   * Method for getting the previous {@link WorkflowDefinitionId} given the current stage id
   *
   * @param stageId current stage {@link WorkflowDefinitionId}
   * @return optional of previous {@link WorkflowDefinitionId}
   */
  private Optional<WorkflowDefinitionId> getPreviousStage(WorkflowDefinitionId stageId) {
    var currStageIndex = signalDetectionBridgeDefinition.getOrderedStages().indexOf(stageId);
    if (currStageIndex <= 0) {
      return Optional.empty();
    }
    return Optional.of(signalDetectionBridgeDefinition.getOrderedStages().get(currStageIndex - 1));
  }

  /**
   * Build hypotheses from stage id and arid from hypothesis id components
   *
   * @param stageId {@link WorkflowDefinitionId} for stage
   * @param aridOridList list of pairs of airds and orids
   * @return list of {@link SignalDetectionHypothesis}
   */
  private List<SignalDetectionHypothesis> buildHypothesesFromStageIdAridsAndOrids(
      WorkflowDefinitionId stageId, List<Pair<Long, Long>> aridOridList) {

    if (!signalDetectionBridgeDefinition.getOrderedStages().contains(stageId)) {
      LOGGER.warn(STAGEID_DOES_NOT_EXIST, stageId.getName());
      return List.of();
    }

    var stageName = stageId.getName();
    // get the current connectors for amplitude, arrival and assoc
    var amplitudeDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, AMPLITUDE_CONNECTOR_TYPE);
    var arrivalDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var assocDatabaseConnector =
        signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStageOrThrow(
            stageName, ASSOC_CONNECTOR_TYPE);

    // check if the previous connectors exists for arrival and assoc
    var prevArrivalDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ARRIVAL_CONNECTOR_TYPE);
    var prevAssocDatabaseConnectorExists =
        signalDetectionBridgeDatabaseConnectors.connectorExistsForPreviousStage(
            stageName, ASSOC_CONNECTOR_TYPE);

    List<Long> arids = aridOridList.stream().map(Pair::getLeft).collect(toList());

    // current and previous stage arrivals
    List<ArrivalDao> currentStageArrivals = arrivalDatabaseConnector.findArrivalsByArids(arids);

    // if prevous stage connector exists, create map of previous stage arrivals using arids as keys
    Map<Long, ArrivalDao> previousStageArrivals =
        prevArrivalDatabaseConnectorExists ? findPreviousStageArrivals(stageId, arids) : Map.of();

    // create list and maps of current and previous stage assocs using arids and orids as keys
    List<AssocDao> currentStageAssocs =
        assocDatabaseConnector.findAssocsByAridsAndOrids(aridOridList);

    // if previous arids exists and previous stage database connector exists querry for previous
    // assocs
    List<AssocDao> previousStageAssocs =
        prevAssocDatabaseConnectorExists
            ? signalDetectionBridgeDatabaseConnectors
                .getConnectorForPreviousStageOrThrow(stageName, ASSOC_CONNECTOR_TYPE)
                .findAssocsByAridsAndOrids(aridOridList)
            : List.of();

    // get amplitude from current set of arids
    SetMultimap<Long, AmplitudeDao> currentStageAmplitudes =
        findCurrentStageAmplitudes(amplitudeDatabaseConnector, arids);

    // mapping of arids to appropriate wfdiscDaos
    Map<Long, SourcedWfdisc> sourcedWfdiscsByArid =
        getSourcedWfdiscsByArid(currentStageArrivals, arids);

    // get the previous stage workflow id if it exists
    WorkflowDefinitionId previousStage = getPreviousStage(stageId).orElse(null);

    return signalDetectionHypothesesFromAssocs(
        sourcedWfdiscsByArid,
        currentStageArrivals,
        currentStageAssocs,
        previousStageArrivals,
        previousStageAssocs,
        currentStageAmplitudes,
        Pair.of(stageId, previousStage));
  }

  /**
   * Create list of {@link SignalDetectionHypothesis} given the following data:
   *
   * @param sourcedWfdiscsByArid a map of arids to {@link SourcedWfdisc}s.
   * @param arrivalDaos list of {@link ArrivalDao}s from current stage
   * @param aridAssocMap a map of arids to {@link AssocDao}s from current stage used for determining
   *     existence of assoc daos associated with arid
   * @param aridAmplitudeMap map of arids to {@link AmplitudeDao}s from current stage
   * @param aridPreviousStageArrivalsMap map of arids to previous stage {@link ArrivalDao}s
   * @param previousStage previous stage {@link WorkflowDefinitionId}
   * @param stageId current stage {@link WorkflowDefinitionId}
   * @return list of {@link SignalDetectionHypothesis}
   */
  private List<SignalDetectionHypothesis> signalDetectionHypothesesFromArrivals(
      Map<Long, SourcedWfdisc> sourcedWfdiscsByArid,
      List<ArrivalDao> arrivalDaos,
      Map<Long, AssocDao> aridAssocMap,
      Multimap<Long, AmplitudeDao> aridAmplitudeMap,
      Map<Long, ArrivalDao> aridPreviousStageArrivalsMap,
      WorkflowDefinitionId stageId,
      WorkflowDefinitionId previousStage) {

    return arrivalDaos.stream()
        .map(
            arrival ->
                createSdhFromArrival(
                    arrival,
                    sourcedWfdiscsByArid,
                    aridAssocMap,
                    aridAmplitudeMap,
                    aridPreviousStageArrivalsMap,
                    stageId,
                    previousStage))
        .flatMap(Optional::stream)
        .collect(Collectors.toList());
  }

  private Optional<SignalDetectionHypothesis> createSdhFromArrival(
      ArrivalDao arrival,
      Map<Long, SourcedWfdisc> sourcedWfdiscsByArid,
      Map<Long, AssocDao> aridAssocMap,
      Multimap<Long, AmplitudeDao> aridAmplitudeMap,
      Map<Long, ArrivalDao> aridPreviousStageArrivalsMap,
      WorkflowDefinitionId stageId,
      WorkflowDefinitionId previousStage) {

    long arid = arrival.getId();

    /*
     * determine whether to make SDH from arrival: SDH created from arrival if it's in the first stage, or it has no
     * associated assocs in the same stage, or there was no arrival in previous stage with the same id, or the phase
     * changed
     */
    if (previousStage == null
        || aridAssocMap.get(arid) == null
        || aridPreviousStageArrivalsMap.get(arid) == null
        || !aridPreviousStageArrivalsMap.get(arid).getPhase().equals(arrival.getPhase())) {

      Optional<UUID> parentId = createParentId(arid, aridPreviousStageArrivalsMap, previousStage);

      if (sourcedWfdiscsByArid.containsKey(arid)) {
        var sourcedWfdisc = sourcedWfdiscsByArid.get(arid);
        var fromWftagString =
            sourcedWfdisc
                .getAssociatedWfTagDao()
                .map(WfTagDao::getWfTagKey)
                .map(WfTagKey::toString)
                .orElse("no WFTAG associated");
        LOGGER.debug(
            "SDH from Arrival - Sourced WFDISC: {} WFTAG: {}",
            sourcedWfdisc.getWfdiscDao().getId(),
            fromWftagString);
        Collection<AmplitudeDao> amplitudeDaos = aridAmplitudeMap.get(arid);
        // create the signal detection hypothesis from arrival and sourcedWfdisc
        // parent id will be empty for first stage, SDH of previous stage with same arid for
        // subsequent stages
        return createSignalDetectionHypothesis(
            arrival, sourcedWfdisc, arid, stageId, Optional.empty(), amplitudeDaos, parentId);
      } else {
        LOGGER.warn(
            "SDH from Arrival - Could not find sourced WFDISC for SDH!!! No hypothesis will be"
                + " returned");
      }
    } else {
      LOGGER.warn("SDH from Arrival - Outer validation failed!!! No hypothesis will be returned");
    }

    return Optional.<SignalDetectionHypothesis>empty();
  }

  /**
   * Create list of {@link SignalDetectionHypothesis} given the following data:
   *
   * @param sourcedWfdiscsByArid a map of arids to {@link SourcedWfdisc}s.
   * @param arrivalDaos list of {@link ArrivalDao}s from current stage
   * @param currentStageAssocs list of {@link ArrivalDao}s from previous stage
   * @param aridPreviousStageArrivalsMap map of arids to previous stage {@link ArrivalDao}s
   * @param previousStageAssocs list of {@link AssocDao}s from previous stage
   * @param aridAmplitudeMap map of arids to {@link AmplitudeDao}s from current stage
   * @param currentPreviousStagePair pair of current and previous stage {@link WorkflowDefinitionId}
   * @return list of {@link SignalDetectionHypothesis}
   */
  private List<SignalDetectionHypothesis> signalDetectionHypothesesFromAssocs(
      Map<Long, SourcedWfdisc> sourcedWfdiscsByArid,
      List<ArrivalDao> arrivalDaos,
      List<AssocDao> currentStageAssocs,
      Map<Long, ArrivalDao> aridPreviousStageArrivalsMap,
      List<AssocDao> previousStageAssocs,
      Multimap<Long, AmplitudeDao> aridAmplitudeMap,
      Pair<WorkflowDefinitionId, WorkflowDefinitionId> currentPreviousStagePair) {

    // map of arids to arrival daos
    Map<Long, ArrivalDao> aridArrivalMap =
        arrivalDaos.stream().collect(Collectors.toMap(ArrivalDao::getId, Functions.identity()));

    // map of aridoridkey to previous assocs
    Map<AridOridKey, AssocDao> keyAssocDaoMap =
        previousStageAssocs.stream()
            .collect(Collectors.toMap(AssocDao::getId, Functions.identity()));

    return currentStageAssocs.stream()
        .map(
            assocDao ->
                createSdhFromAssoc(
                    assocDao,
                    currentPreviousStagePair,
                    aridArrivalMap,
                    keyAssocDaoMap,
                    aridPreviousStageArrivalsMap,
                    aridAmplitudeMap,
                    sourcedWfdiscsByArid))
        .flatMap(Optional::stream)
        .collect(Collectors.toList());
  }

  private Optional<SignalDetectionHypothesis> createSdhFromAssoc(
      AssocDao assocDao,
      Pair<WorkflowDefinitionId, WorkflowDefinitionId> currentPreviousStagePair,
      Map<Long, ArrivalDao> aridArrivalMap,
      Map<AridOridKey, AssocDao> keyAssocDaoMap,
      Map<Long, ArrivalDao> aridPreviousStageArrivalsMap,
      Multimap<Long, AmplitudeDao> aridAmplitudeMap,
      Map<Long, SourcedWfdisc> sourcedWfdiscsByArid) {
    var stageId = currentPreviousStagePair.getLeft();
    var previousStage = currentPreviousStagePair.getRight();
    var arid = assocDao.getId().getArrivalId();

    // determine parent SDH
    Optional<UUID> parentIdAssoc =
        findAssocParent(
            arid,
            assocDao,
            aridArrivalMap,
            keyAssocDaoMap,
            aridPreviousStageArrivalsMap,
            stageId,
            previousStage);

    ArrivalDao potentialArrival = aridArrivalMap.get(arid);

    // get amplitude dao from current stage associated with arid
    Collection<AmplitudeDao> amplitudeDaos = aridAmplitudeMap.get(arid);

    var possibleSourcedWfdisc = Optional.ofNullable(sourcedWfdiscsByArid.get(arid));

    if (possibleSourcedWfdisc.isEmpty()) {
      LOGGER.warn(
          "SDH from Assoc - Could not find sourced WFDISC for SDH!!! No hypothesis will be"
              + " returned");
    }

    return possibleSourcedWfdisc.flatMap(
        (SourcedWfdisc sourcedWfdisc) -> {
          var fromWftagString =
              sourcedWfdisc
                  .getAssociatedWfTagDao()
                  .map(WfTagDao::getWfTagKey)
                  .map(WfTagKey::toString)
                  .orElse("no WFTAG associated");
          LOGGER.debug(
              "SDH from Assoc - Sourced WFDISC: {} WFTAG: {}",
              sourcedWfdisc.getWfdiscDao().getId(),
              fromWftagString);
          return createSignalDetectionHypothesis(
              potentialArrival,
              sourcedWfdisc,
              arid,
              stageId,
              Optional.of(assocDao),
              amplitudeDaos,
              parentIdAssoc);
        });
  }

  Optional<UUID> findAssocParent(
      long arid,
      AssocDao assocDao,
      Map<Long, ArrivalDao> aridArrivalMap,
      Map<AridOridKey, AssocDao> previousStageAssocs,
      Map<Long, ArrivalDao> previousStageArrivals,
      WorkflowDefinitionId stageId,
      WorkflowDefinitionId previousStage) {

    // for first stage parent is SDH of arrival
    if (previousStage == null) {
      return createParentId(arid, stageId);
    }

    // if previous stage had an assoc with same id, that assoc is the parent
    if (previousStageAssocs.get(assocDao.getId()) != null) {
      return createParentId(assocDao, previousStage);
    }

    ArrivalDao currArrival = aridArrivalMap.get(arid);
    ArrivalDao previousArrival = previousStageArrivals.get(arid);

    // determine if SDH was created from current stage arrival
    if (currArrival != null
        && (previousArrival == null
            || !currArrival.getPhase().equals(previousArrival.getPhase()))) {

      return createParentId(arid, stageId);
    }

    return createParentId(arid, previousStageArrivals, previousStage);
  }

  /**
   * Create signal detection hypothesis for the give {@link ArrivalDao}, {@link WfdiscDao}, {@link
   * WorkflowDefinitionId} and the arrival parent UUID if it exists
   *
   * @param arrival {@link ArrivalDao}
   * @param wfdisc {@link WfdiscDao}
   * @param arid ArrivalDao id
   * @param stageId stage id of the query
   * @param assoc AssocDao associated with SDH if it exists
   * @param amplitude AmplitudeDao associated with SDH if it exists
   * @param parentId parent id of arrivals if it exists
   * @return optional of {@link SignalDetectionHypothesis}
   */
  private Optional<SignalDetectionHypothesis> createSignalDetectionHypothesis(
      ArrivalDao arrival,
      SourcedWfdisc sourcedWfdisc,
      long arid,
      WorkflowDefinitionId stageId,
      Optional<AssocDao> assoc,
      Collection<AmplitudeDao> amplitudeDaos,
      Optional<UUID> parentId) {

    LOGGER.debug(
        "Create SDH - SourcedWfdisc: WFID: {} WFTAG? {}",
        sourcedWfdisc.getWfdiscDao().getId(),
        sourcedWfdisc.getAssociatedWfTagDao().isPresent());

    var wfdisc = sourcedWfdisc.getWfdiscDao();

    var arrChannelOpt =
        sdhBridgeHelperUtility.createFilteredChannelForArrival(sourcedWfdisc, arid, stageId);

    if (arrChannelOpt.isEmpty()) {
      LOGGER.warn("Create SDH - Bridged arrival channel returned null... No SDH will be returned");
      return Optional.empty();
    }

    var arrivalChannel = arrChannelOpt.get();

    // create arrivalChannel segment description from unpopulated arrivalChannel for caching
    var descriptor =
        ChannelSegmentDescriptor.from(
            Channel.createVersionReference(arrivalChannel),
            wfdisc.getTime(),
            wfdisc.getEndTime(),
            wfdisc.getTime());
    ChannelSegment<Timeseries> channelSegment = ChannelSegment.builder().setId(descriptor).build();

    // cache the sourcedWfdisc id using the arrivalChannel segment descriptor
    channelSegmentDescriptorWfidsCache.put(descriptor, List.of(wfdisc.getId()));

    String legacyDatabaseAccountId =
        signalDetectionBridgeDefinition.getDatabaseAccountByStage().get(stageId);
    var converterId =
        SignalDetectionHypothesisConverterId.from(
            legacyDatabaseAccountId,
            signalDetectionIdUtility.getOrCreateSignalDetectionIdfromArid(arid),
            parentId);

    // Currently, we only support AmplitudeDaos with AMPTYPE=AMPLITUDE_A5_OVER_2
    var prioritizedA5Over2SingletonList =
        findPrioritizedA5Over2AmpDao(arrival, amplitudeDaos)
            .map(List::of)
            .orElse(Collections.emptyList());

    var amplitudeAssociations =
        sdhBridgeHelperUtility
            .createAmplitudeDaoChannelMap(prioritizedA5Over2SingletonList, sourcedWfdisc, stageId)
            .stream()
            .map(
                pair ->
                    AmplitudeDaoAndChannelAssociation.create(
                        pair.getKey(),
                        pair.getValue(),
                        ChannelSegment.builder()
                            .setId(
                                ChannelSegmentDescriptor.from(
                                    Channel.createVersionReference(pair.getValue()),
                                    wfdisc.getTime(),
                                    wfdisc.getEndTime(),
                                    wfdisc.getTime()))
                            .build()))
            .collect(Collectors.toList());

    amplitudeAssociations.forEach(
        association ->
            channelSegmentDescriptorWfidsCache.put(
                association.getChannelSegment().getId(), List.of(wfdisc.getId())));

    WaveformAndFilterDefinition analysisWaveform;
    try {
      analysisWaveform =
          sdhBridgeHelperUtility.createAnalysisWaveform(sourcedWfdisc, arid, stageId);
    } catch (IllegalStateException e) {
      LOGGER.warn(
          "Could not retrieve an unfiltered channel for "
              + "the analysisWaveform; SDH will not be built. Exception was: ",
          e);
      return Optional.empty();
    }

    var analysisWaveformsForAmpIds =
        sdhBridgeHelperUtility.createAmplitudeAnalysisWaveforms(
            sourcedWfdisc, amplitudeAssociations, stageId);

    return signalDetectionHypothesisConverter.convert(
        converterId,
        Pair.of(
            ArrivalDaoAndChannelAssociation.create(arrival, arrivalChannel, channelSegment),
            analysisWaveform),
        assoc,
        signalDetectionBridgeDefinition.getMonitoringOrganization(),
        StationDefinitionIdUtility.getStationEntityForSta(arrival.getArrivalKey().getStationCode()),
        amplitudeAssociations,
        analysisWaveformsForAmpIds);
  }

  /**
   * Prioritizes the filtering of A5/2 Amplitude records for use in bridging {@link
   * FeatureMeasurement}s
   *
   * @param arrivalDao Arrival associated with the {@link SignalDetectionHypothesis} being bridged
   * @param amplitudeDaos Amplitudes associated with the {@link SignalDetectionHypothesis} being
   *     bridged
   * @return The prioritized A5/2 Amplitude record, if such a record is available
   */
  @VisibleForTesting
  Optional<AmplitudeDao> findPrioritizedA5Over2AmpDao(
      ArrivalDao arrivalDao, Collection<AmplitudeDao> amplitudeDaos) {
    var a5Over2AmpDaos =
        Optional.ofNullable(
            amplitudeDaos.stream()
                .collect(Collectors.groupingBy(AmplitudeDao::getAmplitudeType))
                .get(AmplitudeType.AMPLITUDE_A5_OVER_2.getName()));

    // Prioritize A5/2 Amplitudes that match the Arrival's amplitude and period
    var prioritizedA5Over2AmpDaos =
        a5Over2AmpDaos.stream()
            .flatMap(List::stream)
            .filter(
                ampDao ->
                    DoubleMath.fuzzyEquals(
                            arrivalDao.getAmplitude(),
                            ampDao.getAmplitude(),
                            DOUBLE_EQUALITY_EPSILON)
                        && DoubleMath.fuzzyEquals(
                            arrivalDao.getPeriod(), ampDao.getPeriod(), DOUBLE_EQUALITY_EPSILON))
            .toList();

    if (a5Over2AmpDaos.isPresent() && prioritizedA5Over2AmpDaos.size() != 1) {
      LOGGER.debug(
          "Amplitude + Period matching to Arrival prioritization failed for provided A5/2 Amplitude"
              + " records");
    }

    // Need to reduce A5/2 Amplitude records to 1 in order to satisfy 1:1 mapping for Amp Type -> FM
    // If we prioritized properly in the previous reduction, use that.
    // Otherwise, pick the Amplitude record with highest AMPID
    return prioritizedA5Over2AmpDaos.size() == 1
        ? Optional.of(prioritizedA5Over2AmpDaos.get(0))
        : a5Over2AmpDaos.stream()
            .flatMap(List::stream)
            .max(Comparator.comparing(AmplitudeDao::getId));
  }

  /**
   * Create the parent id for the given {@link ArrivalDao}s and stage id
   *
   * @param arid {@link ArrivalDao} id
   * @param previousStageArrivals map of arids to previous stage {@link ArrivalDao}
   * @param previousStage {@link WorkflowDefinitionId}
   * @return optional of UUID
   */
  private Optional<UUID> createParentId(
      long arid, Map<Long, ArrivalDao> previousStageArrivals, WorkflowDefinitionId previousStage) {

    if (previousStageArrivals.containsKey(arid)) {
      String legacyDatabaseAccountId =
          signalDetectionBridgeDefinition.getDatabaseAccountByStage().get(previousStage);
      return Optional.of(
          signalDetectionIdUtility.getOrCreateSignalDetectionHypothesisIdFromAridAndStageId(
              arid, legacyDatabaseAccountId));
    } else {
      return Optional.empty();
    }
  }

  /**
   * Create the parent id for the given {@link ArrivalDao}s and stage id
   *
   * @param arid {@link ArrivalDao} id
   * @param currentStage {@link WorkflowDefinitionId}
   * @return optional of UUID
   */
  private Optional<UUID> createParentId(long arid, WorkflowDefinitionId currentStage) {

    String legacyDatabaseAccountId =
        signalDetectionBridgeDefinition.getDatabaseAccountByStage().get(currentStage);
    return Optional.of(
        signalDetectionIdUtility.getOrCreateSignalDetectionHypothesisIdFromAridAndStageId(
            arid, legacyDatabaseAccountId));
  }

  /**
   * Create the parent id for the given parent {@link AssocDao} and stage id
   *
   * @param parentAssocDao {@link AssocDao} the parent assoc dao
   * @param previousStage {@link WorkflowDefinitionId}
   * @return optional of UUID
   */
  private Optional<UUID> createParentId(
      AssocDao parentAssocDao, WorkflowDefinitionId previousStage) {
    String legacyDatabaseAccountId =
        signalDetectionBridgeDefinition.getDatabaseAccountByStage().get(previousStage);
    return Optional.of(
        signalDetectionIdUtility.getOrCreateSignalDetectionHypothesisIdFromAridOridAndStageId(
            parentAssocDao.getId().getArrivalId(),
            parentAssocDao.getId().getOriginId(),
            legacyDatabaseAccountId));
  }

  /**
   * Retrieve related filter records, mapped by their usage, and associate them with the provided
   * hypotheses
   *
   * @param hypotheses A collection of {@link SignalDetectionHypothesis} to retrieve associated
   *     filter records for
   * @return Pair<List<FilterRecordIdsByUsage>, Boolean> A Pair of the Filter records mapped by
   *     usage associated with the provided hypotheses and a Boolean representing if the results are
   *     partial or not
   */
  public Pair<List<FilterRecordIdsByUsage>, Boolean> findFilterRecordsForSignalDetectionHypotheses(
      Collection<SignalDetectionHypothesis> hypotheses) {
    checkNotNull(hypotheses);

    var partialResults = new AtomicBoolean(false);
    var sdhsWithLegacyAccountInfo =
        hypotheses.stream()
            .distinct()
            .map(SignalDetectionHypothesis::toEntityReference)
            .map(
                (SignalDetectionHypothesis sdh) -> {
                  LOGGER.debug("Hypothesis: {}", sdh.getId());
                  var legacyAccountInfoPair = getLegacyAccountInfo(sdh);
                  setPartialResultsFlag(partialResults, legacyAccountInfoPair.getRight());
                  return legacyAccountInfoPair
                      .getLeft()
                      .map(legacyAccountInfo -> Pair.of(sdh, legacyAccountInfo));
                })
            .flatMap(Optional::stream)
            .collect(Collectors.toList());

    var aridsByAccountId =
        sdhsWithLegacyAccountInfo.stream()
            .map(Pair::getRight)
            .collect(
                Collectors.groupingBy(
                    SignalDetectionHypothesisArrivalIdComponents::getLegacyDatabaseAccountId,
                    mapping(SignalDetectionHypothesisArrivalIdComponents::getArid, toList())));

    var filterIdsByUsageByLegacyAccountInfo =
        aridsByAccountId.entrySet().stream()
            .map(
                aridsByAcctEntry ->
                    getFilterIdsByUsageByLegacyAccountInfo(
                        aridsByAcctEntry.getKey(), aridsByAcctEntry.getValue()))
            .map(
                (Pair<
                            Optional<
                                Map<
                                    SignalDetectionHypothesisArrivalIdComponents,
                                    Map<FilterDefinitionUsage, Long>>>,
                            Boolean>
                        pair) -> {
                  setPartialResultsFlag(partialResults, pair.getRight());
                  return pair.getLeft();
                })
            .flatMap(Optional::stream)
            .flatMap(
                fIdsByUsageByLegacyAccInfoSubmap ->
                    fIdsByUsageByLegacyAccInfoSubmap.entrySet().stream())
            .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));

    return Pair.of(
        sdhsWithLegacyAccountInfo.stream()
            .map(
                (Pair<SignalDetectionHypothesis, SignalDetectionHypothesisArrivalIdComponents>
                        sdhWithLegacyAccountInfo) -> {
                  var fIdsByUsageForSdh =
                      Optional.ofNullable(
                              filterIdsByUsageByLegacyAccountInfo.get(
                                  sdhWithLegacyAccountInfo.getRight()))
                          .map(
                              filterIdsByUsage ->
                                  FilterRecordIdsByUsage.create(
                                      filterIdsByUsage, sdhWithLegacyAccountInfo.getLeft()));
                  fIdsByUsageForSdh.ifPresentOrElse(
                      mapForSdh ->
                          LOGGER.debug(
                              "Resolved Filter IDs by usage for SDH {}",
                              sdhWithLegacyAccountInfo.getLeft().getId()),
                      () ->
                          LOGGER.debug(
                              "Resolved no Filter IDs by usage for SDH {}",
                              sdhWithLegacyAccountInfo.getLeft().getId()));
                  return fIdsByUsageForSdh;
                })
            .flatMap(Optional::stream)
            .filter(
                (FilterRecordIdsByUsage filterRecordIdsByUsage) -> {
                  if (filterRecordIdsByUsage.getIdsByUsage().isEmpty()) {
                    LOGGER.warn(
                        "Usage map for hypothesis {} has no entries. Excluding hypothesis from"
                            + " results.",
                        filterRecordIdsByUsage.getHypothesis().getId());
                    return false;
                  } else {
                    return true;
                  }
                })
            .collect(toList()),
        partialResults.get());
  }

  private Pair<Optional<SignalDetectionHypothesisArrivalIdComponents>, Boolean>
      getLegacyAccountInfo(SignalDetectionHypothesis hypothesis) {

    var legacyAccountInfo =
        Optional.ofNullable(
                signalDetectionIdUtility.getArrivalIdComponentsFromSignalDetectionHypothesisId(
                    hypothesis.getId().getId()))
            .or(
                () -> {
                  var sdhAssocIdComponents =
                      Optional.ofNullable(
                          signalDetectionIdUtility
                              .getAssocIdComponentsFromSignalDetectionHypothesisId(
                                  hypothesis.getId().getId()));

                  // TODO: Why are these component types separate? Can we join the two together with
                  // an optional field?
                  return sdhAssocIdComponents.map(
                      sdhAssocIdC ->
                          SignalDetectionHypothesisArrivalIdComponents.create(
                              sdhAssocIdC.getLegacyDatabaseAccountId(), sdhAssocIdC.getArid()));
                });

    var partialResults = new AtomicBoolean(false);
    legacyAccountInfo.ifPresentOrElse(
        id ->
            LOGGER.debug(
                "Resolved legacy account information {} for hypothesis {}", id, hypothesis),
        () -> {
          partialResults.set(true);
          LOGGER.warn(
              "Legacy Account info not found for hypothesis {}. No filter information will be"
                  + " resolved",
              hypothesis.getId().getId());
        });

    return Pair.of(legacyAccountInfo, partialResults.get());
  }

  private Pair<
          Optional<
              Map<SignalDetectionHypothesisArrivalIdComponents, Map<FilterDefinitionUsage, Long>>>,
          Boolean>
      getFilterIdsByUsageByLegacyAccountInfo(String legacyAccountName, List<Long> arids) {
    var partialResults = new AtomicBoolean(false);
    var arrDPIConnector =
        findStageIdFromDatabaseAccountByStage(legacyAccountName)
            .flatMap(
                stageId ->
                    signalDetectionBridgeDatabaseConnectors.getConnectorForCurrentStage(
                        stageId.getName(), ARRIVAL_DYN_PARS_INT_CONNECTOR_TYPE));

    arrDPIConnector.ifPresentOrElse(
        connector ->
            LOGGER.debug("Resolved ArrDPI connector for Legacy Account {}", legacyAccountName),
        () -> {
          partialResults.set(true);
          LOGGER.warn(
              "Legacy Account {} does not map to a known stage."
                  + " Unable to acquire ArrDPI Connector. No filter information will be resolved",
              legacyAccountName);
        });

    return Pair.of(
        arrDPIConnector
            .map(
                connector ->
                    connector.findFilterAdpisByIds(arids).stream()
                        .collect(groupingBy(adpi -> adpi.getArrivalDynParsIntKey().getArid())))
            .map(
                adpisByArid ->
                    adpisByArid.entrySet().stream()
                        .collect(
                            toMap(
                                Map.Entry::getKey, entry -> getFilterIdsByUsage(entry.getValue()))))
            .map(
                filterIdsByUsageByArid ->
                    remapAridToLegacyAccountInfo(legacyAccountName, filterIdsByUsageByArid)),
        partialResults.get());
  }

  private static Map<FilterDefinitionUsage, Long> getFilterIdsByUsage(
      List<ArrivalDynParsIntDao> adpis) {
    return adpis.stream()
        .collect(
            toMap(
                adpi ->
                    FilterDefinitionUsage.fromString(adpi.getArrivalDynParsIntKey().getGroupName()),
                ArrivalDynParsIntDao::getIvalue));
  }

  private static Map<SignalDetectionHypothesisArrivalIdComponents, Map<FilterDefinitionUsage, Long>>
      remapAridToLegacyAccountInfo(
          String legacyAccountName,
          Map<Long, Map<FilterDefinitionUsage, Long>> filterIdsByUsageByArid) {
    return filterIdsByUsageByArid.entrySet().stream()
        .map(
            fidByUsageByAridEntry ->
                Map.entry(
                    SignalDetectionHypothesisArrivalIdComponents.create(
                        legacyAccountName, fidByUsageByAridEntry.getKey()),
                    fidByUsageByAridEntry.getValue()))
        .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  // helper method to make sure atomic boolean is only set to true once
  // given that it is false, and not set again to false
  private static void setPartialResultsFlag(AtomicBoolean partialResults, boolean isPartial) {
    if (!partialResults.get() && isPartial) {
      partialResults.set(isPartial);
    }
  }
}
