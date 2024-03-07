package gms.testtools.simulators.bridgeddatasourcesimulator.repository;

import gms.shared.signaldetection.dao.css.ArrivalDao;
import gms.shared.stationdefinition.dao.css.BeamDao;
import gms.shared.stationdefinition.dao.css.WfTagDao;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.utilities.bridge.database.connector.EntityVoidFunction;
import jakarta.persistence.EntityManagerFactory;
import org.apache.commons.lang3.Validate;

public class BridgedDataSourceAnalysisRepositoryJpa extends BridgedDataSourceRepositoryJpa
    implements BridgedDataSourceRepository {

  protected BridgedDataSourceAnalysisRepositoryJpa(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public static BridgedDataSourceAnalysisRepositoryJpa create(
      EntityManagerFactory entityManagerFactory) {
    Validate.notNull(entityManagerFactory);
    return new BridgedDataSourceAnalysisRepositoryJpa(entityManagerFactory);
  }

  @Override
  public void cleanupData() {
    EntityVoidFunction delegateFunc =
        (entityManager) -> {
          entityManager.getTransaction().begin();

          cleanupTable(ArrivalDao.class, entityManager);
          cleanupTable(BeamDao.class, entityManager);
          cleanupTable(WfdiscDao.class, entityManager);
          cleanupTable(WfTagDao.class, entityManager);

          entityManager.getTransaction().commit();
        };

    var errMessage = this.getClass().getSimpleName() + ".cleanupData() error.";
    runWithEntityManagerVoidFunction(delegateFunc, errMessage);
  }
}
