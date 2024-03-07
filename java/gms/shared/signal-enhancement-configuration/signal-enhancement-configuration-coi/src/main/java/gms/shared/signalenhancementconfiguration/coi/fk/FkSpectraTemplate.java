package gms.shared.signalenhancementconfiguration.coi.fk;

import gms.shared.common.coi.types.PhaseType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.fk.FkSpectraParameters;
import gms.shared.stationdefinition.coi.fk.FkWindow;
import gms.shared.stationdefinition.coi.station.Station;
import java.util.Collection;

/** Contains parameters used for the Fk spectra and spectrum calculations */
public record FkSpectraTemplate(
    FkWindow fkSpectraWindow,
    Station station,
    PhaseType phaseType,
    Collection<Channel> inputChannels,
    FkSpectraParameters fkSpectraParameters) {}
