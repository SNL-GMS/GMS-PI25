package gms.shared.emf.util;

import com.mchange.v2.c3p0.DataSources;
import java.sql.SQLException;
import java.util.Properties;
import javax.sql.DataSource;
import org.hibernate.jpa.HibernatePersistenceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

public final class OracleSpringUtilities {

  private static final Logger LOGGER = LoggerFactory.getLogger(OracleSpringUtilities.class);

  private static final String HIBERNATE_CONNECTION_DRIVER_CLASS =
      "hibernate.connection.driver_class";
  private static final String HIBERNATE_C3P0_POOL_MIN_SIZE_KEY = "hibernate.c3p0.min_size";
  private static final String HIBERNATE_C3P0_POOL_SIZE_KEY = "hibernate.c3p0.max_size";
  private static final String HIBERNATE_C3P0_ACQUIRE_INCREMENT = "hibernate.c3p0.acquire_increment";
  private static final String HIBERNATE_C3P0_TIMEOUT = "hibernate.c3p0.timeout";
  private static final String HIBERNATE_FLUSH_MODE = "hibernate.flushMode";
  private static final String HIBERNATE_AUTO = "hibernate.hbm2ddl.auto";
  private static final String HIBERNATE_TIMEZONE = "hibernate.jdbc.time_zone";
  private static final String HIBERNATE_RETRY_ATTEMPTS = "hibernate.c3p0.acquireRetryAttempts";
  private static final String HIBERNATE_SYNONYMS = "hibernate.synonyms";
  private static final String HIBERNATE_UNRETURNED_CONNECTION_TIMEOUT =
      "hibernate.c3p0.unreturnedConnectionTimeout";
  private static final String HIBERNATE_JDBC_BATCH_SIZE = "hibernate.jdbc.batch_size";
  private static final String HIBERNATE_ORDER_INSERTS = "hibernate.order_inserts";
  private static final String HIBERNATE_ORDER_UPDATES = "hibernate.order_updates";
  private static final String HIBERNATE_JDBC_BATCH_VERSIONED_DATA =
      "hibernate.jdbc.batch_versioned_data";

  private static final String ORACLE_DRIVER_CLASS = "oracle.jdbc.OracleDriver";
  private static final int C3P0_POOL_MIN_SIZE = 1;
  private static final int C3P0_ACQUIRE_INCREMENT = 2;
  private static final int C3P0_TIMEOUT = 10;
  private static final int RETRY_ATTEMPTS = 2;
  private static final int CONNECTION_TIMEOUT = 300;
  private static final int JDBC_BATCH_SIZE = 50;

  public static final String JDBC_URL_CONFIG_KEY = "jdbc_url";

  private OracleSpringUtilities() {}

  public static LocalContainerEntityManagerFactoryBean createEntityManagerFactory(
      DataSource dataSource, String persistenceUnitName, int connectionPoolSize) {

    var emf = new LocalContainerEntityManagerFactoryBean();

    emf.setPersistenceUnitName(persistenceUnitName);
    emf.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
    emf.setDataSource(dataSource);
    emf.setPersistenceProviderClass(HibernatePersistenceProvider.class);
    emf.setJpaProperties(jpaHibernateProperties(connectionPoolSize));

    emf.afterPropertiesSet();

    return emf;
  }

  public static DataSource getDataSource(String jdbcUrl) {
    try {
      var unpooledDataSource = DataSources.unpooledDataSource(jdbcUrl);

      return DataSources.pooledDataSource(unpooledDataSource);
    } catch (SQLException e) {
      throw new IllegalStateException(e);
    }
  }

  public static Properties jpaHibernateProperties(int connectionPoolSize) {

    var properties = new Properties();

    properties.put(HIBERNATE_CONNECTION_DRIVER_CLASS, ORACLE_DRIVER_CLASS);
    properties.put(HIBERNATE_C3P0_POOL_MIN_SIZE_KEY, C3P0_POOL_MIN_SIZE);
    properties.put(HIBERNATE_C3P0_POOL_SIZE_KEY, connectionPoolSize);
    properties.put(HIBERNATE_C3P0_ACQUIRE_INCREMENT, C3P0_ACQUIRE_INCREMENT);
    properties.put(HIBERNATE_C3P0_TIMEOUT, C3P0_TIMEOUT);
    properties.put(HIBERNATE_FLUSH_MODE, "FLUSH_AUTO");
    properties.put(HIBERNATE_AUTO, "none");
    properties.put(HIBERNATE_TIMEZONE, "UTC");
    properties.put(HIBERNATE_RETRY_ATTEMPTS, RETRY_ATTEMPTS);
    properties.put(HIBERNATE_SYNONYMS, true);

    // Useful for debugging connection leaks: time out and give a stack trace if a connection cannot
    // be acquired in time
    properties.put(HIBERNATE_UNRETURNED_CONNECTION_TIMEOUT, CONNECTION_TIMEOUT);

    // enabling batch inserts
    properties.put(HIBERNATE_JDBC_BATCH_SIZE, JDBC_BATCH_SIZE);
    properties.put(HIBERNATE_ORDER_INSERTS, true);
    properties.put(HIBERNATE_ORDER_UPDATES, true);
    properties.put(HIBERNATE_JDBC_BATCH_VERSIONED_DATA, true);

    return properties;
  }
}
