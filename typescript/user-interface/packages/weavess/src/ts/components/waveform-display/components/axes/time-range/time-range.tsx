import { WeavessConstants } from '@gms/weavess-core';
import * as React from 'react';

import type { TimeRangeProps } from './types';

type TRProps = React.PropsWithChildren<TimeRangeProps>;

function InternalTimeRange({ labelWidthPx, children }: TRProps) {
  return (
    <div
      className="weavess-wp-time-range"
      style={{
        left: `${labelWidthPx ?? WeavessConstants.DEFAULT_LABEL_WIDTH_PIXELS}px`
      }}
    >
      <span>{children}</span>
    </div>
  );
}

/**
 * A memoized component that simply draws a time range string at the desired location on the page.
 * If labelWidthPx are given, will draw them at that offset. Otherwise, defaults to WeavessConstants.DEFAULT_LABEL_WIDTH_PIXELS
 */
export const TimeRange = React.memo(InternalTimeRange);
