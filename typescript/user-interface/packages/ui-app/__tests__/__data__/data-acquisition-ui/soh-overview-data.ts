import { stationAndStationGroupSohStatus } from '@gms/common-model/__tests__/__data__';

import type { SohOverviewContextData } from '../../../src/ts/components/data-acquisition-ui/components/soh-overview/soh-overview-context';

export const contextValues: SohOverviewContextData = {
  stationGroupSoh: stationAndStationGroupSohStatus.stationGroups,
  stationSoh: stationAndStationGroupSohStatus.stationSoh,
  acknowledgeSohStatus: jest.fn(),
  glContainer: undefined,
  quietTimerMs: 1,
  updateIntervalSecs: 2,
  selectedStationIds: ['H05N'],
  setSelectedStationIds: jest.fn(),
  sohStationStaleTimeMS: 30000
};
