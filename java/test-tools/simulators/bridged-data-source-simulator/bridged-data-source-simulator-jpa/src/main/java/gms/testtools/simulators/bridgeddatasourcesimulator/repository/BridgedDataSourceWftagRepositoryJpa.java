package gms.testtools.simulators.bridgeddatasourcesimulator.repository;

import gms.shared.stationdefinition.dao.css.WfTagDao;
import gms.shared.utilities.bridge.database.connector.EntityVoidFunction;
import jakarta.persistence.EntityManagerFactory;
import org.apache.commons.lang3.Validate;

public class BridgedDataSourceWftagRepositoryJpa extends BridgedDataSourceAnalysisRepositoryJpa
    implements BridgedDataSourceRepository {

  protected BridgedDataSourceWftagRepositoryJpa(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public static BridgedDataSourceWftagRepositoryJpa create(
      EntityManagerFactory entityManagerFactory) {
    Validate.notNull(entityManagerFactory);
    return new BridgedDataSourceWftagRepositoryJpa(entityManagerFactory);
  }

  @Override
  public void cleanupData() {
    EntityVoidFunction delegateFunc =
        (entityManager) -> {
          entityManager.getTransaction().begin();
          cleanupTable(WfTagDao.class, entityManager);
          entityManager.getTransaction().commit();
        };

    var errMessage = this.getClass().getSimpleName() + ".cleanupData() error.";
    runWithEntityManagerVoidFunction(delegateFunc, errMessage);
  }
}
