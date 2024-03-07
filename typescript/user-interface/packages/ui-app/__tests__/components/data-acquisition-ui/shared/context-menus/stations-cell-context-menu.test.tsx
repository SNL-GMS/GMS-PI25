import { render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import type {
  StationSohContextMenuItemProps,
  StationSohContextMenuProps
} from '../../../../../src/ts/components/data-acquisition-ui/shared/context-menus/stations-cell-context-menu';
import {
  acknowledgeOnClick,
  DisabledStationSohContextMenu,
  getStationAcknowledgementMenuText,
  StationSohContextMenu
} from '../../../../../src/ts/components/data-acquisition-ui/shared/context-menus/stations-cell-context-menu';

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

describe('Station cell context menu', () => {
  const stationSohContextMenuProps: StationSohContextMenuProps = {
    stationNames: ['test', 'test2'],
    acknowledgeCallback: jest.fn()
  };

  const stationSohContextMenu = render(
    // eslint-disable-next-line react/jsx-props-no-spreading
    <StationSohContextMenu {...stationSohContextMenuProps} />
  );
  const disabledStationSohContextMenu = render(
    // eslint-disable-next-line react/jsx-props-no-spreading
    <DisabledStationSohContextMenu {...stationSohContextMenuProps} />
  );

  it('StationSohContextMenu can be created', () => {
    expect(stationSohContextMenu.baseElement).toMatchSnapshot();
  });

  it('DisabledStationSohContextMenu can be created', () => {
    expect(disabledStationSohContextMenu.baseElement).toMatchSnapshot();
  });

  it('getStationAcknowledgementMenuText to work as expected', () => {
    const stationNames = ['test', 'test1'];
    const withComment = false;
    const expectedResult = 'Acknowledge 2 stations';
    const result = getStationAcknowledgementMenuText(stationNames, withComment);
    expect(result).toEqual(expectedResult);
  });

  it('acknowledgeOnClick to work as expected', async () => {
    const stationSohContextMenuItemProps: StationSohContextMenuItemProps = {
      ...stationSohContextMenuProps,
      disabled: false
    };
    const mouseEvent: any = {
      preventDefault: jest.fn(),
      clientX: 5,
      clientY: 5
    };
    // call acknowledge and wait for React lifecycle to finish so it can be deferred.
    await act(async () => {
      acknowledgeOnClick(mouseEvent, stationSohContextMenuItemProps);
      const waitDurationMs = 200;
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, waitDurationMs));
    });
    expect(mockShowContextMenu).toHaveBeenCalled();
  });
});
