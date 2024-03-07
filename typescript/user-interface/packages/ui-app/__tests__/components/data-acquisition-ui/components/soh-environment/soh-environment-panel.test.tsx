/* eslint-disable react/jsx-no-constructed-context-values */
import { SohTypes } from '@gms/common-model';
import { uuid } from '@gms/common-util';
import { getStore } from '@gms/ui-state';
import uniqueId from 'lodash/uniqueId';
import React from 'react';
import { Provider } from 'react-redux';

import { BaseDisplayContext } from '../../../../../src/ts/components/common-ui/components/base-display';
import type { EnvironmentPanelProps } from '../../../../../src/ts/components/data-acquisition-ui/components/soh-environment/soh-environment-panel';
import { EnvironmentPanel } from '../../../../../src/ts/components/data-acquisition-ui/components/soh-environment/soh-environment-panel';
import type { SohContextData } from '../../../../../src/ts/components/data-acquisition-ui/shared/soh-context';
import { SohContext } from '../../../../../src/ts/components/data-acquisition-ui/shared/soh-context';
import type { FilterableSOHTypes } from '../../../../../src/ts/components/data-acquisition-ui/shared/toolbars/soh-toolbar';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');

uuid.asString = jest.fn().mockImplementation(uniqueId);

// set up window alert and open so we don't see errors
(window as any).alert = jest.fn();
(window as any).open = jest.fn();

describe('SohEnvironmentPanel class', () => {
  const channel: SohTypes.ChannelSoh[] = [
    {
      allSohMonitorValueAndStatuses: [
        {
          status: SohTypes.SohStatusSummary.GOOD,
          value: 1,
          valuePresent: true,
          monitorType: SohTypes.SohMonitorType.ENV_ZEROED_DATA,
          hasUnacknowledgedChanges: false,
          contributing: true,
          thresholdMarginal: 1,
          thresholdBad: 10,
          quietUntilMs: 1
        }
      ],
      channelName: 'channelName',
      channelSohStatus: SohTypes.SohStatusSummary.GOOD
    }
  ];
  const channelStatusesToDisplay: Record<FilterableSOHTypes, boolean> = {
    NONE: false,
    BAD: false,
    GOOD: true,
    MARGINAL: false
  };
  const monitorStatusesToDisplay: Record<SohTypes.SohStatusSummary, boolean> = {
    NONE: false,
    BAD: false,
    GOOD: true,
    MARGINAL: false
  };
  const myProps: EnvironmentPanelProps = {
    channelSohs: channel,
    sohStatusContributors: [],
    channelStatusesToDisplay,
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    quietingDurationSelections: [1, 5, 10],
    defaultQuietDurationMs: 10,
    monitorStatusesToDisplay,
    stationName: 'AAK',
    isStale: false
  };

  const contextDefaults: SohContextData = {
    glContainer: {} as any,
    selectedAceiType: SohTypes.AceiType.BEGINNING_TIME_OUTAGE,
    setSelectedAceiType: jest.fn()
  };

  const panelContent = (
    <Provider store={getStore()}>
      <BaseDisplayContext.Provider
        value={{
          glContainer: { width: 150, height: 150 } as any,
          widthPx: 150,
          heightPx: 150
        }}
      >
        <SohContext.Provider value={contextDefaults}>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <EnvironmentPanel {...myProps} />
        </SohContext.Provider>
      </BaseDisplayContext.Provider>
    </Provider>
  );
  const sohEnvironmentPanel = Enzyme.mount(panelContent);
  const sohShallowEnvironmentPanel = Enzyme.shallow(panelContent);
  const sohEnvironmentPanel2: any = new EnvironmentPanel(myProps);

  it('should be defined', () => {
    expect(sohEnvironmentPanel).toBeDefined();
    expect(sohEnvironmentPanel2).toBeDefined();
  });

  it('should match snapshot', () => {
    expect(sohShallowEnvironmentPanel).toMatchSnapshot();
  });

  it('can use value getters', () => {
    const monitorTypeResult = sohEnvironmentPanel
      .find(EnvironmentPanel)
      .instance()
      .monitorTypeValueGetter({
        data: { id: SohTypes.SohMonitorType.ENV_ZEROED_DATA }
      });
    const channelValueResult = sohEnvironmentPanel
      .find(EnvironmentPanel)
      .instance()
      .channelValueGetter({
        data: {
          id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
        },
        colDef: {
          colId: 'channelName'
        }
      });
    expect(monitorTypeResult).toEqual(SohTypes.SohMonitorType.ENV_ZEROED_DATA);
    expect(channelValueResult).toEqual(1);
  });

  it('can handle isMonitorTypeColumn', () => {
    const params = {
      colDef: {
        colId: SohTypes.SohMonitorType.ENV_ZEROED_DATA
      },
      event: {
        metaKey: true,
        ctrlKey: true
      },
      data: {
        id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
      }
    };
    const result = sohEnvironmentPanel
      .find(EnvironmentPanel)
      .instance()
      .isMonitorTypeColumn(params);
    expect(result).toBeFalsy();
  });

  it('can handle onCellClicked', () => {
    const props = {
      colDef: {
        colId: 'Monitor Type'
      },
      data: {
        id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
      },
      event: {
        metaKey: true
      }
    };
    sohEnvironmentPanel.find(EnvironmentPanel).instance().onCellClicked(props);
    expect(sohEnvironmentPanel).toBeDefined();
  });

  it('can handle onCellContextMenu', () => {
    const props = {
      colDef: {
        colId: 'Monitor Type'
      },
      data: {
        id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
      },
      event: {
        metaKey: true
      }
    };
    sohEnvironmentPanel.find(EnvironmentPanel).instance().onCellContextMenu(props);
    expect(sohEnvironmentPanel).toBeDefined();
  });

  it('can handle onCellContextMenu not monitor type', () => {
    const props = {
      colDef: {
        colId: 'test'
      },
      data: {
        id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
      },
      event: {
        metaKey: true
      }
    };
    sohEnvironmentPanel.find(EnvironmentPanel).instance().onCellContextMenu(props);
    expect(sohEnvironmentPanel).toBeDefined();
  });
  it('can handle componentDidUpdate', () => {
    sohEnvironmentPanel.find(EnvironmentPanel).instance().componentDidUpdate();
    expect(sohEnvironmentPanel).toBeDefined();
  });

  it('can handle selectCells', () => {
    const params = {
      params: {
        colDef: {
          colId: 'Monitor Type'
        },
        event: {
          metaKey: true,
          ctrlKey: true
        },
        data: {
          id: SohTypes.SohMonitorType.ENV_ZEROED_DATA
        }
      },
      shouldRemoveIfExisting: true,
      callback: jest.fn()
    };
    sohEnvironmentPanel
      .find(EnvironmentPanel)
      .instance()
      .selectCells(params.params, params.shouldRemoveIfExisting, params.callback);
    expect(sohEnvironmentPanel).toBeDefined();
  });
});
