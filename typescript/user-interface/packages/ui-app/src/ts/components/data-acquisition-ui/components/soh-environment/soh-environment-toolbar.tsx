/* eslint-disable react/prop-types */
/* eslint-disable react/destructuring-assignment */
import type { DeprecatedToolbarTypes } from '@gms/ui-core-components';
import * as React from 'react';

import { messageConfig } from '~components/data-acquisition-ui/config/message-config';
import { SohToolbar } from '~components/data-acquisition-ui/shared/toolbars/soh-toolbar';

export interface EnvironmentToolbarProps {
  filterDropdown: DeprecatedToolbarTypes.CheckboxDropdownItem[];
  monitorStatusesToDisplay: Record<any, boolean>;
  setMonitorStatusesToDisplay(statuses: any): void;
}

export function EnvironmentToolbar(props: React.PropsWithChildren<EnvironmentToolbarProps>) {
  return (
    <>
      <SohToolbar
        setStatusesToDisplay={statuses => props.setMonitorStatusesToDisplay(statuses)}
        leftItems={props.filterDropdown}
        rightItems={[]}
        statusFilterText={messageConfig.labels.sohToolbar.filterMonitorsByStatus}
        statusesToDisplay={props.monitorStatusesToDisplay}
        toggleHighlight={() => {
          // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
        }}
        isDrillDown
      />
      {props.children}
    </>
  );
}
