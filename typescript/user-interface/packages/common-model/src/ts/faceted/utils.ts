import type { EntityReference, Faceted, VersionReference } from './types';
/**
 * Converts an objected that extends Faceted into a version reference
 *
 * @param value the object to be converted
 * @param key The faceting key of the object
 * @returns a version reference containing only the requested key and the effectiveAt field
 */
export function convertToVersionReference<
  K extends Exclude<keyof T, 'effectiveAt'>,
  T extends Faceted
>(value: T, key: K): VersionReference<K, T> {
  return { [key]: value[key], effectiveAt: value.effectiveAt } as VersionReference<K, T>;
}

/**
 * Converts an objected that extends Faceted into a entity reference
 *
 * @param value the object to be converted
 * @param key The faceting key of the object
 * @returns a entity reference containing only the requested key
 */
export function convertToEntityReference<K extends keyof T, T extends Faceted>(
  value: T,
  key: K
): EntityReference<K, T> {
  return { [key]: value[key] } as EntityReference<K, T>;
}

/**
 * Checks to see if an object is faceted by version (key and effective time),
 * which is true if and only if the object has the expected key and effective time,
 * and nothing else;
 *
 * @param value the object to check if it is faceted by reference
 * @param key the key to check for faceting on
 */
export const isVersionReference = <K extends Exclude<keyof T, 'effectiveAt'>, T extends Faceted>(
  value: T,
  key: K
): boolean =>
  Object.keys(value).length === 2 &&
  Object.keys(value).includes(key as string) &&
  Object.keys(value).includes('effectiveAt');

/**
 * Checks to see if an object is faceted by entity (key),
 * which is true if and only if the object has the expected key and nothing else;
 *
 * @param value the object to check if it is faceted by reference
 * @param key the key to check for faceting on
 */
export const isEntityReference = <K extends Exclude<keyof T, 'effectiveAt'>, T extends Faceted>(
  value: T,
  key: K
): boolean => Object.keys(value).length === 1 && Object.keys(value)[0] === key;
