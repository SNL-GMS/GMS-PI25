import type { DialogProps } from '@blueprintjs/core';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogBody,
  DialogFooter,
  Intent,
  Switch
} from '@blueprintjs/core';
import type { StationTypes } from '@gms/common-model';
import { FkTypes } from '@gms/common-model';
import { AllColorMaps } from '@gms/common-model/lib/color/types';
import type { FormTypes, ValidationDefinition } from '@gms/ui-core-components';
import {
  DialogTitle,
  FormContent,
  FormGroup,
  FormMessage,
  NumericInput
} from '@gms/ui-core-components';
import { useColorMap } from '@gms/ui-state';
import produce from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';

import { ChannelSelector } from '~analyst-ui/common/forms/inputs/channel-selector';
import { FilterSelector } from '~analyst-ui/common/forms/inputs/filter-selector';
import { StringSelect } from '~analyst-ui/common/forms/inputs/string-select';

function DialogWrapper({ isOpen, title, onClose, children, ...rest }: DialogProps) {
  return (
    <Dialog
      canEscapeKeyClose
      canOutsideClickClose
      enforceFocus={false}
      isCloseButtonShown
      isOpen={isOpen}
      onClose={onClose}
      shouldReturnFocusOnClose
      title={title}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </Dialog>
  );
}

// TODO: use config instead of hardcoded constants (legacy)
const getLeadLengthPairByName = (enumVal: any): FkTypes.LeadLagPairAndString =>
  FkTypes.Util.LeadLagValuesAndDisplayString.find(llpv => llpv.leadLagPairs === enumVal);

const frequencyBandToString = (band: [number, number]): string => `${band[0]} - ${band[1]} Hz`;

const getFrequencyBandPairByName = (frequencyBandStr: string): FkTypes.FrequencyBand => {
  const newFreq = FkTypes.Util.FrequencyBands.filter(
    pair => frequencyBandToString([pair.minFrequencyHz, pair.maxFrequencyHz]) === frequencyBandStr
  )[0];
  if (newFreq) {
    const frequencyPair: FkTypes.FrequencyBand = {
      maxFrequencyHz: newFreq.maxFrequencyHz,
      minFrequencyHz: newFreq.minFrequencyHz
    };
    return frequencyPair;
  }
  return undefined;
};

type AcceptStringsForNumbers<InputType> = {
  [K in keyof InputType]: InputType[K] extends number
    ? string | number
    : InputType[K] extends { [L in keyof InputType[K]]: number }
    ? AcceptStringsForNumbers<InputType[K]>
    : InputType[K];
};

type FkConfigurationInput = AcceptStringsForNumbers<FkTypes.FkDialogConfiguration>;

const isValidConfig = (config: FkConfigurationInput): config is FkTypes.FkDialogConfiguration => {
  if (typeof config.window.durationSecs === 'string') {
    return false;
  }
  if (typeof config.window.leadSecs === 'string') {
    return false;
  }
  if (typeof config.frequencyBand.minFrequencyHz === 'string') {
    return false;
  }
  if (typeof config.frequencyBand.maxFrequencyHz === 'string') {
    return false;
  }
  // TODO: more validation!
  return true;
};

const useNumericValidator = (
  displayName: string,
  otherValidators: ValidationDefinition<string>[] = []
): [
  FormTypes.Message,
  React.Dispatch<React.SetStateAction<FormTypes.Message>>,
  ValidationDefinition<string>[]
] => {
  const [validationMessage, setValidationMessage] = React.useState<FormTypes.Message>(undefined);
  const validationDefinitions: ValidationDefinition<string>[] = [
    {
      valueIsInvalid: val => {
        return Number.isNaN(parseFloat(val));
      },
      invalidMessage: {
        summary: `Invalid ${displayName}. Value must be numeric.`,
        intent: 'danger'
      }
    },
    ...otherValidators
  ];
  return [validationMessage, setValidationMessage, validationDefinitions];
};

/**
 * The type of the props for the {@link FkConfigurationDialog} component
 */
