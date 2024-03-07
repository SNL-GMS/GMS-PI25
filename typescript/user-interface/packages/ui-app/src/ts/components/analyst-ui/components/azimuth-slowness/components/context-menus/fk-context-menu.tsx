import { Menu } from '@blueprintjs/core';
import { MenuItem2 } from '@blueprintjs/popover2';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';
/**
 * functions which will review or clear fks
 */
export interface FkClearOrReview {
  (): void;
}
export interface FkThumbnailContextMenuProps {
  readonly action: FkClearOrReview;
  readonly fksCanBeCleared: boolean;
}

export type FkThumbnailContextMenuCb = ImperativeContextMenuOpenFunc<FkThumbnailContextMenuProps>;

export type FkThumbnailContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  FkThumbnailContextMenuProps
>;

/**
 * FK Thumbnail context menu content.
 *
 * @param clearAll Callback function to clear all selected FK
 * @param fksCanBeCleared True is some fks can be removed from the selection
 */
export const FkThumbnailContextMenuContent = React.memo(function FkThumbnailContextMenuContent(
  props: FkThumbnailContextMenuProps
): JSX.Element {
  const { action, fksCanBeCleared } = props;
  return (
    <Menu>
      <MenuItem2 text="Clear selected" onClick={action} disabled={!fksCanBeCleared} />
    </Menu>
  );
});

/**
 * Displays the FK Thumbnails Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const FkThumbnailContextMenu = React.memo(function FkThumbnailContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<FkThumbnailContextMenuProps>;
}): JSX.Element {
  const { getOpenCallback } = props;

  const content = React.useCallback(
    // eslint-disable-next-line react/jsx-props-no-spreading
    (p: FkThumbnailContextMenuProps) => <FkThumbnailContextMenuContent {...p} />,
    []
  );

  return (
    <ImperativeContextMenu<FkThumbnailContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
