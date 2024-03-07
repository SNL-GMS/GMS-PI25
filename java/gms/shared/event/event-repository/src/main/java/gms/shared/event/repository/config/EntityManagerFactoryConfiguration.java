package gms.shared.event.repository.config;

import gms.shared.emf.util.OracleSpringUtilities;
import jakarta.persistence.EntityManagerFactory;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

/** Provides new {@link jakarta.persistence.EntityManagerFactory} instances */
@Configuration
@ComponentScan(basePackages = "gms.shared.spring")
public class EntityManagerFactoryConfiguration {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(EntityManagerFactoryConfiguration.class);

  @Value("${gms.persistence.connection_pool_size:2}")
  private int connectionPoolSize;

  private final ObjectProvider<DataSource> dataSourceObjectProvider;

  /**
   * @param dataSourceObjectProvider Provides new DataSources using a specified jdbc url and schema
   */
  @Autowired
  public EntityManagerFactoryConfiguration(
      @Qualifier("event-dataSource") ObjectProvider<DataSource> dataSourceObjectProvider) {
    this.dataSourceObjectProvider = dataSourceObjectProvider;
  }

  /**
   * Provides new {@link javax.persistence.EntityManagerFactory}s using the specified jdbc url
   *
   * @param jdbcUrl jdbc url the EntityManagerFactory will connect to
   * @param persistenceUnitName persistence unit name
   * @return new EntityManagerFactory using the provided schema
   */
  @Bean(name = "event-entityManagerFactory")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public EntityManagerFactory entityManagerFactory(String jdbcUrl, String persistenceUnitName) {

    LOGGER.info("Loading event-entityManagerfactory with jdbcUrl [{}]", jdbcUrl);

    var dataSource = dataSourceObjectProvider.getObject(jdbcUrl);
    return OracleSpringUtilities.createEntityManagerFactory(
            dataSource, persistenceUnitName, connectionPoolSize)
        .getNativeEntityManagerFactory();
  }
}
