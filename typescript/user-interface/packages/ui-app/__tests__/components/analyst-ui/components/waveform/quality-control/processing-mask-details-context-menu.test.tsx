import { pd01ProcessingMask, qcSegment } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  ProcessingMaskDetailsContextMenu,
  ProcessingMaskDetailsContextMenuContent
} from '~analyst-ui/components/waveform/quality-control';
import type { ProcessingMaskMenuOpenFunc } from '~analyst-ui/components/waveform/quality-control/types';

describe('QC Segment Edit Context Menu', () => {
  it('exists', () => {
    expect(ProcessingMaskDetailsContextMenu).toBeDefined();
    expect(ProcessingMaskDetailsContextMenuContent).toBeDefined();
  });

  it('renders ProcessingMaskDetailsContextMenuContent', () => {
    // Empty content
    let container = render(
      <ProcessingMaskDetailsContextMenuContent
        processingMask={undefined}
        qcSegments={[]}
        qcSegmentEditContextMenuCb={jest.fn()}
      />
    );
    expect(container.container).toMatchSnapshot();

    // Processing Mask
    container = render(
      <Provider store={getStore()}>
        <ProcessingMaskDetailsContextMenuContent
          processingMask={pd01ProcessingMask}
          qcSegments={[]}
          qcSegmentEditContextMenuCb={jest.fn()}
        />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();
  });

  it('renders QcSegmentContextMenu', async () => {
    let qcContextMenu: ProcessingMaskMenuOpenFunc;

    const Display = function Display() {
      return (
        <ProcessingMaskDetailsContextMenu
          getOpenCallback={callback => {
            qcContextMenu = callback;
          }}
          qcSegmentEditContextMenuCb={jest.fn()}
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

    // render with a processing mask
    await waitFor(() => {
      qcContextMenu(mouseEvent, { processingMask: pd01ProcessingMask, allSegments: [qcSegment] });
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
