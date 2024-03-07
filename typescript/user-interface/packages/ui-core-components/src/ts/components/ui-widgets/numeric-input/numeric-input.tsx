import { Intent, NumericInput as BlueprintNumericInput } from '@blueprintjs/core';
import * as React from 'react';

import type { ValidationDefinition } from '../../../util';
import { getValidator } from '../../../util';
import type { Message } from '../form/types';
import type { NumericInputProps } from './types';

/**
 * A wrapper around the Blueprint NumericInput component. Supports custom
 * validation/error handling (turns red if a bad input is given)
 */
export function NumericInput({
  tooltip,
  widthPx,
  disabled,
  minMax,
  className,
  onChange,
  onError,
  validationDefinitions,
  minorStepSize,
  step,
  value,
  cyData
}: NumericInputProps) {
  const style = React.useMemo(() => ({ width: `${widthPx}px` }), [widthPx]);
  const [invalid, setInvalid] = React.useState(false);

  /** Base validation to handle min/max */
  const minMaxValid: ValidationDefinition<string>[] = [
    {
      valueIsInvalid: input => parseFloat(input) > minMax?.max,
      invalidMessage: {
        summary: 'Input is greater than allowed maximum',
        details: `Maximum value allowed is ${minMax?.max}`,
        intent: 'danger'
      }
    },
    {
      valueIsInvalid: input => parseFloat(input) < minMax?.min,
      invalidMessage: {
        summary: 'Input is less than allowed minimum',
        details: `Minimum value allowed is ${minMax?.min}`,
        intent: 'danger'
      }
    }
  ];

  const internalOnError = React.useCallback(
    (isInvalid: boolean, invalidMessage: Message) => {
      setInvalid(isInvalid);
      if (onError) onError(invalidMessage);
    },
    [onError]
  );

  const validate = getValidator(internalOnError, validationDefinitions ?? minMaxValid);

  const onInputChange = React.useCallback(
    (valueAsNumber: number, valueAsString: string) => {
      onChange(valueAsString);

      if (invalid) validate(valueAsString);
    },
    [invalid, onChange, validate]
  );

  return (
    <div style={style} className="numeric-input__wrapper">
      <BlueprintNumericInput
        asyncControl
        clampValueOnBlur={!!minMax}
        className={`numeric-input ${className}`}
        defaultValue={value}
        value={value}
        disabled={disabled}
        intent={invalid ? Intent.DANGER : Intent.NONE}
        max={minMax?.max}
        min={minMax?.min}
        onValueChange={onInputChange}
        onBlur={e => validate(e.target.value)}
        onButtonClick={e => validate(e.toString())}
        placeholder="Enter a number..."
        title={tooltip}
        minorStepSize={minorStepSize}
        stepSize={step}
        width={widthPx}
        fill
        data-cy={cyData}
      />
    </div>
  );
}
