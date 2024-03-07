package gms.shared.spring.persistence;

import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class SpringPersistenceOracleConfigurationTest {

  private static final int VALIDATION_TIMEOUT_SECONDS = 120;
  private SpringPersistenceOracleConfiguration configuration;

  @BeforeEach
  void startup() {
    this.configuration = new SpringPersistenceOracleConfiguration();
  }

  @Test
  void testDataSource() {
    assertDoesNotThrow(() -> configuration.dataSource("TEST"));
  }

  @Test
  void testDataSourcesByAccount() {
    assertDoesNotThrow(
        () -> configuration.dataSourcesByAccount(new String[] {"TEST1", "TEST2", "TEST3"}));
  }

  @Test
  void testSingleDataSourceStartupValidator() {
    assertDoesNotThrow(
        () ->
            configuration.singleDataSourceStartupValidator(
                new DriverManagerDataSource("test"), VALIDATION_TIMEOUT_SECONDS));
  }

  @Test
  void testMultiDataSourceStartupValidator() {
    assertDoesNotThrow(
        () ->
            configuration.multiDataSourceStartupValidator(
                new DataSourcesByAccount(Map.of("test", new DriverManagerDataSource("test"))),
                VALIDATION_TIMEOUT_SECONDS));
  }

  @Test
  void testMultiDataSourceStartupValidatorNoDataSourcesThrows() {
    assertThatIllegalStateException()
        .isThrownBy(
            () ->
                configuration.multiDataSourceStartupValidator(
                    new DataSourcesByAccount(Map.of()), VALIDATION_TIMEOUT_SECONDS))
        .withMessage("No DataSources Found");
  }
}
