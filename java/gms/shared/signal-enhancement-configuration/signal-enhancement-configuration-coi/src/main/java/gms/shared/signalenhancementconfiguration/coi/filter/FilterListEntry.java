package gms.shared.signalenhancementconfiguration.coi.filter;

import static com.google.common.base.Preconditions.checkArgument;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import java.util.Optional;
import java.util.stream.Stream;

@AutoValue
public abstract class FilterListEntry {
  public abstract boolean getWithinHotKeyCycle();

  public abstract Optional<Boolean> getUnfiltered();

  public abstract Optional<FilterDefinitionUsage> getNamedFilter();

  public abstract Optional<FilterDefinition> getFilterDefinition();

  @JsonCreator
  public static FilterListEntry from(
      @JsonProperty("withinHotKeyCycle") boolean withinHotKeyCycle,
      @JsonProperty("unfiltered") Optional<Boolean> unfiltered,
      @JsonProperty("namedFilter") Optional<FilterDefinitionUsage> namedFilter,
      @JsonProperty("filterDefinition") Optional<FilterDefinition> filterDefinition) {

    checkArgument(
        Stream.of(unfiltered, namedFilter, filterDefinition).flatMap(Optional::stream).count() == 1,
        "Exactly one filter entry must be populated");

    return new AutoValue_FilterListEntry(
        withinHotKeyCycle, unfiltered, namedFilter, filterDefinition);
  }
}
