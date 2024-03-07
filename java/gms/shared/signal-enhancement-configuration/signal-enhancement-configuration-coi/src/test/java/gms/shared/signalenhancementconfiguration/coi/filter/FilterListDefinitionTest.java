package gms.shared.signalenhancementconfiguration.coi.filter;

import static gms.shared.signalenhancementconfiguration.coi.utils.FilterFixtures.DEFAULT_FILTER_LIST;
import static gms.shared.signalenhancementconfiguration.coi.utils.FilterFixtures.WORKFLOW_PAIR_LIST;

import com.google.common.collect.ImmutableList;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class FilterListDefinitionTest {

  @BeforeAll
  static void setup() {}

  @Test
  void testSerialization() {

    FilterListDefinition filterListDefinition =
        FilterListDefinition.from(
            ImmutableList.copyOf(WORKFLOW_PAIR_LIST), ImmutableList.copyOf(DEFAULT_FILTER_LIST));

    TestUtilities.assertSerializes(filterListDefinition, FilterListDefinition.class);
  }
}
