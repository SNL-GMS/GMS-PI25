import type React from 'react';

export const UNKNOWN = -1;
export const NOT_APPLICABLE = -2;

export interface Offset {
  left: number;
  top: number;
}

export interface DragCellProps {
  stationId: string;
  getSelectedStationIds(): string[];
  setSelectedStationIds(ids: string[]): void;
  getSingleDragImage(e: React.DragEvent): HTMLElement;
}
