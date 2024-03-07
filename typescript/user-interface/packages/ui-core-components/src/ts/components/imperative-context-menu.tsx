import { Classes, ContextMenu2, hideContextMenu } from '@blueprintjs/popover2';
import { useForceUpdate } from '@gms/ui-util';
import React from 'react';

export type ImperativeContextMenuOpenFunc<T = unknown> = (
  event: React.MouseEvent | MouseEvent | Event,
  data?: T
) => void;

export type ImperativeContextMenuGetOpenCallbackFunc<T = undefined> = (
  callback: ImperativeContextMenuOpenFunc<T>
) => void;

export type ContextMenu2Content = JSX.Element | undefined;

export type ImperativeContextMenuContentFunc<T = undefined> = (data: T) => ContextMenu2Content;

export interface ImperativeContextMenuProps<T = undefined> {
  readonly content: ImperativeContextMenuContentFunc<T> | JSX.Element;
  readonly getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<T>;
  readonly onClose?: () => void;
  readonly onOpen?: () => void;
}

/**
 * @returns a hook that returns a mutable ref to a {@link ImperativeContextMenuOpenFunc} and
 * callback for setting the {@link ImperativeContextMenuOpenFunc} that can be used for an instance of a
 * {@link ImperativeContextMenu}.
 */
export function useImperativeContextMenuCallback<
  T = undefined,
  C = ImperativeContextMenuOpenFunc<T>
>(initial: C = undefined): [C, (callback: C) => void] {
  const forceUpdate = useForceUpdate();
  const contextMenuCbRef = React.useRef<C>(initial);
  const getOpenCallback = React.useCallback((callback: C) => {
    contextMenuCbRef.current = callback;
    forceUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [contextMenuCbRef.current, getOpenCallback];
}

/**
 * @param event the event to check if it is a @see {@link React.MouseEvent}.
 * @returns if a @see {@link React.MouseEvent} returns true and type casts; otherwise false.
 */
export const isReactMouseEvent = (
  event: React.MouseEvent | MouseEvent
): event is React.MouseEvent => ((event as unknown) as { nativeEvent })?.nativeEvent !== undefined;

/**
 * Closes any opened context menus.
 */
export const closeContextMenu = (): void => {
  // remove the context menu content from the dom
  const elements = [
    ...document.getElementsByClassName(`${Classes.POPOVER2_CONTENT}`),
    ...document.getElementsByClassName(`${Classes.POPOVER2_BACKDROP}`)
  ];

  elements.forEach((e, idx) => {
    elements[idx].innerHTML = '';
  });

  // remove any context menus that were opened by blueprintjs
  hideContextMenu();
};

const InternalImperativeContextMenu = function InternalImperativeContextMenu<T = undefined>(
  props: ImperativeContextMenuProps<T>
): JSX.Element {
  const { content, getOpenCallback, onClose, onOpen } = props;

  const forceUpdate = useForceUpdate();

  const menuChildRef = React.useRef<HTMLDivElement>();

  const dataRef = React.useRef<T>();

  const open: ImperativeContextMenuOpenFunc<T> = React.useCallback(
    (event: React.MouseEvent | MouseEvent, data: T) => {
      event.preventDefault();
      forceUpdate();
      const actualEvent = isReactMouseEvent(event) ? event.nativeEvent : event;
      dataRef.current = data;
      const newEvent: MouseEvent = new MouseEvent(
        // ! must be of type contextmenu for event to fire properly
        'contextmenu',
        {
          // capture the positioning of the event
          clientX: actualEvent.clientX,
          clientY: actualEvent.clientY,
          // ! ensure that the events bubbles up so that contextmenu receives the event
          bubbles: true
        }
      );
      menuChildRef.current?.dispatchEvent(newEvent);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // on mount use effect
  // pass the open function back to the parent prop so that it can be called to open the menu
  React.useEffect(
    () => {
      getOpenCallback(open);
      if (onOpen) {
        onOpen();
      }
      forceUpdate();
    },
    // We only want this to run onMount so we need no dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const contentFunc = React.useCallback(() => {
    if (typeof content === 'function') {
      return content(dataRef.current);
    }
    return content;
  }, [content]);

  const handleOnClose = React.useCallback(() => {
    closeContextMenu();
    // TODO: Update this when code to clear brush stroke is refactored
    if (dataRef.current && 'onClose' in (dataRef.current as any)) {
      (dataRef as any).current.onClose();
    }
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <ContextMenu2
      content={contentFunc}
      onClose={handleOnClose}
      // !This 'unknown' is needed to trick ContextMenu2 to return focus since they omit it
      popoverProps={{ shouldReturnFocusOnClose: true } as unknown}
    >
      <div ref={menuChildRef} />
    </ContextMenu2>
  );
};

/**
 * Menu item designed to replace the imperative call from Context Menu that was deprecated in ContextMenu2
 */
export const ImperativeContextMenu = React.memo(
  InternalImperativeContextMenu
) as typeof InternalImperativeContextMenu;
