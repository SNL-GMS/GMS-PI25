import { SignalDetectionTypes } from '@gms/common-model';
import {
  eventData,
  processingAnalystConfigurationData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import type { Entity } from 'cesium';
import cloneDeep from 'lodash/cloneDeep';

import { createSignalDetectionEntities } from '~analyst-ui/components/map/create-ian-entities';

import { EventFilterOptions } from '../../../../../src/ts/components/analyst-ui/components/events/types';
import {
  sdOnMouseEnterHandler,
  sdOnMouseLeaveHandler
} from '../../../../../src/ts/components/analyst-ui/components/map/ian-map-utils';

describe('ian map data source', () => {
  const associatedEvent = cloneDeep(eventData);
  signalDetectionsData.forEach(sd => {
    associatedEvent.eventHypotheses[0].associatedSignalDetectionHypotheses.push(
      sd.signalDetectionHypotheses[0]
    );
  });

  const entities: Entity[] = createSignalDetectionEntities(
    {
      signalDetections: signalDetectionsData,
      selectedSdIds: [],
      edgeSDType: EventFilterOptions.INTERVAL,
      status: SignalDetectionTypes.SignalDetectionStatus.OTHER_ASSOCIATED,
      sdVisibility: true,
      signalDetectionLengthMeters: null
    },
    [],
    [],
    processingAnalystConfigurationData.uiThemes[0],
    []
  );

  test('sdOnMouseEnterHandler', () => {
    const result = sdOnMouseEnterHandler({} as any, entities[0]);
    expect(result).toMatchSnapshot();
  });

  test('sdOnMouseLeaveHandler', () => {
    const result = sdOnMouseLeaveHandler({} as any, entities[0]);
    expect(result).toMatchSnapshot();
  });
});
