/* eslint-disable @typescript-eslint/no-duplicate-imports */
/* eslint-disable import/namespace */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  eventData,
  eventStatusInfoInProgress,
  openIntervalName
} from '@gms/common-model/__tests__/__data__';
import type { AnalystWaveformTypes, AppState, EventStatus } from '@gms/ui-state';
import { GLDisplayState } from '@gms/ui-state';
import { appState } from '@gms/ui-state/__tests__/test-util';
import type * as Cesium from 'cesium';

import * as IanMapUtils from '../../../../../src/ts/components/analyst-ui/components/map/ian-map-utils';
import {
  ASAR_NO_CHANNEL_GROUPS,
  ChannelGroupsDupes,
  ChannelGroupSingle,
  ChannelGroupsNoDupes
} from '../../../../__data__/geojson-data';

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  const mockDispatch = () => jest.fn();
  const mockUseAppDispatch = jest.fn(mockDispatch);
  return {
    ...actual,
    useAppDispatch: mockUseAppDispatch,
    useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
      data: {
        leadBufferDuration: 900,
        lagBufferDuration: 900
      }
    })),
    useEventsWithSegmentsAndSignalDetectionsByTimeQuery: jest.fn(() => ({
      data: undefined
    })),
    useWorkflowQuery: jest.fn(() => ({
      isSuccess: true,
      data: { stages: [{ name: 'Auto Network' }, { name: 'AL1' }] }
    })),
    useUpdateEventStatusMutation: jest.fn(() => [jest.fn()]),
    useAppSelector: jest.fn((stateFunc: (state: AppState) => any) => {
      const stationsVisibility: AnalystWaveformTypes.StationVisibilityChangesDictionary = {};
      stationsVisibility.name = {
        visibility: true,
        stationName: 'station-name',
        isStationExpanded: false
      };
      const state: AppState = appState;
      const range = { startTimeSecs: 100, endTimeSecs: 200 };
      state.app.workflow.timeRange = range;
      state.app.workflow.openIntervalName = 'AL1';
      state.app.waveform.viewableInterval = range;
      state.app.waveform.stationsVisibility = stationsVisibility;
      state.app.common.selectedStationIds = ['station-name'];
      return stateFunc(state);
    }),
    useGetEvents: jest.fn().mockReturnValue({
      data: [{ id: 'testID' }]
    })
  };
});

const mockShowContextMenu = jest.fn();
const mockHideContextMenu = jest.fn();

jest.mock('@blueprintjs/popover2', () => {
  const actual = jest.requireActual('@blueprintjs/popover2');
  return {
    ...actual,
    showContextMenu: () => {
      mockShowContextMenu();
    },
    hideContextMenu: () => {
      mockHideContextMenu();
    }
  };
});

// Mock console.warn so they are not getting out put to the test log
// several tests are unhappy path tests and will console warn
// eslint-disable-next-line no-console
console.warn = jest.fn();

