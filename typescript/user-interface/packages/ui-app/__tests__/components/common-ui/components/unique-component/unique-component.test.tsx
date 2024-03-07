/* eslint-disable @typescript-eslint/unbound-method */
import '@testing-library/jest-dom';

import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { getStore } from '@gms/ui-state';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { UniqueComponent } from '~common-ui/components/unique-component';

import { glContainer } from '../../../analyst-ui/components/workflow/gl-container';

describe('Unique Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('will not allow two unique components to be open at once', async () => {
    const store = getStore();
    render(
      <Provider store={store}>
        <UniqueComponent name={IanDisplays.WAVEFORM} glContainer={glContainer}>
          <div>CHILD 1</div>
        </UniqueComponent>
        <UniqueComponent name={IanDisplays.WAVEFORM} glContainer={glContainer}>
          <div>CHILD 2</div>
        </UniqueComponent>
      </Provider>
    );
    expect(screen.queryByText('CHILD 1')).not.toBeInTheDocument();
    expect(screen.getByText('This display is already open in another tab.')).toBeInTheDocument();
    expect(screen.getByText('CHILD 2')).toBeInTheDocument();

    await waitFor(() => {
      expect(glContainer.close).toHaveBeenCalled();
    });
  });

  it('will display children in the case where two different components are rendered', async () => {
    const store = getStore();
    render(
      <Provider store={store}>
        <UniqueComponent name={IanDisplays.WAVEFORM} glContainer={glContainer}>
          <div>CHILD 1</div>
        </UniqueComponent>
        <UniqueComponent name={IanDisplays.WORKFLOW} glContainer={glContainer}>
          <div>CHILD 2</div>
        </UniqueComponent>
      </Provider>
    );
    expect(screen.getByText('CHILD 1')).toBeInTheDocument();
    expect(screen.getByText('CHILD 2')).toBeInTheDocument();

    await waitFor(() => {
      expect(glContainer.close).not.toHaveBeenCalled();
    });
  });

  it('will display children in the case only one component is rendered', async () => {
    const store = getStore();
    render(
      <Provider store={store}>
        <UniqueComponent name={IanDisplays.WAVEFORM} glContainer={glContainer}>
          <div>CHILD</div>
        </UniqueComponent>
      </Provider>
    );
    expect(screen.getByText('CHILD')).toBeInTheDocument();

    await waitFor(() => {
      expect(glContainer.close).not.toHaveBeenCalled();
    });
  });
});
