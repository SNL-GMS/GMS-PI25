import type { SohTypes } from '@gms/common-model';
import { sohConfiguration } from '@gms/common-model/__tests__/__data__';
import { dataAcquisitionActions, getStore } from '@gms/ui-state';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { BaseDisplayContext } from '../../../../../src/ts/components/common-ui/components/base-display';
import type { SohToolbarProps } from '../../../../../src/ts/components/data-acquisition-ui/shared/toolbars/soh-toolbar';
import { SohToolbar } from '../../../../../src/ts/components/data-acquisition-ui/shared/toolbars/soh-toolbar';

// set up window alert and open so we don't see errors
(window as any).alert = jest.fn();
(window as any).open = jest.fn();

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useGetSohConfigurationQuery: jest.fn(() => ({
      data: sohConfiguration,
      isLoading: false
    }))
  };
});
describe('Soh toolbar component', () => {
  const statusesToDisplay: Record<SohTypes.SohStatusSummary, boolean> = {
    NONE: false,
    BAD: false,
    GOOD: true,
    MARGINAL: false
  };
  const item: any = {
    dropdownOptions: {},
    value: {},
    custom: false,
    onChange: jest.fn()
  };
  const sohToolbarProps: SohToolbarProps = {
    statusesToDisplay,
    widthPx: 1000,
    leftItems: [item],
    rightItems: [],
    statusFilterText: '',
    setStatusesToDisplay: jest.fn(),
    toggleHighlight: jest.fn(),
    statusFilterTooltip: 'test tooltip',
    isDrillDown: true
  };

  const store = getStore();
  store.dispatch(
    dataAcquisitionActions.setSohStatus({
      isStale: false,
      lastUpdated: 0,
      loading: false,
      stationAndStationGroupSoh: undefined
    })
  );

  const { container } = render(
    <Provider store={store}>
      <BaseDisplayContext.Provider
        // eslint-disable-next-line react/jsx-no-constructed-context-values
        value={{
          glContainer: { width: 150, height: 150 } as any,
          widthPx: 150,
          heightPx: 150
        }}
      >
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <SohToolbar {...sohToolbarProps} />
      </BaseDisplayContext.Provider>
    </Provider>
  );

  it('should be defined', () => {
    expect(SohToolbar).toBeDefined();
  });

  it('should match snapshot', () => {
    expect(container).toMatchSnapshot();
  });
});
