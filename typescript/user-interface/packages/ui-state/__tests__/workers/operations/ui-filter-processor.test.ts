import type { ChannelSegmentTypes, WaveformTypes } from '@gms/common-model';
import {
  cascadedFilterDefinition,
  linearFilterDefinition
} from '@gms/common-model/__tests__/__data__';

import {
  designFilter,
  filterChannelSegments
} from '../../../src/ts/workers/waveform-worker/operations/ui-filter-processor';
import { WaveformStore } from '../../../src/ts/workers/waveform-worker/worker-store/waveform-store';
import { filteredUiChannelSegmentWithClaimCheck, valuesAsNumbers } from '../../__data__';

describe('UI Filter Processor', () => {
  describe('UI Filter Processor: designFilter', () => {
    it('designs a linear filter', async () => {
      const filter = await designFilter({
        filterDefinition: linearFilterDefinition,
        taper: 0,
        removeGroupDelay: false
      });
      expect(filter).toMatchObject(linearFilterDefinition);
    });

    it('designs a cascade filter', async () => {
      const filter = await designFilter({
        filterDefinition: cascadedFilterDefinition,
        taper: 0,
        removeGroupDelay: false
      });
      expect(filter).toMatchObject(cascadedFilterDefinition);
    });
  });
  describe('UI Filter Processor: filterChannelSegments', () => {
    beforeAll(() => {
      // Arrange data in the store ahead of time
      filteredUiChannelSegmentWithClaimCheck.channelSegment.timeseries.forEach(async timeseries => {
        const waveform = timeseries as WaveformTypes.Waveform;
        await WaveformStore.store(waveform._uiClaimCheckId, new Float64Array(valuesAsNumbers));
      });
    });

    it('filters a channel segment by linear filter', async () => {
      const results = await filterChannelSegments({
        channelSegments: [
          filteredUiChannelSegmentWithClaimCheck.channelSegment as ChannelSegmentTypes.ChannelSegment<
            WaveformTypes.Waveform
          >
        ],
        filterDefinitions: { 40: linearFilterDefinition },
        taper: 0,
        removeGroupDelay: false
      });
      const filterName = results[0]._uiFilterId;
      expect(filterName).toBe(linearFilterDefinition.name);
    });

    it('filters a channel segment by cascade filter', async () => {
      const results = await filterChannelSegments({
        channelSegments: [
          filteredUiChannelSegmentWithClaimCheck.channelSegment as ChannelSegmentTypes.ChannelSegment<
            WaveformTypes.Waveform
          >
        ],
        filterDefinitions: { 40: cascadedFilterDefinition },
        taper: 0,
        removeGroupDelay: false
      });
      const filterName = results[0]._uiFilterId;
      expect(filterName).toBe(cascadedFilterDefinition.name);
    });
  });
});
