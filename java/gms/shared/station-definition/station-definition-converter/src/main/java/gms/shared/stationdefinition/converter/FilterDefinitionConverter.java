package gms.shared.stationdefinition.converter;

import static java.util.stream.Collectors.toList;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDescription;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.filter.types.FilterType;
import gms.shared.stationdefinition.converter.util.ParsedFilterString;
import gms.shared.stationdefinition.dao.css.FilterDao;
import gms.shared.stationdefinition.dao.css.FilterGroupDao;
import gms.shared.stationdefinition.dao.css.FilterGroupKey;
import gms.shared.stationdefinition.dao.util.FilterDataNode;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class FilterDefinitionConverter {

  private static final Logger LOGGER = LoggerFactory.getLogger(FilterDefinitionConverter.class);

  private FilterDefinitionConverter() {
    // Hide implicit public constructor
  }

  public static Optional<FilterDefinition> convert(FilterDataNode filterDataNode) {
    Preconditions.checkNotNull(filterDataNode);

    var filterDao = filterDataNode.getFilterRecord();

    var comments =
        String.format("Bridged from FILTER record with filterid=%d", filterDao.getFilterId());

    try {
      Preconditions.checkArgument(
          filterDataNode.getFilterGroup().isEmpty(),
          "Top filter record for definition conversion must not be associated with a parent"
              + " filter");

      Pair<String, FilterDescription> nameAndDescription = parseNameAndDescription(filterDataNode);

      return Optional.of(
          FilterDefinition.from(
              nameAndDescription.getLeft(), Optional.of(comments), nameAndDescription.getRight()));
    } catch (IllegalArgumentException e) {
      LOGGER.warn("Failed to convert FilterDefinition from filter tree", e);
      return Optional.empty();
    }
  }

  private static Pair<String, FilterDescription> parseNameAndDescription(
      FilterDataNode filterDataNode) {

    String name;
    FilterDescription description;

    var filterDao = filterDataNode.getFilterRecord();

    if (isLinear(filterDao)) {
      var filterString = ParsedFilterString.create(filterDao.getFilterString());
      name = buildLinearName(filterString);

      var descriptionComments =
          buildDescriptionComments(
              name, filterDataNode.getFilterGroup().map(FilterGroupDao::getFilterGroupKey));

      description =
          convertLinearFilterDescription(
              filterDao.getFilterMethod(), descriptionComments, filterString);
    } else {
      name =
          Arrays.stream(StringUtils.normalizeSpace(filterDao.getFilterString()).strip().split("/"))
              .map(StringUtils::normalizeSpace)
              .map(ParsedFilterString::create)
              .map(FilterDefinitionConverter::buildLinearName)
              .collect(Collectors.joining(" / "));

      var descriptionComments =
          buildDescriptionComments(
              name, filterDataNode.getFilterGroup().map(FilterGroupDao::getFilterGroupKey));

      description = convertCascadeFilterDescription(filterDataNode, descriptionComments);
    }

    return Pair.of(name, description);
  }

  private static boolean isLinear(FilterDao filterDao) {
    var type = FilterType.fromString(filterDao.getFilterMethod());
    if (filterDao.getCompoundFilter() == 'n' && FilterType.IIR_BUTTERWORTH == type) {
      return true;
    } else if (filterDao.getCompoundFilter() == 'y' && FilterType.CASCADE == type) {
      return false;
    } else {
      throw new IllegalArgumentException(
          String.format(
              "Cannot construct FilterDefinition from unsupported combination of"
                  + " compound_filter:%s, filter_method:%s for filter record %d",
              filterDao.getCompoundFilter(), filterDao.getFilterMethod(), filterDao.getFilterId()));
    }
  }

  private static LinearFilterDescription convertLinearFilterDescription(
      String filterMethod, String comments, ParsedFilterString filterString) {

    var type = FilterType.fromString(filterMethod);

    return LinearFilterDescription.from(
        Optional.of(comments),
        filterString.isCausal(),
        type,
        Optional.of(filterString.getLowFrequencyHz()),
        Optional.of(filterString.getHighFrequencyHz()),
        filterString.getOrder(),
        !filterString.isCausal(),
        filterString.getFilterType(),
        Optional.empty());
  }

  private static FilterDescription convertCascadeFilterDescription(
      FilterDataNode filterDataNode, String comments) {

    var filterGroup = filterDataNode.getFilterGroup();

    if (filterGroup.isPresent()) {
      var errFormat =
          String.format(
              "Filter records demonstrating \"cascade of cascades\" behavior currently not"
                  + " supported. Parent: %d, Child: %d",
              filterGroup.get().getFilterGroupKey().getParentFilterId(),
              filterGroup.get().getFilterGroupKey().getChildFilterDao().getFilterId());
      throw new IllegalArgumentException(errFormat);
    }

    var childFilters =
        filterDataNode
            .getChildFilters()
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        String.format(
                            "Compound filter record %d must have associated child filters",
                            filterDataNode.getFilterRecord().getFilterId())));

    if (childFilters.size() > 1) {
      var filterDescriptions =
          childFilters.stream()
              .map(
                  childFdNode ->
                      Pair.of(
                          childFdNode
                              .getFilterGroup()
                              .orElseThrow(
                                  () ->
                                      new IllegalArgumentException(
                                          String.format(
                                              "Child filter record %d of compound filter record %d"
                                                  + " is missing its filter group record"
                                                  + " associating it with its parent",
                                              childFdNode.getFilterRecord().getFilterId(),
                                              filterDataNode.getFilterRecord().getFilterId())))
                              .getFilterGroupKey()
                              .getChildSequence(),
                          parseNameAndDescription(childFdNode).getRight()))
              .collect(
                  Collectors.collectingAndThen(
                      toList(),
                      sequencedDescriptions ->
                          sortAndExtractDescriptions(
                              filterDataNode.getFilterRecord().getFilterId(),
                              sequencedDescriptions)));

      return CascadeFilterDescription.from(
          Optional.of(comments), filterDescriptions, Optional.empty());
    } else if (!childFilters.isEmpty()) {
      return parseNameAndDescription(
              childFilters.get(0).toBuilder().setFilterGroup(Optional.empty()).build())
          .getRight();
    } else {
      throw new IllegalArgumentException(
          String.format(
              "Compound filter record %d is associated with an empty list of child filters",
              filterDataNode.getFilterRecord().getFilterId()));
    }
  }

  private static ImmutableList<FilterDescription> sortAndExtractDescriptions(
      long parentFilterId, List<Pair<Long, FilterDescription>> sequencedDescriptions) {
    sequencedDescriptions.sort(Comparator.comparing(Pair::getLeft));

    var orderedSequence =
        sequencedDescriptions.stream().map(Pair::getLeft).collect(Collectors.toList());

    var isContiguous =
        IntStream.range(0, orderedSequence.size()).allMatch(i -> i + 1 == orderedSequence.get(i));

    if (!isContiguous) {
      throw new IllegalArgumentException(
          String.format(
              "All child filter records for compound filter %d must have their sequences be"
                  + " contiguous and increasing, starting at 1",
              parentFilterId));
    }
    return sequencedDescriptions.stream()
        .map(Pair::getRight)
        .collect(Collectors.collectingAndThen(toList(), ImmutableList::copyOf));
  }

  private static String buildLinearName(ParsedFilterString filterString) {
    var name =
        String.format(
            "%f-%f %d %s",
            filterString.getLowFrequencyHz(),
            filterString.getHighFrequencyHz(),
            filterString.getOrder(),
            filterString.getFilterType().getValue());

    if (filterString.isCausal()) {
      name += " zero-phase";
    } else {
      name += " non-causal";
    }

    return name;
  }

  private static String buildDescriptionComments(
      String name, Optional<FilterGroupKey> filterGroupKey) {
    var comments = name;

    var cascadeComment =
        filterGroupKey
            .map(
                fgk ->
                    String.format(
                        "; Bridged from filter cascade element w/ parent_filterid=%s,"
                            + " child_filterid=%s, child_sequence=%d",
                        fgk.getParentFilterId(),
                        fgk.getChildFilterDao().getFilterId(),
                        fgk.getChildSequence()))
            .orElse("");

    return comments.concat(cascadeComment);
  }
}
