package gms.shared.signalenhancementconfiguration.coi.filter;

import static org.junit.jupiter.api.Assertions.assertThrows;

import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.coi.utils.FilterFixtures;
import gms.shared.utilities.test.TestUtilities;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class FilterListEntryTest {

  private static void executeEmptyUnfiltered() {
    FilterListEntry.from(
        true,
        Optional.empty(),
        Optional.of(FilterDefinitionUsage.DETECTION),
        Optional.of(FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ));
  }

  private static void executeEmptyNamedFilter() {
    FilterListEntry.from(
        true,
        Optional.of(true),
        Optional.empty(),
        Optional.of(FilterFixtures.FILTER_DEFINITION_HAM_FIR_BP_0_40_3_50_HZ));
  }

  private static void executeEmptyFilterDefinition() {
    FilterListEntry.from(
        true, Optional.of(true), Optional.of(FilterDefinitionUsage.DETECTION), Optional.empty());
  }

  private static void executeAllEmpty() {
    FilterListEntry.from(true, Optional.empty(), Optional.empty(), Optional.empty());
  }

  @Test
  void testSerialization() {
    TestUtilities.assertSerializes(FilterFixtures.FILTER_LIST_ENTRY, FilterListEntry.class);
  }

  @Test
  void testErrorWhenFilterDefinitionAndFilterNamedEntryIsPopulated() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, FilterListEntryTest::executeEmptyUnfiltered);

    Assertions.assertEquals("Exactly one filter entry must be populated", thrown.getMessage());
  }

  @Test
  void testErrorWhenFilterDefinitionAndUnfilteredEntryIsPopulated() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, FilterListEntryTest::executeEmptyNamedFilter);

    Assertions.assertEquals("Exactly one filter entry must be populated", thrown.getMessage());
  }

  @Test
  void testErrorWhenNamedFilteredEntryAndUnfilteredEntryIsPopulated() {
    IllegalArgumentException thrown =
        assertThrows(
            IllegalArgumentException.class, FilterListEntryTest::executeEmptyFilterDefinition);

    Assertions.assertEquals("Exactly one filter entry must be populated", thrown.getMessage());
  }

  @Test
  void testErrorAllFilterEntriesAreEmpty() {
    IllegalArgumentException thrown =
        assertThrows(IllegalArgumentException.class, FilterListEntryTest::executeAllEmpty);

    Assertions.assertEquals("Exactly one filter entry must be populated", thrown.getMessage());
  }
}
