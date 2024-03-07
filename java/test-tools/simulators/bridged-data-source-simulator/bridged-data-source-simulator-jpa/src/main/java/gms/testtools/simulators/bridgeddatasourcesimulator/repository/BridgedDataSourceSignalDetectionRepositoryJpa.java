package gms.testtools.simulators.bridgeddatasourcesimulator.repository;

import gms.shared.signaldetection.dao.css.AmplitudeDao;
import gms.shared.signaldetection.dao.css.ArrivalDao;
import gms.shared.utilities.bridge.database.connector.EntityVoidFunction;
import jakarta.persistence.EntityManagerFactory;
import org.apache.commons.lang3.Validate;

public class BridgedDataSourceSignalDetectionRepositoryJpa
    extends BridgedDataSourceAnalysisRepositoryJpa implements BridgedDataSourceRepository {

  protected BridgedDataSourceSignalDetectionRepositoryJpa(
      EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public static BridgedDataSourceSignalDetectionRepositoryJpa create(
      EntityManagerFactory entityManagerFactory) {
    Validate.notNull(entityManagerFactory);
    return new BridgedDataSourceSignalDetectionRepositoryJpa(entityManagerFactory);
  }

  @Override
  public void cleanupData() {
    EntityVoidFunction delegateFunc =
        (entityManager) -> {
          entityManager.getTransaction().begin();
          cleanupTable(ArrivalDao.class, entityManager);
          cleanupTable(AmplitudeDao.class, entityManager);
          entityManager.getTransaction().commit();
        };

    var errMessage = this.getClass().getSimpleName() + ".cleanupData() error.";
    runWithEntityManagerVoidFunction(delegateFunc, errMessage);
  }
}
