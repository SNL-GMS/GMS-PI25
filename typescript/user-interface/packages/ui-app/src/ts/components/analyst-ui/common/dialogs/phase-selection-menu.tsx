/* eslint-disable react/destructuring-assignment */
import { FilterableOptionList } from '@gms/ui-core-components';
import React from 'react';

/**
 * How wide to render internal elements
 */
const widthPx = 160;

export interface PhaseSelectionMenuProps {
  phase?: string;
  sdPhases: string[];
  prioritySdPhases?: string[];
  onBlur(phase: string);
  onEnterForPhases?(phase: string);
  onPhaseClicked?(phase: string);
}

export interface PhaseSelectionMenuState {
  phase: string;
}

/**
 * Phase selection menu.
 */
export class PhaseSelectionMenu extends React.Component<
  PhaseSelectionMenuProps,
  PhaseSelectionMenuState
> {
  private constructor(props) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      phase: this.props.phase ? this.props.phase : 'P'
    };
  }

  /**
   * React component lifecycle.
   */
  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    return (
      <div className="alignment-dropdown">
        <FilterableOptionList
          options={this.props.sdPhases}
          onSelection={this.onPhaseSelection}
          onClick={this.onClick}
          onDoubleClick={this.onClick}
          priorityOptions={this.props.prioritySdPhases}
          defaultSelection={this.props.phase}
          widthPx={widthPx}
          onEnter={this.props.onEnterForPhases}
        />
      </div>
    );
  }

  /**
   * On phase selection event handler.
   *
   * @param phase the selected phase
   */
  private readonly onPhaseSelection = (phase: string) => {
    // eslint-disable-next-line react/no-unused-state
    this.setState({ phase });
  };

  private readonly onClick = (phase: string) => {
    if (this.props.onPhaseClicked) {
      this.props.onPhaseClicked(phase);
    } else {
      // eslint-disable-next-line react/no-unused-state
      this.setState({ phase });
    }
  };
}
