package gms.shared.signalenhancementconfiguration.coi.filter;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.common.collect.ImmutableList;
import gms.shared.signalenhancementconfiguration.coi.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import java.util.ArrayList;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class FilterListTest {
  private static void execute() {
    FilterList.from("nando", 2, ImmutableList.copyOf(new ArrayList<>()));
  }

  @Test
  void testSerialization() {
    FilterList filterList =
        FilterList.from("nando", 2, ImmutableList.copyOf(FilterFixtures.FILTER_LIST_ENTRY_LIST));

    TestUtilities.assertSerializes(filterList, FilterList.class);
  }

  @Test
  void testErrorWhenFilterListIsEmpty() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, FilterListTest::execute);

    Assertions.assertEquals("The filter list must contain at list one entry", thrown.getMessage());
  }
}
