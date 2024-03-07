import type { CommonTypes } from '@gms/common-model';
import { qcSegment, workflowDefinitionId } from '@gms/common-model/__tests__/__data__';
import { getStore, waveformSlice } from '@gms/ui-state';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  QcSegmentCreationContextMenu,
  QcSegmentCreationContextMenuContent
} from '~analyst-ui/components/waveform/quality-control/qc-segment-edit-menu/qc-segment-creation-context-menu';
import type { QcSegmentCreationMenuProps } from '~analyst-ui/components/waveform/quality-control/types';

jest.mock('@gms/ui-state/lib/app/hooks/workflow-hooks', () => {
  const actual = jest.requireActual('@gms/ui-state/lib/app/hooks/workflow-hooks');
  return {
    ...actual,
    useStageId: () => workflowDefinitionId
  };
});

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useViewableInterval: () => [{ startTimeSecs: 0, endTimeSecs: 1000 }, jest.fn()]
  };
});

const viewableInterval: CommonTypes.TimeRange = {
  startTimeSecs: 1636503404,
  endTimeSecs: 1636506404
};

const clearBrushStroke = jest.fn();

const menuProps: QcSegmentCreationMenuProps = {
  startTime: 1636503405,
  endTime: 1636506403,
  selectedStationIds: [qcSegment.channel.name],
  onClose: clearBrushStroke
};

describe('QC Segment Creation Context Menu', () => {
  it('exists', () => {
    expect(QcSegmentCreationContextMenu).toBeDefined();
    expect(QcSegmentCreationContextMenuContent).toBeDefined();
  });

  it('renders QcSegmentCreationContextMenuContent', () => {
    const store = getStore();

    store.dispatch(waveformSlice.actions.setViewableInterval(viewableInterval));
    const container = render(
      <Provider store={store}>
        <QcSegmentCreationContextMenuContent menuProps={menuProps} />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();
  });

  it('renders QcSegmentCreationMenuContextMenuContent', () => {
    const store = getStore();
    store.dispatch(waveformSlice.actions.setViewableInterval(viewableInterval));

    const result = render(
      <Provider store={store}>
        <QcSegmentCreationContextMenuContent menuProps={menuProps} />
      </Provider>
    );
    expect(result).toMatchSnapshot();
  });
});
