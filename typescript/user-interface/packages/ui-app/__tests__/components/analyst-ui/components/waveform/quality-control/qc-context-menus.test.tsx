import { qcSegment } from '@gms/common-model/__tests__/__data__';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

import type { QcContextMenuCallbacks } from '~analyst-ui/components/waveform/quality-control/qc-context-menus';
import { QcContextMenus } from '~analyst-ui/components/waveform/quality-control/qc-context-menus';

describe('QC Context Menus', () => {
  it('exists', () => {
    expect(QcContextMenus).toBeDefined();
  });

  it('renders QcContextMenus', async () => {
    let qcContextMenu: QcContextMenuCallbacks;

    const Display = function Display() {
      return (
        <QcContextMenus
          getOpenCallback={callback => {
            qcContextMenu = callback;
          }}
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

    await waitFor(() => {
      qcContextMenu.qcSegmentsContextMenuCb(mouseEvent, {
        qcSegments: [qcSegment],
        allSegments: [qcSegment]
      });
      qcContextMenu.qcSegmentEditContextMenuCb(mouseEvent, qcSegment);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
