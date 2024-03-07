import { compose } from '@gms/common-util';
import type { AppState } from '@gms/ui-state';
import { analystActions, AnalystWorkspaceOperations } from '@gms/ui-state';
import * as ReactRedux from 'react-redux';
import { bindActionCreators } from 'redux';

import { AzimuthSlownessDataInjector } from './azimuth-slowness-data-injector';
import type { AzimuthSlownessReduxProps } from './types';

/**
 *  Mapping between the current redux state and props for the Azimuth Slowness Display
 */
const mapStateToProps = (state: AppState): Partial<AzimuthSlownessReduxProps> => ({
  viewableInterval: state.app.waveform ? state.app.waveform.viewableInterval : undefined,
  analysisMode: state.app.workflow ? state.app.workflow.analysisMode : undefined,
  openEventId: state.app.analyst.openEventId,
  sdIdsToShowFk: state.app.analyst.sdIdsToShowFk,
  location: state.app.analyst.location,
  selectedSortType: state.app.analyst.selectedSortType
});

/**
 * Map actions dispatch callbacks into this component as props
 */
const mapDispatchToProps = (dispatch): Partial<AzimuthSlownessReduxProps> =>
  bindActionCreators(
    {
      setSdIdsToShowFk: analystActions.setSdIdsToShowFk,
      setMeasurementModeEntries: AnalystWorkspaceOperations.setMeasurementModeEntries
    },
    dispatch
  );

export const AzimuthSlowness: React.ComponentClass<Pick<any, never>> = compose(
  ReactRedux.connect(mapStateToProps, mapDispatchToProps)
)(AzimuthSlownessDataInjector);
