import type { ChannelSegmentTypes, ChannelTypes, CommonTypes, EventTypes } from '@gms/common-model';
import type { BeamType } from '@gms/common-model/lib/beamforming-templates/types';
import type { VersionReference } from '@gms/common-model/lib/faceted';
import type { ProcessingMaskDefinitionsByPhaseByChannel } from '@gms/common-model/lib/processing-mask-definitions/types';
import type { StationGroup } from '@gms/common-model/lib/workflow/types';

import type { AsyncFetchHistory } from '../../../query';

// query args for GetDefaultFilterDefinitionByUsageForChannelSegments call
export interface GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs {
  interval: CommonTypes.TimeRange;
  channelSegments: ChannelSegmentTypes.ChannelSegmentFaceted[];
  eventHypothesis?: EventTypes.EventHypothesis;
}

export type GetDefaultFilterDefinitionByUsageForChannelSegmentsHistory = AsyncFetchHistory<
  GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs
>;

// query args for GetProcessingMaskDefinitions call
export interface GetProcessingMaskDefinitionsQueryArgs {
  stationGroup: StationGroup;
  channels: VersionReference<'name', ChannelTypes.Channel>[];
  processingOperations: ChannelSegmentTypes.ProcessingOperation[];
  phaseTypes: string[];
}

export interface GetProcessingMaskDefinitionsQueryResult {
  processingMaskDefinitionByPhaseByChannel: ProcessingMaskDefinitionsByPhaseByChannel[];
}

export type GetProcessingMaskDefinitionsHistory = AsyncFetchHistory<
  GetProcessingMaskDefinitionsQueryArgs
>;

// query args for GetBeamformingTemplates call
export interface GetBeamformingTemplatesQueryArgs {
  phases: string[];
  stations: VersionReference<'name'>[];
  beamType: BeamType;
}

export type GetBeamformingTemplatesHistory = AsyncFetchHistory<GetBeamformingTemplatesQueryArgs>;
