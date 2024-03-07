/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IconNames } from '@blueprintjs/icons';
import { render } from '@testing-library/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';
import { act } from 'react-dom/test-utils';

import type { PopoverTypes } from '../../../../src/ts/components/ui-widgets/popover-button';
import { PopoverButton } from '../../../../src/ts/components/ui-widgets/popover-button';
import { waitForComponentToPaint } from '../../../util/test-util';

const props: PopoverTypes.PopoverProps = {
  label: 'my label',
  popupContent: (
    <div>
      <p>Pop Up Content</p>
    </div>
  ),
  renderAsMenuItem: false,
  disabled: false,
  tooltip: 'my tool tip',
  cyData: 'my-test-popover-button',
  widthPx: 150,
  onlyShowIcon: false,
  icon: IconNames.AIRPLANE,
  onPopoverDismissed: jest.fn(),
  onClick: jest.fn()
};

describe('PopoverButton', () => {
  it('to be defined', () => {
    expect(PopoverButton).toBeDefined();
  });

  it('PopoverButton renders', () => {
    const { container } = render(<PopoverButton {...props} />);
    expect(container).toMatchSnapshot();
  });

  it('PopoverButton props and state', async () => {
    const mockOnPopoverDismissed = jest.fn();
    const mockOnClick = jest.fn();

    const wrapper = Enzyme.mount(
      <PopoverButton
        label="my label"
        popupContent={
          <div>
            <p>Pop Up Content</p>
          </div>
        }
        renderAsMenuItem={false}
        disabled={false}
        tooltip="my tool tip"
        cyData="my-test-popover-button"
        widthPx={150}
        onlyShowIcon={false}
        icon={IconNames.AIRPLANE}
        onPopoverDismissed={mockOnPopoverDismissed}
        onClick={mockOnClick}
      />
    );

    const pbProps = wrapper.props() as PopoverTypes.PopoverProps;
    expect(pbProps.disabled).toBe(false);

    const instance: PopoverButton = wrapper.instance() as PopoverButton;
    const spy2 = jest.spyOn(instance, 'togglePopover');
    expect(spy2).toHaveBeenCalledTimes(0);

    // confirm button not expanded
    expect(instance.state.isExpanded).toBe(false);

    // expand button
    await act(() => {
      instance.togglePopover();
    });

    expect(spy2).toHaveBeenCalledTimes(1);
    expect(instance.state.isExpanded).toBe(true);

    await act(() => {
      instance.togglePopover();
    });
    expect(spy2).toHaveBeenCalledTimes(2);
    expect(instance.state.isExpanded).toBe(false);

    expect(mockOnClick).toHaveBeenCalledTimes(0);
    expect(mockOnPopoverDismissed).toHaveBeenCalledTimes(0);
  });

  it('PopoverButton props and state menu item', async () => {
    const mockOnPopoverDismissed = jest.fn();
    const mockOnClick = jest.fn();

    const wrapper = Enzyme.mount(
      <PopoverButton
        label="my label"
        popupContent={
          <div>
            <p>Pop Up Content</p>
          </div>
        }
        renderAsMenuItem
        disabled={false}
        tooltip="my tool tip"
        cyData="my-test-popover-button"
        widthPx={150}
        onlyShowIcon={false}
        icon={IconNames.AIRPLANE}
        onPopoverDismissed={mockOnPopoverDismissed}
        onClick={mockOnClick}
      />
    );

    expect(wrapper).toMatchSnapshot();

    const pbProps = wrapper.props() as PopoverTypes.PopoverProps;
    expect(pbProps.disabled).toBe(false);

    const instance: PopoverButton = wrapper.instance() as PopoverButton;
    expect(instance.state.isExpanded).toBe(false);

    const spy2 = jest.spyOn(instance, 'togglePopover');
    expect(spy2).toHaveBeenCalledTimes(0);

    await act(() => {
      instance.togglePopover();
    });

    expect(spy2).toHaveBeenCalledTimes(1);
    expect(wrapper.state('isExpanded')).toBe(true);

    await act(() => {
      instance.togglePopover();
    });
    expect(spy2).toHaveBeenCalledTimes(2);
    expect(wrapper.state('isExpanded')).toBe(false);

    // eslint-disable-next-line
    wrapper.find('.bp4-menu-item').simulate('click');

    expect(mockOnClick).toHaveBeenCalledTimes(0);
    expect(mockOnPopoverDismissed).toHaveBeenCalledTimes(0);
  });

  it('PopoverButton item clicks', async () => {
    jest.setTimeout(10000);
    const mockOnPopoverDismissed = jest.fn();
    const mockOnClick = jest.fn();

    const wrapper4 = Enzyme.mount(
      <PopoverButton
        label="my label"
        popupContent={
          <div>
            <p>Pop Up Content</p>
          </div>
        }
        renderAsMenuItem={false}
        disabled={false}
        tooltip="my tool tip"
        cyData="my-test-popover-button"
        widthPx={150}
        onlyShowIcon
        icon={IconNames.AIRPLANE}
        onPopoverDismissed={mockOnPopoverDismissed}
        onClick={mockOnClick}
      />
    );

    await waitForComponentToPaint(wrapper4);

    const lastPB = wrapper4.find('.toolbar-button--icon-only').first();
    const lastPBIcon = wrapper4.find('icon');
    expect(lastPB).toBeDefined();
    expect(lastPBIcon).toBeDefined();
    lastPB.simulate('click');
    await waitForComponentToPaint(wrapper4);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
