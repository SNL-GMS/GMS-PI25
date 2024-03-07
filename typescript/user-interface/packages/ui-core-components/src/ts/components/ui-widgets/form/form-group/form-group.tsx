import { Button, Collapse } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import React from 'react';

import type { FormGroupProps } from '../types';

/**
 * Creates a label, form element, and optional helper text
 */
export function FormGroup({
  label,
  children,
  helperText,
  labelFor,
  labelInfo,
  accordionContent
}: FormGroupProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="gms-group__label form-label" htmlFor={labelFor}>
        <span>
          {label} {labelInfo && <span className="gms-form-group__label-info">{labelInfo}</span>}
        </span>
        {accordionContent ? (
          <Button
            onClick={() => setIsOpen(val => !val)}
            minimal
            small
            icon={isOpen ? IconNames.CHEVRON_UP : IconNames.CHEVRON_DOWN}
          />
        ) : null}
        {helperText && <div className="gms-form-group__helper-text">{helperText}</div>}
      </label>
      <div className="gms-form-group__content form-value">{children}</div>
      {accordionContent ? (
        <Collapse
          isOpen={isOpen}
          className={classNames('gms-form-group__content--accordion', {
            'gms-form-group__content--hidden': !isOpen
          })}
        >
          {accordionContent}
        </Collapse>
      ) : null}
    </>
  );
}
