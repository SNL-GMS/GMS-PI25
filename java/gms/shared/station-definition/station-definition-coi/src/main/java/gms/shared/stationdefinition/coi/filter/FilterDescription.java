package gms.shared.stationdefinition.coi.filter;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import java.util.Optional;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXISTING_PROPERTY,
    property = "filterType",
    visible = true)
@JsonSubTypes({
  @JsonSubTypes.Type(value = CascadeFilterDescription.class, name = "CASCADE"),
  @JsonSubTypes.Type(value = LinearFilterDescription.class, name = "FIR_HAMMING"),
  @JsonSubTypes.Type(value = LinearFilterDescription.class, name = "IIR_BUTTERWORTH")
})
public interface FilterDescription {

  Optional<String> getComments();

  boolean isCausal();

  FilterType getFilterType();
}
