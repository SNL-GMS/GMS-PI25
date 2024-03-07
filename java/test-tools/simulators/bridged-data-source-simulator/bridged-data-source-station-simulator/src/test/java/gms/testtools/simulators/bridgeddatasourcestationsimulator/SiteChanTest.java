package gms.testtools.simulators.bridgeddatasourcestationsimulator;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import gms.shared.stationdefinition.coi.utils.CoiObjectMapperFactory;
import gms.shared.stationdefinition.dao.css.enums.ChannelType;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SiteChanTest {

  private SiteChan.Builder builder;

  @BeforeEach
  void testSetup() {
    builder = SiteChan.builder();
  }

  @Test
  void testSerializationDeserialization() throws JsonProcessingException {
    ObjectMapper coiObjectMapper = CoiObjectMapperFactory.getJsonObjectMapper();
    SiteChan siteChan =
        builder
            .setStationCode("sta")
            .setChannelCode("chan")
            .setOnDate(Instant.EPOCH)
            .setOffDate(Instant.MAX)
            .setChannelType(ChannelType.N)
            .setEmplacementDepth(180.0)
            .setHorizontalAngle(90.0)
            .setVerticalAngle(180.0)
            .setChannelDescription("Test Channel")
            .setLoadDate(Instant.EPOCH)
            .build();

    assertEquals(
        siteChan,
        coiObjectMapper.readValue(coiObjectMapper.writeValueAsString(siteChan), SiteChan.class));
  }
}
