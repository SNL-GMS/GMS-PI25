import { NonIdealState } from '@blueprintjs/core';
import { Tooltip2 } from '@blueprintjs/popover2';
import { EventTypes, SignalDetectionTypes } from '@gms/common-model';
import {
  DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  dateToString,
  toDate
} from '@gms/common-util';
import { closeContextMenu, Form, FormTypes, Table } from '@gms/ui-core-components';
import type { FilterDefinitionsForSignalDetectionsRecord } from '@gms/ui-state';
import {
  selectAssociationConflict,
  selectEvents,
  selectFilterDefinitionsForSignalDetections,
  selectOpenEventId,
  selectOpenIntervalName,
  selectPreviousActionTargets,
  selectSignalDetections,
  selectWorkflowTimeRange,
  useAppSelector,
  useEventStatusQuery,
  useGetEvents,
  useUiTheme
} from '@gms/ui-state';
import classNames from 'classnames';
import React from 'react';

import { getSignalDetectionDetailsProps } from '~analyst-ui/common/menus/signal-detection-context-menu/signal-detection-context-menu-utils';
import { getConflictedEventsForSD } from '~analyst-ui/common/utils/conflicts-utils';
import { findEventHypothesesForDetection } from '~analyst-ui/common/utils/event-util';

import { SignalDetectionDetailsConflictIcon } from './conflict-icon';
import { SIGNAL_DETECTION_HISTORY_COLUMN_DEFINITIONS } from './constants';
import { EventTimesDisplayItem } from './event-times-display-item';
import type { SignalDetectionDetailsProps } from './types';
import { buildSdDetailFormItems, generateDetectionHistoryTableRows } from './utils';

/**
 * SignalDetectionDetails Component that can use a passed in sd or action target sd
 */
function SignalDetectionDetailsContent({ signalDetection }: SignalDetectionDetailsProps) {
  const previousActionTargets = useAppSelector(selectPreviousActionTargets);
  const signalDetections = useAppSelector(selectSignalDetections);
  const events = useAppSelector(selectEvents);
  const eventStatusQuery = useEventStatusQuery();
  const [uiTheme] = useUiTheme();
  const currentOpenEventId = useAppSelector(selectOpenEventId);
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const intervalTimeRange = useAppSelector(selectWorkflowTimeRange);
  let actionTargetSd = signalDetection;

  // It's possible for details to get an sd that is not an action target. Via alt click in the map for example.
  // Checking if no sd is passed in, if not using previous action target. Using previous action
  // target since when the context menu is closed it sets action targets to []
  if (!signalDetection && previousActionTargets[0]) {
    actionTargetSd = Object.values(signalDetections).find(sd => sd.id === previousActionTargets[0]);
  }
  const sdDetailsProps = getSignalDetectionDetailsProps(
    actionTargetSd,
    Object.values(events),
    currentOpenEventId,
    eventStatusQuery.data,
    openIntervalName,
    intervalTimeRange,
    uiTheme
  );
  const associationConflicts = useAppSelector(selectAssociationConflict);
  const isConflicted = associationConflicts[actionTargetSd?.id] !== undefined;
  const allEvents: EventTypes.Event[] = useGetEvents().data;
  // Get filterDefinitionsForSDRecord for this SD (if exists)
  const filterDefinitionsForSignalDetectionsRecord: FilterDefinitionsForSignalDetectionsRecord = useAppSelector(
    selectFilterDefinitionsForSignalDetections
  );
  const sdHypothesis = SignalDetectionTypes.Util.getCurrentHypothesis(
    actionTargetSd?.signalDetectionHypotheses
  );
  const signalDetectionHypothesisID = sdHypothesis?.id?.id;
  const filterDefinitionByFilterDefinitionUsage =
    filterDefinitionsForSignalDetectionsRecord[signalDetectionHypothesisID];
  if (!actionTargetSd) {
    return <NonIdealState />;
  }
  const eventConflictInfo = getConflictedEventsForSD(
    allEvents,
    associationConflicts,
    openIntervalName,
    actionTargetSd.id
  );

  let associatedEventTimes: string[] = [];
  if (isConflicted) {
    associatedEventTimes = eventConflictInfo.map(e =>
      dateToString(toDate(e.time), DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
    );
  } else {
    // No conflicted event times; derive the event time using util functions
    const eventHypotheses: EventTypes.EventHypothesis[] = findEventHypothesesForDetection(
      actionTargetSd,
      allEvents,
      openIntervalName
    );

    const eventHypothesis = eventHypotheses[0];

    const locationSolution = EventTypes.findPreferredLocationSolution(
      eventHypothesis?.id.hypothesisId,
      allEvents.find(e => e.id === eventHypothesis?.id.eventId)?.eventHypotheses ?? []
    );

    associatedEventTimes = locationSolution
      ? [
          dateToString(
            toDate(locationSolution.location.time),
            DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION
          )
        ]
      : [];
  }

  const formItems = buildSdDetailFormItems(actionTargetSd, filterDefinitionByFilterDefinitionUsage);
  formItems.push({
    itemKey: `Associated event time${associatedEventTimes.length > 1 ? '(s)' : ''}`,
    labelText: `Associated event time${associatedEventTimes.length > 1 ? '(s)' : ''}`,
    itemType: FormTypes.ItemType.Display,
    displayText: (
      <EventTimesDisplayItem time={associatedEventTimes} conflictData={eventConflictInfo} />
    ),
    displayTextFormat: FormTypes.TextFormats.Standard
  });

  const defaultPanel: FormTypes.FormPanel = {
    formItems,
    name: 'Current Version'
  };

  /** Detection table */
  const extraPanels: FormTypes.FormPanel[] = [
    {
      name: 'All Versions',
      content: (
        <div className={classNames('ag-theme-dark', 'signal-detection-details-versions-table')}>
          <div className="max">
            <Table
              columnDefs={SIGNAL_DETECTION_HISTORY_COLUMN_DEFINITIONS}
              getRowId={params => params.data.id}
              rowSelection="single"
              rowData={generateDetectionHistoryTableRows(actionTargetSd)}
              overlayNoRowsTemplate="No Versions"
              rowClassRules={{
                'versions-table__row--first-in-table': params => {
                  if (params.data['first-in-table']) {
                    return true;
                  }
                  return false;
                }
              }}
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="signal-detection-details__container">
      <Form
        header="Signal Detection Details"
        headerDecoration={
          <>
            <Tooltip2
              content={
                <span className="sd-swatch-tooltip">
                  {sdDetailsProps.swatchTooltipText || 'UNKNOWN'}
                </span>
              }
            >
              <div
                className="signal-detection-swatch"
                style={{ backgroundColor: sdDetailsProps.color }}
              />
            </Tooltip2>
            <span className="signal-detection-swatch-label">{sdDetailsProps.assocStatus}</span>
            {isConflicted && (
              <SignalDetectionDetailsConflictIcon conflictData={eventConflictInfo} />
            )}
          </>
        }
        defaultPanel={defaultPanel}
        disableSubmit
        onCancel={() => {
          closeContextMenu();
        }}
        extraPanels={extraPanels}
      />
    </div>
  );
}

/**
 * Functional wrapper so that we can use hooks to get information on Named Filters for the Signal Detection Details component
 *
 * @param props SignalDetectionDetailsProps
 * @returns SignalDetectionDetailsComponent
 */
export function SignalDetectionDetails({ signalDetection }: SignalDetectionDetailsProps) {
  return <SignalDetectionDetailsContent signalDetection={signalDetection} />;
}
