/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable dot-notation */
import {
  linearFilter,
  linearFilterDefinition,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import { createAction } from '@reduxjs/toolkit';
import cloneDeep from 'lodash/cloneDeep';
import type * as Redux from 'redux';

import {
  addChannelSegments,
  addDefaultFilterDefinitionsByUsageForChannelSegments,
  addDesignedFilterDefinitions,
  addEvents,
  addSignalDetections,
  clearChannelSegmentsAndHistory,
  clearEventsAndHistory,
  clearSignalDetectionsAndHistory
} from '../../../../src/ts/app';
import { dataInitialState, dataSlice } from '../../../../src/ts/app/api/data/data-slice';
import type * as Types from '../../../../src/ts/app/api/data/types';
import { createChannelSegmentString } from '../../../../src/ts/workers/waveform-worker/util/channel-segment-util';
import { unfilteredClaimCheckUiChannelSegment } from '../../../__data__';

const clearWaveformsFunc = jest.fn();

jest.mock('../../../../src/ts/workers/api/clear-waveforms', () => {
  return {
    clearWaveforms: async (): Promise<void> => {
      await clearWaveformsFunc();
    }
  };
});

describe('data slice', () => {
  it('defined', () => {
    expect(dataInitialState).toBeDefined();
    expect(dataSlice).toBeDefined();
  });

  it('should return the initial state', () => {
    expect(dataSlice.reducer(undefined, createAction(undefined))).toMatchSnapshot();
    expect(dataSlice.reducer(undefined, createAction(''))).toMatchSnapshot();
    expect(dataSlice.reducer(dataInitialState, createAction(undefined))).toMatchSnapshot();
    expect(dataSlice.reducer(dataInitialState, createAction(''))).toMatchSnapshot();
  });

  it('should add signal detections', () => {
    const action: Redux.AnyAction = {
      type: addSignalDetections.type,
      payload: [signalDetectionsData[0]]
    };
    const signalDetections = {};
    // eslint-disable-next-line prefer-destructuring
    signalDetections[signalDetectionsData[0].id] = signalDetectionsData[0];
    const expectedState: Types.DataState = {
      ...dataInitialState,
      signalDetections
    };
    expect(dataSlice.reducer(dataInitialState, action)).toEqual(expectedState);
  });

  it('should clear signal detections', () => {
    const action: Redux.AnyAction = {
      type: clearSignalDetectionsAndHistory.type
    };
    const expectedState: Types.DataState = {
      ...dataInitialState
    };
    expect(dataSlice.reducer(dataInitialState, action)).toEqual(expectedState);
  });

  it('should add channel segments', () => {
    const data = [
      {
        name: 'sample',
        startTimeSecs: 400,
        endTimeSecs: 500,
        channelSegments: [unfilteredClaimCheckUiChannelSegment]
      }
    ];

    const action: Redux.AnyAction = {
      type: addChannelSegments.type,
      payload: data
    };
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();
  });

  it('should clear channel segments', () => {
    clearWaveformsFunc.mockClear();
    const action: Redux.AnyAction = {
      type: clearChannelSegmentsAndHistory.type
    };
    const expectedState: Types.DataState = {
      ...dataInitialState
    };
    expect(dataSlice.reducer(dataInitialState, action)).toEqual(expectedState);
    expect(clearWaveformsFunc).toHaveBeenCalledTimes(1);
  });

  it('should add events', () => {
    const data: any[] = [
      {
        id: 'eventID'
      }
    ];

    const action: Redux.AnyAction = {
      type: addEvents.type,
      payload: data
    };
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();
  });

  it('should not add filter definitions', () => {
    const data: FilterDefinition = cloneDeep(linearFilterDefinition);

    const action: Redux.AnyAction = {
      type: addDesignedFilterDefinitions.type,
      payload: [data]
    };
    // not designed
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();

    action.payload = [
      {
        ...data,
        filterDescription: {
          ...data.filterDescription,
          parameters: {
            groupDelaySec: 1,
            sampleRateHz: 40,
            sampleRateToleranceHz: 20
          }
        }
      }
    ];
    // not designed
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();

    action.payload = [
      {
        ...data,
        name: undefined,
        filterDescription: {
          ...data.filterDescription,
          parameters: {
            aCoefficients: [4.4, 5.5, 6.6],
            bCoefficients: [1.1, 2.2, 3.3],
            groupDelaySec: 1,
            sampleRateHz: 40,
            sampleRateToleranceHz: 20
          }
        }
      }
    ];
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();
  });

  it('should add filter definitions', () => {
    const data: FilterDefinition = cloneDeep(linearFilterDefinition);

    const action: Redux.AnyAction = {
      type: addDesignedFilterDefinitions.type,
      payload: [
        {
          ...data,
          filterDescription: {
            ...data.filterDescription,
            parameters: {
              aCoefficients: [4.4, 5.5, 6.6],
              bCoefficients: [1.1, 2.2, 3.3],
              groupDelaySec: 1,
              sampleRateHz: 40,
              sampleRateToleranceHz: 20
            }
          }
        }
      ]
    };

    // designed with no id
    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();
  });

  it('should add default filter definitions by usage for channel segments', () => {
    const data: FilterDefinition = cloneDeep(linearFilter.filterDefinition);

    const action: Redux.AnyAction = {
      type: addDefaultFilterDefinitionsByUsageForChannelSegments.type,
      payload: [
        {
          channelSegmentDescriptorId: createChannelSegmentString(
            unfilteredClaimCheckUiChannelSegment.channelSegmentDescriptor
          ),
          filterDefinitionByFilterDefinitionUsage: {
            DETECTION: data,
            FK: data,
            ONSET: data
          }
        }
      ]
    };

    expect(dataSlice.reducer(dataInitialState, action)).toMatchSnapshot();
  });

  it('should clear events', () => {
    const action: Redux.AnyAction = {
      type: clearEventsAndHistory.type
    };
    const expectedState: Types.DataState = {
      ...dataInitialState
    };
    expect(dataSlice.reducer(dataInitialState, action)).toEqual(expectedState);
  });

  it('should clear everything', () => {
    clearWaveformsFunc.mockClear();
    const action: Redux.AnyAction = {
      type: dataSlice.actions.clearAll.type
    };

    const expectedState: Types.DataState = {
      ...dataInitialState
    };
    expect(dataSlice.reducer(dataInitialState, action)).toEqual(expectedState);
    expect(clearWaveformsFunc).toHaveBeenCalledTimes(1);
  });
});
