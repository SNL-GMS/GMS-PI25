/* eslint-disable react/jsx-no-constructed-context-values */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { CommonTypes } from '@gms/common-model';
import { WorkflowTypes } from '@gms/common-model';
import {
  eventData,
  processingAnalystConfigurationData,
  qcSegment,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { UNFILTERED } from '@gms/common-model/lib/filter';
import { toEpochSeconds } from '@gms/common-util';
import {
  AnalystWorkspaceOperations,
  AnalystWorkspaceTypes,
  defaultTheme,
  getStore,
  setOpenInterval
} from '@gms/ui-state';
import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessConfiguration } from '@gms/weavess-core';
import { LineStyle } from '@gms/weavess-core/lib/types';
import { render } from '@testing-library/react';
import { mount } from 'enzyme';
import flatMap from 'lodash/flatMap';
import * as React from 'react';
import { Provider } from 'react-redux';

import type { SignalDetectionContextMenusCallbacks } from '~analyst-ui/common/menus/signal-detection-context-menus';
import type { QcContextMenuCallbacks } from '~analyst-ui/components/waveform/quality-control';

import { AmplitudeScalingOptions } from '../../../../../../src/ts/components/analyst-ui/components/waveform/components/waveform-controls/scaling-options';
import { WeavessContext } from '../../../../../../src/ts/components/analyst-ui/components/waveform/weavess-context';
import { WeavessDisplay } from '../../../../../../src/ts/components/analyst-ui/components/waveform/weavess-display';
import type { WeavessDisplayProps } from '../../../../../../src/ts/components/analyst-ui/components/waveform/weavess-display/types';
import type { WeavessContextMenuCallbacks } from '../../../../../../src/ts/components/analyst-ui/components/waveform/weavess-display/weavess-display-context-menus';
import { systemConfig } from '../../../../../../src/ts/components/analyst-ui/config/system-config';
import { BaseDisplayContext } from '../../../../../../src/ts/components/common-ui/components/base-display';

jest.mock('worker-rpc', () => ({
  RpcProvider: jest.fn().mockImplementation(() => {
    const mockRpc = jest.fn(async () => {
      return new Promise(resolve => {
        resolve([]);
      });
    });
    return { rpc: mockRpc };
  })
}));

