/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';

import { Classes } from '@blueprintjs/core';
import { fireEvent, render } from '@testing-library/react';
import * as React from 'react';

import { TimePickerDeprecated } from '../../../../src/ts/components/ui-widgets/time-picker';
import type * as TimePickerTypes from '../../../../src/ts/components/ui-widgets/time-picker/types';

const MOCK_TIME = 1611153271425;
Date.now = jest.fn(() => MOCK_TIME);
Date.constructor = jest.fn(() => new Date(MOCK_TIME));

const initialDate = new Date(Date.now());

const setHold = jest.fn();
const onMaybeDate = jest.fn();

const props: TimePickerTypes.TimePickerDeprecatedProps = {
  date: initialDate,
  datePickerEnabled: true,
  shortFormat: false,
  hasHold: false,
  onMaybeDate,
  setHold,
  onEnter: jest.fn()
};

const props2: TimePickerTypes.TimePickerDeprecatedProps = {
  date: initialDate,
  datePickerEnabled: true,
  shortFormat: true,
  hasHold: false,
  onMaybeDate: jest.fn(),
  setHold: jest.fn(),
  onEnter: jest.fn()
};

describe('Time Picker Deprecated', () => {
  it('to be defined', () => {
    expect(TimePickerDeprecated).toBeDefined();
  });

  it('renders', () => {
    const { container } = render(<TimePickerDeprecated {...props} />);
    expect(container).toMatchSnapshot();
  });

  it('renders with short format', () => {
    const { container } = render(<TimePickerDeprecated {...props2} />);
    expect(container).toMatchSnapshot();
  });

  it('opens the calendar popover', () => {
    const { container } = render(<TimePickerDeprecated {...props} />);

    expect(container.getElementsByClassName('time-picker')).toHaveLength(1);
    expect(container.getElementsByClassName('time-picker__date-picker')).toHaveLength(0);

    // expect(container).toMatchInlineSnapshot('1');

    // date picker button exists
    expect(
      container.getElementsByClassName(`${Classes.BUTTON} time-picker__date-picker-button`)
    ).toHaveLength(1);

    // click button
    fireEvent(
      container.getElementsByClassName(`${Classes.BUTTON} time-picker__date-picker-button`)[0],
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      })
    );

    // Picker popover exists
    expect(container.getElementsByClassName('time-picker__date-picker')).toHaveLength(1);

    expect(container).toMatchSnapshot();
  });

  it('shows invalid if junk data is entered and valid if a date is entered', () => {
    const { container } = render(<TimePickerDeprecated {...props} />);

    // Not invalid at the start
    expect(container.getElementsByClassName('time-picker__input')).toHaveLength(1);
    expect(container.getElementsByClassName('time-picker__input--invalid')).toHaveLength(0);

    // Enter a non-date
    fireEvent.change(container.getElementsByClassName('time-picker__input')[0], {
      target: { value: 'foobar' }
    });

    // Is now invalid
    expect(container.getElementsByClassName('time-picker__input')).toHaveLength(0);
    expect(container.getElementsByClassName('time-picker__input--invalid')).toHaveLength(1);

    // Callbacks are called
    expect(setHold).toHaveBeenCalledWith(true);
    expect(onMaybeDate).toHaveBeenCalledWith(undefined);

    // Clear mocks for next test
    setHold.mockClear();
    onMaybeDate.mockClear();

    // Enter a valid date
    fireEvent.change(container.getElementsByClassName('time-picker__input--invalid')[0], {
      target: { value: '1970-01-01T00:00:00.000' }
    });

    // Callbacks are called
    expect(setHold).toHaveBeenCalledWith(false);
    expect(onMaybeDate).toHaveBeenCalledWith(new Date(0));
  });

  it('shows invalid if isExternallyInvalid is true', () => {
    const externalFlagProps: TimePickerTypes.TimePickerDeprecatedProps = {
      ...props,
      isExternallyInvalid: true
    };

    const { container } = render(<TimePickerDeprecated {...externalFlagProps} />);

    expect(container.getElementsByClassName('time-picker__input')).toHaveLength(0);
    expect(container.getElementsByClassName('time-picker__input--invalid')).toHaveLength(1);
  });
});
