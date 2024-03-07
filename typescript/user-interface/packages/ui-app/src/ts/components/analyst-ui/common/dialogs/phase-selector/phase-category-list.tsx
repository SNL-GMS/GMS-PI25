import { H5 } from '@blueprintjs/core';
import React from 'react';

import type { PhaseHotkey } from '~analyst-ui/components/waveform/types';

import { PhaseListEntry } from './phase-list-entry';
import type { CategorizedPhases } from './types';

/**
 * The type of the props for the {@link PhaseCategoryList} component
 */
export interface PhaseCategoryListProps {
  /**
   * The category of phases to render, including the title and the list of phase names
   */
  categorizedPhases: CategorizedPhases;

  /**
   * phases that get shadowed hotkey label and tooltip
   */
  phaseHotkeys: PhaseHotkey[];

  /**
   * The selected phases
   */
  selectedPhases: string[];

  /**
   * Callback that accepts the selected phases
   */
  phaseSelectorCallback: (selectedPhases: string[]) => void;

  /**
   * onClose callback for dialog
   */
  onClose: () => void;

  /**
   * processing analyst config favorite phases
   */
  favorites: string[];

  /**
   * operation to update processing analyst config favorite phases
   */
  updateFavoritesList: (phase: string) => void;
}

/**
 * A list of phase entry items with a title
 */
export function PhaseCategoryList({
  categorizedPhases,
  phaseHotkeys,
  selectedPhases,
  phaseSelectorCallback,
  onClose,
  favorites,
  updateFavoritesList
}: PhaseCategoryListProps) {
  const performPhaseSelectorCallback = React.useCallback(
    (phase: string) => {
      phaseSelectorCallback([phase]);
      onClose();
    },
    [onClose, phaseSelectorCallback]
  );

  return (
    <li className="phase-category">
      <H5 className="phase-category__title">{categorizedPhases.categoryTitle}</H5>
      <ol className="phase-category-list">
        {categorizedPhases.phases.map(phase => {
          const foundPhaseHotkey = phaseHotkeys.find(phaseHotkey => {
            return phaseHotkey.phase === phase;
          });
          return (
            <PhaseListEntry
              key={`phase-${phase}`}
              phaseHotkey={foundPhaseHotkey}
              name={phase}
              isSelected={selectedPhases.includes(phase)}
              isFavorite={favorites.includes(phase)}
              updateFavoritesList={updateFavoritesList}
              handleClick={() => performPhaseSelectorCallback(phase)}
            />
          );
        })}
      </ol>
    </li>
  );
}
