export enum IanDisplays {
  EVENTS = 'events',
  MAP = 'map',
  SIGNAL_DETECTIONS = 'signal-detections-list',
  STATION_PROPERTIES = 'station-properties',
  WAVEFORM = 'waveform',
  WORKFLOW = 'workflow',
  FILTERS = 'filters',
  AZIMUTH_SLOWNESS = 'azimuth-slowness',
  HISTORY = 'undo-redo'
}

export enum CommonDisplays {
  SYSTEM_MESSAGES = 'system-messages'
}

export enum SohDisplays {
  SOH_OVERVIEW = 'soh-overview',
  STATION_STATISTICS = 'station-statistics',
  SOH_LAG = 'soh-lag',
  SOH_MISSING = 'soh-missing',
  SOH_ENVIRONMENT = 'soh-environment',
  SOH_ENVIRONMENT_TRENDS = 'soh-environment-trends',
  SOH_LAG_TRENDS = 'soh-lag-trends',
  SOH_MISSING_TRENDS = 'soh-missing-trends',
  SOH_TIMELINESS_TRENDS = 'soh-timeliness-trends',
  SOH_TIMELINESS = 'soh-timeliness',
  SOH_MAP = 'soh-map'
}

export type DisplayNames = IanDisplays | CommonDisplays | SohDisplays;

const displayTitleOverrides = {
  [IanDisplays.HISTORY]: 'Undo/Redo'
};

/**
 * Type guard to check if a string is a valid display name. Display names are the strings
 * used to identify components that are passed to GoldenLayout, and are also used to define
 * the routes at which displays can be visited.
 *
 * @param candidateName a string to check
 * @returns whether the name is in one of the DisplayName enums
 */
export const isValidDisplayName = (candidateName: string): candidateName is DisplayNames =>
  Object.values<string>(IanDisplays).includes(candidateName) ||
  Object.values<string>(SohDisplays).includes(candidateName) ||
  Object.values<string>(CommonDisplays).includes(candidateName);

/**
 * Converts the enum to a human readable title so they can be kept in sync easier.
 * If the enum appears as a key in {@link displayTitleOverrides}, we simply return the
 * value from that record, with any provided prefix added.
 *
 * @param str a string to convert
 * @param prefix a string to append to the start of the converted title, such as `GMS: `
 * @returns a human readable title
 */
export const toDisplayTitle = (
  str: string,
  prefix?: string,
  splitChars: Record<string, string> = { '-': ' ', _: ' ', '/': '/' }
): string => {
  if (Object.keys(displayTitleOverrides).includes(str)) {
    return `${prefix ?? ''}${displayTitleOverrides[str]}`;
  }
  let displayString = str.toLowerCase();
  Object.keys(splitChars).forEach(key => {
    displayString = displayString
      .split(key)
      .map(entry => {
        return `${entry[0].toUpperCase()}${entry.substring(1, entry.length)}`;
      })
      .join(splitChars[key]);
  });
  return `${prefix ?? ''}${displayString}`;
};
