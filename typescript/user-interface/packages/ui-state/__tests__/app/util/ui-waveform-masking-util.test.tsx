import {
  PD01Channel,
  processingMaskDefinition,
  processingMaskDefinitionsByPhaseByChannel1,
  qcSegment,
  qcSegment2Version,
  qcSegment3Version2,
  qcSegment4Version,
  qcSegment5Version,
  qcSegment6Version,
  qcSegmentVersion
} from '@gms/common-model/__tests__/__data__';
import { ProcessingOperation } from '@gms/common-model/lib/channel-segment/types';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { AppState } from '../../../src/ts/app/store';
import {
  createProcessingMasksFromQCSegmentVersions,
  useCreateProcessingMasks
} from '../../../src/ts/app/util/ui-waveform-masking-util';
import { unfilteredSamplesUiChannelSegment } from '../../__data__';
import { appState } from '../../test-util';

const MOCK_UUID = 123456789;

jest.mock('@gms/common-util', () => {
  const actual = jest.requireActual('@gms/common-util');
  return {
    ...actual,
    epochSecondsNow: () => 100,
    uuid4: () => MOCK_UUID
  };
});
const MOCK_TIME = 1606818240000;
global.Date.now = jest.fn(() => MOCK_TIME);

describe('ui waveform masking util', () => {
  describe('createProcessingMasksFromQCSegmentVersions', () => {
    const segmentVersions = [
      qcSegmentVersion,
      qcSegment2Version,
      qcSegment3Version2,
      qcSegment4Version,
      qcSegment5Version
    ];

    it('is defined', () => {
      expect(createProcessingMasksFromQCSegmentVersions).toBeDefined();
    });
    it('filters out segments that do not match the mask definition', () => {
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        segmentVersions,
        processingMaskDefinition
      );
      expect(processingMasks[0].maskedQcSegmentVersions).toEqual([
        qcSegment3Version2,
        qcSegment5Version
      ]);
    });
    it('groups segments based on the threshold and sets teh start and end time to the min and max', () => {
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        segmentVersions.concat(qcSegment6Version),
        processingMaskDefinition
      );

      expect(processingMasks[0].maskedQcSegmentVersions).toEqual([
        qcSegment3Version2,
        qcSegment5Version
      ]);
      expect(processingMasks[0].startTime).toEqual(qcSegment3Version2.startTime);
      expect(processingMasks[0].endTime).toEqual(qcSegment5Version.endTime);
      expect(processingMasks[1].maskedQcSegmentVersions).toEqual([qcSegment6Version]);
      expect(processingMasks[1].startTime).toEqual(qcSegment6Version.startTime);
      expect(processingMasks[1].endTime).toEqual(qcSegment6Version.endTime);
    });
    it('generates a new UUID for the processing mask', () => {
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        segmentVersions.concat(qcSegment6Version),
        processingMaskDefinition
      );

      expect(processingMasks[0].id).toEqual(MOCK_UUID);
    });
    it('sets the effective at to now', () => {
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        segmentVersions.concat(qcSegment6Version),
        processingMaskDefinition
      );

      expect(processingMasks[0].effectiveAt).toEqual(Date.now());
    });

    it('sets the processing operation to that of the mask definition', () => {
      const processingMasks = createProcessingMasksFromQCSegmentVersions(
        segmentVersions.concat(qcSegment6Version),
        processingMaskDefinition
      );

      expect(processingMasks[0].processingOperation).toEqual(
        processingMaskDefinition.processingOperation
      );
    });
  });

  describe('useCreateProcessingMasks', () => {
    it('creates processing masks', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);

      const store = mockStoreCreator({
        ...appState,
        data: {
          ...appState.data,
          channels: { ...appState.data.channels, raw: { [PD01Channel.name]: PD01Channel } },
          qcSegments: { [PD01Channel.name]: { [qcSegment.id]: qcSegment } },
          processingMaskDefinitions: {
            [PD01Channel.name]: [processingMaskDefinitionsByPhaseByChannel1]
          }
        }
      });

      const { result } = renderHook(() => useCreateProcessingMasks(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });
      const returnValue = await result.current(
        unfilteredSamplesUiChannelSegment,
        ProcessingOperation.EVENT_BEAM,
        'P'
      );
      expect(returnValue).toMatchSnapshot();
    });
  });
});
