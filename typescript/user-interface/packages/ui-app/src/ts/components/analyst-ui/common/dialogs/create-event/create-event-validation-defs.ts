import { MILLISECONDS_IN_SECOND } from '@gms/common-util';
import type { ValidationDefinition } from '@gms/ui-core-components';
import { useViewableInterval } from '@gms/ui-state';

/** Lat/Lon support 6 decimals in the database */
const latLonDecimalRegex = /^-?\d+(\.\d{1,6})?$/;

/** Depth supports 4 decimals in the database */
const depthDecimalRegex = /^-?\d+(\.\d{1,4})?$/;

const latitudeRange = 90;
const longitudeRange = 180;
const depthMin = -100;
const depthMax = 1000;

/** {@link ValidationDefinition}s pertaining to latitude */
export const latitudeValidationDefs: ValidationDefinition<string>[] = [
  {
    valueIsInvalid: lat => {
      return !latLonDecimalRegex.test(lat);
    },
    invalidMessage: { summary: 'Invalid latitude', intent: 'danger' }
  },
  {
    valueIsInvalid: lat => {
      const latFloat = parseFloat(lat);
      return latFloat > latitudeRange || latFloat < -latitudeRange;
    },
    invalidMessage: {
      summary: `Latitude must be between -${latitudeRange}° and ${latitudeRange}°`,
      intent: 'danger'
    }
  }
];

/** {@link ValidationDefinition}s pertaining to longitude */
export const longitudeValidationDefs: ValidationDefinition<string>[] = [
  {
    valueIsInvalid: lon => {
      return !latLonDecimalRegex.test(lon);
    },
    invalidMessage: { summary: 'Invalid longitude', intent: 'danger' }
  },
  {
    valueIsInvalid: lon => {
      const lonFloat = parseFloat(lon);
      return lonFloat > longitudeRange || lonFloat < -longitudeRange;
    },
    invalidMessage: {
      summary: `Longitude must be between -${longitudeRange}° and ${longitudeRange}°`,
      intent: 'danger'
    }
  }
];

/** {@link ValidationDefinition}s pertaining to depth */
export const depthValidationDefs: ValidationDefinition<string>[] = [
  {
    valueIsInvalid: depth => {
      return !depthDecimalRegex.test(depth);
    },
    invalidMessage: { summary: 'Invalid depth', intent: 'danger' }
  },
  {
    valueIsInvalid: depth => {
      const depthFloat = parseFloat(depth);
      return depthFloat >= depthMax || depthFloat < depthMin;
    },
    invalidMessage: {
      summary: `Depth must be between ${depthMin} (inclusive) and ${depthMax} (exclusive)`,
      intent: 'danger'
    }
  }
];

/**
 * @returns a {@link ValidationDefinition} that ensures the selected date
 * is within the viewable interval.
 */
export const useDateRangeValidationDefs = (): ValidationDefinition<Date>[] => {
  const [viewableInterval] = useViewableInterval();

  return [
    {
      valueIsInvalid: input => {
        return (
          input.getTime() < viewableInterval.startTimeSecs * MILLISECONDS_IN_SECOND ||
          input.getTime() > viewableInterval.endTimeSecs * MILLISECONDS_IN_SECOND
        );
      },
      invalidMessage: { summary: 'Event time outside of viewable interval', intent: 'danger' }
    }
  ];
};
