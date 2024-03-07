package gms.shared.fk.control.configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import gms.shared.stationdefinition.coi.utils.CoiObjectMapperFactory;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FkAttributesParametersTest {

  @Test
  void testSerialization() throws JsonProcessingException {
    FkAttributesParameters parameters =
        FkAttributesParameters.from(
            "test", Map.of("duration", Duration.ZERO, "time", Instant.now()));
    ObjectMapper mapper = CoiObjectMapperFactory.getJsonObjectMapper();
    FkAttributesParameters deserialized =
        mapper.readValue(mapper.writeValueAsString(parameters), FkAttributesParameters.class);
    assertEquals(parameters.getPluginName(), deserialized.getPluginName());
    assertEquals(
        parameters.getPluginParameters().size(), deserialized.getPluginParameters().size());

    assertTrue(deserialized.getPluginParameters().containsKey("duration"));
    assertEquals(
        parameters.getPluginParameters().get("duration"),
        mapper.convertValue(deserialized.getPluginParameters().get("duration"), Duration.class));

    assertTrue(deserialized.getPluginParameters().containsKey("time"));
    assertEquals(
        parameters.getPluginParameters().get("time"),
        mapper.convertValue(deserialized.getPluginParameters().get("time"), Instant.class));
  }
}
