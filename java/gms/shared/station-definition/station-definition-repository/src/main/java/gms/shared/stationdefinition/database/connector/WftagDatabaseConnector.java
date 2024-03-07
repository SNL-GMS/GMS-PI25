package gms.shared.stationdefinition.database.connector;

import gms.shared.stationdefinition.dao.css.WfTagDao;
import gms.shared.utilities.bridge.database.connector.DatabaseConnector;
import gms.shared.utilities.bridge.database.connector.EntityResultListFunction;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.apache.commons.lang3.Validate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class WftagDatabaseConnector extends DatabaseConnector {

  private static final Logger LOGGER = LoggerFactory.getLogger(WftagDatabaseConnector.class);

  private static final String WFTAG_KEY = "wfTagKey";
  private static final String TAGID = "id";

  public static final String EMPTY_TAGID_LIST_ERROR =
      "Request for Wftag by ids must be given a list of tagIds";

  static final String WFTAGS_BY_IDS_ERROR = "Wftags by tag ids exception";
  static final String WFTAGS_BY_IDS_MESSAGE = "tag ids size %s";

  @Autowired
  public WftagDatabaseConnector(
      @Qualifier("entityManagerFactory") EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  /**
   * Find all {@link WfTagDao}s for the given tagIds
   *
   * @param tagIds Collection of tagIds
   * @return list of {@link WfTagDao}s
   */
  public List<WfTagDao> findWftagsByTagIds(Collection<Long> tagIds) {
    Validate.notNull(tagIds, EMPTY_TAGID_LIST_ERROR);

    var errMessage = String.format(WFTAGS_BY_IDS_MESSAGE, tagIds.size());
    if (tagIds.isEmpty()) {
      LOGGER.debug("Request for Wftag by tagIds was given an empty list of keys");
      return new ArrayList<>();
    } else {
      return runPartitionedQuery(
          tagIds,
          250,
          partitionedTagIds -> {
            EntityResultListFunction<WfTagDao> delegateFunc =
                entityManager -> {
                  var cb = entityManager.getCriteriaBuilder();
                  CriteriaQuery<WfTagDao> query = cb.createQuery(WfTagDao.class);
                  Root<WfTagDao> fromWftag = query.from(WfTagDao.class);

                  final Path<Object> idPath = fromWftag.get(WFTAG_KEY);
                  query.select(fromWftag);
                  query.where(
                      cb.or(
                          partitionedTagIds.stream()
                              .map(tagId -> cb.equal(idPath.get(TAGID), tagId))
                              .toArray(Predicate[]::new)));

                  return entityManager.createQuery(query).getResultList();
                };

            return runWithEntityManagerResultListFunction(
                delegateFunc, WFTAGS_BY_IDS_ERROR, errMessage);
          });
    }
  }
}
