/* eslint-disable react/destructuring-assignment */
import { Menu, MenuDivider } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { MenuItem2, Tooltip2 } from '@blueprintjs/popover2';
import type { ConfigurationTypes, UserProfileTypes } from '@gms/common-model';
import type { KeyValue } from '@gms/common-util';
import { IS_MODE_IAN, isIanMode, UI_BASE_PATH, UI_URL } from '@gms/common-util';
import {
  useGetAllUiThemes,
  useKeyboardShortcutsDisplayVisibility,
  useUiTheme
} from '@gms/ui-state';
import { getOS, OSTypes } from '@gms/ui-util';
import kebabCase from 'lodash/kebabCase';
import React from 'react';

import { KeyCloakService } from '~app/authentication/gms-keycloak';
import { GMS_DISABLE_KEYCLOAK_AUTH } from '~env';

import { uniqueLayouts } from '../golden-layout/golden-layout-util';
import type {
  GLComponentConfig,
  GLComponentMap,
  GLComponentValue,
  GLMap
} from '../golden-layout/types';
import { GoldenLayoutContext, isGLComponentMap, isGLKeyValue } from '../golden-layout/types';
import { SubMenuButton } from './sub-menu-button';
/**
 * Generates an array of sub menu items
 *
 * @param components map of components to create sub menu items for
 * @param openDisplay method that should be called after an onClick
 * @param getOpenDisplays
 */
export const generateAppMenuDisplayOptions = (
  components: GLMap | GLComponentMap,
  openDisplay: (componentKey: string) => void,
  getOpenDisplays: () => string[]
): JSX.Element[] => {
  const getValue = (key: string, val: GLComponentValue): string => {
    if (isGLComponentMap(val)) {
      return key.toLowerCase();
    }
    if (isGLKeyValue(val)) {
      return val.id.title.toLowerCase();
    }
    return '';
  };
  const sort = (values: GLMap) =>
    [...values].sort(([keyA, componentA], [keyB, componentB]) => {
      const componentAVal = getValue(keyA, componentA);
      const componentBVal = getValue(keyB, componentB);
      return componentAVal.localeCompare(componentBVal);
    });

  return sort(components).map(([key, component]) => {
    if (isGLComponentMap(component)) {
      return (
        <MenuItem2 text={`${key}`} key={key} icon={IconNames.DESKTOP} data-cy="app-menu__displays">
          {...generateAppMenuDisplayOptions(component, openDisplay, getOpenDisplays)}
        </MenuItem2>
      );
    }

    if (isGLKeyValue(component)) {
      const isDisabled =
        getOpenDisplays().find(display => display === component.id.component) !== undefined;
      const openInNewTab = e => {
        e.stopPropagation();
        e.preventDefault();
        window.open(`${UI_URL}${UI_BASE_PATH}/#/${component.id.component}`);
      };
      return (
        <MenuItem2
          text={component.id.title}
          className="app-menu-item"
          key={key}
          data-cy={`app-menu__displays__${kebabCase(component.id.title.toLowerCase())}`}
          onClick={(e: React.MouseEvent) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) {
              openInNewTab(e);
            } else {
              openDisplay(key);
            }
          }}
          disabled={isDisabled}
          labelElement={
            IS_MODE_IAN && (
              <Tooltip2 content={`Open ${component.id.title} in new tab`} placement="right">
                <SubMenuButton
                  disabled={isDisabled}
                  handleClick={openInNewTab}
                  handleKeyDown={openInNewTab}
                  iconName={IconNames.OPEN_APPLICATION}
                />
              </Tooltip2>
            )
          }
        />
      );
    }
    return undefined;
  });
};

export interface AppMenuProps {
  components: Map<
    string,
    | KeyValue<GLComponentConfig, React.ComponentClass | React.FunctionComponent>
    | Map<string, KeyValue<GLComponentConfig, React.ComponentClass | React.FunctionComponent>>
  >;
  logo: any;
  userProfile: UserProfileTypes.UserProfile;
  openLayoutName: string;
  getOpenDisplays(): string[];
  logout(): void;
  showLogs(): void;
  clearLayout(): void;
  openDisplay(componentKey: string): void;
  openWorkspace(layout: UserProfileTypes.UserLayout): void;
  showAboutDialog(): void;
  saveWorkspaceAs(): void;
}

export function UIThemeMenuItem() {
  const [currentTheme, setUiTheme] = useUiTheme();
  const uiThemes: ConfigurationTypes.UITheme[] = useGetAllUiThemes();
  // not supported in SOH mode currently
  if (!isIanMode()) return null;
  return (
    <MenuItem2
      text="UI Themes"
      title="Choose a UI Theme"
      data-cy="app-menu__choose-theme"
      icon={IconNames.TINT}
      className="app-menu__save-as"
    >
      {uiThemes.map(theme => {
        return (
          <MenuItem2
            text={theme.name}
            key={theme.name}
            icon={theme.name === currentTheme.name ? IconNames.TICK : null}
            title={`Opens the theme "${theme.name}`}
            data-cy={`app-menu__open-theme-${theme.name}`}
            onClick={() => {
              setUiTheme(theme.name);
            }}
          />
        );
      })}
    </MenuItem2>
  );
}

