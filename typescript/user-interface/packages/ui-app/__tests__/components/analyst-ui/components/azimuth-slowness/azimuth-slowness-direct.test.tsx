/* eslint-disable react/jsx-props-no-spreading */
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { WorkflowTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { getTestFkData } from '@gms/ui-state/__tests__/__data__';
import { act, render } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import { getFkParams } from '~analyst-ui/common/utils/fk-utils';
import { FilterType } from '~analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnails-controls';
import { BaseDisplay } from '~common-ui/components/base-display';

import { AzimuthSlowness } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/azimuth-slowness-component';
import type { AzimuthSlownessProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/types';
import { configuration } from '../../../../__data__/azimuth-slowness';
import { azSlowProps } from '../../../../__data__/test-util-data';
import { glContainer } from '../workflow/gl-container';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');
// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const fkData = getTestFkData(1000);
const fkParams = getFkParams(fkData);
const buildAzimuthSlowness = (props: AzimuthSlownessProps): JSX.Element => {
  const store = getStore();
  const state = {
    displayedSignalDetectionId: signalDetectionsData[0].id
  };
  return (
    <Provider store={store}>
      <BaseDisplay glContainer={glContainer} />
      <AzimuthSlowness {...props} {...state} />
    </Provider>
  );
};

describe('AzimuthSlowness Direct', () => {
  // enzyme needs a new adapter for each configuration
  beforeEach(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  // Mounting enzyme into the DOM
  // Using a testing DOM not real DOM
  // So a few things will be missing window.fetch, or alert etc...
  const wrapper: ReactWrapper = Enzyme.mount(buildAzimuthSlowness({ ...(azSlowProps as any) }));
  const instance: AzimuthSlowness = wrapper.find(AzimuthSlowness).instance() as AzimuthSlowness;
  const anyInstance: any = instance;

  it('AzimuthSlowness snapshot', () => {
    const { container } = render(buildAzimuthSlowness(azSlowProps as AzimuthSlownessProps));
    expect(container).toMatchSnapshot();
  });

  it('componentDidUpdate openEventId changed', () => {
    expect(() => instance.componentDidUpdate({ ...(azSlowProps as any) })).not.toThrow();
    const prevProps = {
      ...azSlowProps,
      openEventId: undefined
    };
    expect(() => instance.componentDidUpdate(prevProps as any)).not.toThrow();
  });

  it('filter mode change in componentDidUpdate', () => {
    // Scan to Event Review
    const prevProps = {
      ...azSlowProps,
      analysisMode: WorkflowTypes.AnalysisMode.SCAN
    };
    expect(() => instance.componentDidUpdate(prevProps as any)).not.toThrow();

    // Event Review to Scan
    prevProps.analysisMode = WorkflowTypes.AnalysisMode.EVENT_REVIEW;
    const props = {
      ...azSlowProps,
      analysisMode: WorkflowTypes.AnalysisMode.SCAN
    };
    anyInstance.props = props;
    expect(() => anyInstance.componentDidUpdate(prevProps as any)).not.toThrow();
  });

  it('computeFkAndUpdateState', async () => {
    expect(fkParams).toBeDefined();
    expect(
      await act(async () => {
        await anyInstance.computeFkAndUpdateState(fkParams, configuration);
      })
    ).toBeUndefined();
  });
  it('showOrGenerateSignalDetectionFk', async () => {
    expect(
      await act(async () => {
        await anyInstance.showOrGenerateSignalDetectionFk(azSlowProps.signalDetectionResults.data);
      })
    ).toBeUndefined();
  });

  it('test Associated and Unassociated methods', () => {
    const associatedSignalDetections = anyInstance.getAssociatedDetections();
    expect(associatedSignalDetections).toHaveLength(1);
    expect(anyInstance.getUnassociatedDetections(associatedSignalDetections)).toHaveLength(1);
  });

  it('test misc private methods', async () => {
    // Set thumbnail size
    const newSize = 56;
    await act(async () => {
      await anyInstance.updateFkThumbnailSize(newSize);
      await anyInstance.updateFkFilter(FilterType.needsReview);
    });
    expect(anyInstance.state.fkThumbnailSizePx).toEqual(newSize);
    expect(anyInstance.state.filterType).toEqual(FilterType.needsReview);
  });
});
