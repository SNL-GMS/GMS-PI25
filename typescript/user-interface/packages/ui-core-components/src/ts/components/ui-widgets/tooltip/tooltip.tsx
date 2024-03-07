/* eslint-disable react/destructuring-assignment */
import { PopoverPosition } from '@blueprintjs/core';
import { Tooltip2 } from '@blueprintjs/popover2';
import * as React from 'react';

import type { Tooltip2Props } from './types';

/**
 * Creates a Blueprint Tooltip2 around the children of this, with sensible defaults.
 */
export function Tooltip2Wrapper<T>(props: React.PropsWithChildren<Tooltip2Props<T>>): JSX.Element {
  const defaultHoverOpenDelay = 300;
  return (
    <Tooltip2
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      className={props.className || 'core-tooltip'}
      content={props.content}
      onOpened={props.onOpened}
      position={props.position || PopoverPosition.BOTTOM}
      targetTagName={props.targetTagName || 'div'}
      hoverOpenDelay={props.hoverOpenDelay ?? defaultHoverOpenDelay}
    >
      {props.children}
    </Tooltip2>
  );
}
