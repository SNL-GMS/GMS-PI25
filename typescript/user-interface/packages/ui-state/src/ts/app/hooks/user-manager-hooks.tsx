import type { UserProfileTypes } from '@gms/common-model';
import type { ColorMapName } from '@gms/common-model/lib/color/types';
import { DEFAULT_COLOR_MAP } from '@gms/common-model/lib/color/types';
import { UILogger } from '@gms/ui-util';
import produce from 'immer';
import React from 'react';

import type { SetLayoutArgs } from '../api/user-manager';
import {
  createNewProfileFromSetLayoutInput,
  updateAudibleNotification,
  useGetUserProfileQuery,
  useSetUserProfileMutation
} from '../api/user-manager';

const logger = UILogger.create('GMS_LOG_USER_MANAGER_API', process.env.GMS_LOG_USER_MANAGER_API);

/**
 * Hook that provides a function (mutation) for setting the user layout.
 *
 * @returns a mutation function for setting the layout
 */
export const useSetLayout = (): ((args: SetLayoutArgs) => Promise<void>) => {
  const userProfileQuery = useGetUserProfileQuery();
  const [setUserProfileMutation] = useSetUserProfileMutation();
  const userProfile: UserProfileTypes.UserProfile = userProfileQuery?.data;

  return React.useCallback(
    async (args: SetLayoutArgs) => {
      const updatedProfile: UserProfileTypes.UserProfileCOI = createNewProfileFromSetLayoutInput(
        userProfile,
        args
      );
      await setUserProfileMutation(updatedProfile).catch(error =>
        logger.error('Failed to set layout', error)
      );
    },
    [userProfile, setUserProfileMutation]
  );
};

/**
 * Hook that provides a function (mutation) for setting the audible notifications.
 *
 * @returns a mutation function for setting the audible notifications
 */
export const useSetAudibleNotifications = (): ((
  audibleNotifications: UserProfileTypes.AudibleNotification[]
) => Promise<void>) => {
  const userProfileQuery = useGetUserProfileQuery();
  const [setUserProfileMutation] = useSetUserProfileMutation();
  const userProfile: UserProfileTypes.UserProfile = userProfileQuery?.data;

  return React.useCallback(
    async (audibleNotifications: UserProfileTypes.AudibleNotification[]) => {
      const updatedProfile: UserProfileTypes.UserProfileCOI = {
        ...userProfile,
        audibleNotifications: updateAudibleNotification(
          userProfile.audibleNotifications,
          audibleNotifications
        )
      };
      await setUserProfileMutation(updatedProfile).catch(error =>
        logger.error('Failed to set audible notifications', error)
      );
    },
    [userProfile, setUserProfileMutation]
  );
};

/**
 * Returns a mutation function that sets a value in the user profile to be the value provided.
 *
 * @example ```
 * useSetValueInUserProfile('currentTheme') // creates a setter function for the 'currentTheme' key
 *
 * @throws if the mutation fails
 */
export const useSetValueInUserProfile = (
  key: keyof UserProfileTypes.UserProfile
): ((value: UserProfileTypes.UserProfile[keyof UserProfileTypes.UserProfile]) => Promise<void>) => {
  const userProfileQuery = useGetUserProfileQuery();
  const userProfile: UserProfileTypes.UserProfile = userProfileQuery?.data;
  const [setUserProfileMutation] = useSetUserProfileMutation();
  return async (value: UserProfileTypes.UserProfile[keyof UserProfileTypes.UserProfile]) => {
    const newUserProfile = produce(userProfile, draft => {
      draft[key] = value as any;
    });
    await setUserProfileMutation(newUserProfile).catch(error => {
      logger.error(`Failed to set ${key} in user profile`, error);
    });
  };
};
/**
 * Returns a mutation function that sets the theme in the user profile to be the string provided.
 *
 * @throws if the mutation fails
 */
export const useSetThemeInUserProfile = (): ((themeName: string) => Promise<void>) => {
  return useSetValueInUserProfile('currentTheme');
};

/**
 * @returns the value for a particular key in the user profile, and a setter to update that value in the profile
 */
export function useUserProfileConfigValue<T extends keyof UserProfileTypes.UserProfile>(
  key: T,
  defaultValue?: UserProfileTypes.UserProfile[T]
): [UserProfileTypes.UserProfile[T], (val: UserProfileTypes.UserProfile[T]) => void] {
  // see if the user's profile has a preferred theme
  const userProfileQueryResults = useGetUserProfileQuery();
  const currentUserProfile = userProfileQueryResults.data;
  const currentVal = currentUserProfile?.[key];

  React.useLayoutEffect(() => {
    if (currentVal) {
      localStorage.setItem(key, JSON.stringify(currentVal));
    }
  }, [currentVal, key]);
  const setValueInUserProfile = useSetValueInUserProfile(key);

  let selectedVal = currentVal;
  const valInLocalStorage = localStorage.getItem(key);
  if (!currentVal && (valInLocalStorage == null || valInLocalStorage === 'undefined')) {
    selectedVal = defaultValue;
  } else if (!selectedVal) {
    selectedVal = JSON.parse(valInLocalStorage);
  }

  return [selectedVal, setValueInUserProfile];
}

/**
 * @returns the currently selected color map, either from the user preferences, or from local storage
 * (if not found in preferences)
 */
export const useColorMap = (): [ColorMapName, (colorMap: ColorMapName) => void] => {
  return useUserProfileConfigValue('colorMap', DEFAULT_COLOR_MAP);
};
