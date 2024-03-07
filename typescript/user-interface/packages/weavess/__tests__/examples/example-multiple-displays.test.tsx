import { render } from '@testing-library/react';
import React from 'react';

import { MultipleDisplaysExample } from '../../src/ts/examples/example-multiple-displays';
import { initialConfiguration } from '../__data__/test-util-data';

jest.mock('../../src/ts/components/waveform-display/configuration', () => {
  const actual = jest.requireActual('../../src/ts/components/waveform-display/configuration');
  return {
    ...actual,
    memoizedGetConfiguration: jest.fn(() => {
      return initialConfiguration;
    })
  };
});

window.ResizeObserver = jest.fn(() => {
  return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() };
});
const globalAny: any = global;
globalAny.ResizeObserver = window.ResizeObserver;
globalAny.DOMRect = jest.fn(() => ({}));

// set up window alert and open so we don't see errors
(window as any).alert = jest.fn();
(window as any).open = jest.fn();

it('renders a component', () => {
  const { container } = render(<MultipleDisplaysExample />);
  expect(container).toMatchSnapshot();
});