jest.mock('@gms/ui-state', () => {
  const actualImport = jest.requireActual('@gms/ui-state');
  return {
    ...actualImport,
    getBoundaries: jest.fn(() => ({
      topMax: 100,
      bottomMax: -100,
      channelAvg: 0,
      offset: 100,
      channelSegmentId: 'TEST',
      samplesCount: 100
    }))
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

const configuration: WeavessTypes.Configuration = {
  ...WeavessConfiguration.defaultConfiguration,
  defaultChannel: {
    disableMeasureWindow: true,
    disableMaskModification: true
  },
  nonDefaultChannel: {
    disableMeasureWindow: true,
    disableMaskModification: false
  },
  hotKeys: {
    createSignalDetectionWithCurrentPhase:
      processingAnalystConfigurationData.keyboardShortcuts.clickEvents
        .createSignalDetectionWithCurrentPhase,
    createSignalDetectionWithDefaultPhase:
      processingAnalystConfigurationData.keyboardShortcuts.clickEvents
        .createSignalDetectionWithDefaultPhase
  }
};
const startTimeSecs = toEpochSeconds('2010-05-20T22:00:00.000Z');
const endTimeSecs = toEpochSeconds('2010-05-20T23:59:59.000Z');
const viewableInterval = {
  startTimeSecs,
  endTimeSecs
};

let updateMockSdIds;
const mockSetSelectedSdIds = jest.fn((selectedIds: string[]) => {
  updateMockSdIds(selectedIds);
});

// Add a mock function to set selectedStationIds for testing
let updateMockStationIds;
const mockSetSelectedStationIds = jest.fn((selectedIds: string[]) => {
  updateMockStationIds(selectedIds);
});

const mockAssociateSignalDetections = jest.fn();
const mockUnassociateSignalDetections = jest.fn();

const timeRange: CommonTypes.TimeRange = {
  startTimeSecs,
  endTimeSecs
};

const mockCreateSignalDetection = jest.fn(async () => Promise.resolve());
const openIntervalName = 'AL1';

describe('weavess display', () => {
  const weavessProps: WeavessDisplayProps = {
    openIntervalName,
    weavessProps: {
      viewableInterval,
      minimumOffset: 0,
      maximumOffset: 0,
      showMeasureWindow: false,
      stations: [],
      events: undefined,
      measureWindowSelection: {
        channel: undefined,
        endTimeSecs: undefined,
        isDefaultChannel: undefined,
        startTimeSecs: undefined,
        stationId: undefined,
        waveformAmplitudeScaleFactor: undefined
      } as WeavessTypes.MeasureWindowSelection,
      selections: { signalDetections: [], channels: [] },
      initialConfiguration: configuration,
      flex: false
    },
    defaultWaveformFilters: [],
    defaultStations: [],
    events: [eventData],
    signalDetections: [],
    measurementMode: {
      mode: AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT,
      entries: undefined
    } as AnalystWorkspaceTypes.MeasurementMode,
    currentPhase: 'PnP',
    defaultSignalDetectionPhase: 'P',
    setMeasurementModeEntries: AnalystWorkspaceOperations.setMeasurementModeEntries,
    analysisMode: undefined,
    createEvent: undefined,
    createQcMask: undefined,
    createSignalDetection: mockCreateSignalDetection,
    currentOpenEventId: eventData.id,
    currentTimeInterval: timeRange,
    rejectQcMask: jest.fn(),
    sdIdsToShowFk: [],
    selectedSdIds: [],
    signalDetectionActionTargets: [],
    selectedStationIds: [],
    updateQcMask: jest.fn(),
    updateSignalDetection: jest.fn(),
    glContainer: undefined,
    setSdIdsToShowFk: jest.fn(),
    setSelectedSdIds: mockSetSelectedSdIds,
    setSelectedStationIds: mockSetSelectedStationIds,
    amplitudeScaleOption: AmplitudeScalingOptions.FIXED,
    fixedScaleVal: 26,
    eventStatuses: {},
    uiTheme: defaultTheme,
    qcSegmentsByChannelName: {
      'AAK.AAK.BHZ': {
        id: qcSegment
      }
    },
    processingMask: undefined,
    maskVisibility: {},
    associateSignalDetections: mockAssociateSignalDetections,
    unassociateSignalDetections: mockUnassociateSignalDetections,
    phaseMenuVisibility: false,
    setPhaseMenuVisibility: jest.fn(),
    setClickedSdId: jest.fn(),
    setSignalDetectionActionTargets: jest.fn(),
    setViewportVisibleStations: jest.fn(),
    channelFilters: {}
  };

  const store = getStore();
  store.dispatch(
    setOpenInterval(timeRange, undefined, undefined, [], WorkflowTypes.AnalysisMode.SCAN) as any
  );

  let weavessRef: any = {
    waveformPanelRef: {
      stationComponentRefs: {
        values: () => [
          {
            props: { station: { name: 'AAK.BHZ' }, nonDefaultChannels: ['AAK.AAK.BHZ'] },
            state: {}
          },
          {
            props: { station: { name: 'AFI.BHZ', nonDefaultChannels: ['AFI.AFI.BHZ'] } },
            state: { expanded: true }
          }
        ]
      },
      getOrderedVisibleChannelNames: jest.fn(() => {
        return ['AAK.BHZ', 'AAK.AAK.BHZ', 'AFI.BHZ', 'AFI.AFI.BHZ'];
      }),
      getCurrentZoomInterval: jest.fn(() => ({ startTimeSecs: 0, endTimeSecs: 1000 }))
    },
    toggleMeasureWindowVisibility: jest.fn(),
    zoomToTimeWindow: jest.fn(),
    refresh: jest.fn()
  };
  const waveform = (
    <Provider store={store}>
      <BaseDisplayContext.Provider
        value={{
          glContainer: undefined,
          widthPx: 1920,
          heightPx: 1080
        }}
      >
        <WeavessContext.Provider
          value={{
            weavessRef,
            setWeavessRef: ref => {
              weavessRef = ref;
            }
          }}
        >
          <WeavessDisplay {...weavessProps} />
        </WeavessContext.Provider>
      </BaseDisplayContext.Provider>
    </Provider>
  );

  const { container } = render(waveform);
  const wrapper = mount(waveform);
  const weavessDisplayComponent: any = wrapper.find('WeavessDisplayComponent').instance();

  weavessDisplayComponent.weavessContextMenuCb = {
    qc: {
      processingMaskContextMenuCb: jest.fn(),
      qcSegmentEditContextMenuCb: jest.fn(),
      qcSegmentSelectionContextMenuCb: jest.fn(),
      qcSegmentsContextMenuCb: jest.fn(),
      qcSegmentCreationContextMenuCb: jest.fn()
    } as QcContextMenuCallbacks,
    sd: {
      phaseContextMenuCb: jest.fn(),
      signalDetectionContextMenuCb: jest.fn(),
      signalDetectionDetailsCb: jest.fn()
    } as SignalDetectionContextMenusCallbacks
  } as WeavessContextMenuCallbacks;

  const updateIds = (existingList: string[], ids: string[]): void => {
    // sync up the selected station id list in props
    if (existingList.length > 0) {
      existingList.splice(0, existingList.length);
    }
    ids.forEach(id => existingList.push(id));
  };

  // Replace now we have the weavessDisplayComponent ref
  updateMockStationIds = (ids: string[]): void => {
    updateIds(weavessDisplayComponent.props.selectedStationIds, ids);
  };
  updateMockSdIds = (ids: string[]): void => {
    updateIds(weavessDisplayComponent.props.selectedSdIds, ids);
  };

  beforeEach(() => {
    document.body.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'E',
        code: 'KeyE'
      })
    );
    document.body.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'Alt',
        code: 'AltLeft'
      })
    );
  });

  test('can mount waveform panel', () => {
    expect(container).toMatchSnapshot();
  });

  test('onChannelClick', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
      ctrlKey: false,
      metaKey: false,
      stopPropagation: jest.fn()
    };

    const channel: WeavessTypes.Channel = {
      id: 'AAK.BHZ',
      name: 'AAK.BHZ'
    };

    wrapper.setProps({
      defaultStations: [
        {
          name: 'AAK.BHZ',
          allRawChannels: [{ name: 'AAK.BHZ' }, { name: 'AAK.AAK.BHZ' }]
        }
      ]
    });

    weavessProps.defaultStations = [
      {
        name: 'AAK.BHZ',
        allRawChannels: [{ name: 'AAK.BHZ' }, { name: 'AAK.AAK.BHZ' }]
      } as any
    ];
    const waveformOnChannelClick = (
      <Provider store={store}>
        <BaseDisplayContext.Provider
          value={{
            glContainer: undefined,
            widthPx: 1920,
            heightPx: 1080
          }}
        >
          <WeavessContext.Provider
            value={{
              weavessRef,
              setWeavessRef: ref => {
                weavessRef = ref;
              }
            }}
          >
            <WeavessDisplay {...weavessProps} />
          </WeavessContext.Provider>
        </BaseDisplayContext.Provider>
      </Provider>
    );
    const onChannelClickWrapper = mount(waveformOnChannelClick);
    const wrapperInstance: any = onChannelClickWrapper.find('WeavessDisplayComponent').instance();

    const keyDownEventE = new KeyboardEvent('keydown', {
      key: 'E',
      code: 'KeyE'
    });
    const keyDownEventAlt = new KeyboardEvent('keydown', {
      key: 'E',
      code: 'KeyE',
      altKey: true
    });
    const keyDownEventShift = new KeyboardEvent('keydown', {
      key: 'E',
      code: 'KeyE',
      shiftKey: true
    });
    const keyDownEventAltShift = new KeyboardEvent('keydown', {
      key: 'E',
      code: 'KeyE',
      altKey: true,
      shiftKey: true
    });

    document.body.dispatchEvent(keyDownEventE);
    wrapperInstance.onChannelClick(mockEvent, channel, 100);
    expect(mockCreateSignalDetection).toHaveBeenCalledWith('AAK.BHZ', undefined, 100, 'PnP');
    jest.clearAllMocks();

    document.body.dispatchEvent(keyDownEventAlt);
    wrapperInstance.onChannelClick(mockEvent, channel, 100);
    expect(mockCreateSignalDetection).toHaveBeenCalledWith('AAK.BHZ', undefined, 100, 'P');
    jest.clearAllMocks();

    document.body.dispatchEvent(keyDownEventAltShift);
    wrapperInstance.onChannelClick(mockEvent, channel, 100);
    // TODO currently only logs to console, this should be updated with the function call when functionality is added
    expect(mockCreateSignalDetection).not.toHaveBeenCalledWith('AAK.BHZ', undefined, 100, 'PnP');
    jest.clearAllMocks();

    document.body.dispatchEvent(keyDownEventShift);
    wrapperInstance.onChannelClick(mockEvent, channel, 100);
    // TODO currently only logs to console, this should be updated with the function call when functionality is added
    expect(mockCreateSignalDetection).not.toHaveBeenCalledWith('AAK.BHZ', undefined, 100, 'P');
    jest.clearAllMocks();
  });

  test('split channel onChannelClick', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
      ctrlKey: false,
      metaKey: false,
      stopPropagation: jest.fn()
    };

    const channel: WeavessTypes.Channel = {
      id: 'AAK.BHZ',
      name: 'AAK.BHZ',
      splitChannelTime: 100,
      splitChannelPhase: 'PnP',
      waveform: {
        channelSegmentId: UNFILTERED,
        channelSegmentsRecord: {
          [UNFILTERED]: [
            {
              configuredInputName: 'TEST channelName id',
              channelName: 'TEST channelName',
              wfFilterId: UNFILTERED,
              isSelected: false,
              dataSegments: []
            }
          ]
        }
      }
    };

    wrapper.setProps({
      defaultStations: [
        {
          name: 'AAK.BHZ',
          allRawChannels: [{ name: 'AAK.BHZ' }, { name: 'AAK.AAK.BHZ' }]
        }
      ]
    });

    weavessProps.defaultStations = [
      {
        name: 'AAK.BHZ',
        allRawChannels: [{ name: 'AAK.BHZ' }, { name: 'AAK.AAK.BHZ' }]
      } as any
    ];
    const waveformOnChannelClick = (
      <Provider store={store}>
        <BaseDisplayContext.Provider
          value={{
            glContainer: undefined,
            widthPx: 1920,
            heightPx: 1080
          }}
        >
          <WeavessContext.Provider
            value={{
              weavessRef,
              setWeavessRef: ref => {
                weavessRef = ref;
              }
            }}
          >
            <WeavessDisplay {...weavessProps} />
          </WeavessContext.Provider>
        </BaseDisplayContext.Provider>
      </Provider>
    );
    const onChannelClickWrapper = mount(waveformOnChannelClick);
    const wrapperInstance: any = onChannelClickWrapper.find('WeavessDisplayComponent').instance();

    wrapperInstance.onChannelClick(mockEvent, channel, 100);
    expect(mockCreateSignalDetection).toHaveBeenCalledWith(
      'AAK.BHZ',
      'TEST channelName',
      100,
      'PnP'
    );
    jest.clearAllMocks();
  });

  test('can exercise mask clicks', () => {
    // Lets try and exercise somethings
    weavessDisplayComponent.props.defaultStations[0] = {
      name: 'AAK.BHZ',
      allRawChannels: [{ name: 'AAK.BHZ' }, { name: 'AAK.AAK.BHZ' }]
    };
    weavessDisplayComponent.props.defaultStations[1] = {
      name: 'AFI.BHZ',
      allRawChannels: [{ name: 'AFI.BHZ' }, { name: 'AFI.AFI.BHZ' }]
    };
    weavessDisplayComponent.onUpdateChannelMarker();
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      shiftKey: true,
      stopPropagation: jest.fn()
    };

    const qcSegmentSelected = flatMap(
      Object.values(weavessProps.qcSegmentsByChannelName).map(r => Object.values(r))
    )[0].id;

    expect(() =>
      weavessDisplayComponent.onMaskClick(mouseEvent, 'AAK.AAK.BHZ', [], false, false)
    ).not.toThrow();
    mouseEvent.shiftKey = false;
    expect(() =>
      weavessDisplayComponent.onMaskClick(mouseEvent, 'AAK.AAK.BHZ', [qcSegmentSelected], true)
    ).not.toThrow();
    expect(() =>
      weavessDisplayComponent.onMaskClick(
        mouseEvent,
        'AAK.AAK.BHZ',
        [qcSegmentSelected],
        false,
        true
      )
    ).not.toThrow();
    expect(() =>
      weavessDisplayComponent.onMaskClick(mouseEvent, 'AAK.AAK.BHZ', [qcSegmentSelected], true)
    ).not.toThrow();
    mouseEvent.shiftKey = true;
    expect(() =>
      weavessDisplayComponent.onMaskClick(mouseEvent, 'AAK.AAK.BHZ', [qcSegmentSelected], false)
    ).not.toThrow();

    expect(() => weavessDisplayComponent.clearSelectedChannels()).not.toThrow();
    expect(() => weavessDisplayComponent.refresh()).not.toThrow();
    expect(() => weavessDisplayComponent.setSelectedQcSegment(qcSegment)).not.toThrow();
  });

  test('can exercise channel label clicks', () => {
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      shiftKey: false
    };

    weavessDisplayComponent.onChannelLabelClick(mouseEvent, 'AAK.AAK.BHZ'); // Select
    expect(weavessDisplayComponent.props.selectedStationIds).toContain('AAK.AAK.BHZ');
    expect(weavessDisplayComponent.props.selectedStationIds).toHaveLength(1);
    weavessDisplayComponent.onChannelLabelClick(mouseEvent, 'AAK.AAK.BHZ'); // De-select
    expect(weavessDisplayComponent.props.selectedStationIds).toHaveLength(0);

    mouseEvent.shiftKey = true;
    weavessDisplayComponent.onChannelLabelClick(mouseEvent, 'AFI.BHZ'); // Range select
    expect(weavessDisplayComponent.props.selectedStationIds).toContain('AFI.BHZ');
    expect(weavessDisplayComponent.props.selectedStationIds).toHaveLength(3);
    // TODO this test is broken beyond this point with unexpected jest results and needs to be fixed
    // mouseEvent.shiftKey = false;
    // mouseEvent.ctrlKey = true;
    // mouseEvent.altKey = true;
    // weavessDisplayComponent.onChannelLabelClick(mouseEvent, 'AAK.BHZ');
    // expect(weavessDisplayComponent.props.selectedStationIds).toContain('AAK.BHZ');
    // expect(weavessDisplayComponent.props.selectedStationIds).toContain('AAK.AAK.BHZ');
    // expect(weavessDisplayComponent.props.selectedStationIds).toContain('AFI.BHZ');
    // expect(weavessDisplayComponent.props.selectedStationIds).toHaveLength(3);
  });
  test('click on signal detection for context menu', () => {
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      altKey: true,
      clientX: 100,
      clientY: 100
    };
    const sds = signalDetectionsData;
    expect(weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[0].id)).toBeUndefined();
    weavessDisplayComponent.props.signalDetections.push(sds[0]);
    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[0].id)
    ).not.toThrow();
  });

  test('click on signal detection for single select/deselect signal detections', () => {
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
      button: 0
    };
    const sds = signalDetectionsData;
    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[0].id)
    ).not.toThrow();
    expect(mockSetSelectedSdIds).toHaveBeenCalledTimes(1);
    expect(weavessDisplayComponent.props.selectedSdIds).toEqual([sds[0].id]);

    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[0].id)
    ).not.toThrow();
    expect(mockSetSelectedSdIds).toHaveBeenCalledTimes(2);
    expect(weavessDisplayComponent.props.selectedSdIds).toHaveLength(0);
  });

  test('click on signal detection for single multi select signal detections', () => {
    // clear counts and selectedSdIds
    mockSetSelectedSdIds.mockClear();
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      metaKey: true,
      clientX: 100,
      clientY: 100,
      button: 0
    };
    const sds = signalDetectionsData;
    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[0].id)
    ).not.toThrow();
    expect(mockSetSelectedSdIds).toHaveBeenCalledTimes(1);
    expect(weavessDisplayComponent.props.selectedSdIds).toEqual([sds[0].id]);
    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[1].id)
    ).not.toThrow();
    expect(mockSetSelectedSdIds).toHaveBeenCalledTimes(2);
    expect(weavessDisplayComponent.props.selectedSdIds).toEqual([sds[0].id, sds[1].id]);

    // Remove sds[1].id from the list
    expect(() =>
      weavessDisplayComponent.onSignalDetectionClick(mouseEvent, sds[1].id)
    ).not.toThrow();
    expect(mockSetSelectedSdIds).toHaveBeenCalledTimes(3);
    expect(weavessDisplayComponent.props.selectedSdIds).toEqual([sds[0].id]);
  });

  test('double-click on signal detection to unassociate', () => {
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
      button: 0
    };
    const newProps = {
      ...weavessProps,
      signalDetections: signalDetectionsData,
      currentOpenEventId: eventData.id,
      selectedSdIds: [signalDetectionsData[0].id],
      events: [eventData]
    };

    weavessDisplayComponent.props = newProps;
    expect(() =>
      weavessDisplayComponent.onSignalDetectionDoubleClick(mouseEvent, signalDetectionsData[0].id)
    ).not.toThrow();
    expect(mockUnassociateSignalDetections).toHaveBeenCalledTimes(1);
  });

  test('double-click on signal detection to associate', () => {
    const mouseEvent: Partial<React.MouseEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
      button: 0
    };
    const newProps = {
      ...weavessProps,
      signalDetections: signalDetectionsData,
      currentOpenEventId: eventData.id,
      selectedSdIds: [signalDetectionsData[1].id],
      events: [eventData]
    };

    weavessDisplayComponent.props = newProps;
    expect(() =>
      weavessDisplayComponent.onSignalDetectionDoubleClick(mouseEvent, signalDetectionsData[1].id)
    ).not.toThrow();
    expect(mockAssociateSignalDetections).toHaveBeenCalledTimes(1);
  });

  test('bounds generator for fixed', async () => {
    let boundsGenerator: (
      id: string,
      channelSegment?: WeavessTypes.ChannelSegment
    ) => Promise<WeavessTypes.ChannelSegmentBoundaries>;
    boundsGenerator = weavessDisplayComponent.getBoundariesCalculator(
      AmplitudeScalingOptions.FIXED,
      weavessProps.fixedScaleVal,
      undefined,
      -1,
      -1
    );
    let bounds = await boundsGenerator('TEST');
    weavessDisplayComponent.onSetAmplitude('TEST', bounds, false);
    expect(bounds.channelSegmentId).toBe('TEST');
    expect(bounds.offset).toBe(weavessProps.fixedScaleVal);
    expect(bounds.bottomMax).toBe(-weavessProps.fixedScaleVal);
    expect(bounds.topMax).toBe(weavessProps.fixedScaleVal);
    expect(bounds.channelAvg).toBe(0);

    boundsGenerator = weavessDisplayComponent.getBoundariesCalculator(
      AmplitudeScalingOptions.FIXED,
      'this should trigger scale freezing',
      undefined,
      -1,
      1
    );
    bounds = await boundsGenerator('TEST');
    weavessDisplayComponent.onSetAmplitude('TEST', bounds, false);
    expect(bounds.channelSegmentId).toBe('TEST');
    expect(bounds.offset).toBe(weavessProps.fixedScaleVal);
    expect(bounds.bottomMax).toBe(-weavessProps.fixedScaleVal);
    expect(bounds.topMax).toBe(weavessProps.fixedScaleVal);
    expect(bounds.channelAvg).toBe(0);
  });

  test('bounds generator for scale all channels to this one', async () => {
    // Test bounds with scale amplitude for all channels set to use max set to 129
    let boundsGenerator = weavessDisplayComponent.getBoundariesCalculator(
      AmplitudeScalingOptions.FIXED,
      weavessProps.fixedScaleVal,
      'AAk',
      -110,
      129
    );
    let bounds = await boundsGenerator('TEST');
    expect(bounds.channelSegmentId).toBe('TEST');
    expect(bounds.offset).toBe(129);
    expect(bounds.bottomMax).toBe(-110);
    expect(bounds.topMax).toBe(129);
    expect(bounds.channelAvg).toBe(0);

    // Test bounds with scale amplitude for all channels set to use min set to -110
    boundsGenerator = weavessDisplayComponent.getBoundariesCalculator(
      AmplitudeScalingOptions.FIXED,
      weavessProps.fixedScaleVal,
      'AAk',
      -110,
      110
    );
    bounds = await boundsGenerator('TEST');
    expect(bounds.channelSegmentId).toBe('TEST');
    expect(bounds.offset).toBe(110);
    expect(bounds.bottomMax).toBe(-110);
    expect(bounds.topMax).toBe(110);
    expect(bounds.channelAvg).toBe(0);
  });

  test('bounds generator for auto', async () => {
    // Test bounds with scale amplitude for auto
    const boundsGenerator = weavessDisplayComponent.getBoundariesCalculator(
      AmplitudeScalingOptions.AUTO,
      weavessProps.fixedScaleVal,
      undefined,
      -1,
      1
    );
    const bounds = await boundsGenerator('TEST');
    expect(bounds.channelSegmentId).toBe('TEST');
    expect(bounds.offset).toBe(100);
    expect(bounds.bottomMax).toBe(-100);
    expect(bounds.topMax).toBe(100);
    expect(bounds.channelAvg).toBe(0);
  });

  test('getWindowedBoundaries gets bounds from the worker cache', async () => {
    const bounds = await weavessDisplayComponent.getWindowedBoundaries('TEST', {
      channelName: 'TEST',
      wfFilterId: 'unfiltered',
      isSelected: false,
      dataSegments: [1, 2, 3, 4]
    });
    expect(bounds).toMatchSnapshot();
    expect(bounds.topMax).toBe(100);
    expect(bounds.bottomMax).toBe(-100);
    expect(bounds.channelSegmentId).toBe('TEST');
  });

  test('getWindowedBoundaries gets bounds from the worker cache when given a time range', async () => {
    const bounds = await weavessDisplayComponent.getWindowedBoundaries(
      'TEST',
      {
        channelName: 'TEST',
        wfFilterId: 'unfiltered',
        isSelected: false,
        dataSegments: [1, 2, 3, 4]
      },
      { startTimeSecs: 0, endTimeSecs: 1000 }
    );
    expect(bounds).toMatchSnapshot();
    expect(bounds.topMax).toBe(100);
    expect(bounds.bottomMax).toBe(-100);
    expect(bounds.channelSegmentId).toBe('TEST');
  });

  test('onUpdateChannelSelectionWindow', () => {
    const startMarker = {
      id: systemConfig.measurementMode.peakTroughSelection.id,
      color: 'red',
      lineStyle: LineStyle.SOLID,
      timeSecs: 0
    };
    const endMarker = {
      ...startMarker,
      timeSecs: 100
    };
    const selectionWindow = {
      id: systemConfig.measurementMode.peakTroughSelection.id,
      startMarker,
      endMarker,
      isMoveable: true,
      color: 'red'
    };
    expect(() =>
      weavessDisplayComponent.onUpdateChannelSelectionWindow(1, selectionWindow)
    ).toThrow();
  });

  test('onClickChannelSelectionWindow', () => {
    const startMarker = {
      id: systemConfig.measurementMode.peakTroughSelection.id,
      color: 'red',
      lineStyle: LineStyle.SOLID,
      timeSecs: 0
    };
    const endMarker = {
      ...startMarker,
      timeSecs: 100
    };
    const selectionWindow = {
      id: systemConfig.measurementMode.peakTroughSelection.id,
      startMarker,
      endMarker,
      isMoveable: true,
      color: 'red'
    };
    expect(() =>
      weavessDisplayComponent.onClickChannelSelectionWindow(1, selectionWindow, 100)
    ).toThrow();
  });

  test('onKeyPress', () => {
    // call escape
    let nativeKeyboardEvent: Partial<React.KeyboardEvent<HTMLDivElement>> = {
      key: 'Escape',
      altKey: false,
      shiftKey: false,
      ctrlKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        code: 'Escape'
      } as KeyboardEvent
    };
    const newState = {
      ...weavessDisplayComponent.state,
      selectedQcMask: 'foo'
    };
    weavessDisplayComponent.state = newState;
    expect(() => weavessDisplayComponent.onKeyPress(nativeKeyboardEvent, 1, 100)).not.toThrow();

    // call onAltKeyPress for all keys
    const keys = ['a', 'f', 'p', 'FOO'];
    keys.forEach(key => {
      nativeKeyboardEvent = {
        key,
        altKey: true,
        shiftKey: false,
        ctrlKey: true,
        preventDefault: jest.fn(),
        nativeEvent: {
          code: key
        } as KeyboardEvent
      };
      expect(() => weavessDisplayComponent.onKeyPress(nativeKeyboardEvent, 1, 100)).not.toThrow();
    });

    // Test branch logic when signal detections and event are set
    const newProps = {
      ...weavessProps,
      signalDetections: signalDetectionsData,
      currentOpenEventId: eventData.id,
      selectedSdIds: [signalDetectionsData[0].id],
      events: [eventData]
    };

    weavessDisplayComponent.props = newProps;
    keys.forEach(key => {
      nativeKeyboardEvent = {
        key,
        altKey: true,
        shiftKey: false,
        ctrlKey: true,
        preventDefault: jest.fn(),
        nativeEvent: {
          code: key
        } as KeyboardEvent
      };
      expect(() => weavessDisplayComponent.onKeyPress(nativeKeyboardEvent, 1, 100)).not.toThrow();
    });
  });

  test('can build mask selection windows', () => {
    const newState = {
      ...weavessDisplayComponent.state,
      qcSegmentModifyInterval: timeRange
    };
    weavessDisplayComponent.state = newState;
    expect(() => weavessDisplayComponent.addMaskSelectionWindows()).not.toThrow();
  });
});
