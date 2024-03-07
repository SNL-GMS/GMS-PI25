import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Tooltip2 } from '@blueprintjs/popover2';
import type { WeavessTypes } from '@gms/weavess-core/lib/weavess-core';
import classNames from 'classnames';
import React from 'react';

import { ErrorTooltip } from '../../../../../../../error-tooltip';
/**
 * The type of the props for the {@link ChannelDescriptionLabel} component
 */
export interface ChannelDescriptionLabelProps {
  description?: string | WeavessTypes.ChannelDescription;
}

const isError = (
  description: string | WeavessTypes.ChannelDescription
): description is WeavessTypes.ChannelDescription => {
  return typeof description === 'string' ? false : description.isError;
};

function ChannelDescriptionLabelMessage({ err, message }: { err: boolean; message: string }) {
  return (
    <span className="channel-description__message-container">
      {err && <Icon className="channel-description__icon" icon={IconNames.ERROR} size={12} />}
      <span className="channel-description__message">{message}</span>
    </span>
  );
}

/**
 * Renders a channel description label, which is a string that will turn red and add a tooltip if the isError flag is set to true.
 */
export function ChannelDescriptionLabel({
  description
}: ChannelDescriptionLabelProps): JSX.Element {
  const message = typeof description === 'string' ? description : description.message;
  const tooltipMessage = typeof description === 'string' ? null : description.tooltipMessage;
  const err = isError(description);
  return (
    <span
      className={classNames({
        'channel-description': true,
        'channel-description--error': isError(description)
      })}
    >
      {tooltipMessage != null ? (
        <Tooltip2
          compact
          content={
            err ? <ErrorTooltip errorTitle={message} message={tooltipMessage} /> : tooltipMessage
          }
        >
          <ChannelDescriptionLabelMessage message={message} err={err} />
        </Tooltip2>
      ) : (
        <ChannelDescriptionLabelMessage message={message} err={err} />
      )}
    </span>
  );
}
