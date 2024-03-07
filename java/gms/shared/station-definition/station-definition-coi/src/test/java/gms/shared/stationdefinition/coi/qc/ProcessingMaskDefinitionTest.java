package gms.shared.stationdefinition.coi.qc;

import gms.shared.utilities.test.TestUtilities;
import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProcessingMaskDefinitionTest {

  @Test
  void testSerialization() {
    var processingMaskDefinition =
        ProcessingMaskDefinition.create(
            Duration.ofMinutes(8),
            ProcessingOperation.ROTATION,
            Set.of(
                QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
                QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED)));

    TestUtilities.assertSerializes(processingMaskDefinition, ProcessingMaskDefinition.class);
  }
}
