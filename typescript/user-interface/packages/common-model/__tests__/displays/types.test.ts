import {
  CommonDisplays,
  IanDisplays,
  isValidDisplayName,
  SohDisplays,
  toDisplayTitle
} from '../../src/ts/displays/types';

describe('display types', () => {
  test('exists', () => {
    expect(isValidDisplayName).toBeDefined();
    expect(toDisplayTitle).toBeDefined();
  });

  test('can check for valid display name', () => {
    [
      ...Object.values(CommonDisplays),
      ...Object.values(SohDisplays),
      ...Object.values(IanDisplays)
    ].forEach(d => {
      expect(isValidDisplayName(d)).toBeTruthy();
    });

    expect(isValidDisplayName('not valid')).toBeFalsy();
  });

  test('can get display title', () => {
    // COMMON
    expect(toDisplayTitle(CommonDisplays.SYSTEM_MESSAGES)).toMatchInlineSnapshot(
      `"System Messages"`
    );

    // SOH
    expect(toDisplayTitle(SohDisplays.SOH_OVERVIEW)).toMatchInlineSnapshot(`"Soh Overview"`);
    expect(toDisplayTitle(SohDisplays.STATION_STATISTICS)).toMatchInlineSnapshot(
      `"Station Statistics"`
    );
    expect(toDisplayTitle(SohDisplays.SOH_LAG)).toMatchInlineSnapshot(`"Soh Lag"`);
    expect(toDisplayTitle(SohDisplays.SOH_MISSING)).toMatchInlineSnapshot(`"Soh Missing"`);
    expect(toDisplayTitle(SohDisplays.SOH_ENVIRONMENT)).toMatchInlineSnapshot(`"Soh Environment"`);
    expect(toDisplayTitle(SohDisplays.SOH_ENVIRONMENT_TRENDS)).toMatchInlineSnapshot(
      `"Soh Environment Trends"`
    );
    expect(toDisplayTitle(SohDisplays.SOH_LAG_TRENDS)).toMatchInlineSnapshot(`"Soh Lag Trends"`);
    expect(toDisplayTitle(SohDisplays.SOH_MISSING_TRENDS)).toMatchInlineSnapshot(
      `"Soh Missing Trends"`
    );
    expect(toDisplayTitle(SohDisplays.SOH_TIMELINESS_TRENDS)).toMatchInlineSnapshot(
      `"Soh Timeliness Trends"`
    );
    expect(toDisplayTitle(SohDisplays.SOH_TIMELINESS)).toMatchInlineSnapshot(`"Soh Timeliness"`);
    expect(toDisplayTitle(SohDisplays.SOH_MAP)).toMatchInlineSnapshot(`"Soh Map"`);

    // IAN
    expect(toDisplayTitle(IanDisplays.EVENTS)).toMatchInlineSnapshot(`"Events"`);
    expect(toDisplayTitle(IanDisplays.MAP)).toMatchInlineSnapshot(`"Map"`);
    expect(toDisplayTitle(IanDisplays.SIGNAL_DETECTIONS)).toMatchInlineSnapshot(
      `"Signal Detections List"`
    );
    expect(toDisplayTitle(IanDisplays.STATION_PROPERTIES)).toMatchInlineSnapshot(
      `"Station Properties"`
    );
    expect(toDisplayTitle(IanDisplays.WAVEFORM)).toMatchInlineSnapshot(`"Waveform"`);
    expect(toDisplayTitle(IanDisplays.WORKFLOW)).toMatchInlineSnapshot(`"Workflow"`);
    expect(toDisplayTitle(IanDisplays.FILTERS)).toMatchInlineSnapshot(`"Filters"`);
    expect(toDisplayTitle(IanDisplays.AZIMUTH_SLOWNESS)).toMatchInlineSnapshot(
      `"Azimuth Slowness"`
    );
    expect(toDisplayTitle(IanDisplays.HISTORY)).toMatchInlineSnapshot(`"Undo/Redo"`);
  });
});