export function KeyboardShortcutsAppMenuItem() {
  const { openKeyboardShortcuts } = useKeyboardShortcutsDisplayVisibility();
  const labelElement = getOS() === OSTypes.MAC ? '⌘ + /' : 'ctrl + /';
  return isIanMode() ? (
    <MenuItem2
      className="app-menu__keyboard-shortcuts"
      onClick={openKeyboardShortcuts}
      text="Keyboard Shortcuts"
      title="Shows GMS keyboard shortcuts (hotkeys)"
      icon={IconNames.KEY}
      labelElement={labelElement}
      data-cy="app-menu__keyboard-shortcuts"
    />
  ) : null;
}

/**
 * Create the app menu component for use in the top-level app menu popover
 */
export function AppMenu(props: AppMenuProps) {
  const context = React.useContext(GoldenLayoutContext);

  const { defaultLayoutName } = props.userProfile;

  const defaultLayout = props.userProfile.workspaceLayouts
    .filter(layout =>
      layout.supportedUserInterfaceModes.includes(context.supportedUserInterfaceMode)
    )
    .find(wl => wl.name === defaultLayoutName);
  // Get a list of layouts that are uniq by name - this is a limitation due to the current
  // way layouts are stored in the database. It causes duplicates in the UI.
  const layouts = uniqueLayouts(
    props.userProfile.workspaceLayouts,
    defaultLayoutName,
    context.supportedUserInterfaceMode
  );
  layouts.sort((a, b) => a.name.localeCompare(b.name));
  const defaultLayoutClassName =
    defaultLayout?.name !== props.openLayoutName ? 'unopened-layout' : '';
  const defaultLayoutIcon = defaultLayout?.name === props.openLayoutName ? IconNames.TICK : null;
  const menuDividerElement =
    layouts?.length > 0 ? (
      <>
        <MenuDivider />
        {layouts.map(wl => (
          <MenuItem2
            key={wl.name}
            data-cy={wl.name}
            className={wl.name !== props.openLayoutName ? 'unopened-layout' : ''}
            icon={wl.name === props.openLayoutName ? IconNames.TICK : null}
            text={`${wl.name}`}
            onClick={() => props.openWorkspace(wl)}
          />
        ))}
      </>
    ) : null;
  const userProfileMenu =
    props.userProfile !== undefined ? (
      <MenuItem2
        text="Open Workspace"
        title="Opens a previously saved workspace"
        data-cy="open-workspace-button"
        className="app-menu__open-workspace"
        icon={IconNames.FOLDER_OPEN}
      >
        <MenuItem2
          data-cy={defaultLayout?.name}
          className={defaultLayoutClassName}
          icon={defaultLayoutIcon}
          text={`${defaultLayout?.name} (default)`}
          onClick={() => props.openWorkspace(defaultLayout)}
        />
        {menuDividerElement}
      </MenuItem2>
    ) : null;
  return (
    <Menu className="user-menu" data-cy="user-menu">
      <MenuItem2
        className="app-menu__about"
        onClick={() => {
          props.showAboutDialog();
        }}
        text="About"
        title="Shows GMS system version info"
        icon={IconNames.INFO_SIGN}
        data-cy="app-menu__about"
      />
      <KeyboardShortcutsAppMenuItem />
      <MenuDivider title="Workspace" className="menu-title" />
      {userProfileMenu}
      <MenuItem2
        onClick={() => {
          props.saveWorkspaceAs();
        }}
        text="Save Workspace As"
        data-cy="save-workspace-as-button"
        className="app-menu__save-as"
        title="Save your current workspace layout as a new layout"
        icon={IconNames.FLOPPY_DISK}
      />
      <UIThemeMenuItem />
      <MenuDivider title="Displays" className="menu-title" />
      {...generateAppMenuDisplayOptions(
        props.components,
        key => {
          props.openDisplay(key);
        },
        () => props.getOpenDisplays()
      )}
      <MenuDivider />
      <MenuItem2
        text="Developer Tools"
        title="Shows advanced debugging tools"
        icon={IconNames.WRENCH}
        data-cy="app-menu__devtools"
      >
        <MenuItem2
          onClick={() => {
            props.showLogs();
          }}
          className="app-menu__logs"
          data-cy="app-menu__logs"
          text="Logs"
          title="Shows logs between UI and API Gateway"
        />
        <MenuItem2
          onClick={() => {
            props.clearLayout();
          }}
          text="Clear Layout"
          className="app-menu__clear-layout"
          data-cy="app-menu__clearlayout"
          title="Clears local golden layout configuration and replaces with pre-configured default"
        />
      </MenuItem2>
      <MenuDivider />
      <MenuItem2
        onClick={
          GMS_DISABLE_KEYCLOAK_AUTH ? () => props.logout() : () => KeyCloakService.callLogout()
        }
        text="Log out"
        className="app-menu__logout"
        data-cy="app-menu__logout"
        icon={IconNames.LOG_OUT}
      />
    </Menu>
  );
}
