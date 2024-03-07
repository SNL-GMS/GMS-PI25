package gms.shared.stationdefinition.configuration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import gms.shared.common.coi.types.PhaseType;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class PhaseTypesByBeamDescriptionsTest {

  @Test
  void testSerialization() throws JsonProcessingException {
    Map<String, PhaseType> inputMap = new HashMap<>();
    inputMap.put("pKp", PhaseType.IPx);
    inputMap.put("PaPo", PhaseType.Iw);
    inputMap.put("hPs", PhaseType.IPx);

    PhaseTypesByBeamDescriptions expectedPhaseTypesByBeamDescriptions =
        PhaseTypesByBeamDescriptions.from(inputMap);

    ObjectMapper objectMapper = new ObjectMapper();

    String result = objectMapper.writeValueAsString(expectedPhaseTypesByBeamDescriptions);

    PhaseTypesByBeamDescriptions actualPhaseTypesByBeamDescriptions =
        objectMapper.readValue(result, PhaseTypesByBeamDescriptions.class);

    Assertions.assertEquals(
        expectedPhaseTypesByBeamDescriptions, actualPhaseTypesByBeamDescriptions);
  }
}
