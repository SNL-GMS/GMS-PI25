import type { FilterList } from '@gms/common-model/lib/filter/types';
import { BandType, FilterType } from '@gms/common-model/lib/filter/types';

export const uiFilterList: FilterList = {
  name: 'Test Filters',
  defaultFilterIndex: 0,
  filters: [
    {
      withinHotKeyCycle: true,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 1',
        comments: 'Simple LP Filter',
        filterDescription: {
          filterType: FilterType.IIR_BUTTERWORTH,
          comments: 'BW 0.0 3.0 1 LP causal',
          causal: true,
          passBandType: BandType.LOW_PASS,
          lowFrequency: 0.5,
          highFrequency: 3.0,
          order: 1,
          zeroPhase: false,
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    },
    {
      withinHotKeyCycle: true,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 2',
        comments: 'Simple HP Filter',
        filterDescription: {
          filterType: FilterType.IIR_BUTTERWORTH,
          comments: 'BW 0.5 0.0 3 HP non-causal',
          causal: false,
          passBandType: BandType.HIGH_PASS,
          lowFrequency: 0.5,
          highFrequency: 3.0,
          order: 3,
          zeroPhase: true,
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    },
    {
      withinHotKeyCycle: true,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 3',
        comments: 'Simple BP Filter',
        filterDescription: {
          filterType: FilterType.IIR_BUTTERWORTH,
          comments: 'BW 0.5 3.0 10 BP causal',
          causal: true,
          passBandType: BandType.BAND_PASS,
          lowFrequency: 0.5,
          highFrequency: 3.0,
          order: 10,
          zeroPhase: false,
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    },
    {
      withinHotKeyCycle: true,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 4',
        comments: 'Simple BR Filter',
        filterDescription: {
          filterType: FilterType.IIR_BUTTERWORTH,
          comments: 'BW 0.5 3.0 20 BR non-causal',
          causal: false,
          passBandType: BandType.BAND_REJECT,
          lowFrequency: 0.5,
          highFrequency: 3.0,
          order: 20,
          zeroPhase: true,
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    },
    {
      withinHotKeyCycle: false,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 5',
        comments: 'Cascade LP-HP Filter',
        filterDescription: {
          filterType: FilterType.CASCADE,
          comments: 'Cascade BW 0.0 3.0 7 LP causal / BW 0.5 0.0 1 HP non-causal',
          causal: true,
          filterDescriptions: [
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 0.0 3.0 7 LP causal',
              causal: true,
              passBandType: BandType.LOW_PASS,
              lowFrequency: 0.5,
              highFrequency: 3.0,
              order: 7,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            },
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 0.5 0.0 1 HP non-causal',
              causal: true,
              passBandType: BandType.HIGH_PASS,
              lowFrequency: 0.5,
              highFrequency: 3.0,
              order: 1,
              zeroPhase: true,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            }
          ],
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    },
    {
      withinHotKeyCycle: false,
      unfiltered: null,
      namedFilter: null,
      filterDefinition: {
        name: 'Test Filter 6',
        comments: 'Cascade LP-HP-BP-BR-BR Filter',
        filterDescription: {
          filterType: FilterType.CASCADE,
          comments: 'Cascade BW LP-HP-BP-BR-BR causal',
          causal: true,
          filterDescriptions: [
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 0.0 8.0 13 LP causal',
              causal: true,
              passBandType: BandType.LOW_PASS,
              lowFrequency: 0.5,
              highFrequency: 8.0,
              order: 13,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            },
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 0.5 0.0 13 HP causal',
              causal: true,
              passBandType: BandType.HIGH_PASS,
              lowFrequency: 0.5,
              highFrequency: 8.0,
              order: 13,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            },
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 1.0 6.0 5 BP causal',
              causal: true,
              passBandType: BandType.BAND_PASS,
              lowFrequency: 0.8,
              highFrequency: 6.0,
              order: 5,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            },
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 2.0 3.0 3 BR causal',
              causal: true,
              passBandType: BandType.BAND_REJECT,
              lowFrequency: 2.0,
              highFrequency: 3.0,
              order: 3,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            },
            {
              filterType: FilterType.IIR_BUTTERWORTH,
              comments: 'BW 4.0 4.1 7 BR causal',
              causal: true,
              passBandType: BandType.BAND_REJECT,
              lowFrequency: 4.0,
              highFrequency: 4.1,
              order: 7,
              zeroPhase: false,
              parameters: {
                sampleRateHz: 40,
                sampleRateToleranceHz: 0,
                groupDelaySec: 0
              }
            }
          ],
          parameters: {
            sampleRateHz: 40,
            sampleRateToleranceHz: 0,
            groupDelaySec: 0
          }
        }
      }
    }
  ]
};
