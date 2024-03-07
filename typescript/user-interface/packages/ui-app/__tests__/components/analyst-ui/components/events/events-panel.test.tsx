import { getStore } from '@gms/ui-state';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { EventsPanel } from '../../../../../src/ts/components/analyst-ui/components/events/events-panel';
import { BaseDisplay } from '../../../../../src/ts/components/common-ui/components/base-display';
import { glContainer } from '../workflow/gl-container';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const MOCK_TIME = 1606818240000;
global.Date.now = jest.fn(() => MOCK_TIME);

window.ResizeObserver = jest.fn(() => {
  return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() };
});

const globalAny: any = global;
globalAny.ResizeObserver = window.ResizeObserver;
globalAny.DOMRect = jest.fn(() => ({}));

describe('Event Panel', () => {
  const storeDefault = getStore();

  it('is exported', () => {
    expect(EventsPanel).toBeDefined();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <Provider store={storeDefault}>
        <BaseDisplay glContainer={glContainer}>
          <EventsPanel />
        </BaseDisplay>
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });
});
