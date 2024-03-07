import type { ConfigurationTypes } from '@gms/common-model';
import React from 'react';

import { HelpText } from './help-text';
import { KeyComboMarks } from './key-combo-marks';

/**
 * Render a single keyboard shortcut object from config. Includes all key combos,
 * help text (if provided), and the description.
 */
// eslint-disable-next-line react/function-component-definition
export const KeyboardShortcutEntry: React.FC<ConfigurationTypes.HotkeyConfiguration> = shortcut => {
  const { description, combos, helpText, categories } = shortcut;
  const catKey = categories.map(cat => cat).reduce((a, b) => `${a}-${b}`);
  const key = `${description}-${catKey}`;
  return (
    <div key={key} className="keyboard-shortcuts__hotkey-entry">
      <span className="keyboard-shortcuts__description">
        {helpText && <HelpText>{helpText}</HelpText>}
        {description}
        :&nbsp;
      </span>
      <ul className="keyboard-shortcuts__hotkey-list">
        <KeyComboMarks hotkeys={combos} description={description} />
      </ul>
    </div>
  );
};
