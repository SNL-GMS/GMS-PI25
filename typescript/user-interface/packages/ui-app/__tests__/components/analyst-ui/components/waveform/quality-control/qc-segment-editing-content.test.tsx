import { WorkflowTypes } from '@gms/common-model';
import { qcSegment, qcSegment4, workflowDefinitionId } from '@gms/common-model/__tests__/__data__';
import { getStore, setOpenInterval } from '@gms/ui-state';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { generateSegmentHistoryTableRows } from '~analyst-ui/components/waveform/quality-control/qc-segment-edit-menu/qc-segment-editing-content/all-versions';
import { QCSegmentEditingContent } from '~analyst-ui/components/waveform/quality-control/qc-segment-edit-menu/qc-segment-editing-content/qc-segment-editing-content';

jest.mock('@gms/ui-state/src/ts/app/hooks/workflow-hooks.ts', () => {
  const actual = jest.requireActual('@gms/ui-state/src/ts/app/hooks/workflow-hooks.ts');
  return {
    ...actual,
    useStageId: () => workflowDefinitionId
  };
});
jest.mock('@gms/ui-state/src/ts/app/hooks/user-session-hooks.ts', () => {
  const actual = jest.requireActual('@gms/ui-state/src/ts/app/hooks/user-session-hooks.ts');
  return {
    ...actual,
    useUsername: () => 'Test User'
  };
});

describe('QC editing dialog', () => {
  const store = getStore();
  store.dispatch(
    setOpenInterval(
      {
        startTimeSecs: 0,
        endTimeSecs: 100
      },
      {
        name: 'Station Group',
        effectiveAt: 0,
        description: ''
      },
      'Al1',
      ['Event Review'],
      WorkflowTypes.AnalysisMode.SCAN
    ) as any
  );
  it('exists', () => {
    expect(QCSegmentEditingContent).toBeDefined();
  });

  it('can generate table rows', () => {
    const expectedResult = [
      {
        author: 'User 1',
        category: 'Analyst Defined',
        channelName: ['PDAR.PD01.SHZ'],
        effectiveAt: 0,
        endTime: 100,
        'first-in-table': true,
        id: '0',
        rationale: '',
        rejected: 'False',
        stage: 'Unknown',
        startTime: 0,
        type: 'Calibration'
      }
    ];
    const tableRows = generateSegmentHistoryTableRows(qcSegment.versionHistory);
    expect(tableRows).toMatchObject(expectedResult);
  });
  it('renders QCSegmentEditingDialog', () => {
    // non-reject process
    const container = render(
      <Provider store={getStore()}>
        <QCSegmentEditingContent qcSegment={qcSegment} />
      </Provider>
    );

    const rejectButton = screen.queryByText('Reject');

    expect(container.container).toMatchSnapshot();
    expect(screen.getAllByText('Save')).toHaveLength(1);
    expect(rejectButton).toBeNull();

    // rejected and expect save button to not be on the screen
    container.rerender(
      <Provider store={getStore()}>
        <QCSegmentEditingContent qcSegment={qcSegment4} />
      </Provider>
    );

    expect(container.container).toMatchSnapshot();
  });

  it('renders with clearBrushStroke prop', () => {
    const clearBrushStroke = jest.fn();
    const container = render(
      <Provider store={getStore()}>
        <QCSegmentEditingContent qcSegment={qcSegment} clearBrushStroke={clearBrushStroke} />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();
  });
});
