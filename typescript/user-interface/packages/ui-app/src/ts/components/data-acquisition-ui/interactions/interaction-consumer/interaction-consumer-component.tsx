import { getKeyPressAction, isDataAcquisitionKeyAction } from '@gms/ui-state';
import produce from 'immer';
import throttle from 'lodash/throttle';
import React from 'react';

import type { InteractionConsumerProps } from './types';

const THROTTLE_HOTKEY_REPEAT_MS = 500;

const isHotkeyListenerAttached = () => {
  if (document.getElementById('app')) {
    return document.getElementById('app').dataset.hotkeyListenerAttached === 'true';
  }
  return false;
};

const setHotkeyListenerAttached = () => {
  if (document.getElementById('app')) {
    document.getElementById('app').dataset.hotkeyListenerAttached = 'true';
  }
};

/**
 * checks to see if the keypress matches a configured hotkey, and if so,
 * adds it to the keypress action queue
 */
export const handleHotkey = (props: InteractionConsumerProps) => (
  keyEvent: KeyboardEvent
): void => {
  if (props.keyPressActionQueue && !keyEvent.repeat) {
    const keyPressAction = getKeyPressAction(keyEvent);
    if (keyPressAction && isDataAcquisitionKeyAction(keyPressAction)) {
      keyEvent.stopPropagation();
      keyEvent.preventDefault();
      const entryForKeyMap = props.keyPressActionQueue[keyPressAction];
      props.setKeyPressActionQueue(
        produce(props.keyPressActionQueue, draft => {
          draft[keyPressAction] = Number(entryForKeyMap) + 1;
        })
      );
    }
  }
};

/**
 * Consumes keypress from the redux store and calls the Interaction Provider context to perform the appropriate action
 */
export const InteractionConsumer: React.FunctionComponent<React.PropsWithChildren<
  InteractionConsumerProps
  // eslint-disable-next-line react/function-component-definition
>> = props => {
  const throttleFunction = React.useCallback(() => {
    return throttle(handleHotkey(props), THROTTLE_HOTKEY_REPEAT_MS);
  }, [props]);
  /**
   * Checks to see if an action should be performed, and if so consumes the keypress and performs it
   *
   * @param keyAction the key action
   * @param callback the callback
   * @param shouldConsumeAllKeypress true if should consume all key presses
   */

  /**
   * Adds a keydown listener to the document, so we will catch anything that bubbles up to the top.
   */
  React.useEffect(() => {
    if (!isHotkeyListenerAttached()) {
      document.addEventListener('keydown', throttleFunction);
      setHotkeyListenerAttached();
    }
    // Clean up the event listener on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => document.removeEventListener('keydown', throttleFunction);
    // !FIX ESLINT Validate and check REACT HOOK dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react/jsx-no-useless-fragment, react/destructuring-assignment
  return <>{props.children}</>;
};
