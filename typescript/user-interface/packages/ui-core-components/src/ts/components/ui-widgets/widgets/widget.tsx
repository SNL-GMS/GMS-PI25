/* eslint-disable react/destructuring-assignment */
import React from 'react';

import { DropDown } from '../drop-down';
import { FilterableOptionList } from '../filterable-option-list';
import { TextArea } from '../text-area';
import { TimePickerDeprecated } from '../time-picker';
import type * as WidgetTypes from './types';

/**
 * Widget component.
 */
export class Widget extends React.Component<WidgetTypes.WidgetProps, WidgetTypes.WidgetState> {
  private constructor(props) {
    super(props);
    this.state = {
      isValid: this.props.isValid !== undefined ? this.props.isValid : true,
      // eslint-disable-next-line react/no-unused-state
      value: this.props.defaultValue
    };
  }

  /**
   * React component lifecycle.
   */
  // eslint-disable-next-line complexity
  public render(): JSX.Element {
    const title = this.props.params && this.props.params.tooltip ? this.props.params.tooltip : '';
    const maxChar =
      this.props.params && this.props.params.maxChar ? this.props.params.maxChar : undefined;
    switch (this.props.type) {
      case 'DropDown':
        return (
          <DropDown
            value={this.props.defaultValue}
            dropDownItems={this.props.params.dropDownItems}
            dropdownText={this.props.params.dropdownText}
            onMaybeValue={this.props.onMaybeValue}
            title={title}
          />
        );
      case 'TextArea':
        return (
          <TextArea
            maxChar={maxChar}
            defaultValue={this.props.defaultValue}
            onMaybeValue={this.props.onMaybeValue}
            data-cy={this.props['data-cy']}
            title={title}
          />
        );
      case 'TimePicker':
        return (
          <TimePickerDeprecated
            date={this.props.defaultValue}
            datePickerEnabled
            onMaybeDate={this.props.onMaybeValue}
            setHold={this.props.onValidStatus}
            hasHold={!this.state.isValid}
          />
        );
      case 'FilterableOptionList':
        return (
          <FilterableOptionList
            options={this.props.params.options}
            priorityOptions={this.props.params.priorityOptions}
            defaultSelection={this.props.defaultValue}
            defaultFilter={this.props.params.defaultFilter}
            onSelection={this.props.onMaybeValue}
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            widthPx={280}
          />
        );
      default:
    }

    return undefined;
  }
}
