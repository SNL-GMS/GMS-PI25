import { Alignment, Button, Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { MenuItem2 } from '@blueprintjs/popover2';
import React from 'react';

import type { ImperativeContextMenuGetOpenCallbackFunc } from '../..';
import type { ImperativeContextMenuOpenFunc } from '../../imperative-context-menu';
import { closeContextMenu, ImperativeContextMenu } from '../../imperative-context-menu';
import type { PopoverProps, PopoverState } from './types';

/**
 * Displays the {@link PopoverButtonContextMenu}.
 */
const PopoverButtonContextMenu = React.memo(function PopoverButtonContextMenu(props: {
  isExpanded: boolean;
  popupContent: JSX.Element;
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc;
  onClose: () => void;
}): JSX.Element {
  const { isExpanded, popupContent, getOpenCallback, onClose } = props;
  const content = React.useCallback(() => {
    if (isExpanded) {
      return popupContent;
    }
    return undefined;
  }, [isExpanded, popupContent]);

  return (
    <ImperativeContextMenu content={content} getOpenCallback={getOpenCallback} onClose={onClose} />
  );
});

/**
 * Renders button in toolbar that creates and dismisses popovers
 * Not for external use
 */
export class PopoverButtonComponent extends React.Component<PopoverProps, PopoverState> {
  /** Internal reference to the button container */
  private internalRef: HTMLDivElement;

  /**
   * The callback function for opening the context menu (popups).
   */
  private contextMenuCb: ImperativeContextMenuOpenFunc;

  private constructor(props) {
    super(props);
    this.state = {
      isExpanded: false
    };
  }

  /**
   * Assigns the Context Menu callback; which can be used to imperatively show the context menu.
   *
   * @param callback the context menu open callback
   */
  private readonly setContextMenuCb: ImperativeContextMenuGetOpenCallbackFunc = callback => {
    this.contextMenuCb = callback;
  };

  /**
   * Handles onClose method of the context menu.
   */
  private readonly onClose = (): void => {
    const { onPopoverDismissed } = this.props;
    if (onPopoverDismissed) {
      onPopoverDismissed();
    }
    this.setState({ isExpanded: false });
  };

  /**
   * Toggles the popover
   *
   * @param leftOff left offset to render popover
   * @param topSet top offset to render popover
   */
  public togglePopover = (leftOffset?: number, topOffset?: number): void => {
    const { renderAsMenuItem } = this.props;
    const { isExpanded } = this.state;
    if (isExpanded) {
      this.setState({ isExpanded: false }, () => {
        closeContextMenu();
      });
    } else {
      const left = renderAsMenuItem
        ? // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          this.internalRef.getBoundingClientRect().left + this.internalRef.scrollWidth
        : this.internalRef.getBoundingClientRect().left;
      // The plus four is a chosen offset - has no real world meaning
      const top = renderAsMenuItem
        ? this.internalRef.getBoundingClientRect().top
        : // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          this.internalRef.getBoundingClientRect().top + this.internalRef.scrollHeight + 4;

      // set the state to expanded
      this.setState({ isExpanded: true }, () => {
        this.contextMenuCb(
          new MouseEvent('contextmenu', {
            clientX: leftOffset || left,
            clientY: topOffset || top,
            bubbles: true
          })
        );
      });
    }
  };

  /**
   * React component lifecycle.
   */
  public render(): JSX.Element {
    const {
      widthPx,
      onlyShowIcon,
      icon,
      label,
      cyData,
      popupContent,
      renderAsMenuItem,
      disabled,
      tooltip,
      onClick
    } = this.props;

    const { isExpanded } = this.state;

    const widthStr = widthPx ? `${widthPx}px` : undefined;
    const iconAlignText = onlyShowIcon ? Alignment.CENTER : Alignment.LEFT;
    const iconClassName = onlyShowIcon ? 'toolbar-button--icon-only' : 'toolbar-button';
    const iconLabel = onlyShowIcon ? null : label;
    const iconSymbol = icon || IconNames.CHEVRON_DOWN;
    return (
      <>
        <PopoverButtonContextMenu
          isExpanded={isExpanded}
          getOpenCallback={this.setContextMenuCb}
          popupContent={popupContent}
          onClose={this.onClose}
        />
        <div
          ref={ref => {
            if (ref) {
              this.internalRef = ref;
            }
          }}
          data-cy={cyData}
        >
          {renderAsMenuItem ? (
            <MenuItem2
              disabled={disabled}
              icon={IconNames.MENU_OPEN}
              text={label}
              label="opens dialog"
              onClick={event => {
                event.stopPropagation();
                this.togglePopover();
              }}
            />
          ) : (
            <Button
              title={tooltip}
              disabled={disabled}
              onClick={() => {
                this.togglePopover();
                if (onClick) {
                  onClick(this.internalRef);
                }
              }}
              active={isExpanded}
              style={{ width: widthStr }}
              alignText={iconAlignText}
              className={iconClassName}
            >
              <span>{iconLabel}</span>
              <Icon title={false} icon={iconSymbol} />
            </Button>
          )}
        </div>
      </>
    );
  }
}
