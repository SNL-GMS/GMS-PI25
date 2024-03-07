/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import { Checkbox, Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Tooltip2 } from '@blueprintjs/popover2';
import React from 'react';

import { DefiningTypes } from '~analyst-ui/components/location/components/location-signal-detections/types';
import { messageConfig } from '~analyst-ui/config/message-config';

/**
 * When the user changes the checkbox by calling the location SD table's component
 */

export function onCheckboxChange(
  definingType: DefiningTypes,
  signalDetectionId: string,
  setDefining: boolean,
  props: any
): void {
  props.data.updateIsDefining(definingType, signalDetectionId, setDefining);
}

// eslint-disable-next-line react/function-component-definition
export const DefiningCheckBoxCellRenderer: React.FunctionComponent<any> = props => {
  const { definingType } = props.colDef.cellRendererParams;
  let isDefining = props.data.arrivalTimeDefining;
  if (definingType === DefiningTypes.SLOWNESS) {
    isDefining = props.data.slownessDefining;
  } else if (definingType === DefiningTypes.AZIMUTH) {
    isDefining = props.data.azimuthDefining;
  }
  return (
    <Checkbox
      label=""
      checked={isDefining}
      disabled={props.data.historicalMode || props.data.deletedOrUnassociated}
      onChange={() => {
        onCheckboxChange(definingType, props.data.signalDetectionId, !isDefining, props);
      }}
    />
  );
};

/**
 * Renders the modified color cell for the signal detection list
 */
// eslint-disable-next-line react/function-component-definition
export const AddedRemovedSDMarker: React.FunctionComponent<any> = props => {
  if (!props.data.deletedOrUnassociated && !props.data.isAssociatedDiff) {
    return null;
  }
  const tooltip = props.data.deletedOrUnassociated
    ? messageConfig.tooltipMessages.location.deletedOrUnassociatedMessage
    : messageConfig.tooltipMessages.location.associatedOrCreatedMessage;
  return (
    <Tooltip2 content={<div>{tooltip}</div>} className="dirty-dot-wrapper">
      <Icon
        icon={props.data.deletedOrUnassociated ? IconNames.GRAPH_REMOVE : IconNames.NEW_OBJECT}
      />
    </Tooltip2>
  );
};
