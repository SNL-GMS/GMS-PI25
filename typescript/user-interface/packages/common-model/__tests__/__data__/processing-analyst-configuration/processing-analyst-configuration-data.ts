import { ConfigurationTypes } from '../../../src/ts/common-model';

/* eslint-disable @typescript-eslint/no-magic-numbers */
export const processingAnalystConfigurationData: ConfigurationTypes.ProcessingAnalystConfiguration = {
  defaultNetwork: 'demo',
  defaultInteractiveAnalysisStationGroup: 'ALL_1',
  defaultSDTimeUncertainty: 0,
  currentIntervalEndTime: 1642764648,
  currentIntervalDuration: 7200,
  maximumOpenAnythingDuration: 7200,
  leadBufferDuration: 900,
  lagBufferDuration: 900,
  minimumRequestDuration: 900,
  waveformPanningBoundaryDuration: 3600,
  waveformPanRatio: 0.75,
  fixedAmplitudeScaleValues: [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  priorityPhases: ['P', 'Pn', 'Pg', 'S', 'Sn', 'Lg', 'Rg', 'pP', 'sP'],
  zasDefaultAlignmentPhase: 'P',
  zasZoomInterval: 60,
  phaseLists: [
    {
      favorites: [
        'P',
        'Pn',
        'Pg',
        'pP',
        'S',
        'PKP',
        'PKPdf',
        'PKPbc',
        'PKPab',
        'PcP',
        'ScP',
        'Sn',
        'Lg',
        'Rg',
        'sP'
      ],
      defaultPhaseLabelAssignment: 'P',
      listTitle: 'Seismic & Hydroacoustic',
      categorizedPhases: [
        {
          categoryTitle: 'Crust',
          phases: [
            'Lg',
            'LQ',
            'LR',
            'Pb',
            'Pg',
            'PmP',
            'Pn',
            'PnPn',
            'Rg',
            'Sb',
            'Sg',
            'Sn',
            'SnSn'
          ]
        },
        {
          categoryTitle: 'Mantle',
          phases: [
            'P',
            'PcP',
            'PcS',
            'Pdiff',
            'PP',
            'pP',
            'PP_1',
            'PP_B',
            'pPdiff',
            'PPP',
            'PPP_B',
            'PPS',
            'PPS_B',
            'PS',
            'pS',
            'PS_1',
            'pSdiff',
            'S',
            'ScP',
            'ScS',
            'Sdiff',
            'SP',
            'sP',
            'SP_1',
            'sPdiff',
            'SS',
            'sS',
            'SS_B',
            'sSdiff',
            'SSS',
            'SSS_B'
          ]
        },
        {
          categoryTitle: 'Core',
          phases: [
            'P3KPdf_B',
            'P3KP',
            'P3KPbc',
            'P3KPdf',
            'P4KP',
            'P4KPbc',
            'P4KPdf',
            'P4KPdf_B',
            'P5KP',
            'P5KPbc',
            'P5KPbc_B',
            'P5KPdf',
            'P5KPdf_B',
            'P5KPdf_C',
            'P7KP',
            'P7KPbc',
            'P7KPbc_B',
            'P7KPbc_C',
            'P7KPdf',
            'P7KPdf_B',
            'P7KPdf_C',
            'P7KPdf_D',
            'PKiKP',
            'PKKP',
            'PKKPab',
            'PKKPbc',
            'PKKPdf',
            'PKKS',
            'PKKSab',
            'PKKSbc',
            'PKKSdf',
            'PKP',
            'PKP2',
            'PKP2ab',
            'PKP2bc',
            'PKP2df',
            'PKP3',
            'PKP3ab',
            'PKP3bc',
            'PKP3df',
            'PKP3df_B',
            'PKPab',
            'PKPbc',
            'PKPdf',
            'PKPPKP',
            'PKS',
            'PKSab',
            'PKSbc',
            'PKSdf',
            'pPKiKP',
            'pPKP',
            'pPKPab',
            'pPKPbc',
            'pPKPdf',
            'pSKS',
            'pSKSac',
            'pSKSdf',
            'SKiKP',
            'SKKP',
            'SKKPab',
            'SKKPbc',
            'SKKPdf',
            'SKKS',
            'SKKSac',
            'SKKSac_B',
            'SKKSdf',
            'SKP',
            'SKPab',
            'SKPdf',
            'SKS',
            'SKS2',
            'SKS2ac',
            'SKS2df',
            'SKSac',
            'SKSdf',
            'SKSSKS',
            'sPKiKP',
            'sPKP',
            'sPKPab',
            'sPKPbc',
            'sPKPdf',
            'sSKS',
            'sSKSac',
            'sSKSdf'
          ]
        },
        {
          categoryTitle: 'Hydro',
          phases: ['T', 'H']
        },
        {
          categoryTitle: 'Noise',
          phases: ['N', 'nNL', 'NP', 'nP', 'NP_1']
        },
        {
          categoryTitle: 'Unidentified',
          phases: ['IPx', 'Px', 'Sx', 'Tx', 'tx', 'L']
        }
      ]
    },
    {
      favorites: ['Iw'],
      defaultPhaseLabelAssignment: 'Iw',
      listTitle: 'Infrasound',
      categorizedPhases: [
        {
          categoryTitle: 'Tropospheric',
          phases: ['It']
        },
        {
          categoryTitle: 'Stratospheric',
          phases: ['Is']
        },
        {
          categoryTitle: 'Thermospheric',
          phases: ['Iw']
        },
        {
          categoryTitle: 'Unidentified',
          phases: ['Ix']
        }
      ]
    }
  ],
  gmsFilters: {
    defaultTaper: 0,
    defaultRemoveGroupDelay: false,
    defaultSampleRateToleranceHz: 0.01,
    defaultGroupDelaySecs: 0,
    defaultDesignedSampleRates: [1, 4, 20, 50, 40, 80, 100]
  },
  defaultFilters: [
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 0.7,
      filterSource: 'SYSTEM',
      sampleRate: 20,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 0.70-2.00 Hz',
      id: '48fd578e-e428-43ff-9f9e-62598e7e6ce6',
      bCoefficients: [
        0.00154277211073,
        0.00223135962309,
        0.00273104312013,
        0.00280258383269,
        0.00217656734384,
        0.000812768009294,
        -0.000856234196934,
        -0.00192237976758,
        -0.0013754340351,
        0.00122672506506,
        0.00510147945921,
        0.0080189420631,
        0.00682513728192,
        -0.00129622159881,
        -0.0172316219193,
        -0.0387105481955,
        -0.0601389046705,
        -0.0738477944677,
        -0.0725367436799,
        -0.0521167800143,
        -0.0138536966861,
        0.0351522813688,
        0.0835493685776,
        0.118991116265,
        0.131989358502,
        0.118991116265,
        0.0835493685776,
        0.0351522813688,
        -0.0138536966861,
        -0.0521167800143,
        -0.0725367436799,
        -0.0738477944677,
        -0.0601389046705,
        -0.0387105481955,
        -0.0172316219193,
        -0.00129622159881,
        0.00682513728192,
        0.0080189420631,
        0.00510147945921,
        0.00122672506506,
        -0.0013754340351,
        -0.00192237976758,
        -0.000856234196934,
        0.000812768009294,
        0.00217656734384,
        0.00280258383269,
        0.00273104312013,
        0.00223135962309,
        0.00154277211073
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 2,
      description: 'Hamming FIR Filter Band Pass, 0.70-2.00 Hz',
      groupDelaySecs: 1.2
    },
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 0.7,
      filterSource: 'SYSTEM',
      sampleRate: 40,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 0.70-2.00 Hz',
      id: '0351d87a-fde9-43e2-8754-84a1d797fbc1',
      bCoefficients: [
        0.000691445600541,
        0.000377468642363,
        -0.000141332631077,
        -0.00104244005645,
        -0.00253223392526,
        -0.00479588548886,
        -0.00793853477407,
        -0.0119288321892,
        -0.0165568182648,
        -0.0214168344392,
        -0.025922780948,
        -0.0293580295881,
        -0.0309564399352,
        -0.0300051904366,
        -0.0259555234352,
        -0.0185248746457,
        -0.00777377388799,
        0.00585647979045,
        0.0215543407194,
        0.0381989801021,
        0.0544665117815,
        0.0689693454386,
        0.0804111587258,
        0.0877370790275,
        0.0902587505603,
        0.0877370790275,
        0.0804111587258,
        0.0689693454386,
        0.0544665117815,
        0.0381989801021,
        0.0215543407194,
        0.00585647979045,
        -0.00777377388799,
        -0.0185248746457,
        -0.0259555234352,
        -0.0300051904366,
        -0.0309564399352,
        -0.0293580295881,
        -0.025922780948,
        -0.0214168344392,
        -0.0165568182648,
        -0.0119288321892,
        -0.00793853477407,
        -0.00479588548886,
        -0.00253223392526,
        -0.00104244005645,
        -0.000141332631077,
        0.000377468642363,
        0.000691445600541
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 2,
      description: 'Hamming FIR Filter Band Pass, 0.70-2.00 Hz',
      groupDelaySecs: 0.6
    },
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 1,
      filterSource: 'SYSTEM',
      sampleRate: 20,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 1.00-3.00 Hz',
      id: '56893621-d9a1-4cfd-830a-13969f9d2aad',
      bCoefficients: [
        -0.00162968132747,
        -0.00057971845183,
        0.000501918055191,
        0.000870035030313,
        -1.1020997701e-18,
        -0.00146361554413,
        -0.00137683857015,
        0.0024292592533,
        0.0094725227159,
        0.0154180368294,
        0.0147000715057,
        0.00586488933248,
        -0.00519366026175,
        -0.00866540733871,
        5.1285387975e-18,
        0.0126383782153,
        0.0111086622265,
        -0.0186093763917,
        -0.0705056463516,
        -0.115003477368,
        -0.114693511086,
        -0.0510974354705,
        0.0568028245339,
        0.158229517656,
        0.199622663898,
        0.158229517656,
        0.0568028245339,
        -0.0510974354705,
        -0.114693511086,
        -0.115003477368,
        -0.0705056463516,
        -0.0186093763917,
        0.0111086622265,
        0.0126383782153,
        5.1285387975e-18,
        -0.00866540733871,
        -0.00519366026175,
        0.00586488933248,
        0.0147000715057,
        0.0154180368294,
        0.0094725227159,
        0.0024292592533,
        -0.00137683857015,
        -0.00146361554413,
        -1.1020997701e-18,
        0.000870035030313,
        0.000501918055191,
        -0.00057971845183,
        -0.00162968132747
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 3,
      description: 'Hamming FIR Filter Band Pass, 1.00-3.00 Hz',
      groupDelaySecs: 1.2
    },
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 1,
      filterSource: 'SYSTEM',
      sampleRate: 40,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 1.00-3.00 Hz',
      id: '8bab76bd-db1a-4226-a151-786577adb3d8',
      bCoefficients: [
        -0.00041931139298,
        -0.000674434004618,
        -0.00075295439347,
        -0.000564329029297,
        6.00603432641e-19,
        0.000949341935097,
        0.00206546993035,
        0.00282615645799,
        0.0024372474717,
        -2.06057591484e-18,
        -0.00520585874328,
        -0.013391100708,
        -0.0239791261194,
        -0.0354872315641,
        -0.0456435786343,
        -0.051757642404,
        -0.0512886864221,
        -0.0424901510066,
        -0.0249687517076,
        0,
        0.0295102454011,
        0.0594458360283,
        0.0852129861677,
        0.102632086058,
        0.108786936013,
        0.102632086058,
        0.0852129861677,
        0.0594458360283,
        0.0295102454011,
        0,
        -0.0249687517076,
        -0.0424901510066,
        -0.0512886864221,
        -0.051757642404,
        -0.0456435786343,
        -0.0354872315641,
        -0.0239791261194,
        -0.013391100708,
        -0.00520585874328,
        -2.06057591484e-18,
        0.0024372474717,
        0.00282615645799,
        0.00206546993035,
        0.000949341935097,
        6.00603432641e-19,
        -0.000564329029297,
        -0.00075295439347,
        -0.000674434004618,
        -0.00041931139298
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 3,
      description: 'Hamming FIR Filter Band Pass, 1.00-3.00 Hz',
      groupDelaySecs: 0.6
    },
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 4,
      filterSource: 'SYSTEM',
      sampleRate: 20,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 4.00-8.00 Hz',
      id: 'db5e61a0-b8dc-48a7-b56c-5e497925e89c',
      bCoefficients: [
        0.000384613747726,
        0.00178371769276,
        -0.00212559624529,
        -0.000631950140381,
        -2.20361612866e-18,
        0.00106309748039,
        0.0058308380518,
        -0.00747451232012,
        -0.00223556740866,
        -5.66299554687e-18,
        0.00346929764634,
        0.0180454957668,
        -0.0219948747361,
        -0.00629412057373,
        -1.02543627331e-17,
        0.0091798888655,
        0.0470445931855,
        -0.057258612032,
        -0.0166397199392,
        -1.40801363022e-17,
        0.027068298811,
        0.157220111617,
        -0.240556938135,
        -0.114930045816,
        0.399139654818,
        -0.114930045816,
        -0.240556938135,
        0.157220111617,
        0.027068298811,
        -1.40801363022e-17,
        -0.0166397199392,
        -0.057258612032,
        0.0470445931855,
        0.0091798888655,
        -1.02543627331e-17,
        -0.00629412057373,
        -0.0219948747361,
        0.0180454957668,
        0.00346929764634,
        -5.66299554687e-18,
        -0.00223556740866,
        -0.00747451232012,
        0.0058308380518,
        0.00106309748039,
        -2.20361612866e-18,
        -0.000631950140381,
        -0.00212559624529,
        0.00178371769276,
        0.000384613747726
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 8,
      description: 'Hamming FIR Filter Band Pass, 4.00-8.00 Hz',
      groupDelaySecs: 1.19999999999
    },
    {
      filterCausality: 'CAUSAL',
      lowFrequencyHz: 4,
      filterSource: 'SYSTEM',
      sampleRate: 40,
      filterType: 'FIR_HAMMING',
      name: 'HAM FIR BP 4.00-8.00 Hz',
      id: 'b92d6ade-3e69-42b6-82e5-f9290f50120f',
      bCoefficients: [
        -0.00162648167403,
        -0.00178068692572,
        -0.000500932608649,
        0.000630876375368,
        -1.09993594994e-18,
        -0.00106129114029,
        0.00137413533843,
        0.00746181215706,
        0.00945392473033,
        -8.48006007763e-18,
        -0.0146712099526,
        -0.0180148341358,
        -0.0051834632296,
        0.0062834260489,
        -5.11846962233e-18,
        -0.00916429104716,
        0.0110868519078,
        0.0571613222453,
        0.0703672182862,
        -2.10843184946e-17,
        -0.114468326272,
        -0.156952974316,
        -0.0566913000601,
        0.114734764805,
        0.199230732463,
        0.114734764805,
        -0.0566913000601,
        -0.156952974316,
        -0.114468326272,
        -2.10843184946e-17,
        0.0703672182862,
        0.0571613222453,
        0.0110868519078,
        -0.00916429104716,
        -5.11846962233e-18,
        0.0062834260489,
        -0.0051834632296,
        -0.0180148341358,
        -0.0146712099526,
        -8.48006007763e-18,
        0.00945392473033,
        0.00746181215706,
        0.00137413533843,
        -0.00106129114029,
        -1.09993594994e-18,
        0.000630876375368,
        -0.000500932608649,
        -0.00178068692572,
        -0.00162648167403
      ],
      order: 48,
      validForSampleRate: true,
      aCoefficients: [1],
      sampleRateTolerance: 0.05,
      zeroPhase: false,
      filterPassBandType: 'BAND_PASS',
      highFrequencyHz: 8,
      description: 'Hamming FIR Filter Band Pass, 4.00-8.00 Hz',
      groupDelaySecs: 0.6
    }
  ],
  workflow: {
    panSingleArrow: 86400,
    panDoubleArrow: 86400
  },
  keyboardShortcuts: {
    clickEvents: {
      createSignalDetectionWithCurrentPhase: {
        description: 'Create new signal detection with current phase',
        helpText: 'Create new signal detection with current phase on the clicked channel/station.',
        combos: ['e'],
        tags: ['sd', 'signal detections', 'current phase', 'mouse'],
        categories: ['Waveform Display']
      },
      createSignalDetectionWithDefaultPhase: {
        description: 'Create new signal detection with default phase',
        helpText: 'Create new signal detection with default phase on the clicked channel/station.',
        combos: ['alt+e'],
        tags: ['sd', 'signal detections', 'default phase', 'mouse'],
        categories: ['Waveform Display']
      },
      createSignalDetectionNotAssociatedWithWaveformCurrentPhase: {
        description: 'Create new signal detection with current phase & no waveform',
        helpText:
          'Create new signal detection with current phase & no waveform on the clicked channel/station.',
        combos: ['shift+e'],
        tags: ['sd', 'signal detections', 'current phase', 'mouse'],
        categories: ['Waveform Display']
      },
      createSignalDetectionNotAssociatedWithWaveformDefaultPhase: {
        description: 'Create new signal detection with default phase & no waveform',
        helpText:
          'Create new signal detection with default phase & no waveform on the clicked channel/station.',
        combos: ['shift+alt+e'],
        tags: ['sd', 'signal detections', 'default phase', 'mouse'],
        categories: ['Waveform Display']
      },
      viewQcSegmentDetails: {
        description: 'View QC segment details',
        helpText: 'View details about existing QC segments.',
        combos: ['alt'],
        tags: ['qc', 'qc mask', 'details', 'segment'],
        categories: ['Waveform Display']
      },
      showEventDetails: {
        description: 'Show event details',
        helpText: 'Show additional details about the event.',
        combos: ['alt'],
        tags: ['events', 'map', 'details', 'time', 'association', 'info', 'more', 'mouse'],
        categories: ['Map Display']
      },
      showSignalDetectionDetails: {
        description: 'Show signal detection details',
        helpText: 'Show additional details about the signal detection.',
        combos: ['alt'],
        tags: [
          'signal detections',
          'map',
          'details',
          'time',
          'association',
          'info',
          'more',
          'mouse'
        ],
        categories: ['Map Display', 'Waveform Display']
      },
      showStationDetails: {
        description: 'Show station/site details',
        helpText: 'Show additional details about the station or site.',
        combos: ['alt'],
        tags: ['station', 'site', 'map', 'details', 'info', 'more', 'mouse'],
        categories: ['Map Display']
      },
      selectParentChild: {
        description: 'Select channel and children',
        helpText: 'Select a channel and its children.',
        combos: ['alt'],
        tags: ['channel', 'select', 'waveform', 'mouse'],
        categories: ['Waveform Display']
      },
      selectParentChildRange: {
        description: 'Select channel range and children',
        helpText: 'Alt + click a station label to select a range of channels and their children.',
        combos: ['shift+alt'],
        tags: ['channel', 'select', 'waveform', 'mouse', 'range'],
        categories: ['Waveform Display']
      }
    },
    doubleClickEvents: {
      associateSelectedSignalDetections: {
        description: 'Associate selected signal detections to open event',
        helpText:
          'If they are not associated to the currently open event, double click to associate selected signal detection(s) to the currently open event.',
        combos: [],
        tags: ['associate', 'signal', 'detection'],
        categories: ['Waveform Display', 'Signal Detections List Display']
      },
      unassociateSelectedSignalDetections: {
        description: 'Unassociate selected signal detections from open event',
        helpText:
          'If they are associated to the currently open event, double click to unassociate selected signal detection(s) from the open event.',
        combos: [],
        tags: ['unassociate', 'signal', 'detection'],
        categories: ['Waveform Display', 'Signal Detections List Display']
      }
    },
    dragEvents: {
      zoomToRange: {
        description: 'Zoom to range',
        helpText: 'Zoom in on a selection by clicking and dragging (with a modifier key).',
        combos: ['ctrl', 'cmd'],
        tags: ['zoom', 'in', 'waveform', 'click', 'mouse'],
        categories: ['Waveform Display']
      },
      drawMeasureWindow: {
        description: 'Draw measure window',
        helpText: 'Select a region on a channel to view it in the measure window.',
        combos: ['shift'],
        tags: [
          'measure',
          'window',
          'bigger',
          'larger',
          'isolation',
          'isolated',
          'focus',
          'separate'
        ],
        categories: ['Waveform Display']
      },
      scaleWaveformAmplitude: {
        description: 'Scale waveform amplitude (Y values)',
        helpText:
          'Click and drag (with modifier key) to increase/decrease the scale of the y axis, which makes waveforms smaller/larger.',
        combos: ['y'],
        tags: [
          'scale',
          'amplitude',
          'waveform',
          'grow',
          'bigger',
          'increase',
          'y',
          'values',
          'mouse',
          'axis',
          'y-axis'
        ],
        categories: ['Waveform Display']
      },
      createQcSegments: {
        description: 'Create new QC segments',
        helpText: 'Create new QC segments on selected raw channels.',
        combos: ['m'],
        tags: ['create', 'qc', 'qc mask', 'segment'],
        categories: ['Waveform Display']
      },
      showRuler: {
        description: 'Show ruler',
        helpText: 'Click and drag to show a popup that measures times in the Waveform Display.',
        combos: [],
        tags: ['ruler', 'times', 'durations', 'amount of time', 'line', 'measure'],
        categories: ['Waveform Display']
      }
    },
    scrollEvents: {
      zoomMouseWheel: {
        description: 'Zoom - smooth',
        helpText: 'Zoom in and out using the mouse wheel.',
        combos: ['ctrl', 'cmd'],
        tags: ['zoom', 'in', 'out', 'scroll', 'waveform'],
        categories: ['Waveform Display']
      }
    },
    hotkeys: {
      zoomInOneStep: {
        description: 'Zoom in one step',
        helpText:
          'Zoom in by a percentage. Zooming in and then out one step returns you to the same view.',
        combos: ['w'],
        tags: ['zoom', 'in', 'waveform'],
        categories: ['Waveform Display']
      },
      zoomOutOneStep: {
        description: 'Zoom out one step',
        helpText:
          'Zoom out by a configured percentage. Zooming out and then in one step returns you to the same view.',
        combos: ['s'],
        tags: ['zoom', 'out', 'waveform'],
        categories: ['Waveform Display']
      },
      zoomOutFully: {
        description: 'Zoom out fully',
        helpText: 'Zoom out to the open interval.',
        combos: ['space'],
        tags: ['zoom', 'out', 'waveform'],
        categories: ['Waveform Display']
      },
      pageDown: {
        description: 'Page down',
        helpText: 'Scroll down in the waveform display so that the bottom-most row is at the top.',
        combos: ['shift+s'],
        tags: ['scroll', 'down', 'waveform', 'page', 'jump'],
        categories: ['Waveform Display']
      },
      pageUp: {
        description: 'Page up',
        helpText: 'Scroll up in the waveform display so that the top-most row is at the bottom.',
        combos: ['shift+w'],
        tags: ['scroll', 'up', 'waveform', 'page', 'jump'],
        categories: ['Waveform Display']
      },
      zas: {
        description: 'Zoom, align, sort (ZAS)',
        helpText:
          'Zoom to configured range, align on predicted P, sort by distance. Add stations with signal detections associated to the current open event.',
        combos: ['z'],
        tags: ['zoom', 'align', 'sort', 'zas'],
        categories: ['Waveform Display']
      },
      createEventBeam: {
        description: 'Create event beams',
        helpText:
          'Create event beams with default settings for all selected stations or all loaded stations if none are selected',
        combos: ['b'],
        tags: ['create', 'event', 'bream'],
        categories: ['Waveform Display']
      },
      panRight: {
        description: 'Pan right',
        helpText:
          'Scroll the Waveform Display to the right one step. This will not load additional data outside of the current bounds.',
        combos: ['d', 'right'],
        tags: ['step', 'scroll', 'right', 'move'],
        categories: ['Waveform Display']
      },
      panLeft: {
        description: 'Pan left',
        helpText:
          'Scroll the Waveform Display to the left one step. This will not load additional data outside of the current bounds.',
        combos: ['a', 'left'],
        tags: ['step', 'scroll', 'left', 'move'],
        categories: ['Waveform Display']
      },
      panRightHard: {
        description: 'Pan right & load',
        helpText: 'Load additional data outside of the current interval (past lead/lag).',
        combos: ['shift+d'],
        tags: ['step', 'scroll', 'right', 'move'],
        categories: ['Waveform Display']
      },
      panLeftHard: {
        description: 'Pan left & load',
        helpText: 'Load additional data outside of the current interval (past lead/lag).',
        combos: ['shift+a'],
        tags: ['step', 'scroll', 'left', 'move'],
        categories: ['Waveform Display']
      },
      scaleAllWaveformAmplitude: {
        description: 'Scale all amplitudes to selected channel',
        helpText:
          'Scale all waveform amplitudes to match the selected channel. If no channel is selected, this has no effect.',
        combos: ['ctrl+shift+y'],
        tags: [
          'scale',
          'amplitudes',
          'waveform',
          'grow',
          'bigger',
          'increase',
          'y',
          'values',
          'channel',
          'all',
          'axis',
          'y-axis'
        ],
        categories: ['Waveform Display']
      },
      resetSelectedWaveformAmplitudeScaling: {
        description: 'Reset selected waveform manual amplitude scaling (Y values)',
        helpText:
          'Reset manual amplitude scaling for selected channels. This has no effect on non-selected channels.',
        combos: ['alt+y'],
        tags: ['scale', 'amplitude', 'reset', 'waveform', 'y', 'values', 'axis', 'y-axis'],
        categories: ['Waveform Display']
      },
      resetAllWaveformAmplitudeScaling: {
        description: 'Reset all waveform amplitude scaling (Y values)',
        helpText: 'Reset amplitude scaling for all waveforms.',
        combos: ['alt+shift+y'],
        tags: ['scale', 'amplitude', 'reset', 'waveform', 'y', 'values', 'axis', 'y-axis'],
        categories: ['Waveform Display']
      },
      toggleUncertainty: {
        description: 'Toggle uncertainty',
        helpText: 'Toggle on and off the uncertainty bars for signal detections.',
        combos: ['ctrl+shift+u'],
        tags: ['uncertainty', 'bars', 'error', 'toggle', 'lines'],
        categories: ['Waveform Display']
      },
      editSignalDetectionUncertainty: {
        description: 'Edit signal detection time uncertainty',
        helpText: 'Enable edit signal detection time uncertainty capability on waveform display.',
        combos: ['alt+ctrl+e'],
        tags: ['edit', 'sd', 'signal', 'detection', 'uncertainty', 'time', 'bars', 'waveform'],
        categories: ['Waveform Display']
      },
      toggleQcMaskVisibility: {
        description: 'Toggle QC mask visibility',
        helpText: 'Toggle on and off the visibility of the QC masks.',
        combos: ['ctrl+m'],
        tags: ['qc', 'mask', 'qc mask', 'waveform', 'quality control'],
        categories: ['Waveform Display']
      },
      toggleAlignment: {
        description: 'Toggle alignment',
        helpText:
          'Switch between time alignment and predicted/observed phase alignment. Use the dropdown menu from the Waveform Display toolbar for more options.',
        combos: ['p'],
        tags: ['align', 'predicted', 'time'],
        categories: ['Waveform Display']
      },
      workflowRightOneDay: {
        description: 'Pan right one day',
        helpText: 'Scroll the Workflow Display forward in time by one day.',
        combos: ['right', 'd'],
        tags: ['step', 'scroll', 'pan', 'right', 'move', 'time', '1', 'day'],
        categories: ['Workflow Display']
      },
      workflowLeftOneDay: {
        description: 'Pan left one day',
        helpText: 'Scroll the Workflow Display back in time by one day.',
        combos: ['left', 'a'],
        tags: ['step', 'scroll', 'pan', 'left', 'move', 'time', '1', 'day'],
        categories: ['Workflow Display']
      },
      workflowRightOneWeek: {
        description: 'Step right one week',
        helpText: 'Scroll the Workflow Display forward in time by one week.',
        combos: ['shift+right', 'shift+d'],
        tags: ['step', 'scroll', 'right', 'move', 'time', '1', 'week'],
        categories: ['Workflow Display']
      },
      workflowLeftOneWeek: {
        description: 'Step left one week',
        helpText: 'Scroll the Workflow Display back in time by one week.',
        combos: ['shift+left', 'shift+a'],
        tags: ['step', 'scroll', 'left', 'move', 'time', '1', 'week'],
        categories: ['Workflow Display']
      },
      showKeyboardShortcuts: {
        description: 'Keyboard shortcuts',
        helpText: 'Show the list of keyboard shortcuts (this list).',
        combos: ['mod+/'],
        tags: [
          'keyboard',
          'shortcuts',
          'hotkeys',
          'app',
          'help',
          'command',
          'cmd',
          'ctrl',
          'control'
        ],
        categories: ['App']
      },
      toggleSetPhaseMenu: {
        description: 'Open the set phase menu',
        helpText: 'Open set phase menu to change the phase label for selected Signal Detections.',
        combos: ['ctrl+shift+e'],
        tags: ['toggle', 'open', 'set', 'phase', 'menu'],
        categories: ['Signal Detections List Display', 'Waveform Display', 'Map Display']
      },
      toggleCommandPalette: {
        description: 'Command palette',
        helpText: 'Open a popup tool for typing commands.',
        combos: ['ctrl+shift+x', 'command+shift+x'],
        tags: ['command', 'palette', 'workspace', 'app', 'help'],
        categories: ['App']
      },
      selectNextFilter: {
        description: 'Select next filter',
        helpText:
          'Select the next filter in the hotkey cycle (indicated by stars in the filter list).',
        combos: ['f'],
        tags: ['filter', 'next', 'select', 'cycle'],
        categories: ['Filters']
      },
      selectPreviousFilter: {
        description: 'Select previous filter',
        helpText:
          'Select the previous filter in the hotkey cycle (indicated by stars in the filter list).',
        combos: ['shift+f'],
        tags: ['filter', 'previous', 'select', 'cycle'],
        categories: ['Filters']
      },
      selectUnfiltered: {
        description: 'Select unfiltered',
        helpText:
          'Select the "unfiltered" option in the hotkey cycle. This removes the filtering from any selected channels in the waveform display, or from all channels if nothing is selected.',
        combos: ['alt+f'],
        tags: ['filter', 'unfiltered', 'remove', 'clear'],
        categories: ['Filters']
      },
      createNewEvent: {
        description: 'Create a new event',
        helpText:
          'Create event with selected signal detections or virtual event using no signal detections.',
        combos: ['c'],
        tags: ['create', 'new', 'event'],
        categories: [
          'Signal Detections List Display',
          'Events List Display',
          'Waveform Display',
          'Map Display'
        ]
      },
      associateSelectedSignalDetections: {
        description: 'Associate selected signal detections to open event',
        helpText: 'Associate selected signal detection(s) to the currently open event.',
        combos: ['ctrl+g'],
        tags: ['associate', 'signal', 'detection'],
        categories: ['Signal Detections List Display']
      },
      unassociateSelectedSignalDetections: {
        description: 'Unassociate selected signal detections from open event',
        helpText: 'Unassociate selected signal detection(s) from the currently open event.',
        combos: ['alt+g'],
        tags: ['unassociate', 'signal', 'detection'],
        categories: ['Signal Detections List Display']
      },
      currentPhaseLabel: {
        description: 'Set selected signal detections phase label to current phase',
        helpText: 'Set phase label for selected signal detection(s) to the current phase.',
        combos: ['shift+e'],
        tags: ['set', 'update', 'phase label', 'current phase'],
        categories: ['Map Display', 'Signal Detections List Display', 'Waveform Display']
      },
      defaultPhaseLabel: {
        description: 'Set selected signal detections phase label to default phase',
        helpText: 'Set phase label for selected signal detection(s) to the default phase.',
        combos: ['alt+shift+e'],
        tags: ['set', 'update', 'phase label', 'default phase'],
        categories: ['Map Display', 'Signal Detections List Display', 'Waveform Display']
      },
      historyEventMode: {
        description: 'Toggle event mode for history undo/redo',
        helpText: 'Toggle event mode for history undo/redo',
        combos: ['alt'],
        tags: ['redo', 'undo', 'reset', 'event undo', 'event redo', 'event reset'],
        categories: ['App']
      },
      undo: {
        description: 'Undo previous action',
        helpText: 'Undo previous action.',
        combos: ['mod+z'],
        tags: ['undo', 'redo', 'command', 'cmd', 'ctrl', 'control'],
        categories: ['App']
      },
      redo: {
        description: 'Redo previous undone action',
        helpText: 'Redo previous undone action.',
        combos: ['shift+mod+z'],
        tags: ['undo', 'redo', 'command', 'cmd', 'ctrl', 'control'],
        categories: ['App']
      },
      eventUndo: {
        description: 'Undo previous event action',
        helpText: 'Undo previous event action for the open event.',
        combos: ['alt+z'],
        tags: ['undo', 'redo', 'reset', 'event undo', 'event redo', 'event reset'],
        categories: ['App']
      },
      eventRedo: {
        description: 'Redo previous undone event action',
        helpText: 'Redo previous undone event action for the open event.',
        combos: ['alt+shift+z'],
        tags: ['undo', 'redo', 'reset', 'event undo', 'event redo', 'event reset'],
        categories: ['App']
      },
      toggleCurrentPhaseMenu: {
        description: 'Open the current phase menu',
        helpText: 'Open the current phase popup menu to change the current phase label.',
        combos: ['ctrl+e'],
        tags: ['set', 'update', 'phase label', 'current phase'],
        categories: ['Waveform Display']
      },
      hideMeasureWindow: {
        description: 'Hide measure window',
        helpText: 'Hide the open measure window.',
        combos: ['esc'],
        tags: ['measure', 'window', 'hide'],
        categories: ['Waveform Display']
      },
      increaseVisibleWaveforms: {
        description: 'Increase visible waveforms',
        helpText: 'Increase the number of visible waveforms by one.',
        combos: ['mod+up'],
        tags: ['increase', 'decrease', 'visible', 'waveform'],
        categories: ['Waveform Display']
      },
      decreaseVisibleWaveforms: {
        description: 'Decrease visible waveforms',
        helpText: 'Decrease the number of visible waveforms by one.',
        combos: ['mod+down'],
        tags: ['increase', 'decrease', 'visible', 'waveform'],
        categories: ['Waveform Display']
      },
      closeCreateSignalDetectionOverlay: {
        description: 'Close the create signal detection overlay',
        helpText: 'Close the currently open signal detection creation overlay.',
        combos: ['esc'],
        tags: ['close', 'waveform', 'signal detections'],
        categories: ['Waveform Display']
      }
    }
  },
  preventBrowserDefaults: {
    chromeMenu: {
      description: 'Prevent browser alt+e menu as it conflicts with alt+e+click',
      helpText: 'Prevent browser alt+e menu as it conflicts with alt+e+click.',
      combos: ['alt+e'],
      tags: ['preventDefault'],
      categories: ['Global']
    }
  },
  uiThemes: [
    {
      name: 'GMS Dark Theme',
      display: {
        edgeEventOpacity: 0.5,
        edgeSDOpacity: 0.2,
        predictionSDOpacity: 0.1
      },
      colors: ConfigurationTypes.defaultColorTheme
    }
  ],
  qcMaskTypeVisibilities: {
    analystDefined: true,
    dataAuthentication: false,
    longTerm: true,
    processingMask: true,
    rejected: true,
    stationSOH: true,
    unprocessed: true,
    waveform: true,
    qcSegments: true
  },
  unassociatedSignalDetectionLengthMeters:
    ConfigurationTypes.defaultUnassociatedSignalDetectionLengthMeters,
  endpointConfigurations: {
    maxParallelRequests: 10,
    getEventsWithDetectionsAndSegmentsByTime: {
      maxTimeRangeRequestInSeconds: 300
    },
    fetchQcSegmentsByChannelsAndTime: {
      maxTimeRangeRequestInSeconds: 5400
    }
  },
  defaultDeletedEventVisibility: true,
  defaultRejectedEventVisibility: true,
  defaultDeletedSignalDetectionVisibility: true,
  fkConfigurations: {
    fkStationTypeConfigurations: {
      SEISMIC_ARRAY: {
        constantVelocityRings: [8, 10, 20],
        frequencyBands: [
          {
            minFrequencyHz: 0.1,
            maxFrequencyHz: 1
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 2
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 2,
            maxFrequencyHz: 4
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 4,
            maxFrequencyHz: 8
          },
          {
            minFrequencyHz: 6,
            maxFrequencyHz: 12
          },
          {
            minFrequencyHz: 8,
            maxFrequencyHz: 16
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 8
          }
        ]
      },
      SEISMIC_3_COMPONENT: {
        constantVelocityRings: [8, 10, 20],
        frequencyBands: [
          {
            minFrequencyHz: 0.1,
            maxFrequencyHz: 1
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 2
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 2,
            maxFrequencyHz: 4
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 4,
            maxFrequencyHz: 8
          },
          {
            minFrequencyHz: 6,
            maxFrequencyHz: 12
          },
          {
            minFrequencyHz: 8,
            maxFrequencyHz: 16
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 8
          }
        ]
      },
      INFRASOUND: {
        constantVelocityRings: [0.3, 0.33, 0.4, 0.5, 0.7],
        frequencyBands: [
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 6,
            maxFrequencyHz: 12
          },
          {
            minFrequencyHz: 8,
            maxFrequencyHz: 16
          },
          {
            minFrequencyHz: 16,
            maxFrequencyHz: 32
          },
          {
            minFrequencyHz: 32,
            maxFrequencyHz: 64
          },
          {
            minFrequencyHz: 64,
            maxFrequencyHz: 100
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 100
          }
        ]
      },
      INFRASOUND_ARRAY: {
        constantVelocityRings: [0.3, 0.33, 0.4, 0.5, 0.7],
        frequencyBands: [
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 6,
            maxFrequencyHz: 12
          },
          {
            minFrequencyHz: 8,
            maxFrequencyHz: 16
          },
          {
            minFrequencyHz: 16,
            maxFrequencyHz: 32
          },
          {
            minFrequencyHz: 32,
            maxFrequencyHz: 64
          },
          {
            minFrequencyHz: 64,
            maxFrequencyHz: 100
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 100
          }
        ]
      },
      HYDROACOUSTIC: {
        constantVelocityRings: [1.4, 1.6, 3.7],
        frequencyBands: [
          {
            minFrequencyHz: 0.1,
            maxFrequencyHz: 0.5
          },
          {
            minFrequencyHz: 0.2,
            maxFrequencyHz: 1
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 2
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 2,
            maxFrequencyHz: 4
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 4,
            maxFrequencyHz: 8
          },
          {
            minFrequencyHz: 0.2,
            maxFrequencyHz: 8
          }
        ]
      },
      HYDROACOUSTIC_ARRAY: {
        constantVelocityRings: [1.4, 1.6, 3.7],
        frequencyBands: [
          {
            minFrequencyHz: 0.1,
            maxFrequencyHz: 0.5
          },
          {
            minFrequencyHz: 0.2,
            maxFrequencyHz: 1
          },
          {
            minFrequencyHz: 0.5,
            maxFrequencyHz: 2
          },
          {
            minFrequencyHz: 1,
            maxFrequencyHz: 3
          },
          {
            minFrequencyHz: 2,
            maxFrequencyHz: 4
          },
          {
            minFrequencyHz: 3,
            maxFrequencyHz: 6
          },
          {
            minFrequencyHz: 4,
            maxFrequencyHz: 8
          },
          {
            minFrequencyHz: 0.2,
            maxFrequencyHz: 8
          }
        ]
      }
    }
  },
  beamforming: {
    beamChannelThreshold: 3,
    createEventBeamsDescription:
      "Creates beams of the current phase for all selected stations that do not have a signal detection for that phase.\n\nIf no stations are selected, applies to all seismic array stations.\n\nIf a single station is selected and and the minimum number of that station's compatible raw channels are selected, those channels will be used as the inputs for a beam on that station.\n\nBeams start at the time of the predicted phase, minus the configured lead time.\nMinimum number of compatible raw channels: ",
    leadDuration: 60,
    beamDuration: 300,
    beamSummationMethods: {
      COHERENT: 'COHERENT',
      INCOHERENT: 'INCOHERENT',
      RMS: 'RMS'
    },
    interpolationMethods: {
      NEAREST_SAMPLE: 'Nearest sample',
      INTERPOLATED: 'Interpolated'
    }
  }
};
