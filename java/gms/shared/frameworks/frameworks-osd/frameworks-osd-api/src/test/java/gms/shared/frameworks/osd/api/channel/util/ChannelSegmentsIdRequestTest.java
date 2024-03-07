package gms.shared.frameworks.osd.api.channel.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import gms.shared.frameworks.osd.coi.datatransferobjects.CoiObjectMapperFactory;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChannelSegmentsIdRequestTest {

  @Test
  void testSerialization() throws IOException {
    ChannelSegmentsIdRequest request =
        ChannelSegmentsIdRequest.create(
            List.of(
                UUID.fromString("10000000-100-0000-1000-100000000036"),
                UUID.fromString("10000000-100-0000-1000-100000000037")),
            true);
    ObjectMapper mapper = CoiObjectMapperFactory.getJsonObjectMapper();
    assertEquals(
        request,
        mapper.readValue(mapper.writeValueAsString(request), ChannelSegmentsIdRequest.class));
  }
}
