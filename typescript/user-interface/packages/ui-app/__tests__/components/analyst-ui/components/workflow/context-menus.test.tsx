/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { InteractiveAnalysisStageInterval } from '@gms/common-model/lib/workflow/types';
import { getStore } from '@gms/ui-state';
import { setAppAuthenticationStatus } from '@gms/ui-state/lib/app/state/operations';
import { render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';

import type { IntervalContextMenuProps } from '../../../../../src/ts/components/analyst-ui/components/workflow/context-menus';
import { IntervalContextMenu } from '../../../../../src/ts/components/analyst-ui/components/workflow/context-menus';
import * as WorkflowDataTypes from './workflow-data-types';

const store = getStore();
store.dispatch(
  setAppAuthenticationStatus({
    authenticated: true,
    authenticationCheckComplete: true,
    failedToConnect: false,
    userName: 'john'
  })
);

const props: IntervalContextMenuProps = {
  interval: WorkflowDataTypes.activityInterval,
  allActivitiesOpenForSelectedInterval: false,
  isSelectedInterval: false,
  closeCallback: null,
  openCallback: null
};

describe('Activity Interval Context Menu', () => {
  it('is exported', () => {
    expect(IntervalContextMenu).toBeDefined();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <Provider store={store}>
        <IntervalContextMenu
          interval={WorkflowDataTypes.activityInterval}
          allActivitiesOpenForSelectedInterval
          isSelectedInterval
          closeCallback={null}
          openCallback={null}
        />
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });

  it('Interval context menu shallow renders', () => {
    const { container } = render(
      <Provider store={store}>
        <IntervalContextMenu {...props} />{' '}
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });

  it('Interval context menu shallow renders for active analyst', () => {
    const { container } = render(
      <Provider store={store}>
        <IntervalContextMenu
          {...props}
          interval={{
            ...WorkflowDataTypes.activityInterval,
            activeAnalysts: [...WorkflowDataTypes.activityInterval.activeAnalysts, 'john']
          }}
        />{' '}
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });

  it('Interval context menu shallow renders interactive analysis stage interval for active analyst', () => {
    const interactiveAnalysisStageInterval: InteractiveAnalysisStageInterval = {
      ...WorkflowDataTypes.interactiveAnalysisStageInterval,
      activityIntervals: [
        {
          ...WorkflowDataTypes.activityInterval,
          activeAnalysts: [...WorkflowDataTypes.activityInterval.activeAnalysts, 'john']
        }
      ]
    };

    const { container } = render(
      <Provider store={store}>
        <IntervalContextMenu {...props} interval={interactiveAnalysisStageInterval} />{' '}
      </Provider>
    );
    expect(container).toMatchSnapshot();
  });

  it('handle buttons clicks for open disabled', () => {
    const callback = jest.fn();
    const callback2 = jest.fn();
    const component = Enzyme.mount(
      <Provider store={store}>
        <IntervalContextMenu
          interval={WorkflowDataTypes.activityInterval}
          allActivitiesOpenForSelectedInterval={false}
          isSelectedInterval
          openCallback={callback}
          closeCallback={callback2}
        />
      </Provider>
    );

    component.update();
    const openActivityMenuItem = component.find('.menu-item-open-interval').first();
    const openActivityMenuItem2 = component.find('.menu-item-open-interval').last();
    openActivityMenuItem2.simulate('click');

    const closeActivityMenuItem = component.find('.menu-item-close-interval').first();
    const closeActivityMenuItem2 = component.find('.menu-item-close-interval').last();
    closeActivityMenuItem2.simulate('click');
    expect(callback).toHaveBeenCalledTimes(0);
    expect(openActivityMenuItem).toBeDefined();
    expect(openActivityMenuItem2).toBeDefined();

    expect(callback2).toHaveBeenCalledTimes(1);
    expect(closeActivityMenuItem).toBeDefined();
    expect(closeActivityMenuItem2).toBeDefined();
  });
});

it('handle buttons clicks for open enabled', () => {
  const callback = jest.fn();
  const callback2 = jest.fn();
  const component = Enzyme.mount(
    <Provider store={store}>
      <IntervalContextMenu
        interval={WorkflowDataTypes.activityInterval}
        allActivitiesOpenForSelectedInterval={false}
        isSelectedInterval={false}
        openCallback={callback}
        closeCallback={callback2}
      />
    </Provider>
  );

  component.update();
  const openActivityMenuItem = component.find('.menu-item-open-interval').first();
  const openActivityMenuItem2 = component.find('.menu-item-open-interval').last();
  openActivityMenuItem2.simulate('click');

  const closeActivityMenuItem = component.find('.menu-item-close-interval').first();
  const closeActivityMenuItem2 = component.find('.menu-item-close-interval').last();
  closeActivityMenuItem2.simulate('click');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(openActivityMenuItem).toBeDefined();
  expect(openActivityMenuItem2).toBeDefined();

  expect(callback2).toHaveBeenCalledTimes(0);
  expect(closeActivityMenuItem).toBeDefined();
  expect(closeActivityMenuItem2).toBeDefined();
});
