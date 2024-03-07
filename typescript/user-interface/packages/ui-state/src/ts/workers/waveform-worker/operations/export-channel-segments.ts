import type { WaveformTypes } from '@gms/common-model';
import type { ChannelSegment, TimeSeries } from '@gms/common-model/lib/channel-segment/types';
import { TimeSeriesType } from '@gms/common-model/lib/channel-segment/types';
import { Units } from '@gms/common-model/lib/common/types';
import { serializeTypeTransformer } from '@gms/ui-workers';

import type { FilterDefinitionAssociationsObject, UiChannelSegment } from '../../../types';
import { WaveformStore } from '../worker-store';

/**
 * Hydrates claim check's.
 *
 * @param timeSeries A list of channel segment timeseries
 * @throws {@link Error} any exceptions
 * @returns Promise of hydrated timeseries values
 */
const hydrateTimeseries = async (timeseriesList: TimeSeries[]): Promise<TimeSeries[]> => {
  return Promise.all(
    timeseriesList.map(async timeSeries => {
      const waveform: WaveformTypes.Waveform = timeSeries as WaveformTypes.Waveform;
      if (!waveform._uiClaimCheckId) {
        throw new Error('Cannot convert timeseries that is not data claim check');
      }
      // Get wave from store
      let samples = Array.from(await WaveformStore.retrieve(waveform._uiClaimCheckId));

      // Drop all even values. Even values are X and OSD data only contains Y values
      samples = samples.filter((value, index) => index % 2 !== 0);
      return {
        ...timeSeries,
        sampleCount: samples.length,
        samples
      };
    })
  );
};

/**
 * Converts UiChannelSegments to OSD model, with hydrated claim check's.
 *
 * @param uiChannelSegments A list of UIChannelSegments
 *
 * @returns Promise of converted OSD data including waveform data
 */
export const convertUiChannelSegmentsToChannelSegments = async (
  uiChannelSegments: UiChannelSegment[]
): Promise<ChannelSegment<TimeSeries>[]> => {
  return Promise.all(
    uiChannelSegments.map(async uiChannelSegment => {
      const timeseries = await hydrateTimeseries(uiChannelSegment.channelSegment.timeseries);
      return {
        id: {
          channel: {
            name: uiChannelSegment.channelSegmentDescriptor.channel.name,
            effectiveAt: uiChannelSegment.channelSegmentDescriptor.channel.effectiveAt
          },
          startTime: uiChannelSegment.channelSegmentDescriptor.startTime,
          endTime: uiChannelSegment.channelSegmentDescriptor.endTime,
          creationTime: uiChannelSegment.channelSegmentDescriptor.creationTime
        },
        units: Units[uiChannelSegment.channelSegment.units],
        timeseriesType: TimeSeriesType[uiChannelSegment.channelSegment.timeseriesType],
        timeseries,
        maskedBy: uiChannelSegment.processingMasks
      };
    })
  );
};

/**
 * Exports UIChannelSegments as a Blob containing OSD ChannelSegments in JSON format.
 *
 * @param uiChannelSegments A list of UIChannelSegments
 *
 * @returns Promise of Blob containing converted OSD format data
 */
export const exportChannelSegmentsWithFilterAssociations = async (
  params: FilterDefinitionAssociationsObject
): Promise<Blob> => {
  let data = {
    channelSegments: await convertUiChannelSegmentsToChannelSegments(params.channelSegments),
    filterAssociations: params.filterAssociations
  };
  data = serializeTypeTransformer(data);
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
};
