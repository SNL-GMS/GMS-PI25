import { qcSegment, qcSegment2, qcSegment3 } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { QcSegmentSelectionMenu } from '~analyst-ui/components/waveform/quality-control/qc-segment-selection-menu';
import { QcSegmentSelectionMenuTable } from '~analyst-ui/components/waveform/quality-control/qc-segment-selection-menu/qc-segment-selection-menu-table';
import type {
  QcSegmentContextMenuOpenFunc,
  QcSegmentSelectionMenuOpenFunc
} from '~analyst-ui/components/waveform/quality-control/types';

describe('QC Segment Selection Menu', () => {
  it('exists', () => {
    expect(QcSegmentSelectionMenu).toBeDefined();
    expect(QcSegmentSelectionMenuTable).toBeDefined();
  });

  it('renders the Qc Segment Selection Menu Table', () => {
    // Empty
    let container = render(
      <Provider store={getStore()}>
        <QcSegmentSelectionMenuTable qcSegments={[]} qcSegmentEditContextMenuCb={jest.fn} />
      </Provider>
    );

    expect(container.container).toMatchSnapshot();

    // One QC segment
    container = render(
      <Provider store={getStore()}>
        <QcSegmentSelectionMenuTable
          qcSegments={[qcSegment]}
          qcSegmentEditContextMenuCb={jest.fn}
        />
      </Provider>
    );

    expect(container.container).toMatchSnapshot();

    // 3 QC segments
    container = render(
      <Provider store={getStore()}>
        <QcSegmentSelectionMenuTable
          qcSegments={[qcSegment, qcSegment2, qcSegment3]}
          qcSegmentEditContextMenuCb={jest.fn}
        />
      </Provider>
    );

    expect(container.container).toMatchSnapshot();
  });

  it('renders the Qc Segment Selection Menu', async () => {
    let qcContextMenu: QcSegmentSelectionMenuOpenFunc;
    const qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc = jest.fn;

    const Display = function Display() {
      return (
        <QcSegmentSelectionMenu
          getOpenCallback={callback => {
            qcContextMenu = callback;
          }}
          qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        />
      );
    };

    const container = render(<Display />);
    expect(container.container).toMatchSnapshot();

    const mouseEvent = ({
      nativeEvent: new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 100
      }),
      preventDefault: jest.fn(),
      shiftKey: true,
      stopPropagation: jest.fn()
    } as unknown) as React.MouseEvent;

    // render with undefined
    await waitFor(() => {
      qcContextMenu(mouseEvent, undefined);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with empty content
    await waitFor(() => {
      qcContextMenu(mouseEvent, undefined);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with one QC Segment
    await waitFor(() => {
      qcContextMenu(mouseEvent, [qcSegment, qcSegment2, qcSegment3]);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
