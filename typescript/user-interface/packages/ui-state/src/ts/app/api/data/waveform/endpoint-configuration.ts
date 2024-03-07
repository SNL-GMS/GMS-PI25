import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Waveform request config definition
 */
export interface WaveformRequestConfig extends RequestConfig {
  readonly waveform: {
    readonly baseUrl: string;
    readonly services: {
      readonly getChannelSegment: ServiceDefinition;
      readonly findQCSegmentsByChannelAndTimeRange: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.WaveformManagerServiceUrls.baseUrl}`;

/**
 * The Waveform request config for all services.
 */
export const config: WaveformRequestConfig = {
  waveform: {
    baseUrl,
    // Service endpoints for this component
    services: prioritizeRequests({
      getChannelSegment: {
        friendlyName: Endpoints.WaveformManagerServiceUrls.getChannelSegment.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.WaveformManagerServiceUrls.getChannelSegment.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      findQCSegmentsByChannelAndTimeRange: {
        friendlyName:
          Endpoints.WaveformManagerServiceUrls.findQCSegmentsByChannelAndTimeRange.friendlyName,
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.WaveformManagerServiceUrls.findQCSegmentsByChannelAndTimeRange.url,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      }
    })
  }
};

export type ChannelSegmentServices = keyof typeof config.waveform.services;
