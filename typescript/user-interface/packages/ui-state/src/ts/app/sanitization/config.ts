import type { $CombinedState } from '@reduxjs/toolkit';

import type { DataState } from '../api';
import {
  dataSlice,
  eventManagerApiSlice,
  processingConfigurationApiSlice,
  processingStationApiSlice,
  signalEnhancementConfigurationApiSlice,
  sohAceiApiSlice,
  ssamControlApiSlice,
  stationDefinitionSlice,
  systemEventGatewayApiSlice,
  systemMessageDefinitionApiSlice,
  userManagerApiSlice,
  workflowApiSlice
} from '../api';
import { historySlice } from '../history';
import type { AppState } from '../store';
import type { DevToolEnvConfig } from './types';

function getBooleanFromConfig(env: string | undefined): boolean | undefined {
  if (env === 'true') {
    return true;
  }
  if (env === 'false') {
    return false;
  }
  return undefined;
}

/**
 * ! Make sure to add any new env vars to the webpack.config.ts file so that they are picked up and injected
 *
 * Define environment variables that have special, global effects
 * * Default values are set here
 */
export const reduxDevToolsGlobalConfig: Record<string, DevToolEnvConfig> = {
  // If true, this enables all queries and the data slice
  DEV_TOOLS_ENABLE_QUERIES: {
    envVar: 'DEV_TOOLS_ENABLE_QUERIES',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_QUERIES) ?? false // * Default value
  },

  // If false, this adds query actions to the deny list if they are not specifically enabled
  DEV_TOOLS_ENABLE_QUERY_ACTION_TRACKING: {
    envVar: 'DEV_TOOLS_ENABLE_QUERY_ACTION_TRACKING',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_QUERY_ACTION_TRACKING) ?? true // * Default value
  },

  // If true, enables the redux logger
  GMS_ENABLE_REDUX_LOGGER: {
    envVar: 'GMS_ENABLE_REDUX_LOGGER',
    enabled: getBooleanFromConfig(process.env.GMS_ENABLE_REDUX_LOGGER) ?? false
  },

  // If true, enables the redux stack trace feature in the dev tools
  GMS_ENABLE_REDUX_TRACE: {
    envVar: 'GMS_ENABLE_REDUX_TRACE',
    enabled: getBooleanFromConfig(process.env.GMS_ENABLE_REDUX_TRACE) ?? false
  },

  // If true, enables redux immutability checks
  GMS_ENABLE_REDUX_IMMUTABLE_CHECK: {
    envVar: 'GMS_ENABLE_REDUX_IMMUTABLE_CHECK',
    enabled: getBooleanFromConfig(process.env.GMS_ENABLE_REDUX_IMMUTABLE_CHECK) ?? false
  },

  // If true, enables redux serialization check
  GMS_ENABLE_REDUX_SERIALIZABLE_CHECK: {
    envVar: 'GMS_ENABLE_REDUX_SERIALIZABLE_CHECK',
    enabled: getBooleanFromConfig(process.env.GMS_ENABLE_REDUX_SERIALIZABLE_CHECK) ?? false
  },

  // if true, disables redux state sync. Note, this may break behavior, and is for development purposes only
  GMS_DISABLE_REDUX_STATE_SYNC: {
    envVar: 'GMS_DISABLE_REDUX_STATE_SYNC',
    enabled: getBooleanFromConfig(process.env.GMS_DISABLE_REDUX_STATE_SYNC) ?? false
  },

  // Totally disables the dev tools
  GMS_DISABLE_REDUX_DEV_TOOLS: {
    envVar: 'GMS_DISABLE_REDUX_DEV_TOOLS',
    enabled: getBooleanFromConfig(process.env.GMS_DISABLE_REDUX_DEV_TOOLS) ?? false
  }
};

/**
 * ! Make sure to add any new env vars to the webpack.config.ts file so that they are picked up and injected
 *
 * If adding a new slice to the redux store, make sure to add an environment variable to control whether it
 * is shown in the dev tools
 *
 * Configuration for each slice. If enabled, the slice will be shown and its actions will be logged.
 * * Default values are set here
 */
