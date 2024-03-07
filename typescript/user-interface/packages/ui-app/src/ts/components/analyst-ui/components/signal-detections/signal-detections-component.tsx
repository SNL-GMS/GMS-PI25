import { IanDisplays } from '@gms/common-model/lib/displays/types';
import React from 'react';

import { BaseDisplay } from '~common-ui/components/base-display';

import { SignalDetectionsPanel } from './signal-detections-panel';
import type { SignalDetectionsComponentProps } from './types';

/**
 * IAN signal detections component.
 */
function IANSignalDetectionsComponent(props: SignalDetectionsComponentProps) {
  const { glContainer } = props;

  return (
    <BaseDisplay
      glContainer={glContainer}
      tabName={IanDisplays.SIGNAL_DETECTIONS}
      className="ian-signal-detections-gl-container"
      data-cy="ian-signal-detections-container"
    >
      <SignalDetectionsPanel />
    </BaseDisplay>
  );
}

export const SignalDetectionsComponent = React.memo(IANSignalDetectionsComponent);
