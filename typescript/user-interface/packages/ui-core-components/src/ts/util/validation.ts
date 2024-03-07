import type { Message } from '../components/ui-widgets/form/types';

export interface ValidationDefinition<T> {
  valueIsInvalid: (value: T) => boolean;
  invalidMessage: Message;
}

/**
 * Returns a function that can be used to validate a given input
 * against multiple different conditions. Accepts a callback function
 * to handle the error results.
 *
 * @param invalidHandler Callback to handler error results
 * @param definitions List of error conditions with their corresponding error message
 * @returns Validator function. Returns `true` if valid.
 */
export function getValidator<T>(
  invalidHandler: (invalid: boolean, invalidMessage: Message) => void,
  definitions: ValidationDefinition<T>[]
) {
  return function validate(value: T): boolean {
    let isInvalid = false;
    let invalidMessage: Message;

    definitions.forEach(def => {
      if (def.valueIsInvalid(value)) {
        isInvalid = true;
        invalidMessage = def.invalidMessage;
      }
    });

    invalidHandler(isInvalid, invalidMessage);
    return !isInvalid;
  };
}
