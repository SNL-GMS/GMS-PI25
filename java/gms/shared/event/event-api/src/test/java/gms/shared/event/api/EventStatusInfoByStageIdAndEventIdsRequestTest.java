package gms.shared.event.api;

import gms.shared.utilities.test.TestUtilities;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventStatusInfoByStageIdAndEventIdsRequestTest {

  @Test
  void testSerialization() throws IOException {
    WorkflowDefinitionId stageId = WorkflowDefinitionId.from("test");
    var request =
        EventStatusInfoByStageIdAndEventIdsRequest.create(
            stageId, List.of(UUID.fromString("10000000-100-0000-1000-100000000002")));
    TestUtilities.assertSerializes(request, EventStatusInfoByStageIdAndEventIdsRequest.class);
  }
}
