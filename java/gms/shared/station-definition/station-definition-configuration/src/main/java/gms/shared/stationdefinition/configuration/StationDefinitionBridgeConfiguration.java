package gms.shared.stationdefinition.configuration;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.derivedchannel.coi.BeamformingTemplate;
import gms.shared.stationdefinition.coi.channel.BeamType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.qc.ProcessingMaskDefinition;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.station.Station;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * {@link StationDefinitionBridgeConfiguration} is a legacy data bridge configuration utility
 * responsible for providing configured values, including resolved configuration.
 */
@Component
public class StationDefinitionBridgeConfiguration {

  private final ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration;
  private final EventBeamConfiguration eventBeamConfiguration;
  private final BeamformingTemplateConfiguration beamformingTemplateConfiguration;

  @Autowired
  public StationDefinitionBridgeConfiguration(
      ProcessingMaskDefinitionConfiguration processingMaskDefinitionConfiguration,
      EventBeamConfiguration eventBeamConfiguration,
      BeamformingTemplateConfiguration beamformingTemplateConfiguration) {
    this.processingMaskDefinitionConfiguration = processingMaskDefinitionConfiguration;
    this.eventBeamConfiguration = eventBeamConfiguration;
    this.beamformingTemplateConfiguration = beamformingTemplateConfiguration;
  }

  /**
   * Retrieves the {@link ProcessingMaskDefinition} based on the input parameters. If there are no
   * matching definitions, a default all encompassing definition will be returned
   *
   * @param processingOperation {@link ProcessingOperation} to use in configuration query
   * @param channel {@link Channel} to use in configuration query
   * @param phaseType {@link PhaseType} to use in configuration query
   * @return Populated {@link ProcessingMaskDefinition} object
   */
  public ProcessingMaskDefinition getProcessingMaskDefinition(
      ProcessingOperation processingOperation, Channel channel, PhaseType phaseType) {

    return this.processingMaskDefinitionConfiguration.getProcessingMaskDefinition(
        processingOperation, channel, phaseType);
  }

  /**
   * Retrieves the {@link PhaseTypesByBeamDescriptions}.
   *
   * @return Populated {@link PhaseTypesByBeamDescriptions} map
   */
  public PhaseTypesByBeamDescriptions getBeamPhase() {

    return this.eventBeamConfiguration.getPhaseTypesByBeamDescriptions();
  }

  /**
   * Create the {@link BeamformingTemplate} using the processing configuration and station,
   * phaseType and beamType inputs.
   *
   * @param station {@link Station}
   * @param phaseType {@link PhaseType}
   * @param beamType {@link BeamType}
   * @return optional {@link BeamformingTemplate}
   */
  public Optional<BeamformingTemplate> getBeamformingTemplate(
      Station station, PhaseType phaseType, BeamType beamType) {
    return this.beamformingTemplateConfiguration.getBeamformingTemplate(
        station, phaseType, beamType);
  }
}
