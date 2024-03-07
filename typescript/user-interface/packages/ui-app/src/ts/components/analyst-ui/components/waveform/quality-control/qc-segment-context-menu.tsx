import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import { useGetProcessingAnalystConfigurationQuery } from '@gms/ui-state';
import React from 'react';

import { formatHotkeyString } from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import type {
  ProcessingMaskMenuOpenFunc,
  QcSegmentContextMenuOpenFunc,
  QcSegmentMenuProps,
  QcSegmentsContextMenuGetOpenCallbackFunc,
  QcSegmentSelectionMenuOpenFunc
} from './types';

export const QcSegmentContextMenuContent = React.memo(function QcSegmentContextMenuContent(props: {
  menuProps: QcSegmentMenuProps;
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentSelectionMenuOpenFunc;
  processingMaskContextMenuCb: ProcessingMaskMenuOpenFunc;
}): JSX.Element {
  const {
    menuProps,
    qcSegmentEditContextMenuCb,
    qcSegmentSelectionContextMenuCb,
    processingMaskContextMenuCb
  } = props;

  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const hotkeys =
    processingAnalystConfiguration.data.keyboardShortcuts.clickEvents.viewQcSegmentDetails.combos;

  if (menuProps.qcSegments?.length > 0 || menuProps.processingMask) {
    const qcSegmentText =
      menuProps.qcSegments?.length === 1 ? 'Open QC segment details' : 'Select QC segment';
    const labelElement = formatHotkeyString(hotkeys[0]);

    const qcOnClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      if (menuProps.qcSegments?.length === 1) {
        qcSegmentEditContextMenuCb(event, menuProps.qcSegments[0]);
      } else {
        qcSegmentSelectionContextMenuCb(event, menuProps.qcSegments);
      }
    };
    const pmOnClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      processingMaskContextMenuCb(event, menuProps);
    };
    return (
      <Menu>
        {menuProps.qcSegments ? (
          <MenuItem2
            title={qcSegmentText}
            text={qcSegmentText}
            labelElement={labelElement}
            onClick={qcOnClick}
          />
        ) : undefined}
        {menuProps.processingMask ? (
          <MenuItem2
            title="Open processing mask details"
            text="Open processing mask details"
            onClick={pmOnClick}
          />
        ) : undefined}
      </Menu>
    );
  }
  return undefined;
});

/**
 * Displays the QC Segment Context Menu.
 *
 * @params props @see {@link QcSegmentOpenFunc}
 */
export const QcSegmentContextMenu = React.memo(function QcSegmentContextMenu(props: {
  getOpenCallback: QcSegmentsContextMenuGetOpenCallbackFunc;
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentSelectionMenuOpenFunc;
  processingMaskContextMenuCb: ProcessingMaskMenuOpenFunc;
}): JSX.Element {
  const {
    getOpenCallback,
    qcSegmentEditContextMenuCb,
    qcSegmentSelectionContextMenuCb,
    processingMaskContextMenuCb
  } = props;

  const content = React.useCallback(
    (menuProps: QcSegmentMenuProps) => (
      <QcSegmentContextMenuContent
        menuProps={menuProps}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        qcSegmentSelectionContextMenuCb={qcSegmentSelectionContextMenuCb}
        processingMaskContextMenuCb={processingMaskContextMenuCb}
      />
    ),
    [qcSegmentEditContextMenuCb, qcSegmentSelectionContextMenuCb, processingMaskContextMenuCb]
  );

  return (
    <ImperativeContextMenu<QcSegmentMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
