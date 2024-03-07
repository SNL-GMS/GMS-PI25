package gms.shared.spring.utilities.webmvc;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.msgpack.jackson.dataformat.MessagePackMapper;

/** Factory class for building Jackson-related Object Mappers */
public final class MapperFactory {

  private MapperFactory() {}

  public static JsonMapper jsonMapper() {
    return JsonMapper.builder()
        .findAndAddModules()
        .serializationInclusion(JsonInclude.Include.NON_ABSENT)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        .disable(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS)
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .build();
  }

  public static MessagePackMapper messagePackMapper() {
    return MessagePackMapper.builder()
        .findAndAddModules()
        .serializationInclusion(JsonInclude.Include.NON_ABSENT)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        .disable(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS)
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .build();
  }
}
