package gms.testtools.simulators.bridgeddatasourcesimulator.repository;

import gms.shared.stationdefinition.dao.css.BeamDao;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.utilities.bridge.database.connector.EntityVoidFunction;
import jakarta.persistence.EntityManagerFactory;
import org.apache.commons.lang3.Validate;

public class BridgedDataSourceWaveformRepositoryJpa extends BridgedDataSourceAnalysisRepositoryJpa
    implements BridgedDataSourceRepository {

  protected BridgedDataSourceWaveformRepositoryJpa(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public static BridgedDataSourceWaveformRepositoryJpa create(
      EntityManagerFactory entityManagerFactory) {
    Validate.notNull(entityManagerFactory);
    return new BridgedDataSourceWaveformRepositoryJpa(entityManagerFactory);
  }

  @Override
  public void cleanupData() {
    EntityVoidFunction delegateFunc =
        (entityManager) -> {
          entityManager.getTransaction().begin();
          cleanupTable(WfdiscDao.class, entityManager);
          cleanupTable(BeamDao.class, entityManager);
          entityManager.getTransaction().commit();
        };

    var errMessage = this.getClass().getSimpleName() + ".cleanupData() error.";
    runWithEntityManagerVoidFunction(delegateFunc, errMessage);
  }
}
