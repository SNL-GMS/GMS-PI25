package gms.shared.event.repository;

import gms.shared.event.connector.ArInfoDatabaseConnector;
import gms.shared.event.connector.AssocDatabaseConnector;
import gms.shared.event.connector.EventControlDatabaseConnector;
import gms.shared.event.connector.EventDatabaseConnector;
import gms.shared.event.connector.GaTagDatabaseConnector;
import gms.shared.event.connector.NetMagDatabaseConnector;
import gms.shared.event.connector.OriginDatabaseConnector;
import gms.shared.event.connector.OriginErrDatabaseConnector;
import gms.shared.event.connector.StaMagDatabaseConnector;
import gms.shared.event.repository.config.processing.EventBridgeDefinition;
import gms.shared.utilities.bridge.database.connector.BridgedDatabaseConnectors;
import gms.shared.utilities.javautilities.objectmapper.DatabaseLivenessCheck;
import jakarta.persistence.EntityManagerFactory;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Establishes database connectors for the event bridge */
@Component
public class EventBridgeDatabaseConnectors extends BridgedDatabaseConnectors {

  private static final Logger LOGGER = LoggerFactory.getLogger(EventBridgeDatabaseConnectors.class);

  @Autowired
  public EventBridgeDatabaseConnectors(
      @Qualifier("event-entityManagerFactory") ObjectProvider<EntityManagerFactory> entityManagerFactoryProvider,
      ObjectProvider<EventDatabaseConnector> eventDatabaseConnectorProvider,
      ObjectProvider<EventControlDatabaseConnector> eventControlDatabaseConnectorProvider,
      ObjectProvider<OriginDatabaseConnector> originDatabaseConnectorProvider,
      ObjectProvider<OriginErrDatabaseConnector> originErrDatabaseConnectorProvider,
      ObjectProvider<GaTagDatabaseConnector> gaTagDatabaseConnectorProvider,
      @Qualifier("event-assocDatabaseConnector") ObjectProvider<AssocDatabaseConnector> assocDatabaseConnectorProvider,
      ObjectProvider<NetMagDatabaseConnector> netMagDatabaseConnectorObjectProvider,
      ObjectProvider<StaMagDatabaseConnector> staMagDatabaseConnectorsProvider,
      ObjectProvider<ArInfoDatabaseConnector> arInfoDatabaseConnectorObjectProvider,
      EventBridgeDefinition eventBridgeDefinition,
      DatabaseLivenessCheck livenessCheck) {

    if (!livenessCheck.isLive()) {
      LOGGER.info("Could not establish database liveness.  Exiting.");
      System.exit(1);
    }
    LOGGER.info("Connection to database successful");

    eventBridgeDefinition
        .getDatabaseUrlByStage()
        .keySet()
        .forEach(
            stage -> {
              // create current stage database connectors
              Optional.ofNullable(eventBridgeDefinition.getDatabaseUrlByStage().get(stage))
                  .ifPresentOrElse(
                      databaseUrl -> {
                        var stageName = stage.getName();
                        var currentStageEntityManagerFactory =
                            entityManagerFactoryProvider.getObject(databaseUrl, "gms_event");
                        addConnectorForCurrentStage(
                            stageName,
                            eventDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            eventControlDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            originDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            originErrDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            gaTagDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            assocDatabaseConnectorProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            netMagDatabaseConnectorObjectProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            staMagDatabaseConnectorsProvider.getObject(
                                currentStageEntityManagerFactory));
                        addConnectorForCurrentStage(
                            stageName,
                            arInfoDatabaseConnectorObjectProvider.getObject(
                                currentStageEntityManagerFactory));

                        LOGGER.debug(
                            "Adding Event Database 'gms_event' info of input stage [{}] for current"
                                + " stage [{}], JDBC URL [{}]",
                            stage,
                            stageName,
                            databaseUrl);
                      },
                      () ->
                          LOGGER.warn(
                              "No URL mapping found for stage [{}], verify configuration is"
                                  + " correct.",
                              stage));

              // create previous stage database connectors
              Optional.ofNullable(eventBridgeDefinition.getPreviousDatabaseUrlByStage().get(stage))
                  .ifPresentOrElse(
                      databaseUrl -> {
                        var stageName = stage.getName();
                        var previousStageEntityManagerFactory =
                            entityManagerFactoryProvider.getObject(databaseUrl, "gms_event_prev");
                        addConnectorForPreviousStage(
                            stageName,
                            eventDatabaseConnectorProvider.getObject(
                                previousStageEntityManagerFactory));
                        addConnectorForPreviousStage(
                            stageName,
                            originDatabaseConnectorProvider.getObject(
                                previousStageEntityManagerFactory));
                        addConnectorForPreviousStage(
                            stageName,
                            originErrDatabaseConnectorProvider.getObject(
                                previousStageEntityManagerFactory));
                        addConnectorForPreviousStage(
                            stageName,
                            assocDatabaseConnectorProvider.getObject(
                                previousStageEntityManagerFactory));

                        LOGGER.debug(
                            "Adding Event Database 'gms_event_prev' info of input stage [{}] for"
                                + " previous stage [{}], JDBC URL [{}]",
                            stage,
                            stageName,
                            databaseUrl);
                      },
                      () ->
                          LOGGER.warn(
                              "No URL mapping found for stage [{}]. Verify configuration is correct"
                                  + " if this stage is expected to have a previous stage DB.",
                              stage));
            });
  }

  @Override
  public <T> Class<?> getClassForConnector(T databaseConnector) {

    Class<?> connectorClass;
    if (databaseConnector instanceof ArInfoDatabaseConnector) {
      connectorClass = ArInfoDatabaseConnector.class;
    } else if (databaseConnector instanceof AssocDatabaseConnector) {
      connectorClass = AssocDatabaseConnector.class;
    } else if (databaseConnector instanceof EventDatabaseConnector) {
      connectorClass = EventDatabaseConnector.class;
    } else if (databaseConnector instanceof EventControlDatabaseConnector) {
      connectorClass = EventControlDatabaseConnector.class;
    } else if (databaseConnector instanceof GaTagDatabaseConnector) {
      connectorClass = GaTagDatabaseConnector.class;
    } else if (databaseConnector instanceof NetMagDatabaseConnector) {
      connectorClass = NetMagDatabaseConnector.class;
    } else if (databaseConnector instanceof OriginDatabaseConnector) {
      connectorClass = OriginDatabaseConnector.class;
    } else if (databaseConnector instanceof OriginErrDatabaseConnector) {
      connectorClass = OriginErrDatabaseConnector.class;
    } else if (databaseConnector instanceof StaMagDatabaseConnector) {
      connectorClass = StaMagDatabaseConnector.class;
    } else {
      throw new IllegalArgumentException(
          String.format(
              "Connector type [%s] has not been registered in %s",
              databaseConnector.getClass().getSimpleName(), this.getClass().getSimpleName()));
    }
    return connectorClass;
  }
}
