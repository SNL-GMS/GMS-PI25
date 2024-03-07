import type { EntityReference, Faceted, VersionReference } from '../../src/ts/faceted';
import { convertToEntityReference, convertToVersionReference } from '../../src/ts/faceted';

describe('Faceted utils', () => {
  interface Foo extends Faceted {
    otherStuff: 'goes here';
  }

  test('can covert full object to version reference', () => {
    const version: VersionReference<'name'> = {
      name: 'test name',
      effectiveAt: 100
    };

    const populated: Foo = {
      name: 'test name',
      effectiveAt: 100,
      otherStuff: 'goes here'
    };

    expect(convertToVersionReference(populated, 'name')).toEqual(version);
  });

  test('can covert full object to entity reference', () => {
    const entity: EntityReference<'name'> = {
      name: 'test name'
    };

    const populated: Foo = {
      name: 'test name',
      effectiveAt: 100,
      otherStuff: 'goes here'
    };

    expect(convertToEntityReference(populated, 'name')).toEqual(entity);
  });
});
