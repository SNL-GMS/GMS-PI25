import type { FkTypes, WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { deserializeTypeTransformer } from '@gms/ui-workers';

import dummyFkSpectra from './fk-spectra-sample.json';

let startTime = 0;
const fkConfiguration = {
  contributingChannelsConfiguration: [
    { name: 'BRTR.BR101.SHZ', id: 'BRTR.BR101.SHZ', enabled: true },
    { name: 'BRTR.BR102.SHZ', id: 'BRTR.BR102.SHZ', enabled: true },
    { name: 'BRTR.BR103.SHZ', id: 'BRTR.BR103.SHZ', enabled: true },
    { name: 'BRTR.BR104.SHZ', id: 'BRTR.BR104.SHZ', enabled: true },
    { name: 'BRTR.BR105.SHZ', id: 'BRTR.BR105.SHZ', enabled: true },
    { name: 'BRTR.BR106.SHZ', id: 'BRTR.BR106.SHZ', enabled: true },
    { name: 'BRTR.BR131.BHE', id: 'BRTR.BR131.BHE', enabled: true },
    { name: 'BRTR.BR131.BHN', id: 'BRTR.BR131.BHN', enabled: true },
    { name: 'BRTR.BR131.BHZ', id: 'BRTR.BR131.BHZ', enabled: true }
  ],
  maximumSlowness: 40,
  mediumVelocity: 5.8,
  normalizeWaveforms: false,
  numberOfPoints: 81,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: 1
};

const fkParams: FkTypes.FkParams = {
  windowParams: { leadSeconds: 1, lengthSeconds: 4, stepSize: 5 },
  frequencyPair: {
    minFrequencyHz: 3,
    maxFrequencyHz: 6
  }
};

/**
 * Helper method to create the FkData waveforms (azimuthWf, fstatWf, slownessWf)
 *
 * @param fkSpectra the fk spectra
 */
function createFkWaveform(fkSpectra: FkTypes.FkPowerSpectraCOI): WaveformTypes.Waveform {
  return {
    sampleRateHz: fkSpectra.sampleRateHz,
    sampleCount: fkSpectra.sampleCount,
    startTime: startTime + Number(fkSpectra.windowLead),
    endTime: startTime + fkSpectra.sampleCount / fkSpectra.sampleRateHz,
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
      fstatData.azimuthWf.samples.push(fkSpectrum.attributes[0].azimuth);
      fstatData.fstatWf.samples.push(fkSpectrum.attributes[0].peakFStat);
      fstatData.slownessWf.samples.push(fkSpectrum.attributes[0].slowness);
    });
  }
  return fstatData;
}

export const getTestFkCoiData = (arrivalTime: number): FkTypes.FkPowerSpectraCOI => {
  const fkSpectra: FkTypes.FkPowerSpectraCOI = deserializeTypeTransformer(dummyFkSpectra);
  startTime = arrivalTime;
  return {
    ...fkSpectra,
    startTime,
    endTime: startTime + fkSpectra.sampleCount / fkSpectra.sampleRateHz
  };
};
export const getTestFkData = (arrivalTime: number): FkTypes.FkPowerSpectra => {
  const fkSpectra: FkTypes.FkPowerSpectraCOI = getTestFkCoiData(arrivalTime);
  return {
    ...fkSpectra,
    fstatData: convertToPlotData(fkSpectra),
    configuration: fkConfiguration,
    reviewed: false
  };
};

export const fkInput: FkTypes.FkInputWithConfiguration = {
  fkComputeInput: {
    startTime: 1678215524.509,
    sampleRate: 0.0033333333333333335,
    sampleCount: 1,
    channels: [
      { name: 'BRTR.BR101.SHZ' },
      { name: 'BRTR.BR102.SHZ' },
      { name: 'BRTR.BR103.SHZ' },
      { name: 'BRTR.BR104.SHZ' },
      { name: 'BRTR.BR105.SHZ' },
      { name: 'BRTR.BR106.SHZ' },
      { name: 'BRTR.BR131.BHE' },
      { name: 'BRTR.BR131.BHN' },
      { name: 'BRTR.BR131.BHZ' }
    ],
    windowLead: 'PT1S',
    windowLength: 'PT4S',
    lowFrequency: fkParams.frequencyPair.minFrequencyHz,
    highFrequency: fkParams.frequencyPair.maxFrequencyHz,
    useChannelVerticalOffset: false,
    phaseType: 'P',
    normalizeWaveforms: false,
    slowCountX: 81,
    slowCountY: 81,
    slowStartX: -40,
    slowStartY: -40,
    slowDeltaX: 0.008882188700431906,
    slowDeltaY: 0.008882188700431906
  },
  configuration: fkConfiguration,
  signalDetectionId: signalDetectionsData[0].id,
  isThumbnailRequest: false,
  windowParams: fkParams.windowParams
};
