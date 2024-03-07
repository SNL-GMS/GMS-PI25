import type { WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes, FkTypes } from '@gms/common-model';

/**
 * Helper method to create the FkData waveforms (azimuthWf, fstatWf, slownessWf)
 *
 * @param fkSpectra the fk spectra
 */
function createFkWaveform(fkSpectra: FkTypes.FkPowerSpectraCOI): WaveformTypes.Waveform {
  return {
    sampleRateHz: fkSpectra.sampleRateHz,
    sampleCount: fkSpectra.sampleCount,
    startTime: fkSpectra.startTime,
    endTime: fkSpectra.endTime,
    type: ChannelSegmentTypes.TimeSeriesType.FK_SPECTRA,
    samples: []
  };
}

/**
 * Convert a FkSpectra (received from COI or Streaming Service) into an FstatData representation.
 *
 * @param fkSpectra: FkPowerSpectra from COI/Streaming Service
 * @param beamWaveform: beam from the SD Arrival Time Feature measurement Channel Segment
 * @param arrivalTime: arrival time value
 *
 * @returns FK Stat Data or undefined if not able to create
 */
function convertToPlotData(fkSpectra: FkTypes.FkPowerSpectraCOI): FkTypes.FstatData | undefined {
  // If the channel segment is populated at the top properly
  if (!fkSpectra) {
    return undefined;
  }

  const fstatData: FkTypes.FstatData = {
    azimuthWf: createFkWaveform(fkSpectra),
    fstatWf: createFkWaveform(fkSpectra),
    slownessWf: createFkWaveform(fkSpectra)
  };

  // Populate fstatData waveforms beams was a parameter
  if (fkSpectra && fkSpectra.values) {
    fkSpectra.values.forEach((fkSpectrum: FkTypes.FkPowerSpectrum) => {
      fkSpectrum.attributes.forEach(attributes => {
        fstatData.azimuthWf.samples.push(attributes.azimuth);
        fstatData.fstatWf.samples.push(attributes.peakFStat);
        fstatData.slownessWf.samples.push(attributes.slowness);
      });
    });
  }
  return fstatData;
}

/**
 * Update the COI FK Power Spectra to include missing UI fields
 *
 * @param fk COI FK
 * @param args FkInputWithConfiguration (includes Configuration to restore)
 * @returns FkPowerSpectra (UI version)
 */
export const updateFk = (
  fk: FkTypes.FkPowerSpectra,
  args: FkTypes.FkInputWithConfiguration
): FkTypes.FkPowerSpectra => {
  if (!fk) {
    return undefined;
  }
  return {
    ...fk,
    fstatData: convertToPlotData(fk as FkTypes.FkPowerSpectraCOI),
    configuration: args.configuration,
    reviewed: false,
    // These should be coming back from the backend?
    windowLead: args.windowParams.leadSeconds,
    windowLength: args.windowParams.lengthSeconds,
    stepSize: args.windowParams.stepSize,
    lowFrequency: args.fkComputeInput.lowFrequency,
    highFrequency: args.fkComputeInput.highFrequency,
    metadata: {
      ...fk.metadata,
      slowStartX: FkTypes.Util.degreeToKmApproximate(fk.metadata.slowStartX),
      slowStartY: FkTypes.Util.degreeToKmApproximate(fk.metadata.slowStartY),
      slowDeltaX: FkTypes.Util.degreeToKmApproximate(fk.metadata.slowDeltaX),
      slowDeltaY: FkTypes.Util.degreeToKmApproximate(fk.metadata.slowDeltaY)
    }
  };
};
