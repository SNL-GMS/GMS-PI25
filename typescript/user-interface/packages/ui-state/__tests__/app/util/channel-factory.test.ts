/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { TypeUtil } from '@gms/common-model';
import { ChannelTypes, StationTypes } from '@gms/common-model';
import {
  filterDefinitionsData,
  PD01Channel,
  PD02Channel,
  pdar,
  processingMaskDefinition,
  responseData
} from '@gms/common-model/__tests__/__data__';
import { beamDefinition } from '@gms/common-model/__tests__/__data__/beamforming-templates/beamforming-templates-data';
import { Units } from '@gms/common-model/lib/common/types';
import {
  ChannelBandType,
  ChannelInstrumentType,
  ChannelOrientationType
} from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import { toOSDTime } from '@gms/common-util';
import cloneDeep from 'lodash/cloneDeep';

import { ChannelFactory } from '../../../src/ts/app/util';
import {
  buildConfiguredInputsFromStation,
  buildSortedArrayFromRecord,
  createFilterAttributesForChannelName,
  generateChannelDataForHash,
  generateChannelHash,
  generateChannelJsonString,
  getChannelDataTypeFromStation
} from '../../../src/ts/app/util/channel-factory-util';

describe('ChannelFactory', () => {
  describe('createFilterAttributesForChannelName', () => {
    it('Creates filter attributes correctly', () => {
      const filterAttr0 = createFilterAttributesForChannelName(filterDefinitionsData[0]);
      expect(filterAttr0).toBe('filter,filter def name-1');
    });
    it('Creates filter attributes correctly when they have / in the name', () => {
      const filterAttr0 = createFilterAttributesForChannelName(filterDefinitionsData[1]);
      expect(filterAttr0).toBe('filter,filter def name-2 | with slash');
    });
    it('returns an empty string if given an undefined filter', () => {
      const filterAttrEmpty = createFilterAttributesForChannelName(undefined);
      expect(filterAttrEmpty).toBe('');
    });
    it('returns an empty string if given a filter without a name', () => {
      const filterAttrEmpty = createFilterAttributesForChannelName({} as any);
      expect(filterAttrEmpty).toBe('');
    });
  });
  describe('generateChannelHash', () => {
    it('creates the expected JSON for a basic channel', () => {
      expect(generateChannelDataForHash(PD01Channel)).toMatchObject({
        channelBandType: PD01Channel.channelBandType,
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: null,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('creates the expected JSON for a channel with a response', () => {
      const PD01ChannelWithResponse: TypeUtil.Writeable<ChannelTypes.Channel> = cloneDeep(
        PD01Channel
      );
      PD01ChannelWithResponse.response = responseData;
      expect(generateChannelDataForHash(PD01ChannelWithResponse)).toMatchObject({
        channelBandType: PD01Channel.channelBandType,
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: responseData.id,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('creates the expected JSON for a channel with multiple configuredInputs', () => {
      const PD01ChannelWithConfiguredInputs: TypeUtil.Writeable<ChannelTypes.Channel> = cloneDeep(
        PD01Channel
      );
      PD01ChannelWithConfiguredInputs.configuredInputs = [
        {
          name: 'ASAR',
          effectiveAt: 0
        },
        {
          name: 'AAK',
          effectiveAt: 1
        }
      ];
      expect(generateChannelDataForHash(PD01ChannelWithConfiguredInputs)).toMatchObject({
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelBandType: PD01Channel.channelBandType,
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: null,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('gives the expected hash for the correct input', async () => {
      expect(await generateChannelHash(PD01Channel)).toBe(
        '0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4'
      );
    });
  });
  describe('buildSortedArrayFromRecord', () => {
    it('builds a sorted array containing objects with a key/value pair matching the record', () => {
      expect(buildSortedArrayFromRecord({ a: 1, y: 25, b: 2, z: 26, c: 3, x: 24 })).toMatchObject([
        { a: 1 },
        { b: 2 },
        { c: 3 },
        { x: 24 },
        { y: 25 },
        { z: 26 }
      ]);
    });
    it('handles empty records gracefully', () => {
      expect(buildSortedArrayFromRecord({})).toMatchObject([]);
    });
  });
  describe('createFiltered', () => {
    it('throws with expected error if given nullish channel', async () => {
      await expect(async () =>
        ChannelFactory.createFiltered(undefined, filterDefinitionsData[0])
      ).rejects.toThrow(`inputChannel may not be null`);
      await expect(async () =>
        ChannelFactory.createFiltered(null, filterDefinitionsData[0])
      ).rejects.toThrow(`inputChannel may not be null`);
    });
    it('throws with expected error if given nullish filter', async () => {
      await expect(async () =>
        ChannelFactory.createFiltered(PD01Channel, undefined)
      ).rejects.toThrow(`filterDefinition may not be null`);
      await expect(async () => ChannelFactory.createFiltered(PD01Channel, null)).rejects.toThrow(
        `filterDefinition may not be null`
      );
    });
    it('creates a filtered channel with the expected name', async () => {
      const filteredChan = await ChannelFactory.createFiltered(
        PD01Channel,
        filterDefinitionsData[0]
      );
      expect(filteredChan.name).toBe(
        'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6'
      );
    });
    it('creates a filtered channel as expected', async () => {
      const filteredChan = await ChannelFactory.createFiltered(
        PD01Channel,
        filterDefinitionsData[0]
      );
      expect(generateChannelJsonString({ ...filteredChan, name: filteredChan.name })).toBe(
        '{"channelBandType":"SHORT_PERIOD","channelDataType":"SEISMIC","channelInstrumentType":"HIGH_GAIN_SEISMOMETER","channelOrientationCode":"Z","channelOrientationType":"VERTICAL","configuredInputs":[{"effectiveAt":"2021-11-10T00:16:44.000Z","name":"PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6"}],"description":"Raw Channel created from ReferenceChannel 2fabc2d3-858b-3e85-9f47-e2ee72060f0b with version d767395c-850e-36f8-a6f2-a1c7398440e4 Filtered using a filter def name-1 filter.","location":{"latitudeDegrees":42.7765,"longitudeDegrees":-109.58314,"depthKm":0.0381,"elevationKm":2.192},"nominalSampleRateHz":20,"orientationAngles":{"horizontalAngleDeg":-1,"verticalAngleDeg":0},"processingDefinition":[{"comments":"the comments 1"},{"filterDescription":{"causal":false,"comments":"the description comments 1","filterType":"IIR_BUTTERWORTH","highFrequency":1,"lowFrequency":0.5,"order":1,"parameters":{"aCoefficients":[0.1,1],"bCoefficients":[1.1,1.2],"groupDelaySec":"PT3S","sampleRateHz":40,"sampleRateToleranceHz":2},"passBandType":"BAND_PASS","zeroPhase":false}},{"name":"filter def name-1"}],"processingMetadata":[{"CHANNEL_GROUP":"PD01"},{"FILTER_CAUSALITY":false},{"FILTER_TYPE":"IIR_BUTTERWORTH"}],"response":null,"station":"PDAR","units":"NANOMETERS_PER_COUNT"}'
      );
      expect(filteredChan).toMatchObject({
        canonicalName:
          'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6',
        channelBandType: PD01Channel.channelBandType,
        channelDataType: PD01Channel.channelDataType,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelOrientationType: PD01Channel.channelOrientationType,
        configuredInputs: [{ effectiveAt: PD01Channel.effectiveAt, name: PD01Channel.name }],
        description: `${PD01Channel.description} Filtered using a filter def name-1 filter.`,
        effectiveAt: PD01Channel.effectiveAt,
        effectiveForRequestTime: PD01Channel.effectiveForRequestTime,
        effectiveUntil: PD01Channel.effectiveUntil,
        location: PD01Channel.location,
        name:
          'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6',
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        processingDefinition: {
          comments: 'the comments 1',
          filterDescription: {
            causal: false,
            comments: 'the description comments 1',
            filterType: 'IIR_BUTTERWORTH',
            highFrequency: 1,
            lowFrequency: 0.5,
            order: 1,
            parameters: {
              aCoefficients: [0.1, 1],
              bCoefficients: [1.1, 1.2],
              groupDelaySec: 'PT3S',
              sampleRateHz: 40,
              sampleRateToleranceHz: 2
            },
            passBandType: 'BAND_PASS',
            zeroPhase: false
          },
          name: 'filter def name-1'
        },
        processingMetadata: {
          CHANNEL_GROUP: 'PD01',
          FILTER_CAUSALITY: false,
          FILTER_TYPE: 'IIR_BUTTERWORTH'
        },
        response: undefined,
        station: PD01Channel.station,
        units: PD01Channel.units
      });
    });
  });
  describe('createTemporary', () => {
    it('creates a temporary channel based on the input station', async () => {
      const temporaryChannel = await ChannelFactory.createTemporary(pdar);

      expect(temporaryChannel).toMatchObject({
        channelBandType: ChannelBandType.UNKNOWN,
        // We will need to confirm the name hash against the backend when its implemented
        canonicalName:
          'PDAR.temp.---/f35bbadd05a63784d9b7b0f83758f26eafac43d5bad3701f712b14105c96cafd',
        channelOrientationCode: ChannelOrientationType.UNKNOWN,
        configuredInputs: buildConfiguredInputsFromStation(pdar),
        channelDataType: getChannelDataTypeFromStation(pdar),
        description: 'Temporary Channel for Station PDAR.',
        effectiveAt: 1636503404,
        effectiveUntil: 1660701599.984,
        effectiveForRequestTime: null,
        channelInstrumentType: ChannelInstrumentType.UNKNOWN,
        location: {
          latitudeDegrees: 42.76738,
          longitudeDegrees: -109.5579,
          depthKm: 0,
          elevationKm: 2.215
        },
        // We will need to confirm the name hash against the backend when its implemented
        name: 'PDAR.temp.---/f35bbadd05a63784d9b7b0f83758f26eafac43d5bad3701f712b14105c96cafd',
        nominalSampleRateHz: null,
        orientationAngles: { horizontalAngleDeg: null, verticalAngleDeg: null },
        channelOrientationType: ChannelOrientationType.UNKNOWN,
        processingDefinition: {},
        processingMetadata: {},
        response: null,
        station: { effectiveAt: 1636503404, name: 'PDAR' },
        units: Units.UNITLESS
      });
    });

    it('throws an error if the station is null or undefined', async () => {
      await expect(async () => ChannelFactory.createTemporary(undefined)).rejects.toThrow(
        `inputStation may not be null`
      );

      await expect(async () => ChannelFactory.createTemporary(null)).rejects.toThrow(
        `inputStation may not be null`
      );
    });

    it('throws an error if the station is station type is unknown', async () => {
      const bad = { ...cloneDeep(pdar), type: 'BAD' };

      await expect(async () =>
        ChannelFactory.createTemporary((bad as unknown) as StationTypes.Station)
      ).rejects.toThrow('There is no StationType to ChannelDataType map');
    });
  });

  describe('createMasked', () => {
    it('throws with expected error if given nullish channel', async () => {
      await expect(async () =>
        ChannelFactory.createMasked(undefined, processingMaskDefinition)
      ).rejects.toThrow(`inputChannel may not be null`);
      await expect(async () =>
        ChannelFactory.createMasked(null, processingMaskDefinition)
      ).rejects.toThrow(`inputChannel may not be null`);
    });
    it('throws with expected error if given nullish filter', async () => {
      await expect(async () => ChannelFactory.createMasked(PD01Channel, undefined)).rejects.toThrow(
        `processingMaskDefinition may not be null`
      );
      await expect(async () => ChannelFactory.createMasked(PD01Channel, null)).rejects.toThrow(
        `processingMaskDefinition may not be null`
      );
    });
    it('creates a masked channel with the expected name', async () => {
      const maskedChan = await ChannelFactory.createMasked(PD01Channel, processingMaskDefinition);
      expect(maskedChan.name).toBe(
        'PDAR.PD01.SHZ/masked/0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4'
      );
    });
    it('creates a masked channel as expected', async () => {
      const maskedChan = await ChannelFactory.createMasked(PD01Channel, processingMaskDefinition);
      expect(generateChannelJsonString({ ...maskedChan, name: maskedChan.name })).toBe(
        '{"channelBandType":"SHORT_PERIOD","channelDataType":"SEISMIC","channelInstrumentType":"HIGH_GAIN_SEISMOMETER","channelOrientationCode":"Z","channelOrientationType":"VERTICAL","configuredInputs":[{"effectiveAt":"2021-11-10T00:16:44.000Z","name":"PDAR.PD01.SHZ/masked/0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4"}],"description":"Raw Channel created from ReferenceChannel 2fabc2d3-858b-3e85-9f47-e2ee72060f0b with version d767395c-850e-36f8-a6f2-a1c7398440e4 Masked samples removed.","location":{"latitudeDegrees":42.7765,"longitudeDegrees":-109.58314,"depthKm":0.0381,"elevationKm":2.192},"nominalSampleRateHz":20,"orientationAngles":{"horizontalAngleDeg":-1,"verticalAngleDeg":0},"processingDefinition":[{"appliedQcSegmentCategoryAndTypes":{"category":"ANALYST_DEFINED","type":"AGGREGATE"}},{"maskedSegmentMergeThreshold":50},{"processingOperation":"EVENT_BEAM"}],"processingMetadata":[{"CHANNEL_GROUP":"PD01"}],"response":null,"station":"PDAR","units":"NANOMETERS_PER_COUNT"}'
      );
      expect(maskedChan).toMatchObject({
        canonicalName:
          'PDAR.PD01.SHZ/masked/0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4',
        channelBandType: PD01Channel.channelBandType,
        channelDataType: PD01Channel.channelDataType,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelOrientationType: PD01Channel.channelOrientationType,
        configuredInputs: [{ effectiveAt: PD01Channel.effectiveAt, name: PD01Channel.name }],
        description: `${PD01Channel.description} Masked samples removed.`,
        effectiveAt: PD01Channel.effectiveAt,
        effectiveForRequestTime: PD01Channel.effectiveForRequestTime,
        effectiveUntil: PD01Channel.effectiveUntil,
        location: PD01Channel.location,
        name:
          'PDAR.PD01.SHZ/masked/0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4',
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        processingDefinition: processingMaskDefinition,
        processingMetadata: {
          CHANNEL_GROUP: 'PD01'
        },
        response: undefined,
        station: PD01Channel.station,
        units: PD01Channel.units
      });
    });
  });

  describe('createBeamed', () => {
    it('throws with expected error if given nullish channel', async () => {
      await expect(async () =>
        ChannelFactory.createBeamed(undefined, beamDefinition)
      ).rejects.toThrow(`inputChannels array may not be null or empty`);
      await expect(async () => ChannelFactory.createBeamed(null, beamDefinition)).rejects.toThrow(
        `inputChannels array may not be null or empty`
      );
      await expect(async () => ChannelFactory.createBeamed([], beamDefinition)).rejects.toThrow(
        `inputChannels array may not be null or empty`
      );
    });
    it('throws with expected error if given nullish definition', async () => {
      await expect(async () =>
        ChannelFactory.createBeamed([PD01Channel], undefined)
      ).rejects.toThrow(`beamDefinition may not be null`);
      await expect(async () => ChannelFactory.createBeamed([PD01Channel], null)).rejects.toThrow(
        `beamDefinition may not be null`
      );
    });
    it('throws with expected error if given a version or entity reference station', async () => {
      const versionPD01 = { ...PD01Channel, station: { name: 'pdar', effectiveAt: '100' } };

      await expect(async () =>
        ChannelFactory.createBeamed([PD01Channel], beamDefinition)
      ).rejects.toThrow(`the first channel must have a fully populated station`);
      await expect(async () =>
        ChannelFactory.createBeamed([versionPD01], beamDefinition)
      ).rejects.toThrow(`the first channel must have a fully populated station`);
    });
    it('creates a beamed channel as expected', async () => {
      const populatedPD01 = { ...PD01Channel, station: pdar };
      const populatedPD02 = { ...PD02Channel, station: pdar };
      const beamedChan = await ChannelFactory.createBeamed(
        [populatedPD01, populatedPD02],
        beamDefinition
      );

      expect(beamedChan).toMatchSnapshot();
    });
  });

  describe('buildConfiguredInputsFromStation', () => {
    it('builds configured inputs', () => {
      const configuredInputs = buildConfiguredInputsFromStation(pdar);

      expect(configuredInputs).toHaveLength(pdar.allRawChannels.length);
      expect(configuredInputs[0]).toMatchObject({
        effectiveAt: pdar.allRawChannels[0].effectiveAt,
        name: pdar.allRawChannels[0].name
      });
      expect(configuredInputs[1]).toMatchObject({
        effectiveAt: pdar.allRawChannels[1].effectiveAt,
        name: pdar.allRawChannels[1].name
      });
      expect(configuredInputs[2]).toMatchObject({
        effectiveAt: pdar.allRawChannels[2].effectiveAt,
        name: pdar.allRawChannels[2].name
      });
    });
  });

  describe('getChannelDataTypeFromStation', () => {
    it('will return the correct ChannelDataType for the given StationType', () => {
      // getChannelDataTypeFromStation(pdar)
      const s1 = { ...cloneDeep(pdar), type: StationTypes.StationType.SEISMIC_1_COMPONENT };
      const s3 = { ...cloneDeep(pdar), type: StationTypes.StationType.SEISMIC_3_COMPONENT };
      const sa = { ...cloneDeep(pdar), type: StationTypes.StationType.SEISMIC_ARRAY };
      const h = { ...cloneDeep(pdar), type: StationTypes.StationType.HYDROACOUSTIC };
      const ha = { ...cloneDeep(pdar), type: StationTypes.StationType.HYDROACOUSTIC_ARRAY };
      const i = { ...cloneDeep(pdar), type: StationTypes.StationType.INFRASOUND };
      const ia = { ...cloneDeep(pdar), type: StationTypes.StationType.INFRASOUND_ARRAY };
      const w = { ...cloneDeep(pdar), type: StationTypes.StationType.WEATHER };
      const u = { ...cloneDeep(pdar), type: StationTypes.StationType.UNKNOWN };

      expect(getChannelDataTypeFromStation(s1)).toBe(ChannelTypes.ChannelDataType.SEISMIC);
      expect(getChannelDataTypeFromStation(s3)).toBe(ChannelTypes.ChannelDataType.SEISMIC);
      expect(getChannelDataTypeFromStation(sa)).toBe(ChannelTypes.ChannelDataType.SEISMIC);

      expect(getChannelDataTypeFromStation(h)).toBe(ChannelTypes.ChannelDataType.HYDROACOUSTIC);
      expect(getChannelDataTypeFromStation(ha)).toBe(ChannelTypes.ChannelDataType.HYDROACOUSTIC);

      expect(getChannelDataTypeFromStation(i)).toBe(ChannelTypes.ChannelDataType.INFRASOUND);
      expect(getChannelDataTypeFromStation(ia)).toBe(ChannelTypes.ChannelDataType.INFRASOUND);

      expect(getChannelDataTypeFromStation(w)).toBe(ChannelTypes.ChannelDataType.WEATHER);
      expect(getChannelDataTypeFromStation(u)).toBe(ChannelTypes.ChannelDataType.UNKNOWN);
    });

    it('will return undefined if the mapping is unknown', () => {
      const bad = { ...cloneDeep(pdar), type: 'BAD' };

      expect(getChannelDataTypeFromStation((bad as unknown) as StationTypes.Station)).toBe(
        undefined
      );
    });
  });
});
