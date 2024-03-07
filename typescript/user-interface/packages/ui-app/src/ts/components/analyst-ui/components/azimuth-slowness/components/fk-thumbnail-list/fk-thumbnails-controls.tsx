/* eslint-disable react/destructuring-assignment */
import { Menu, MenuDivider } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { MenuItem2 } from '@blueprintjs/popover2';
import { DeprecatedToolbar, DeprecatedToolbarTypes } from '@gms/ui-core-components';
import React from 'react';

const MARGINS_FOR_TOOLBAR_PX = 0;
/**
 * Fk Thumbnails Controls Props
 */
export interface FkThumbnailsControlsProps {
  currentFilter: FilterType;
  widthPx: number;
  anyDisplayedFksNeedReview: boolean;
  onlyOneFkIsSelected: boolean;
  anyUnassociatedSelected: boolean;
  updateFkThumbnail(px: number): void;
  updateFkFilter(filter: FilterType): void;
  clearSelectedUnassociatedFks();
  nextFk(): void;
}

/**
 * Different filters that are available
 */
export enum FilterType {
  firstP = 'First P',
  all = 'All',
  needsReview = 'Needs review'
}

/**
 * Pixels widths of available thumbnail sizes
 */
export enum FkThumbnailSize {
  SMALL = 70,
  MEDIUM = 110,
  LARGE = 150
}

/**
 * FK Thumbnails Controls Component
 * Filtering / review controls for the FK
 */
export function FkThumbnailsControls(props: FkThumbnailsControlsProps) {
  const toolbarItemsLeft: DeprecatedToolbarTypes.ToolbarItem[] = [];
  toolbarItemsLeft.push({
    rank: 1,
    label: 'Filter',
    type: DeprecatedToolbarTypes.ToolbarItemType.Dropdown,
    tooltip: 'Filter the fks',
    dropdownOptions: FilterType,
    widthPx: 130,
    value: props.currentFilter,
    onChange: value => props.updateFkFilter(value as FilterType)
  });
  const fkThumbnailMenuPopup = (
    <Menu>
      <MenuDivider title="Thumbnail Size" className="menu-title" />
      <MenuItem2
        icon={IconNames.SMALL_SQUARE}
        onClick={() => props.updateFkThumbnail(FkThumbnailSize.SMALL)}
        text="Small"
      />
      <MenuItem2
        icon={
          // TODO: This should be created into a separate svg file and used
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path
              id="med-square"
              d="M2.067,10.06H10.06V2.067H2.067ZM1.213,0A1.146,1.146,0,0,0,0,1.213v9.7a1.146,1.146,0,0,0,1.213,1.213h9.7a1.146,1.146,0,0,0,1.212-1.213v-9.7A1.146,1.146,0,0,0,10.915,0Z"
              transform="translate(1.75 1.75)"
              fill="#bfccd6"
              fillRule="evenodd"
            />
          </svg>
        }
        onClick={() => props.updateFkThumbnail(FkThumbnailSize.MEDIUM)}
        text="Medium"
      />
      <MenuItem2
        icon={IconNames.SQUARE}
        onClick={() => props.updateFkThumbnail(FkThumbnailSize.LARGE)}
        text="Large"
      />
      <MenuDivider title="Approval" className="menu-title" />
      <MenuItem2
        icon={IconNames.CONFIRM}
        disabled={false}
        onClick={() => props.clearSelectedUnassociatedFks()}
        text="Accept selected"
      />
      <MenuItem2
        icon={IconNames.CROSS}
        disabled={false}
        onClick={() => props.clearSelectedUnassociatedFks()}
        text="Hide selected"
      />
    </Menu>
  );
  const toolbarItems: DeprecatedToolbarTypes.ToolbarItem[] = [];
  const nextButton: DeprecatedToolbarTypes.ButtonItem = {
    rank: 1,
    label: 'Next',
    tooltip: 'Selected next fk that needs review',
    type: DeprecatedToolbarTypes.ToolbarItemType.Button,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    onClick: props.nextFk,
    disabled: !props.anyDisplayedFksNeedReview || !props.onlyOneFkIsSelected,
    widthPx: 50
  };
  const optionsPopover: DeprecatedToolbarTypes.PopoverItem = {
    rank: 2,
    label: 'Options',
    type: DeprecatedToolbarTypes.ToolbarItemType.Popover,
    tooltip: 'Options for displaying fk thumbnails',
    popoverContent: fkThumbnailMenuPopup,
    widthPx: 30,
    onlyShowIcon: true,
    icon: IconNames.MORE,
    onPopoverDismissed: () => {
      // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
    }
  };
  toolbarItems.push(nextButton);
  toolbarItems.push(optionsPopover);

  return (
    <div className="azimuth-slowness-thumbnails-controls__wrapper">
      <DeprecatedToolbar
        itemsLeft={toolbarItemsLeft}
        toolbarWidthPx={props.widthPx - MARGINS_FOR_TOOLBAR_PX}
        itemsRight={toolbarItems}
      />
    </div>
  );
}
