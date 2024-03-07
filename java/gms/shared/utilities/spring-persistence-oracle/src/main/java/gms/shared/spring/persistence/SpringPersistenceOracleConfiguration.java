package gms.shared.spring.persistence;

import static com.google.common.base.Preconditions.checkState;
import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toMap;

import com.mchange.v2.c3p0.DataSources;
import jakarta.persistence.EntityManagerFactory;
import java.sql.SQLException;
import java.util.Arrays;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.support.DatabaseStartupValidator;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * This class represents a Spring Configuration collection of important beans used in establishing
 * connections to our Oracle database. Most beans are deliberately lazy as to prevent creations of
 * unused or illegal singletons when not required by a dependent project.
 */
@Configuration
@EnableTransactionManagement
public class SpringPersistenceOracleConfiguration {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(SpringPersistenceOracleConfiguration.class);

  @Bean
  @Lazy
  public DataSource dataSource(@Value("${gms.persistence.account}") String account) {
    return getDataSource(account);
  }

  @Bean
  @Lazy
  public DataSourcesByAccount dataSourcesByAccount(
      @Value("${gms.persistence.accounts}") String[] accounts) {
    checkState(accounts.length > 0, "No persistence accounts configured");

    var delegate =
        Arrays.stream(accounts)
            .collect(toMap(identity(), SpringPersistenceOracleConfiguration::getDataSource));

    return new DataSourcesByAccount(delegate);
  }

  @Bean("multiDataSourceStartupValidator")
  @Lazy
  public DatabaseStartupValidator multiDataSourceStartupValidator(
      DataSourcesByAccount dataSourcesByAccount,
      @Value("${gms.persistence.validation_timeout_seconds:120}") int validationTimeoutSeconds) {
    var anyDataSource =
        dataSourcesByAccount
            .dataSources()
            .findAny()
            .orElseThrow(() -> new IllegalStateException("No DataSources Found"));

    var dsv = new DatabaseStartupValidator();
    dsv.setDataSource(anyDataSource);
    dsv.setTimeout(validationTimeoutSeconds);
    return dsv;
  }

  @Bean("singleDataSourceStartupValidator")
  @Lazy
  public DatabaseStartupValidator singleDataSourceStartupValidator(
      DataSource dataSource,
      @Value("${gms.persistence.validation_timeout_seconds:120}") int validationTimeoutSeconds) {
    var dsv = new DatabaseStartupValidator();
    dsv.setDataSource(dataSource);
    dsv.setTimeout(validationTimeoutSeconds);
    return dsv;
  }

  @Bean
  @DependsOn("singleDataSourceStartupValidator")
  @Lazy
  public LocalContainerEntityManagerFactoryBean entityManagerFactory(
      EmfFactory emfFactory,
      DataSource dataSource,
      @Value("${gms.persistence.unit}") String persistenceName,
      @Value("${gms.persistence.connection_pool_size:2}") int connectionPoolSize) {
    return emfFactory.createBean(dataSource, persistenceName, connectionPoolSize);
  }

  @Bean
  @DependsOn("multiDataSourceStartupValidator")
  @Lazy
  public EntityManagerFactoriesByAccount entityManagerFactoriesByAccount(
      EmfFactory emfFactory,
      DataSourcesByAccount dataSourcesByAccount,
      @Value("${gms.persistence.unit}") String persistenceName,
      @Value("${gms.persistence.connection_pool_size:2}") int connectionPoolSize) {
    return emfFactory.createForAccounts(dataSourcesByAccount, persistenceName, connectionPoolSize);
  }

  @Bean(name = "transactionManager")
  @Lazy
  public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
    return new JpaTransactionManager(entityManagerFactory);
  }

  private static DataSource getDataSource(String account) {
    try {
      var unpooledDataSource = DataSources.unpooledDataSource(toUrl(account));

      return DataSources.pooledDataSource(unpooledDataSource);
    } catch (SQLException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String toUrl(String alias) {
    return "jdbc:oracle:thin:/@".concat(alias);
  }
}
