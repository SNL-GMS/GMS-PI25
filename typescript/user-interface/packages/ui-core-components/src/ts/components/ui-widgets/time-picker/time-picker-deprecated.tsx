/* eslint-disable prefer-regex-literals */
/* eslint-disable react/destructuring-assignment */
import { Button } from '@blueprintjs/core';
import { DatePicker, TimePrecision } from '@blueprintjs/datetime';
import { IconNames } from '@blueprintjs/icons';
import {
  convertUTCDateToDate,
  dateToString,
  ISO_DATE_TIME_FORMAT,
  ISO_DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  stringToDate
} from '@gms/common-util';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import type { TimePickerTypes } from '.';

/**
 * @deprecated
 * TimePicker component that lets you enter time in ISO format.
 */
class TimePickerDeprecated extends React.Component<
  TimePickerTypes.TimePickerDeprecatedProps,
  TimePickerTypes.TimePickerDeprecatedState
> {
  private timePickerRef: HTMLDivElement;

  /*
    A constructor
    */
  private constructor(props) {
    super(props);
    this.state = {
      isValid: true,
      showDatePicker: false,
      displayString: this.props.shortFormat
        ? dateToString(this.props.date, ISO_DATE_TIME_FORMAT)
        : dateToString(this.props.date, ISO_DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION),
      datePickerOnBottom: false
    };
  }

  public componentDidUpdate(
    prevProps: TimePickerTypes.TimePickerDeprecatedProps,
    prevState: TimePickerTypes.TimePickerDeprecatedState
  ): void {
    // We only check the date picker's position when it's created
    if (!prevState.showDatePicker && this.state.showDatePicker) {
      this.repositionDatePicker();
      document.body.addEventListener('click', this.hideDatePickerOnClick);
      document.body.addEventListener('keydown', this.hideDatePickerOnKeydown);
    }
    if (prevProps.date.valueOf() !== this.props.date.valueOf()) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        isValid: true,
        displayString: this.props.shortFormat
          ? dateToString(this.props.date, ISO_DATE_TIME_FORMAT)
          : dateToString(this.props.date, ISO_DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
      });
    }
  }

  /**
   * Hides the date picker in response to an escape key click
   *
   * @param e
   */
  private readonly hideDatePickerOnKeydown = (e: any): void => {
    if (e.code === 'Escape') {
      this.hideDatePickerOnClick(e);
    }
  };

  /**
   * Hides the date picker in response to a mouse click outside of the date picker
   *
   * @param e
   */
  private readonly hideDatePickerOnClick = (e: any): void => {
    let { parentElement } = e.target;
    let hideDatePicker = true;
    while (parentElement && hideDatePicker) {
      if (
        parentElement?.classList &&
        parentElement.classList.contains('time-picker__date-picker')
      ) {
        hideDatePicker = false;
      }
      parentElement = parentElement.parentElement;
    }

    if (hideDatePicker) {
      document.body.removeEventListener('click', this.hideDatePickerOnClick);
      document.body.removeEventListener('keydown', this.hideDatePickerOnKeydown);
      e.stopPropagation();
      this.setState({ showDatePicker: false });
    }
  };

  /**
   * Positions the date picker
   *
   * @returns
   */
  private readonly repositionDatePicker = () => {
    if (this.timePickerRef && this.state.showDatePicker) {
      const MIN_HEIGHT_OF_DATE_PICKER_PX = 233;

      const elemRect = this.timePickerRef.getBoundingClientRect();
      let container = this.timePickerRef.parentElement;

      // If the time picker is in a normal div, then we use the golden layout component
      // to decide if it's off screen
      if (!container) {
        return;
      }
      while (container.className !== 'lm_content') {
        container = container.parentElement;
        if (!container) {
          break;
        }
      }
      // Otherwise, we use the document body [occurs if time picker is in context menu]
      if (!container) {
        container = document.body;
      }
      const containerRect = container.getBoundingClientRect();

      if (elemRect.top - MIN_HEIGHT_OF_DATE_PICKER_PX < containerRect.top) {
        this.setState({ datePickerOnBottom: true });
      }
    }
  };

  /**
   * On change handler for the date picker
   *
   * @param inputDate
   * @param isUserChange
   */
  private readonly datePickerOnChange = (inputDate, isUserChange) => {
    // Creates new date from state
    // Updates new date with values from date picker
    if (!inputDate) {
      this.setState({
        showDatePicker: false
      });
    } else if (isUserChange) {
      const newDate = cloneDeep(this.props.date);
      newDate.setDate(inputDate.getDate());
      newDate.setMonth(inputDate.getMonth());
      newDate.setFullYear(inputDate.getFullYear());
      this.props.onMaybeDate(inputDate);
      if (this.props.setHold) {
        this.props.setHold(false);
      }
      this.setState({
        isValid: true,
        displayString: this.props.shortFormat
          ? dateToString(inputDate, ISO_DATE_TIME_FORMAT)
          : dateToString(inputDate, ISO_DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
      });
    }
  };

  /**
   * On change handler for the text area
   *
   * @param e
   */
  private readonly textareaOnChange = e => {
    // Attempts to create new date from parsed string
    const regex = this.props.shortFormat
      ? new RegExp(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d/, 'g')
      : new RegExp(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d+/, 'g');

    const validStringFormat = regex.test(e.target.value);
    const newDate = convertUTCDateToDate(stringToDate(e.target.value));
    // If the date is valid
    if (validStringFormat && !Number.isNaN(newDate.getTime())) {
      this.setState({ isValid: true, displayString: e.target.value }, () => {
        this.props.onMaybeDate(newDate);
      });
      if (this.props.setHold) {
        this.props.setHold(false);
      }
    } else {
      // If the date is not valid
      this.setState({ isValid: false, displayString: e.target.value });
      if (this.props.setHold) {
        this.props.setHold(true);
      }
      this.props.onMaybeDate(undefined);
    }
  };

  /**
   * enter key handler for the text area
   *
   * @param e
   */
  private readonly textareaOnKeyDown = e => {
    if (e.nativeEvent.code === 'Enter') {
      if (this.props.onEnter) {
        this.props.onEnter();
      }
      e.preventDefault();
    }
  };

  /**
   * Helper method to build the class names
   *
   * @returns
   */
  private readonly buildClassNames = () => {
    const timePickerClassName = this.state.datePickerOnBottom
      ? 'time-picker__date-picker time-picker__date-picker--bottom'
      : 'time-picker__date-picker';

    const buttonClassName = this.state.showDatePicker
      ? 'time-picker__date-picker-button time-picker__date-picker-button--active'
      : 'time-picker__date-picker-button';
    const textareaClassName =
      this.state.isValid && !this.props.hasHold && !this.props.isExternallyInvalid
        ? 'time-picker__input'
        : 'time-picker__input--invalid';

    return { timePickerClassName, buttonClassName, textareaClassName };
  };

  /**
   * React component lifecycle.
   */
  public render(): JSX.Element {
    const { timePickerClassName, buttonClassName, textareaClassName } = this.buildClassNames();
    const width = this.props.shortFormat ? '152px' : '240px';
    return (
      <div
        className="time-picker"
        ref={ref => {
          if (ref !== null) {
            this.timePickerRef = ref;
          }
        }}
      >
        <textarea
          value={this.state.displayString}
          disabled={this.props.disabled}
          className={textareaClassName}
          style={{
            width: this.props.fillWidth ? '100%' : width
          }}
          cols={27}
          rows={1}
          onKeyDown={this.textareaOnKeyDown}
          onChange={this.textareaOnChange}
        />
        {this.state.showDatePicker ? (
          <DatePicker
            className={timePickerClassName}
            value={this.props.date}
            timePrecision={TimePrecision.MILLISECOND}
            timePickerProps={{ showArrowButtons: true }}
            onChange={this.datePickerOnChange}
          />
        ) : null}
        {this.props.datePickerEnabled ? (
          <Button
            icon={IconNames.CALENDAR}
            onClick={e => {
              this.setState(prevState => ({ showDatePicker: !prevState.showDatePicker }));
              e.stopPropagation();
            }}
            className={buttonClassName}
            disabled={this.props.disabled}
            title="Choose a date and time"
          />
        ) : null}
      </div>
    );
  }
}
export { TimePickerDeprecated };
