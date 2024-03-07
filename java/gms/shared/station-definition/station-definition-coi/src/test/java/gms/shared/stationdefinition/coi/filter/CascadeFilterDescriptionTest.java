package gms.shared.stationdefinition.coi.filter;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.common.collect.ImmutableList;
import gms.shared.stationdefinition.coi.filter.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CascadeFilterDescriptionTest {
  private final List<FilterDescription> filterDescriptionList = new ArrayList<>();

  @BeforeEach
  void setup() {
    filterDescriptionList.add(FilterFixtures.LINEAR_HAM_FIR_BP_0_70_2_00_HZ_DESCRIPTION);
    filterDescriptionList.add(FilterFixtures.LINEAR_HAM_FIR_BP_1_00_3_00_HZ_DESCRIPTION);
  }

  @Test
  void testSerialization() {
    CascadeFilterDescription cascadeFilterDescription =
        CascadeFilterDescription.from(
            Optional.of(FilterFixtures.CASCADE_FILTER_1),
            ImmutableList.copyOf(filterDescriptionList),
            Optional.of(FilterFixtures.CASCADED_FILTERS_PARAMETERS));

    TestUtilities.assertSerializes(cascadeFilterDescription, CascadeFilterDescription.class);
  }

  @Test
  void testCascadeCausallIsFalse() {
    filterDescriptionList.add(FilterFixtures.LINEAR_HAM_FIR_BP_1_70_3_20_HZ_DESCRIPTION);

    FilterDescription filterDescription =
        CascadeFilterDescription.from(
            Optional.of(FilterFixtures.FILTER1_COMMENTS),
            ImmutableList.copyOf(filterDescriptionList),
            Optional.of(FilterFixtures.CASCADED_FILTERS_PARAMETERS));

    Assertions.assertFalse(filterDescription.isCausal());

    filterDescriptionList.remove(2);
  }

  @Test
  void testCascadeCausalIsTrue() {
    FilterDescription filterDescription =
        CascadeFilterDescription.from(
            Optional.of(FilterFixtures.FILTER1_COMMENTS),
            ImmutableList.copyOf(filterDescriptionList),
            Optional.of(FilterFixtures.CASCADED_FILTERS_PARAMETERS));

    Assertions.assertTrue(filterDescription.isCausal());
  }

  @Test
  void testFilterDescriptionListErrorWhenLessThanTwo() {
    filterDescriptionList.remove(0);
    IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class, this::execute);

    Assertions.assertEquals(
        "List of filter descriptions must be greater than one", thrown.getMessage());
  }

  private void execute() {
    CascadeFilterDescription.from(
        Optional.of(FilterFixtures.FILTER1_COMMENTS),
        ImmutableList.copyOf(filterDescriptionList),
        Optional.of(FilterFixtures.CASCADED_FILTERS_PARAMETERS));
  }
}
