import { dirtyDotCellComparator } from '../../../../../../src/ts/components/analyst-ui/common/table/dirty-dot';

describe('DirtyDotUtils', () => {
  test('functions are defined', () => {
    expect(dirtyDotCellComparator).toBeDefined();
  });

  describe('dirtyDotCellComparator', () => {
    it('returns 1', () => {
      const result = dirtyDotCellComparator(false, true);
      expect(result).toBe(1);
    });

    it('returns -1', () => {
      const result = dirtyDotCellComparator(true, false);
      expect(result).toBe(-1);
    });

    it('returns 0', () => {
      const result = dirtyDotCellComparator(false, false);
      expect(result).toBe(0);
    });
  });
});
