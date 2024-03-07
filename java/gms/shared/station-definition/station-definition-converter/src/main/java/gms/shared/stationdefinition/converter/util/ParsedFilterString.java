package gms.shared.stationdefinition.converter.util;

import com.google.auto.value.AutoValue;
import com.google.common.base.Preconditions;
import gms.shared.stationdefinition.coi.filter.types.PassBandType;
import org.apache.commons.lang3.StringUtils;

/**
 * Value class representing a filter table's filter_string column parsed into their appropriate
 * types
 */
@AutoValue
public abstract class ParsedFilterString {

  public abstract double getLowFrequencyHz();

  public abstract double getHighFrequencyHz();

  public abstract int getOrder();

  public abstract PassBandType getFilterType();

  public abstract boolean isCausal();

  /**
   * Factory method for constructing {@link ParsedFilterString}s
   *
   * @param filterString String in the format expected from the filter_string column of the filter
   *     table
   * @return Value class representation of the input filter string
   */
  public static ParsedFilterString create(String filterString) {
    Preconditions.checkNotNull(filterString);

    var values = StringUtils.normalizeSpace(filterString).strip().split(" ");

    Preconditions.checkArgument(
        values.length == 5, "filter_string must have 5 space-separated values");

    var lowFrequencyHz = Double.valueOf(values[0]);
    var highFrequencyHz = Double.valueOf(values[1]);
    var order = Integer.valueOf(values[2]);
    var filterType = PassBandType.fromString(values[3]);

    var causalString = values[4];

    var causal =
        switch (causalString) {
          case "causal" -> true;
          case "non-causal" -> false;
          default -> throw new IllegalArgumentException(
              String.format("filter_string contains an invalid causal value %s", causalString));
        };

    return new AutoValue_ParsedFilterString(
        lowFrequencyHz, highFrequencyHz, order, filterType, causal);
  }

  /**
   * Converts the parsed value class back into the raw string represented in the filter table's
   * filter_string column
   *
   * @return Filter string in the format expected for filter_string column of filter table
   */
  public String toFilterString() {
    var causalString = this.isCausal() ? "causal" : "non-causal";
    return String.format(
        "%f %f %d %s %s",
        this.getLowFrequencyHz(),
        this.getHighFrequencyHz(),
        this.getOrder(),
        this.getFilterType().getValue(),
        causalString);
  }
}
