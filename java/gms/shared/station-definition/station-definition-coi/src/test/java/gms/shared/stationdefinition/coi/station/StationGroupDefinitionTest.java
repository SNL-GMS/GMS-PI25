package gms.shared.stationdefinition.coi.station;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class StationGroupDefinitionTest {

  private static final Logger LOGGER = LoggerFactory.getLogger(StationGroupDefinitionTest.class);

  private static final ObjectMapper mapper = ObjectMapperFactory.getJsonObjectMapper();

  @Test
  void testStationFromFacetedChannelGroupsSerializeToAndFrom() throws JsonProcessingException {
    final StationGroupDefinition stationGroupDefinition =
        StationGroupDefinition.from(
            "test", "test description", Instant.now(), List.of("station 1", "station 2"));

    final String json = mapper.writeValueAsString(stationGroupDefinition);
    LOGGER.info("json serialized station group definition: {}", json);

    final StationGroupDefinition deserialized =
        mapper.readValue(json, StationGroupDefinition.class);
    assertEquals(stationGroupDefinition, deserialized);
    assertThat(deserialized.getStationNames())
        .describedAs("ChannelGroups in deserialized station group are in order")
        .containsExactly(stationGroupDefinition.getStationNames().toArray(String[]::new));
  }
}
