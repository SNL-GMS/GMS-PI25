package gms.shared.stationdefinition.coi.qc;

import com.fasterxml.jackson.core.JsonProcessingException;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class QcSegmentCategoryAndTypeTest {

  @Test
  void testSerialization() {
    var qcSegmentCategoryAndType =
        QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM, QcSegmentType.NOISY);

    TestUtilities.assertSerializes(qcSegmentCategoryAndType, QcSegmentCategoryAndType.class);
  }

  @Test
  void testNoTypeSerialization() throws JsonProcessingException {

    var objectMapper = ObjectMapperFactory.getJsonObjectMapper();

    var qcSegmentCategoryAndType = QcSegmentCategoryAndType.create(QcSegmentCategory.UNPROCESSED);

    // Test that qcSegmentType is excluded when it is null.
    var qScatString = objectMapper.writeValueAsString(qcSegmentCategoryAndType);

    Assertions.assertFalse(qScatString.contains("qcSegmentType"));

    TestUtilities.assertSerializes(qcSegmentCategoryAndType, QcSegmentCategoryAndType.class);
  }

  @Test
  void testBadTypes() {

    // Type-less WAVEFORM category not allowed
    Assertions.assertThrows(
        IllegalArgumentException.class,
        () -> QcSegmentCategoryAndType.create(QcSegmentCategory.WAVEFORM));

    // WAVEFORM not allowed with STATION_PROBLEM
    Assertions.assertThrows(
        IllegalArgumentException.class,
        () ->
            QcSegmentCategoryAndType.create(
                QcSegmentCategory.WAVEFORM, QcSegmentType.STATION_PROBLEM));
  }
}
