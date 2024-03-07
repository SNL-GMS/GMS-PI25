import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

/**
 * SSAM control request config definition
 */
export interface SSAMControlRequestConfig extends RequestConfig {
  readonly ssamControl: {
    readonly baseUrl: string;
    readonly services: {
      readonly getSohConfiguration: ServiceDefinition;
      readonly retrieveDecimatedHistoricalStationSoh: ServiceDefinition;
    };
  };
}

/**
 * The SSAM control request config for all services.
 */
export const config: SSAMControlRequestConfig = {
  ssamControl: {
    baseUrl: `${UI_URL}/ssam-control`,
    services: {
      getSohConfiguration: {
        friendlyName: 'SSAM control UI client parameters',
        requestConfig: {
          method: 'post',
          url: `/retrieve-station-soh-monitoring-ui-client-parameters`,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'text/plain'
          },
          timeout: 60000,
          data: `"PlaceHolder"`
        }
      },
      retrieveDecimatedHistoricalStationSoh: {
        friendlyName: 'Decimated historical station soh',
        requestConfig: {
          method: 'post',
          url: `/retrieve-decimated-historical-station-soh`,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          // must specify that the response type is of type array buffer for
          // receiving and decoding msgpack data
          responseType: 'arraybuffer',
          timeout: 600000 // 10 minutes
        }
      }
    }
  }
};
