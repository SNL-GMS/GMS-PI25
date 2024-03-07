import type { CommonTypes } from '@gms/common-model';
import { IanDisplays } from '@gms/common-model/lib/displays/types';
import type GoldenLayout from '@gms/golden-layout';
import { WithNonIdealStates } from '@gms/ui-core-components';
import { selectWorkflowTimeRange, useAppSelector } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import * as React from 'react';

import {
  processingAnalystConfigNonIdealStateDefinitions,
  timeRangeNonIdealStateDefinitions
} from '~analyst-ui/common/non-ideal-states/non-ideal-state-defs';
import { BaseDisplay } from '~common-ui/components/base-display';
import { CommonNonIdealStateDefs } from '~common-ui/components/non-ideal-states';

import { EventsPanel } from './events-panel';

const logger = UILogger.create('GMS_LOG_EVENTS', process.env.GMS_LOG_EVENTS);

export interface EventsComponentProps {
  // passed in from golden-layout
  readonly glContainer?: GoldenLayout.Container;
}

interface EventsPanelOrNonIdealStateProps {
  /** Used to determine non-ideal state */
  readonly timeRange: CommonTypes.TimeRange;
}

export const EventsPanelOrNonIdealState = WithNonIdealStates<EventsPanelOrNonIdealStateProps>(
  [
    ...CommonNonIdealStateDefs.baseNonIdealStateDefinitions,
    ...processingAnalystConfigNonIdealStateDefinitions,
    ...timeRangeNonIdealStateDefinitions('events')
  ],
  EventsPanel
);

export function EventsComponent(props: EventsComponentProps) {
  logger.debug(`Rendering EventsComponent`, props);
  const { glContainer } = props;

  const timeRange = useAppSelector(selectWorkflowTimeRange);

  return (
    <BaseDisplay
      glContainer={glContainer}
      className="events-display-window gms-body-text"
      data-cy="events-display-window"
      tabName={IanDisplays.EVENTS}
    >
      <EventsPanelOrNonIdealState timeRange={timeRange} />
    </BaseDisplay>
  );
}
