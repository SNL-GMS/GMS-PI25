import { UserProfileTypes } from '@gms/common-model';
import { asar, linearFilter } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { act, render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import type { FkConfigurationDialogProps } from '~analyst-ui/components/azimuth-slowness/components/fk-display/fk-configuration-popover/fk-configuration-dialog';
import { FkConfigurationDialog } from '~analyst-ui/components/azimuth-slowness/components/fk-display/fk-configuration-popover/fk-configuration-dialog';

import { newConfiguration } from '../../../../../../__data__/azimuth-slowness';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();
const mockUserProfile = {
  userId: '1',
  defaultAnalystLayoutName: 'default',
  defaultSohLayoutName: 'default',
  audibleNotifications: [],
  currentTheme: 'GMS Dark Theme',
  workspaceLayouts: [
    {
      name: 'default',
      layoutConfiguration: 'test',
      supportedUserInterfaceModes: [UserProfileTypes.UserMode.IAN]
    }
  ]
};
jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useGetUserProfileQuery: jest.fn(() => {
      return { data: mockUserProfile };
    }),
    useSelectedFilterList: jest.fn().mockReturnValue({
      name: 'fk-configuration-dialog-test',
      defaultFilterIndex: 0,
      filters: [linearFilter]
    })
  };
});

const fkConfigurationDialogProps: FkConfigurationDialogProps = {
  station: asar,
  isOpen: true,
  fkConfiguration: newConfiguration,
  presets: {
    window: ['Lead: 1, Dur: 4', 'Lead: 1, Dur: 6', 'Lead: 1, Dur: 9', 'Lead: 1, Dur: 11'],
    frequencyBand: ['0.5 - 2 Hz', '1 - 2.5 Hz', '1.5 - 3 Hz', '2 - 4 Hz', '3 - 6 Hz']
  },
  setIsOpen: jest.fn(),
  onSubmit: jest.fn()
};

it('FKConfigurationDialog renders & matches snapshot', async () => {
  let results;
  await act(() => {
    results = render(
      <Provider store={getStore()}>
        <div
          style={{
            border: `1px solid #111`,
            resize: 'both',
            overflow: 'auto',
            height: '700px',
            width: '1000px'
          }}
        >
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <FkConfigurationDialog {...fkConfigurationDialogProps} />
        </div>
      </Provider>
    );
  });
  expect(results.container).toMatchSnapshot();
});
