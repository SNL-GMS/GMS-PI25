package gms.shared.utilities.javautilities.objectmapper;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

/** Factory for getting properly-configured ObjectMapper's for use by most of the code. */
public final class ObjectMapperFactory {

  private ObjectMapperFactory() {}

  /**
   * Gets an ObjectMapper for use in JSON serialization. This ObjectMapper can serialize/deserialize
   * any COI object, and has common modules registered such as for Java 8 Instant.
   *
   * @return an ObjectMapper for use with JSON
   */
  public static ObjectMapper getJsonObjectMapper() {
    return configureObjectMapper(new ObjectMapper());
  }

  private static ObjectMapper configureObjectMapper(ObjectMapper objMapper) {
    return objMapper
        .findAndRegisterModules()
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        .disable(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
  }
}
