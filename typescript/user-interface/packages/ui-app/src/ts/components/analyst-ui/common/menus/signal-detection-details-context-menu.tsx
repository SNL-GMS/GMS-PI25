import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import { SignalDetectionDetails } from '../dialogs';
import type { SignalDetectionDetailsProps } from '../dialogs/signal-detection-details/types';

/**
 * Displays the Signal Detection Details Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const SignalDetectionDetailsContextMenu = React.memo(
  function SignalDetectionDetailsContextMenu(props: {
    getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<SignalDetectionDetailsProps>;
  }): JSX.Element {
    const { getOpenCallback } = props;

    const content = React.useCallback(
      // eslint-disable-next-line react/jsx-props-no-spreading
      (p: SignalDetectionDetailsProps) => <SignalDetectionDetails {...p} />,
      []
    );

    return (
      <ImperativeContextMenu<SignalDetectionDetailsProps>
        content={content}
        getOpenCallback={getOpenCallback}
      />
    );
  }
);
