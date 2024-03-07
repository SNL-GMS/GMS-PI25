package gms.shared.stationdefinition.coi.fk;

/** Contains parameters that are used in the creation of FkSpectra channels */
public record FkSpectraDefinition(
    FkSpectraParameters fkSpectraParameters, OrientationAngles orientationAngles) {}
