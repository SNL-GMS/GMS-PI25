package gms.shared.stationdefinition.coi.qc;

import gms.shared.utilities.test.TestUtilities;
import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProcessingMaskConfigurationObjectTest {

  @Test
  void testSerialization() {
    var processingMaskConfigurationObject =
        ProcessingMaskConfigurationObject.create(
            Duration.ofMinutes(8),
            Set.of(
                QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY),
                QcSegmentCategoryAndType.create(QcSegmentCategory.ANALYST_DEFINED)));

    TestUtilities.assertSerializes(
        processingMaskConfigurationObject, ProcessingMaskConfigurationObject.class);
  }
}
