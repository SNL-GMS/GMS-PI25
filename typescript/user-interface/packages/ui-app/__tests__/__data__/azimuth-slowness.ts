import type { ChannelTypes, FkTypes } from '@gms/common-model';
import { linearFilter } from '@gms/common-model/__tests__/__data__';

export const configuration: FkTypes.FkConfiguration = {
  contributingChannelsConfiguration: [
    { name: 'ARCES.ARA0.BHE', id: 'ARCES.ARA0.BHE', enabled: true },
    { name: 'ARCES.ARA0.BHN', id: 'ARCES.ARA0.BHN', enabled: true },
    { name: 'ARCES.ARA0.BHZ', id: 'ARCES.ARA0.BHZ', enabled: true },
    { name: 'ARCES.ARA1.BHE', id: 'ARCES.ARA1.BHE', enabled: true },
    { name: 'ARCES.ARA1.BHN', id: 'ARCES.ARA1.BHN', enabled: true }
  ],
  maximumSlowness: 40,
  mediumVelocity: 5.8,
  normalizeWaveforms: false,
  numberOfPoints: 81,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: 1
};

/** Compatible with fk-configuration-dialog */
export const newConfiguration: FkTypes.FkDialogConfiguration = {
  maximumSlowness: 40,
  mediumVelocity: 5.8,
  normalizeWaveforms: false,
  numberOfPoints: 81,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: 1,
  fkSpectrumDurationSeconds: 1,
  selectedChannels: [
    { name: 'ARCES.ARA0.BHE' } as ChannelTypes.Channel,
    { name: 'ARCES.ARA0.BHN' } as ChannelTypes.Channel,
    { name: 'ARCES.ARA0.BHZ' } as ChannelTypes.Channel,
    { name: 'ARCES.ARA1.BHE' } as ChannelTypes.Channel,
    { name: 'ARCES.ARA1.BHN' } as ChannelTypes.Channel
  ],
  stepSizeSeconds: 5,
  frequencyBand: {
    minFrequencyHz: 0.5,
    maxFrequencyHz: 2.0
  },
  window: {
    leadSecs: 1.0,
    durationSecs: 4.0
  },
  prefilter: linearFilter
};

export const fkInput: FkTypes.FkInputWithConfiguration = {
  signalDetectionId: '012de1b9-8ae3-3fd4-800d-58665c3152cc',
  fkComputeInput: {
    phaseType: 'P',
    lowFrequency: 0.5,
    highFrequency: 2.0,
    sampleRate: 40,
    sampleCount: 604,
    useChannelVerticalOffset: false,
    normalizeWaveforms: true,
    startTime: 1675874304.406,
    channels: [
      { name: 'ARCES.ARA0.BHE' },
      { name: 'ARCES.ARA0.BHN' },
      { name: 'ARCES.ARA0.BHZ' },
      { name: 'ARCES.ARA1.BHE' },
      { name: 'ARCES.ARA1.BHN' }
    ],
    windowLead: 'PT1S',
    windowLength: 'PT5S',
    slowCountX: 25,
    slowCountY: 25,
    slowStartX: -0.008993216059187304,
    slowStartY: -0.008993216059187304,
    slowDeltaX: 0.01798643211837461,
    slowDeltaY: 0.01798643211837461
  },
  configuration,
  isThumbnailRequest: false,
  windowParams: {
    leadSeconds: 1,
    lengthSeconds: 5,
    stepSize: 2
  }
};
