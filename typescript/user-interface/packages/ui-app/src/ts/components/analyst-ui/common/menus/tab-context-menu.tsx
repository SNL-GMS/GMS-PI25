import { Icon, Menu } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { MenuItem2 } from '@blueprintjs/popover2';
import { toDisplayTitle } from '@gms/common-model/lib/displays/types';
import { UI_BASE_PATH, UI_URL } from '@gms/common-util';
import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

let tabMutationObserver: MutationObserver;
export interface TabContextMenuProps {
  tabName: string;
}
/**
 * Tab Context Menu
 */
export function TabContextMenu(props: TabContextMenuProps) {
  const { tabName } = props;

  // Set up a callback so the imperative context menu can pass along the handler to open the menu
  const getOpenCallback = React.useCallback(
    (open: ImperativeContextMenuOpenFunc) => {
      // Read the golden layout title property to get the tab header
      const tab = document.querySelector(`[title="${toDisplayTitle(tabName)}"]`);

      const handleMutation = () => {
        // get the new tab reference
        const newTab = document.querySelector(`[title="${toDisplayTitle(tabName)}"]`);
        // readd the listener
        newTab.addEventListener('contextmenu', open);
        // Add a mouse down to reattached the observer due to a race condition
        newTab.addEventListener('mousedown', () => {
          const mousedownTab = document.querySelector(`[title="${toDisplayTitle(tabName)}"]`);
          tabMutationObserver.disconnect();
          tabMutationObserver = new MutationObserver(handleMutation);
          tabMutationObserver.observe(mousedownTab, { attributes: true });
        });
      };

      // Tab wont be found if the component is open in its own window
      if (tab) {
        tabMutationObserver = new MutationObserver(handleMutation);
        tab.addEventListener('contextmenu', open);
        tabMutationObserver.observe(tab, { attributes: true });
      }
    },
    [tabName]
  );

  return (
    <ImperativeContextMenu
      content={
        <Menu className="test-menu">
          <MenuItem2
            text={`Open ${toDisplayTitle(tabName)} in new tab`}
            onClick={() => window.open(`${UI_URL}${UI_BASE_PATH}/#/${tabName}`)}
            labelElement={<Icon icon={IconNames.OPEN_APPLICATION} />}
          />
        </Menu>
      }
      getOpenCallback={getOpenCallback}
    />
  );
}