describe('Ian map utils', () => {
  test('are defined', () => {
    expect(IanMapUtils.getObjectFromPoint).toBeDefined();
    expect(IanMapUtils.selectEntitiesInBox).toBeDefined();
    expect(IanMapUtils.buildMapEventSource).toBeDefined();
    expect(IanMapUtils.sdOnMouseEnterHandler).toBeDefined();
    expect(IanMapUtils.sdOnMouseLeaveHandler).toBeDefined();
  });

  test('getObjectFromPoint should match snapshot', () => {
    const pickedFeature = { id: 'myId' };
    const viewer = {
      scene: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pick: jest.fn(position => pickedFeature),
        requestRender: jest.fn()
      }
    };
    const endPosition = { x: 10, y: 10 };
    const pickedFeatureId = IanMapUtils.getObjectFromPoint(viewer as any, endPosition as any);
    expect(pickedFeatureId).toEqual(pickedFeature.id);
  });

  test('getObjectFromPoint should return undefined if there is no feature defined', () => {
    const viewer = {
      scene: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pick: jest.fn(position => undefined),
        requestRender: jest.fn()
      }
    };
    const endPosition = {};
    const pickedFeatureId = IanMapUtils.getObjectFromPoint(viewer as any, endPosition as any);
    expect(pickedFeatureId).toBeUndefined();
  });

  test('isSiteOrStation returns true for sites and stations', () => {
    expect(IanMapUtils.isSiteOrStation('ChannelGroup')).toBe(true);
    expect(IanMapUtils.isSiteOrStation('Station')).toBe(true);
  });

  test('isSiteOrStation returns false for non sites or stations', () => {
    expect(IanMapUtils.isSiteOrStation('aoeu')).toBe(false);
    expect(IanMapUtils.isSiteOrStation('')).toBe(false);
    expect(IanMapUtils.isSiteOrStation(undefined)).toBe(false);
    expect(IanMapUtils.isSiteOrStation(null)).toBe(false);
  });

  test('getStationLocation returns Location from station', () => {
    const result = IanMapUtils.getStationLocation('ASAR', [ASAR_NO_CHANNEL_GROUPS as any]);
    expect(result).toBeDefined();
    expect(result.latitudeDegrees).toEqual(71.6341);
    expect(result.longitudeDegrees).toEqual(128.8667);
    expect(result.depthKm).toEqual(0);
    expect(result.elevationKm).toEqual(0.04);
  });

  test('getStationLocation returns undefined if station is not found', () => {
    const result = IanMapUtils.getStationLocation('ASAaoeuR', [ASAR_NO_CHANNEL_GROUPS as any]);
    expect(result).not.toBeDefined();
  });

  describe('mapIanEntitiesToEntityComponent', () => {
    const mockEntity: Partial<Cesium.Entity> = {};
    const mockLeftClick = jest.fn();
    const mockDoubleClick = jest.fn();
    const mockOnMount = jest.fn();
    const mockRightClick = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('uses a right click handler', () => {
      const rightClickEntities: JSX.Element[] = IanMapUtils.mapIanEntitiesToEntityComponent(
        [mockEntity as any],
        null,
        mockRightClick
      );

      expect(rightClickEntities[0].props.onRightClick).toBeDefined();
      expect(rightClickEntities[0].props.onDoubleClick).toBeUndefined();
      expect(rightClickEntities[0].props.onMount).toBeUndefined();

      rightClickEntities[0].props.onRightClick();

      expect(mockRightClick).toHaveBeenCalled();
      expect(mockLeftClick).toHaveBeenCalledTimes(0);
      expect(mockDoubleClick).toHaveBeenCalledTimes(0);
      expect(mockOnMount).toHaveBeenCalledTimes(0);
    });

    it('uses a double click handler', () => {
      const doubleClickEntities: JSX.Element[] = IanMapUtils.mapIanEntitiesToEntityComponent(
        [mockEntity as any],
        null,
        null,
        mockDoubleClick
      );

      expect(doubleClickEntities[0].props.onDoubleClick).toBeDefined();
      expect(doubleClickEntities[0].props.onRightClick).toBeUndefined();
      expect(doubleClickEntities[0].props.onMount).toBeUndefined();

      doubleClickEntities[0].props.onDoubleClick();

      expect(mockDoubleClick).toHaveBeenCalled();
      expect(mockRightClick).toHaveBeenCalledTimes(0);
      expect(mockLeftClick).toHaveBeenCalledTimes(0);
      expect(mockOnMount).toHaveBeenCalledTimes(0);
    });

    it('uses a on mount function', () => {
      const mountEntities: JSX.Element[] = IanMapUtils.mapIanEntitiesToEntityComponent(
        [mockEntity as any],
        null,
        null,
        null,
        null,
        null,
        mockOnMount
      );

      expect(mountEntities[0].props.onMount).toBeDefined();
      expect(mountEntities[0].props.onRightClick).toBeUndefined();
      expect(mountEntities[0].props.onDoubleClick).toBeUndefined();
      expect(mountEntities[0].props.onDoubleClick).toBeUndefined();

      mountEntities[0].props.onMount();

      expect(mockOnMount).toHaveBeenCalled();
      expect(mockRightClick).toHaveBeenCalledTimes(0);
      expect(mockLeftClick).toHaveBeenCalledTimes(0);
      expect(mockDoubleClick).toHaveBeenCalledTimes(0);
    });
  });

  describe('selectEntitiesInBox', () => {
    const stationProperties = {
      coordinates: {
        _value: {
          latitude: 100,
          longitude: 100,
          elevation: 100
        }
      },
      statype: {
        _value: 'SEISMIC_3_COMPONENT'
      },
      type: 'Station'
    };

    const selectedEntityStation = {
      name: 'AAK',
      properties: { getValue: jest.fn(() => stationProperties) },
      position: {
        getValue: jest.fn(() => {
          return { x: 1, y: 2, z: 3 };
        })
      }
    };

    const stationsDataSource = {
      name: 'Stations',
      entities: {
        values: [selectedEntityStation]
      }
    };

    const rectangle = {
      north: 2,
      south: 3,
      west: 1,
      east: 2
    };

    const viewer = {
      dataSources: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getByName: jest.fn(name => {
          return [stationsDataSource];
        })
      },
      scene: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pickPosition: jest.fn(endPosition => {
          return 'myPosition';
        }),
        requestRender: jest.fn()
      }
    };

    test('is defined', () => {
      expect(IanMapUtils.selectEntitiesInBox(rectangle as any, viewer as any)).toBeDefined();
    });

    test('match snapshot', () => {
      expect(IanMapUtils.selectEntitiesInBox(rectangle as any, viewer as any)).toMatchSnapshot();
    });
  });

  describe('getUniquelyLocatedChannelGroups', () => {
    it('given empty array, returns empty array', () => {
      const channelGroups = IanMapUtils.getUniquelyLocatedChannelGroups(
        [] as any,
        { latitudeDegrees: 1234, longitudeDegrees: 1234 } as any
      );
      expect(channelGroups).toBeDefined();
      expect(channelGroups).toHaveLength(0);
      expect(channelGroups).toEqual([]);
    });
    it('given undefined, returns empty array', () => {
      const channelGroups = IanMapUtils.getUniquelyLocatedChannelGroups(undefined, {
        latitudeDegrees: 1234,
        longitudeDegrees: 1234
      } as any);
      expect(channelGroups).toBeDefined();
      expect(channelGroups).toHaveLength(0);
      expect(channelGroups).toEqual([]);
    });
    it('returns all channel groups when no duplicates exist', () => {
      const channelGroups = IanMapUtils.getUniquelyLocatedChannelGroups(
        ChannelGroupsNoDupes as any,
        { latitudeDegrees: 1234, longitudeDegrees: 1234 } as any
      );
      expect(channelGroups).toHaveLength(ChannelGroupsNoDupes.length);
      expect(channelGroups).toEqual(ChannelGroupsNoDupes);
    });
    it('ignores ChannelGroup when it matches the station location', () => {
      const channelGroups = IanMapUtils.getUniquelyLocatedChannelGroups(
        ChannelGroupSingle as any,
        ChannelGroupSingle[0].location as any
      );
      expect(channelGroups).toHaveLength(0);
      expect(channelGroups).toEqual([]);
    });

    it('returns only unique channel groups when duplicates exist ignoring elevation', () => {
      const channelGroups = IanMapUtils.getUniquelyLocatedChannelGroups(
        ChannelGroupsDupes as any,
        { latitudeDegrees: 1234, longitudeDegrees: 1234 } as any
      );
      expect(channelGroups).toHaveLength(1); // only one unique (lat, long) pair
      expect(channelGroups).not.toHaveLength(ChannelGroupsDupes.length);
    });
  });

  test('applyStationMultiSelectionLogic', () => {
    let stations = ['AAK', 'ARCES'];
    let id = 'AAK';
    expect(IanMapUtils.applyStationMultiSelectionLogic(jest.fn, stations, id)).toMatchSnapshot();

    stations = ['ARCES'];
    id = 'ARCES';
    expect(IanMapUtils.applyStationMultiSelectionLogic(jest.fn, stations, id)).toMatchSnapshot();
  });

  test('applyEventMultiSelectionLogic', () => {
    let events = ['mockId1', 'mockId2'];
    let id = 'mockId1';
    expect(IanMapUtils.applyEventMultiSelectionLogic(jest.fn, events, id)).toMatchSnapshot();

    events = ['mockId2'];
    id = 'mockId2';
    expect(IanMapUtils.applyEventMultiSelectionLogic(jest.fn, events, id)).toMatchSnapshot();
  });

  test('applySdMultiSelectionLogic', () => {
    let sdIds = ['mockId1', 'mockId2'];
    let id = 'mockId1';
    expect(IanMapUtils.applySdMultiSelectionLogic(jest.fn, sdIds, id)).toMatchSnapshot();

    sdIds = ['mockId2'];
    id = 'mockId2';
    expect(IanMapUtils.applySdMultiSelectionLogic(jest.fn, sdIds, id)).toMatchSnapshot();
  });

  describe('intervalIsSelected', () => {
    test('returns false with no interval', () => {
      expect(IanMapUtils.intervalIsSelected(null)).toBe(false);
      expect(IanMapUtils.intervalIsSelected(undefined)).toBe(false);
      expect(IanMapUtils.intervalIsSelected('' as any)).toBe(false);
      expect(IanMapUtils.intervalIsSelected({} as any)).toBe(false);
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: 345, endTimeSecs: undefined })).toBe(
        false
      );
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: undefined, endTimeSecs: 1 })).toBe(
        false
      );
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: undefined, endTimeSecs: 0 })).toBe(
        false
      );
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: 0, endTimeSecs: undefined })).toBe(
        false
      );
      expect(IanMapUtils.intervalIsSelected({ endTimeSecs: 34556 } as any)).toBe(false);
      expect(
        IanMapUtils.intervalIsSelected({ startTimeSecs: undefined, endTimeSecs: undefined })
      ).toBe(false);

      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: null, endTimeSecs: null })).toBe(
        false
      );
    });

    test('returns true with interval', () => {
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: 0, endTimeSecs: 1 })).toBe(true);
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: -20, endTimeSecs: 0 })).toBe(true);
      expect(IanMapUtils.intervalIsSelected({ startTimeSecs: 340, endTimeSecs: 14325 })).toBe(true);
    });
  });

  test('WaveformDisplay is Open returns true when provided array contains waveform display', () => {
    const waveformOpen = { waveform: GLDisplayState.OPEN };
    const waveformClosed = {
      waveform: GLDisplayState.CLOSED
    };
    const waveformNotInMap = { waeoui: GLDisplayState.OPEN };

    expect(IanMapUtils.waveformDisplayIsOpen({})).toEqual(false);
    expect(IanMapUtils.waveformDisplayIsOpen(undefined)).toEqual(false);
    expect(IanMapUtils.waveformDisplayIsOpen(null)).toEqual(false);

    expect(IanMapUtils.waveformDisplayIsOpen(waveformOpen)).toEqual(true);
    expect(IanMapUtils.waveformDisplayIsOpen(waveformClosed)).toEqual(false);
    expect(IanMapUtils.waveformDisplayIsOpen(waveformNotInMap)).toEqual(false);
  });

  it('builds a map event correctly', () => {
    const eventStatuses: Record<string, EventStatus> = {};
    eventStatuses[eventData.id] = {
      stageId: { name: openIntervalName },
      eventId: eventData.id,
      eventStatusInfo: eventStatusInfoInProgress
    };

    expect(
      IanMapUtils.buildMapEventSource(
        {
          event: eventData,
          eventStatus: eventStatuses[eventData.id],
          eventIsOpen: false,
          eventInConflict: false,
          eventIsActionTarget: false
        },
        eventData.eventHypotheses[0].locationSolutions[0],
        openIntervalName,
        { startTimeSecs: 0, endTimeSecs: 100 },
        null
      )
    ).toMatchSnapshot();
  });

  test('sdOnMouseEnterHandler should match snapshot', () => {
    const mockMovement = {
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 0, y: 0 }
    } as any;
    const mockTarget = {
      properties: { isSelected: false, polyline: { width: 1, material: { color: '#FFFFFF' } } }
    } as any;
    expect(IanMapUtils.sdOnMouseEnterHandler(mockMovement, mockTarget)).toMatchSnapshot();
  });

  test('sdOnMouseLeaveHandler should match snapshot', () => {
    const mockMovement = {
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 0, y: 0 }
    } as any;
    const mockTarget = {
      properties: { isSelected: false, polyline: { width: 1, material: { color: '#FFFFFF' } } }
    } as any;
    expect(IanMapUtils.sdOnMouseLeaveHandler(mockMovement, mockTarget)).toMatchSnapshot();
  });
});
