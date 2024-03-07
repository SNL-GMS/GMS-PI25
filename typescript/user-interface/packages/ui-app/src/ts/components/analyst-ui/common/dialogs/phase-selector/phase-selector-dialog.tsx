/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Dialog } from '@blueprintjs/core';
import { DropDown } from '@gms/ui-core-components';
import {
  analystActions,
  selectPhaseSelectorFavorites,
  selectPhaseSelectorPhaseList,
  useAppDispatch,
  useAppSelector,
  useGetProcessingAnalystConfigurationQuery
} from '@gms/ui-state';
import classnames from 'classnames';
import React from 'react';
import { toast } from 'react-toastify';

import type { PhaseHotkey } from '~analyst-ui/components/waveform/types';
import { KeyComboMarks } from '~common-ui/components/keyboard-shortcuts/key-combo-marks';

import { PhaseCategoryList } from './phase-category-list';
import { useHasScrolled } from './phase-selector-utils';

/**
 * The type of the props for the {@link PhaseSelectorDialog} component
 */
export interface PhaseSelectorPopupProps {
  phaseHotkeys?: PhaseHotkey[];

  isOpen: boolean;
  /**
   * The title of the popup
   */
  title: string;

  /**
   * Hotkey combos. Within one hotkey combo, separated by `+` characters.
   * Multiple hotkeys may be configured to support different operating systems.
   * In this case, each hotkey should be separated by a comma and a space: `, `,
   *
   * @example `Alt + e, option + e`
   */
  hotkeyCombo?: string;

  /**
   * Selected phases for selection
   */
  selectedPhases?: string[];

  /**
   * Callback that accepts the selected phases
   */
  phaseSelectorCallback: (selectedPhases: string[]) => void;

  /**
   * callback to close the popup
   */
  closeCallback: () => void;

  /**
   * A child jsx element for an extra optional selector
   */
  children?: React.ReactNode;
}

function InternalPhaseSelectorDialog({
  selectedPhases = [],
  hotkeyCombo = '',
  isOpen = false,
  title,
  phaseHotkeys,
  phaseSelectorCallback,
  closeCallback,
  children
}: PhaseSelectorPopupProps) {
  const phaseLists = useGetProcessingAnalystConfigurationQuery()?.data?.phaseLists;
  const selectedPhaseListTitle =
    useAppSelector(selectPhaseSelectorPhaseList) ?? phaseLists?.[0]?.listTitle;
  const favoritesList = useAppSelector(selectPhaseSelectorFavorites);

  const selectedPhaseList = React.useMemo(
    () => phaseLists?.find(list => list.listTitle === selectedPhaseListTitle),
    [phaseLists, selectedPhaseListTitle]
  );
  const dispatch = useAppDispatch();

  // On load only useEffect to check if we need to populate the redux store
  // The first time a phase selector popup is created the redux values will be undefined and need to be populated from config

  React.useEffect(() => {
    if (favoritesList[selectedPhaseListTitle] === undefined) {
      dispatch(
        analystActions.setPhaseSelectorFavorites({
          listName: selectedPhaseListTitle,
          favorites: selectedPhaseList?.favorites
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultPhase = selectedPhaseList?.defaultPhaseLabelAssignment;
  const currentPhase = useAppSelector(state => state.app.analyst.currentPhase);
  const updateFavoritesList = React.useCallback(
    (phase: string) => {
      if (phase === defaultPhase) {
        toast.info(`Cannot remove default phase from favorites.`, {
          toastId: 'cy-toast-favorite-default'
        });
        return;
      }
      if (favoritesList[selectedPhaseListTitle].includes(phase)) {
        dispatch(
          analystActions.setPhaseSelectorFavorites({
            listName: selectedPhaseListTitle,
            favorites: favoritesList[selectedPhaseListTitle].filter(fav => fav !== phase)
          })
        );
      } else {
        dispatch(
          analystActions.setPhaseSelectorFavorites({
            listName: selectedPhaseListTitle,
            favorites: [...favoritesList[selectedPhaseListTitle], phase]
          })
        );
      }
    },
    [defaultPhase, dispatch, favoritesList, selectedPhaseListTitle]
  );

  const selectPhaseList = React.useCallback(
    (phaseListTitle: string) => {
      dispatch(analystActions.setPhaseSelectorPhaseList(phaseListTitle));
      const phaseList = phaseLists?.find(list => list.listTitle === phaseListTitle);
      // if the favorites list isn't populated populate it
      if (favoritesList[phaseListTitle] === undefined) {
        dispatch(
          analystActions.setPhaseSelectorFavorites({
            listName: phaseListTitle,
            favorites: phaseList?.favorites
          })
        );
      }
    },
    [dispatch, favoritesList, phaseLists]
  );

  const scrollListenerRef = React.useRef<HTMLElement>();
  const hasScrolled = useHasScrolled(scrollListenerRef);
  const numElementsTotal = selectedPhaseList?.categorizedPhases.reduce((total, category) => {
    return total + category.phases.length + 1;
  }, 0);
  return (
    <Dialog
      style={{ '--num-phases': numElementsTotal } as React.CSSProperties}
      className="phase-selector_dialog"
      isOpen={isOpen}
      onClose={closeCallback}
      usePortal
      canOutsideClickClose
      title={
        <div className="form__header phase-selector__header">
          <div>{title}</div>
          <div className="form__header-decoration">
            <KeyComboMarks hotkeys={[hotkeyCombo]} description="" />
          </div>
        </div>
      }
    >
      <section className={classnames('phase-selector', 'phase-selector--current-phase')}>
        <header className="phase-selector__header">
          <DropDown
            disabled={false}
            className="monospace"
            dropDownItems={phaseLists?.map(pl => pl.listTitle)}
            value={selectedPhaseListTitle}
            onMaybeValue={maybeVal => selectPhaseList(maybeVal)}
          />
          {children}
        </header>
        <section
          ref={scrollListenerRef}
          className="phase-selector__body"
          data-has-scrolled={hasScrolled}
        >
          <section className="phase-selector__favorites">
            <PhaseCategoryList
              phaseHotkeys={phaseHotkeys ?? []}
              categorizedPhases={{
                categoryTitle: 'Favorites',
                phases: favoritesList[selectedPhaseListTitle]
              }}
              selectedPhases={selectedPhases || [currentPhase]}
              phaseSelectorCallback={phaseSelectorCallback}
              onClose={closeCallback}
              favorites={favoritesList[selectedPhaseListTitle]}
              updateFavoritesList={updateFavoritesList}
            />
          </section>

          <section className="phase-selector__phases">
            <ol className="phase-categories">
              {selectedPhaseList?.categorizedPhases.map(cat => (
                <PhaseCategoryList
                  key={cat.categoryTitle}
                  phaseHotkeys={phaseHotkeys ?? []}
                  categorizedPhases={cat}
                  selectedPhases={selectedPhases}
                  phaseSelectorCallback={phaseSelectorCallback}
                  onClose={closeCallback}
                  favorites={favoritesList[selectedPhaseListTitle]}
                  updateFavoritesList={updateFavoritesList}
                />
              ))}
            </ol>
          </section>
        </section>
      </section>
    </Dialog>
  );
}

/**
 * Creates a phase selector dialog popup.
 */
export const PhaseSelectorDialog = React.memo(InternalPhaseSelectorDialog);