export const reduxDevToolsSliceConfig: Record<
  keyof Omit<AppState, typeof $CombinedState>,
  DevToolEnvConfig
> = {
  [systemEventGatewayApiSlice.reducerPath]: {
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_SYSTEM_EVENT_GATEWAY_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    envVar: 'DEV_TOOLS_ENABLE_SYSTEM_EVENT_GATEWAY_API'
  },
  [eventManagerApiSlice.reducerPath]: {
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_EVENT_MANAGER_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    envVar: 'DEV_TOOLS_ENABLE_EVENT_MANAGER_API',
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_EVENT_MANAGER_API=true or DEV_TOOLS_ENABLE_QUERIES=true to show`
  },
  [processingConfigurationApiSlice.reducerPath]: {
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_PROCESSING_CONFIGURATION_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    envVar: 'DEV_TOOLS_ENABLE_PROCESSING_CONFIGURATION_API',
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_PROCESSING_CONFIGURATION_API=true or DEV_TOOLS_ENABLE_QUERIES=true to show`
  },
  [processingStationApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_PROCESSING_STATION_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_PROCESSING_STATION_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_PROCESSING_STATION_API=true to show`
  },
  [signalEnhancementConfigurationApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_SIGNAL_ENHANCEMENT_CONFIGURATION_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_SIGNAL_ENHANCEMENT_CONFIGURATION_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_SIGNAL_ENHANCEMENT_CONFIGURATION_API=true to show`
  },
  [ssamControlApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_SSAM_CONTROL_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_SSAM_CONTROL_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_SSAM_CONTROL_API=true to show`
  },
  [sohAceiApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_SOH_ACEI_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_SOH_ACEI_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_SOH_ACEI_API=true to show`
  },
  [stationDefinitionSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_STATION_DEFINITION_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_STATION_DEFINITION_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_STATION_DEFINITION_API=true to show`
  },
  [systemMessageDefinitionApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_SYSTEM_MESSAGE_DEFINITION_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_SYSTEM_MESSAGE_DEFINITION_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_SYSTEM_MESSAGE_DEFINITION_API=true to show`
  },
  [userManagerApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_USER_MANAGER_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_USER_MANAGER_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage:
      'Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_USER_MANAGER_API=true to show'
  },
  [workflowApiSlice.reducerPath]: {
    envVar: 'DEV_TOOLS_ENABLE_WORKFLOW_API',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_WORKFLOW_API) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_WORKFLOW_API=true to show`
  },
  [historySlice.name]: {
    envVar: 'DEV_TOOLS_ENABLE_HISTORY',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_HISTORY) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false // * Default value
  },
  [dataSlice.name]: {
    envVar: 'DEV_TOOLS_ENABLE_DATA',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA) ||
      reduxDevToolsGlobalConfig.DEV_TOOLS_ENABLE_QUERIES.enabled ||
      false, // * Default value
    sanitizationMessage: `Set DEV_TOOLS_ENABLE_QUERIES=true or DEV_TOOLS_ENABLE_DATA=true to show`
  },
  app: {
    envVar: 'DEV_TOOLS_ENABLE_APP',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_APP) ?? true // * Default value
  }
};

/**
 * ! Make sure to add any new env vars to the webpack.config.ts file so that they are picked up and injected
 *
 * If adding a new section to the `data` section of the store, make sure to add an environment variable to control
 * whether it is shown in the dev tools
 *
 * Configuration for each piece of the data slice. If enabled, that section will be shown and its actions will be logged.
 * * Default values are set here
 */
export const reduxDevToolsDataConfig: Record<keyof DataState, DevToolEnvConfig> = {
  associationConflict: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_ASSOCIATION_CONFLICT',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_ASSOCIATION_CONFLICT) ?? true // * Default value
  },
  beamformingTemplates: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_BEAMFORMING_TEMPLATES',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_BEAMFORMING_TEMPLATES) ?? true // * Default value
  },
  channels: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_CHANNELS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_CHANNELS) ?? true // * Default value
  },
  defaultFilterDefinitionByUsageForChannelSegments: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS',
    enabled:
      getBooleanFromConfig(
        process.env.DEV_TOOLS_ENABLE_DATA_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS
      ) ?? true // * Default value
  },
  defaultFilterDefinitionByUsageForChannelSegmentsEventOpen: {
    envVar:
      'DEV_TOOLS_ENABLE_DATA_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS_EVENT_OPEN',
    enabled:
      getBooleanFromConfig(
        process.env
          .DEV_TOOLS_ENABLE_DATA_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS_EVENT_OPEN
      ) ?? true // * Default value
  },
  events: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_EVENTS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_EVENTS) ?? true // * Default value
  },
  filterDefinitions: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS) ?? true // * Default value
  },
  filterDefinitionsForSignalDetectionHypotheses: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES',
    enabled:
      getBooleanFromConfig(
        process.env.DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES
      ) ?? true // * Default value
  },
  filterDefinitionsForSignalDetectionHypothesesEventOpen: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES_EVENT_OPEN',
    enabled:
      getBooleanFromConfig(
        process.env
          .DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES_EVENT_OPEN
      ) ?? true // * Default value
  },
  filterDefinitionsForSignalDetections: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTIONS',
    enabled:
      getBooleanFromConfig(
        process.env.DEV_TOOLS_ENABLE_DATA_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTIONS
      ) ?? true // * Default value
  },
  fkChannelSegments: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FK_CHANNEL_SEGMENTS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_FK_CHANNEL_SEGMENTS) ?? true // * Default value
  },
  fkFrequencyThumbnails: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_FK_FREQUENCY_THUMBNAILS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_FK_FREQUENCY_THUMBNAILS) ?? true // * Default value
  },
  missingSignalDetectionsHypothesesForFilterDefinitions: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_MISSING_SIGNAL_DETECTIONS_HYPOTHESES_FOR_FILTER_DEFINITIONS',
    enabled:
      getBooleanFromConfig(
        process.env
          .DEV_TOOLS_ENABLE_DATA_MISSING_SIGNAL_DETECTIONS_HYPOTHESES_FOR_FILTER_DEFINITIONS
      ) ?? true // * Default value
  },
  processingMaskDefinitions: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_PROCESSING_MASK_DEFINITIONS',
    enabled:
      getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_PROCESSING_MASK_DEFINITIONS) ?? true // * Default value
  },
  qcSegments: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_QC_SEGMENTS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_QC_SEGMENTS) ?? true // * Default value
  },
  queries: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_QUERIES',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_QUERIES) ?? true // * Default value
  },
  signalDetections: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_SIGNAL_DETECTIONS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_SIGNAL_DETECTIONS) ?? true // * Default value
  },
  uiChannelSegments: {
    envVar: 'DEV_TOOLS_ENABLE_DATA_UI_CHANNEL_SEGMENTS',
    enabled: getBooleanFromConfig(process.env.DEV_TOOLS_ENABLE_DATA_UI_CHANNEL_SEGMENTS) ?? true // * Default value
  }
};

export interface DevToolsConfig {
  reduxDevToolsGlobalConfig: typeof reduxDevToolsGlobalConfig;
  reduxDevToolsSliceConfig: typeof reduxDevToolsSliceConfig;
  reduxDevToolsDataConfig: typeof reduxDevToolsDataConfig;
}

export function updateReduxDevToolsConfig(newConfig: DevToolsConfig) {
  if (!newConfig) {
    return;
  }
  Object.entries(newConfig).forEach(
    ([, configCategory]: [string, Record<string, DevToolEnvConfig>]) => {
      Object.entries(configCategory).forEach(([configKey, config]) => {
        if (Object.prototype.hasOwnProperty.call(reduxDevToolsGlobalConfig, configKey)) {
          reduxDevToolsGlobalConfig[configKey] = config;
        } else if (Object.prototype.hasOwnProperty.call(reduxDevToolsSliceConfig, configKey)) {
          reduxDevToolsSliceConfig[configKey] = config;
        } else if (Object.prototype.hasOwnProperty.call(reduxDevToolsDataConfig, configKey)) {
          reduxDevToolsDataConfig[configKey] = config;
        }
      });
    }
  );
}
