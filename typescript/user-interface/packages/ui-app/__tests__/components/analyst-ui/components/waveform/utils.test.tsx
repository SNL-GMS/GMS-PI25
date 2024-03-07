import {
  signalDetectionAsarAs01Shz,
  signalDetectionAsarAs02Shz,
  signalDetectionAsarAs31Bhz,
  signalDetectionAsarEventBeam,
  signalDetectionAsarFkBeams,
  signalDetectionOnRawBHN,
  signalDetectionOnRawBHZ,
  signalDetectionsData,
  tempSignalDetection
} from '@gms/common-model/__tests__/__data__';
import produce from 'immer';

import { getChannelLabelAndToolTipFromSignalDetections } from '~analyst-ui/components/waveform/utils';

// Avoid tests with multiple stations
let asarSignalDetections = signalDetectionsData.filter(sd => sd.station.name === 'ASAR');

describe('Waveform utils', () => {
  describe('getChannelLabelAndToolTipFromSignalDetections', () => {
    it('creates labels with the expected temp channel label and tooltip when only given temp channels', () => {
      expect(getChannelLabelAndToolTipFromSignalDetections([tempSignalDetection])).toMatchObject({
        channelLabel: 'temp.---'
      });
    });
    it('creates the expected label and tooltip message  for a single raw channel equal to the channel name', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([signalDetectionOnRawBHZ])
      ).toMatchObject({
        channelLabel: 'ULM.BHZ'
      });
    });
    it('creates the expected label and tooltip message for multiple signal detections on the same raw channel', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionOnRawBHZ,
          signalDetectionOnRawBHZ
        ])
      ).toMatchObject({
        channelLabel: 'ULM.BHZ'
      });
    });
    it('creates the expected label and tooltip message for multiple signal detections on different raw channels', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionOnRawBHZ,
          signalDetectionOnRawBHN
        ])
      ).toMatchObject({
        channelLabel: 'ULM.*',
        tooltip: 'Multiple raw channels'
      });
    });
    it('creates the expected label and tooltip message for multiple signal detections on different raw channels with the same channel code', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarAs01Shz,
          signalDetectionAsarAs02Shz
        ])
      ).toMatchObject({
        channelLabel: 'raw.SHZ',
        tooltip: 'Multiple raw channels'
      });
    });
    it('creates the expected label and tooltip message for multiple signal detections on different raw channels with different channel codes', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarAs01Shz,
          signalDetectionAsarAs02Shz,
          signalDetectionAsarAs31Bhz
        ])
      ).toMatchObject({
        channelLabel: 'raw.*',
        tooltip: 'Multiple raw channels'
      });
    });
    it('creates the expected label and tooltip message for an FK beam', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarFkBeams[0],
          signalDetectionAsarFkBeams[0]
        ])
      ).toMatchObject({
        channelLabel: 'beam.SHZ'
      });
    });
    it('creates the expected label and tooltip message for multiple beam types of shz channels', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarEventBeam,
          signalDetectionAsarFkBeams[0]
        ])
      ).toMatchObject({
        channelLabel: '*.SHZ',
        tooltip: 'Multiple beam types'
      });
    });
    it('creates the expected label and tooltip message for fk beams on different channel types', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections(signalDetectionAsarFkBeams)
      ).toMatchObject({
        channelLabel: 'beam.*',
        tooltip: 'Multiple channel types'
      });
    });
    it('creates the expected label and tooltip message for multiple beam types of mixed channels', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarEventBeam,
          signalDetectionAsarFkBeams[1]
        ])
      ).toMatchObject({
        channelLabel: '*',
        tooltip: 'Multiple beam and channel types'
      });
    });
    it('creates the expected label and tooltip message for a mix of beams and raw waveforms with different channel codes', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarFkBeams[0],
          signalDetectionAsarAs31Bhz
        ])
      ).toMatchObject({
        channelLabel: '*',
        tooltip: 'Multiple waveform and channel types'
      });
    });
    it('creates the expected label and tooltip message for a mix of beams and raw waveforms with the same channel codes', () => {
      expect(
        getChannelLabelAndToolTipFromSignalDetections([
          signalDetectionAsarAs01Shz,
          signalDetectionAsarFkBeams[0]
        ])
      ).toMatchObject({
        channelLabel: '*.SHZ',
        tooltip: 'Multiple waveform types'
      });
    });
    test('same channel names', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,fk,coherent',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,fk,coherent',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,fk,coherent',
          effectiveAt: 0
        };
      });

      const res = getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      expect(res.channelLabel).toMatch('beam.SHZ');
      expect(res.tooltip).toBeUndefined();
    });

    test('mixed channel orientations', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,fk,coherent',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.BHZ/beam,fk,coherent',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.BHZ/beam,fk,coherent',
          effectiveAt: 0
        };
      });
      const res = getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      expect(res.channelLabel).toMatch('beam.*');
      expect(res.tooltip).toMatch('Multiple channel types');
    });

    test('mixed beams', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,fk,coherent',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,event,coherent',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,detection,coherent',
          effectiveAt: 0
        };
      });
      const res = getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      expect(res.channelLabel).toMatch('*.SHZ');
      expect(res.tooltip).toMatch('Multiple beam types');
    });

    test('mixed beams and channel orientations', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ/beam,event,coherent',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.BHZ/beam,fk,coherent',
          effectiveAt: 0
        };
      });
      const res = getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      expect(res.channelLabel).toMatch('*');
      expect(res.tooltip).toMatch('Multiple beam and channel types');
    });

    test('missing channel name', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: undefined,
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: undefined,
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: undefined,
          effectiveAt: 0
        };
      });
      expect(() => {
        getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      }).toThrow('Cannot get channel name. No channel name provided.');
    });

    test('bad channel name', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: '',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'foo',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'bar',
          effectiveAt: 0
        };
      });
      expect(() => {
        getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      }).toThrow('Cannot get channel name. No channel name provided.');
    });

    test('mismatched station and channel throws an error', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[1].signalDetectionHypotheses[0].station = {
          name: 'ASAR',
          effectiveAt: 0
        };
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'AAK.beam.SHZ',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ARCES.beam.SHZ',
          effectiveAt: 0
        };
      });
      expect(() => {
        getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      }).toThrow('Invalid signal detection. Station has channel from a different station.');
    });

    test('not same station throws error', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].station = {
          name: 'ASAR',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].station = {
          name: 'AAK',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].station = {
          name: 'ARCES',
          effectiveAt: 0
        };
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ASAR.beam.SHZ',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'AAK.beam.SHZ',
          effectiveAt: 0
        };
        draft[2].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ARCES.beam.SHZ',
          effectiveAt: 0
        };
      });
      expect(() => {
        getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections);
      }).toThrow('Cannot build a row label out of channels from multiple stations.');
    });

    test('not 3 channel elements', () => {
      asarSignalDetections = produce(asarSignalDetections, draft => {
        draft[0].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ele1.ele2.ele3.ele4',
          effectiveAt: 0
        };
        draft[1].signalDetectionHypotheses[0].featureMeasurements[0].channel = {
          name: 'ele1.ele2.ele3.ele4',
          effectiveAt: 0
        };
      });
      expect(() => getChannelLabelAndToolTipFromSignalDetections(asarSignalDetections)).toThrow(
        'Cannot get channel name. Channel name format invalid. Channel name must have a three-part STATION.GROUP.CODE format'
      );
    });

    test('null signal detection list', () => {
      const res = getChannelLabelAndToolTipFromSignalDetections(null);
      expect(res.channelLabel).toMatch('');
      expect(res.tooltip).toBeUndefined();
    });

    test('empty signal detection list', () => {
      const res = getChannelLabelAndToolTipFromSignalDetections([]);
      expect(res.channelLabel).toMatch('');
      expect(res.tooltip).toBeUndefined();
    });
  });
});
