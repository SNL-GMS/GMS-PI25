import type { StationTypes } from '@gms/common-model';
import { FormGroup } from '@gms/ui-core-components';
import React from 'react';

import { StringMultiSelect } from './string-multi-select';
/**
 * The type of the props for the {@link StationSelector} component
 */
export interface StationSelectorProps {
  placeholder: string;
  validStations: StationTypes.Station[];
  selectedStations: StationTypes.Station[];
  onChange: (selection: StationTypes.Station[]) => void;
}

/**
 * A multiselect input for stations
 */
export function StationSelector({
  placeholder,
  validStations,
  selectedStations,
  onChange
}: StationSelectorProps) {
  return (
    <FormGroup
      helperText="If none are selected, create beams for all loaded array stations without the current phase"
      label="Input Stations"
    >
      <StringMultiSelect
        values={React.useMemo(() => validStations?.map(station => station.name) ?? [], [
          validStations
        ])}
        selected={React.useMemo(() => selectedStations?.map(station => station.name) ?? [], [
          selectedStations
        ])}
        onChange={React.useCallback(
          selection => {
            onChange(validStations.filter(s => selection.includes(s.name)));
          },
          [onChange, validStations]
        )}
        placeholder={placeholder}
      />
    </FormGroup>
  );
}
