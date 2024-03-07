import type { HistoryState } from '../../../../src/ts/app/history';
import { historyInitialState } from '../../../../src/ts/app/history';
import {
  historyRedoAction,
  validateRedoAction,
  validateRedoPayload
} from '../../../../src/ts/app/history/reducers/redo';

describe('history slice', () => {
  it('exists', () => {
    expect(validateRedoPayload).toBeDefined();
    expect(validateRedoAction).toBeDefined();
  });

  describe('validation', () => {
    it('validateRedoPayload', () => {
      expect(() => {
        validateRedoPayload({ payload: undefined, type: historyRedoAction.type });
      }).toThrow();

      expect(() => {
        validateRedoPayload({ payload: -1, type: historyRedoAction.type });
      }).toThrow();

      expect(() => {
        validateRedoPayload({ payload: 2, type: historyRedoAction.type });
      }).not.toThrow();
    });

    it('validateRedoAction', () => {
      let historyState: HistoryState = historyInitialState;

      // test empty history
      expect(() => {
        validateRedoAction(historyState);
      }).not.toThrow();

      historyState = {
        ...historyState,
        stack: undefined
      };

      // test bad undo position history
      expect(() => {
        validateRedoAction(historyState);
      }).toThrow();
    });
  });
});
