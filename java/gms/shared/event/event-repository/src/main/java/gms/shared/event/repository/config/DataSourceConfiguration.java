package gms.shared.event.repository.config;

import gms.shared.frameworks.systemconfig.SystemConfig;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Provides new {@link DataSource}s with the specified jdbc url and schema */
@Configuration
@ComponentScan(basePackages = "gms.shared.spring")
public class DataSourceConfiguration {

  private static final Logger LOGGER = LoggerFactory.getLogger(DataSourceConfiguration.class);

  private final SystemConfig systemConfig;

  /**
   * Constructor for DataSourceConfiguration using autowired SystemConfig
   *
   * @param systemConfig used to load {@link DataSource} configuration
   */
  @Autowired
  public DataSourceConfiguration(SystemConfig systemConfig) {
    this.systemConfig = systemConfig;
  }

  /**
   * Creates new DataSources with the specified jdbc url and schema
   *
   * @param jdbcUrl The jdbc url the DataSource will connect to
   * @return New DataSource using the specified jdbc url and schema
   */
  @Bean(name = "event-dataSource")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public DataSource dataSource(String jdbcUrl) {
    LOGGER.debug("Loading event-dataSource with jdbcUrl [{}]", jdbcUrl);

    var dataSource = new DriverManagerDataSource();

    dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
    dataSource.setUrl(jdbcUrl);

    return dataSource;
  }
}
