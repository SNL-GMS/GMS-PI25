import React from 'react';
import { CustomDataSource } from 'resium';

import { mapIanEntitiesToEntityComponent } from '~analyst-ui/components/map/ian-map-utils';
import type { IanMapDataSourceProps } from '~analyst-ui/components/map/types';

/**
 * Creates a CustomDataSource to add to the cesium map by converting an array of entities into entity components
 * and spreading them into the DataSource
 */
export function IanMapDataSource(props: IanMapDataSourceProps): JSX.Element {
  const {
    entities,
    leftClickHandler,
    rightClickHandler,
    doubleClickHandler,
    mouseEnterHandler,
    mouseLeaveHandler,
    name,
    onMount,
    show
  } = props;
  const entityComponents = mapIanEntitiesToEntityComponent(
    entities,
    leftClickHandler,
    rightClickHandler,
    doubleClickHandler,
    mouseEnterHandler,
    mouseLeaveHandler,
    onMount
  );
  return (
    <CustomDataSource name={name} show={show}>
      {...entityComponents}
    </CustomDataSource>
  );
}