export interface FkConfigurationDialogProps {
  station: StationTypes.Station;
  isOpen: boolean;
  fkConfiguration: FkTypes.FkDialogConfiguration;
  presets: Partial<Record<keyof FkTypes.FkDialogConfiguration, string[]>>;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (newConfig: FkTypes.FkDialogConfiguration) => void;
}

/**
 * Creates a dialog popup that allows the user to control the configuration for the FK display
 */
export function FkConfigurationDialog({
  isOpen,
  setIsOpen,
  station,
  fkConfiguration,
  presets,
  onSubmit
}: FkConfigurationDialogProps) {
  const [colorMap, setColorMap] = useColorMap();
  const [fkConfig, setFkConfig] = React.useState<FkConfigurationInput>(cloneDeep(fkConfiguration));
  const [windowLeadInvalidMsg, setWindowLeadInvalidMsg, leadValidationDefs] = useNumericValidator(
    'Lead Time'
  );
  const [
    windowDurationValidationMessage,
    setWindowDurationValidationMessage,
    windowDurationValidationDefs
  ] = useNumericValidator('Window Duration');
  const [
    minFrequencyValidationMessage,
    setMinFrequencyValidationMessage,
    minFrequencyValidationDefs
  ] = useNumericValidator('Low Frequency');
  const [
    maxFrequencyValidationMessage,
    setMaxFrequencyValidationMessage,
    maxFrequencyValidationDefs
  ] = useNumericValidator('High Frequency');
  const [maxSlownessMsg, setMaxSlownessMsg, slownessValidationDefs] = useNumericValidator(
    'Maximum Slowness',
    [
      {
        valueIsInvalid: val => {
          return parseFloat(val) <= 0;
        },
        invalidMessage: {
          summary: 'Invalid maximum slowness. Maximum slowness must be a positive number',
          intent: 'danger'
        }
      }
    ]
  );
  const [
    numPointsValidationMessage,
    setNumPointsValidationMessage,
    numPointsValidationDefs
  ] = useNumericValidator('Number of Points', [
    {
      valueIsInvalid: val => {
        return parseFloat(val) % 2 === 0;
      },
      invalidMessage: {
        summary: 'Invalid Number of Points. Value must be odd.',
        intent: 'danger'
      }
    }
  ]);
  const [
    leadFkSpectrumMsg,
    setLeadFkSpectrumMsg,
    leadFkSpectrumValidationDefs
  ] = useNumericValidator('FK Spectrum Lead Time', [
    {
      valueIsInvalid: val => {
        return parseFloat(val) < 0;
      },
      invalidMessage: {
        summary:
          'Warning! FK Spectrum Lead Time is negative. This will result in a start time after the reference point.',
        intent: 'warning'
      }
    }
  ]);
  const [
    fkSpectrumDurationMsg,
    setFkSpectrumDurationMsg,
    fkSpectrumDurationValidationDefs
  ] = useNumericValidator('FK Spectrum Duration', [
    {
      valueIsInvalid: val => {
        return parseFloat(val) <= 0;
      },
      invalidMessage: {
        summary: 'Invalid FK Spectrum Duration. Value must be positive.',
        intent: 'danger'
      }
    }
  ]);
  const [stepSizeMsg, setStepSizeMsg, stepSizeValidationDefs] = useNumericValidator(
    'FK Spectrum Step Size',
    [
      {
        valueIsInvalid: val => {
          return parseFloat(val) <= 0;
        },
        invalidMessage: {
          summary: 'Invalid FK Spectrum Step Size. Value must be positive.',
          intent: 'danger'
        }
      }
    ]
  );
  const formMessage =
    windowLeadInvalidMsg ??
    windowDurationValidationMessage ??
    minFrequencyValidationMessage ??
    maxFrequencyValidationMessage ??
    maxSlownessMsg ??
    numPointsValidationMessage ??
    fkSpectrumDurationMsg ??
    stepSizeMsg ??
    leadFkSpectrumMsg; // warning message

  const updateConfig = React.useCallback(
    function updateConfigCallback<K extends keyof FkConfigurationInput>(
      key: K,
      value: FkConfigurationInput[K]
    ) {
      setFkConfig(
        produce(fkConfig, draft => {
          draft[key] = value;
        })
      );
    },
    [fkConfig]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInvalidConfig = (config: FkConfigurationInput) => {
    // TODO: implement validation and create new error Messages to display
    throw new Error('not yet implemented');
  };

  return (
    <DialogWrapper
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={
        <DialogTitle
          titleText="FK Parameters"
          tooltipContent={
            <p>
              TBD
              {/* TODO: write this */}
            </p>
          }
        />
      }
    >
      <DialogBody className="fk-config-dialog">
        <FormContent className="fk-config-dialog__content">
          <FormGroup helperText="Channels used to generate the FK." label="Channels">
            <ChannelSelector
              intent={Intent.NONE}
              validChannels={station.allRawChannels}
              selectedChannels={fkConfig.selectedChannels}
              onChange={selection => {
                updateConfig('selectedChannels', selection);
              }}
            />
          </FormGroup>
          <FormGroup helperText="The color map used for FK images" label="Color Map">
            <StringSelect
              selected={colorMap}
              items={[...AllColorMaps]}
              setSelected={setColorMap}
              fill
            />
          </FormGroup>
          <FormGroup
            label="Window"
            helperText="Defines the waveform segment used for the nominal FK computation"
            accordionContent={
              <>
                <FormGroup helperText="FK window lead time, in seconds" label="Lead (s)">
                  <NumericInput
                    className="monospace"
                    value={fkConfig.window.leadSecs}
                    minorStepSize={1}
                    validationDefinitions={leadValidationDefs}
                    onChange={val => {
                      updateConfig('window', { ...fkConfig.window, leadSecs: val });
                    }}
                    onError={setWindowLeadInvalidMsg}
                    tooltip=""
                  />
                </FormGroup>
                <FormGroup helperText="FK window duration, in seconds" label="Duration (s)">
                  <NumericInput
                    className="monospace"
                    value={fkConfig.window.durationSecs}
                    minorStepSize={1}
                    validationDefinitions={windowDurationValidationDefs}
                    onChange={val => {
                      updateConfig('window', { ...fkConfig.window, durationSecs: val });
                    }}
                    onError={setWindowDurationValidationMessage}
                    tooltip=""
                  />
                </FormGroup>
              </>
            }
          >
            <StringSelect
              items={presets.window}
              selected={presets.window[0]}
              setSelected={val => {
                const { windowParams } = getLeadLengthPairByName(val);
                updateConfig('window', {
                  leadSecs: windowParams.leadSeconds,
                  durationSecs: windowParams.lengthSeconds
                });
              }}
              fill
            />
          </FormGroup>
          <FormGroup helperText="Filter to apply before generating FK" label="Prefilter">
            <FilterSelector
              selectedFilter={fkConfig.prefilter}
              setSelectedFilter={filter => updateConfig('prefilter', filter)}
            />
          </FormGroup>
          <FormGroup label="Normalize">
            <Switch
              checked={fkConfig.normalizeWaveforms}
              label="Normalize"
              onChange={() => updateConfig('normalizeWaveforms', !fkConfig.normalizeWaveforms)}
            />
          </FormGroup>
          <FormGroup
            label="FK Band"
            helperText="Frequency components included in the FK"
            accordionContent={
              <>
                <FormGroup helperText="The low end of the FK frequency band range" label="Low (Hz)">
                  <NumericInput
                    className="monospace"
                    value={fkConfig.frequencyBand.minFrequencyHz}
                    minorStepSize={1}
                    validationDefinitions={minFrequencyValidationDefs}
                    onChange={val => {
                      updateConfig('frequencyBand', {
                        ...fkConfig.frequencyBand,
                        minFrequencyHz: val
                      });
                    }}
                    onError={setMinFrequencyValidationMessage}
                    tooltip=""
                  />
                </FormGroup>
                <FormGroup
                  helperText="The high end of the FK frequency band range"
                  label="High (Hz)"
                >
                  <NumericInput
                    className="monospace"
                    value={fkConfig.frequencyBand.maxFrequencyHz}
                    minorStepSize={1}
                    validationDefinitions={maxFrequencyValidationDefs}
                    onChange={val => {
                      updateConfig('frequencyBand', {
                        ...fkConfig.frequencyBand,
                        maxFrequencyHz: val
                      });
                    }}
                    onError={setMaxFrequencyValidationMessage}
                    tooltip=""
                  />
                </FormGroup>
              </>
            }
          >
            <StringSelect
              items={presets.frequencyBand}
              selected={presets.frequencyBand[0]}
              setSelected={val => {
                const frequencyBandPair = getFrequencyBandPairByName(val);
                if (frequencyBandPair) {
                  updateConfig('frequencyBand', frequencyBandPair);
                } else {
                  throw new Error(`Invalid frequency band pair: ${val}`);
                }
              }}
              fill
            />
          </FormGroup>
          <FormGroup
            label="Grid"
            helperText="A square grid, equally sized and spaced, centered at 0. Min slowness is -max slowness."
          >
            <FormGroup
              helperText="Maximum slowness displayed on the FK spectrum image"
              label="Max Slowness (s/°)"
            >
              <NumericInput
                className="monospace"
                value={fkConfig.maximumSlowness}
                minorStepSize={1}
                validationDefinitions={slownessValidationDefs}
                onChange={val => {
                  updateConfig('maximumSlowness', val);
                }}
                onError={setMaxSlownessMsg}
                tooltip=""
              />
            </FormGroup>
            <FormGroup
              helperText="The resolution of the FK Spectra images. Must be odd."
              label="Number of Points"
            >
              <NumericInput
                className="monospace"
                value={fkConfig.numberOfPoints}
                minorStepSize={1}
                validationDefinitions={numPointsValidationDefs}
                onChange={val => {
                  updateConfig('numberOfPoints', val);
                }}
                onError={setNumPointsValidationMessage}
                tooltip=""
              />
            </FormGroup>
          </FormGroup>
          <FormGroup
            label="FK Beam & Traces"
            helperText="The time, duration, and spacing of the set of spectra generated."
          >
            <FormGroup
              helperText="The start of the time range (before the signal detection) in which FK spectra are generated"
              label="Lead (s)"
            >
              <NumericInput
                className="monospace"
                value={fkConfig.leadFkSpectrumSeconds}
                minorStepSize={1}
                validationDefinitions={leadFkSpectrumValidationDefs}
                onChange={val => {
                  updateConfig('leadFkSpectrumSeconds', val);
                }}
                onError={setLeadFkSpectrumMsg}
                tooltip=""
              />
            </FormGroup>
            <FormGroup
              helperText="The duration of time, starting from the lead time, for which to generate FK spectra."
              label="Duration (s)"
            >
              <NumericInput
                className="monospace"
                value={fkConfig.fkSpectrumDurationSeconds}
                minorStepSize={1}
                validationDefinitions={fkSpectrumDurationValidationDefs}
                onChange={val => {
                  updateConfig('fkSpectrumDurationSeconds', val);
                }}
                onError={setFkSpectrumDurationMsg}
                tooltip=""
              />
            </FormGroup>
            <FormGroup
              helperText="The duration between the window start times of two adjacent FK Spectra. Recommended to be less than the Window Duration."
              label="Step Size (s)"
            >
              <NumericInput
                className="monospace"
                value={fkConfig.stepSizeSeconds}
                minorStepSize={1}
                validationDefinitions={stepSizeValidationDefs}
                onChange={val => {
                  updateConfig('stepSizeSeconds', val);
                }}
                onError={setStepSizeMsg}
                tooltip=""
              />
            </FormGroup>
          </FormGroup>
        </FormContent>
      </DialogBody>

      <DialogFooter
        minimal
        actions={
          <ButtonGroup>
            <Button onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              intent={formMessage?.intent === 'danger' ? 'danger' : 'primary'}
              type="submit"
              disabled={formMessage?.intent === 'danger'}
              onClick={() => {
                if (isValidConfig(fkConfig)) {
                  onSubmit(fkConfig);
                } else {
                  handleInvalidConfig(fkConfig);
                }
              }}
              title="Update Configuration"
            >
              Compute FK
            </Button>
          </ButtonGroup>
        }
      >
        {formMessage && <FormMessage message={formMessage} />}
      </DialogFooter>
    </DialogWrapper>
  );
}
