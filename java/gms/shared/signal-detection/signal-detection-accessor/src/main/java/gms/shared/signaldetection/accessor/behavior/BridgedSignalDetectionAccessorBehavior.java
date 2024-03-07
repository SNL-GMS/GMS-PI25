package gms.shared.signaldetection.accessor.behavior;

import gms.shared.signaldetection.api.SignalDetectionAccessorBehavior;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.repository.BridgedSignalDetectionRepository;
import gms.shared.signaldetection.util.FilterRecordIdsByUsage;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.repository.BridgedFilterDefinitionRepository;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Implementation of the SignalDetectionAccessorBehavior utilizing bridged repository components and
 * logic
 */
@Component
public class BridgedSignalDetectionAccessorBehavior implements SignalDetectionAccessorBehavior {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(BridgedSignalDetectionAccessorBehavior.class);
  private final BridgedSignalDetectionRepository bridgedSignalDetectionRepository;
  private final BridgedFilterDefinitionRepository bridgedFilterDefinitionRepository;

  @Autowired
  public BridgedSignalDetectionAccessorBehavior(
      BridgedSignalDetectionRepository bridgedSignalDetectionRepository,
      BridgedFilterDefinitionRepository bridgedFilterDefinitionRepository) {
    this.bridgedFilterDefinitionRepository = bridgedFilterDefinitionRepository;
    this.bridgedSignalDetectionRepository = bridgedSignalDetectionRepository;
  }

  @Override
  public Pair<FilterDefinitionByUsageBySignalDetectionHypothesis, Boolean>
      findFilterDefinitionsForSignalDetectionHypotheses(
          Collection<SignalDetectionHypothesis> signalDetectionHypothesis) {

    if (signalDetectionHypothesis.isEmpty()) {
      return Pair.of(FilterDefinitionByUsageBySignalDetectionHypothesis.from(List.of()), true);
    }
    var partialResults = new AtomicBoolean(false);
    // get all the FilterRecordIdAndUsage records from the signalDetectionHypotheses
    var filterRecordIdsByUsagesPair =
        bridgedSignalDetectionRepository.findFilterRecordsForSignalDetectionHypotheses(
            signalDetectionHypothesis);

    var filterRecordIdsByUsages = filterRecordIdsByUsagesPair.getLeft();

    // get all the possible DefinitionByIdsˆ
    var filterIds =
        filterRecordIdsByUsages.stream()
            .map(FilterRecordIdsByUsage::getIdsByUsage)
            .map(Map::values)
            .flatMap(Collection::stream)
            .collect(Collectors.toSet());

    var filterDefinitionByIds =
        bridgedFilterDefinitionRepository.loadFilterDefinitionsForFilterIds(filterIds);

    // for each of the FilterRecordIdAndUsage get the FilterRecordIdAndUsage records
    var signalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePairs =
        filterRecordIdsByUsages.stream()
            .map(
                (FilterRecordIdsByUsage frIdsByUsages) ->
                    SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.builder()
                        .setSignalDetectionHypothesis(frIdsByUsages.getHypothesis())
                        .setFilterDefinitionByFilterDefinitionUsage(
                            FilterDefinitionByFilterDefinitionUsage.from(
                                buildEnumMap(frIdsByUsages, filterDefinitionByIds)
                                    .map(
                                        (Pair<
                                                    EnumMap<
                                                        FilterDefinitionUsage, FilterDefinition>,
                                                    Boolean>
                                                pair) -> {
                                          setPartialResultsFlag(partialResults, pair.getRight());
                                          return pair.getLeft();
                                        })
                                    .findFirst()
                                    .get()))
                        .build())
            .collect(Collectors.toList());
    return Pair.of(
        FilterDefinitionByUsageBySignalDetectionHypothesis.from(
            signalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePairs),
        partialResults.get());
  }

  // Create map of FilterDefinitionUsageByFilterDefinition
  private static Stream<Pair<EnumMap<FilterDefinitionUsage, FilterDefinition>, Boolean>>
      buildEnumMap(
          FilterRecordIdsByUsage frIdsByUsages, Map<Long, FilterDefinition> filterDefinitionByIds) {
    var partialResults = new AtomicBoolean(false);
    EnumMap<FilterDefinitionUsage, FilterDefinition> filterDefinitionByFilterDefinitionUsage =
        new EnumMap<>(FilterDefinitionUsage.class);
    frIdsByUsages
        .getIdsByUsage()
        .entrySet()
        .forEach(
            entry ->
                Optional.ofNullable(filterDefinitionByIds.get(entry.getValue()))
                    .ifPresentOrElse(
                        filterDefinition ->
                            filterDefinitionByFilterDefinitionUsage.put(
                                entry.getKey(), filterDefinition),
                        () -> {
                          partialResults.set(true);
                          logPartialResults(frIdsByUsages, entry);
                        }));
    return Stream.of(Pair.of(filterDefinitionByFilterDefinitionUsage, partialResults.get()));
  }

  // helper method to make sure atomic boolean is only set to true once
  // given that it is false, and not set again to false
  private static void setPartialResultsFlag(AtomicBoolean partialResults, boolean isPartial) {
    if (!partialResults.get() && isPartial) {
      partialResults.set(isPartial);
    }
  }

  private static void logPartialResults(
      FilterRecordIdsByUsage frIdsByUsages, Map.Entry<FilterDefinitionUsage, Long> entry) {
    LOGGER.debug(
        "Could not resolve FilterDefinition for " + "filterId:{}, hypotheisId:{}, usage:{} ",
        entry.getValue(),
        frIdsByUsages.getHypothesis().getId(),
        entry.getKey());
  }
}
