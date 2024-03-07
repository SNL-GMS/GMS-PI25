/* eslint-disable react/destructuring-assignment */
import type { EventTypes, FkTypes, SignalDetectionTypes } from '@gms/common-model';
import type { FkChannelSegmentRecord } from '@gms/ui-state';
import { useGetFkChannelSegments } from '@gms/ui-state';
import type Immutable from 'immutable';
import findIndex from 'lodash/findIndex';
import findLastIndex from 'lodash/findLastIndex';
import React, { useEffect } from 'react';

import { getFkData, getFkUnitForSdId } from '../../../../common/utils/fk-utils';
import { fkNeedsReview } from '../fk-util';
import { FkThumbnailContainer } from './fk-thumbnail-container';

/**
 * Fk Thumbnails Props
 */
export interface FkThumbnailListProps {
  sortedSignalDetections: SignalDetectionTypes.SignalDetection[];
  unassociatedSignalDetections: SignalDetectionTypes.SignalDetection[];
  signalDetectionIdsToFeaturePrediction: Immutable.Map<string, EventTypes.FeaturePrediction[]>;
  thumbnailSizePx: number;
  fkUnitsForEachSdId: Immutable.Map<string, FkTypes.FkUnits>;
  arrivalTimeMovieSpectrumIndex: number;
  displayedSignalDetection: SignalDetectionTypes.SignalDetection;
  selectedSdIds: string[];
  setDisplayedSignalDetection(sd: SignalDetectionTypes.SignalDetection): void;
  setSelectedSdIds(sdIds: string[]): void;
  showFkThumbnailContextMenu(event: React.MouseEvent): void;
}

/**
 * List of fk thumbnails with controls for filtering them
 */
export function FkThumbnailList(props: FkThumbnailListProps) {
  const fkChannelSegments: FkChannelSegmentRecord = useGetFkChannelSegments();
  /**
   * Automatically selects an fk when an event is loaded
   */
  useEffect(() => {
    // If no displayedSignalDetection is selected or
    // displayedSignalDetection is no longer in sortedSignalDetections list
    if (
      !props.displayedSignalDetection ||
      !props.sortedSignalDetections.find(sd => sd.id === props.displayedSignalDetection.id)
    ) {
      // Walk thru the list to find first that needs review
      let selectedSd = props.sortedSignalDetections
        .filter(
          sd =>
            !props.unassociatedSignalDetections.find(unassociatedSd => unassociatedSd.id === sd.id)
        )
        .find(sd => fkNeedsReview(sd, getFkData(sd, fkChannelSegments)));

      // If not found from needs review then take first available with FkData
      if (!selectedSd) {
        selectedSd = props.sortedSignalDetections.find(
          sd => getFkData(sd, fkChannelSegments) !== undefined
        );
      }

      // If found a new one set the selected id
      if (selectedSd) {
        props.setSelectedSdIds([selectedSd.id]);
        props.setDisplayedSignalDetection(selectedSd);
      }
    } else if (props.displayedSignalDetection && props.selectedSdIds.length === 0) {
      props.setSelectedSdIds([props.displayedSignalDetection.id]);
    } else if (props.sortedSignalDetections.length === 0) {
      props.setSelectedSdIds([]);
      props.setDisplayedSignalDetection(undefined);
    }
  }, [fkChannelSegments, props]);

  /**
   * onKeyDown event handler for selecting multiple fk at once
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.repeat) {
      return;
    }

    if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      // Shift + CmrOrCtrl + a ==> add all to current selection
      const selectedIds: string[] = props.selectedSdIds;
      props.sortedSignalDetections.forEach(sd => {
        if (props.selectedSdIds.indexOf(sd.id) === -1) {
          selectedIds.push(sd.id);
        }
      });
      props.setSelectedSdIds(selectedIds);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      // CmrOrCtrl + a ==> select all
      const selectedIds: string[] = [...props.sortedSignalDetections.map(sd => sd.id)];
      props.setSelectedSdIds(selectedIds);
    } else if (e.key.toLowerCase() === 'escape') {
      // Escape ==> deselect all
      props.setSelectedSdIds([]);
      props.setDisplayedSignalDetection(undefined);
    }
  }

  /**
   * Builds the selected SD id list
   *
   * @param sdId selected SD
   * @returns selected SD id list
   */
  function buildMultiSelectedIds(sdId: string): string[] {
    // shift range selection
    const selectedIds = [...props.selectedSdIds];
    const fkIds: string[] = props.sortedSignalDetections.map(sd => sd.id);
    const selectedIndex: number = fkIds.indexOf(sdId);
    const minIndex: number = findIndex(fkIds, i => selectedIds.indexOf(i) !== -1);
    const maxIndex: number = findLastIndex(fkIds, i => selectedIds.indexOf(i) !== -1);
    fkIds.forEach(i => {
      if (selectedIds.indexOf(i) === -1) {
        const index: number = fkIds.indexOf(i);
        if (
          (index >= selectedIndex && index < minIndex) ||
          (index > maxIndex && index <= selectedIndex)
        ) {
          selectedIds.push(i);
        }
      }
    });
    return selectedIds;
  }

  /**
   * Selects a slicked thumbnail
   */
  function onThumbnailClick(e: React.MouseEvent<HTMLCanvasElement>, id: string): void {
    // Ignore signal detections where the FK is not available
    const sdToAdd = props.sortedSignalDetections.find(s => s.id === id);
    if (!getFkData(sdToAdd, fkChannelSegments)) {
      return;
    }
    let selectedIds: string[];
    if (e.shiftKey && props.selectedSdIds.length > 0) {
      selectedIds = buildMultiSelectedIds(id);
    } else if (e.ctrlKey || e.metaKey) {
      // add/remove to current selection
      selectedIds = [...props.selectedSdIds];

      if (selectedIds.indexOf(id) >= 0) {
        selectedIds = selectedIds.splice(selectedIds.indexOf(id), 1);
      } else {
        selectedIds.push(id);
      }
    } else {
      selectedIds = [id];
      props.setDisplayedSignalDetection(props.sortedSignalDetections.find(sd => sd.id === id));
    }
    props.setSelectedSdIds(selectedIds);
  }

  /**
   * Renders the component.
   */
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="azimuth-slowness-thumbnails__wrapper-3"
      onKeyDown={onKeyDown}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      key="fk-thumbnails"
    >
      {props.sortedSignalDetections.map(sd => (
        <FkThumbnailContainer
          key={sd.id}
          data={sd}
          signalDetectionFeaturePredictions={
            props.signalDetectionIdsToFeaturePrediction.has(sd.id)
              ? props.signalDetectionIdsToFeaturePrediction.get(sd.id)
              : []
          }
          sizePx={props.thumbnailSizePx}
          selected={props.selectedSdIds.indexOf(sd.id) >= 0}
          onClick={(e: React.MouseEvent<HTMLCanvasElement>) => onThumbnailClick(e, sd.id)}
          fkUnit={getFkUnitForSdId(sd.id, props.fkUnitsForEachSdId)}
          isUnassociated={
            props.unassociatedSignalDetections.find(unSd => unSd.id === sd.id) !== undefined
          }
          // eslint-disable-next-line @typescript-eslint/unbound-method
          showFkThumbnailMenu={props.showFkThumbnailContextMenu}
          arrivalTimeMovieSpectrumIndex={props.arrivalTimeMovieSpectrumIndex}
          selectedFk={getFkData(sd, fkChannelSegments)}
        />
      ))}
    </div>
  );
}
