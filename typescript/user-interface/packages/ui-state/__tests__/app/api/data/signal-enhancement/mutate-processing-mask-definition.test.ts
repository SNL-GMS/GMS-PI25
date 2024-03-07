import {
  processingMaskDefinitionsByPhaseByChannel1,
  processingMaskDefinitionsByPhaseByChannel2
} from '@gms/common-model/__tests__/__data__';
import type { ProcessingMaskDefinitionsByPhaseByChannel } from '@gms/common-model/lib/processing-mask-definitions/types';
import produce from 'immer';

import { createRecipeToMutateProcessingMaskDefinition } from '../../../../../src/ts/app/api/data/signal-enhancement/mutate-processing-mask-definition';

describe('mutate processing mask definition', () => {
  it('can exercise immer produce method to add a processing mask defintion to an unseen channel', () => {
    const processingMaskDefinitionsByPhaseByChannel: Record<
      string,
      ProcessingMaskDefinitionsByPhaseByChannel[]
    > = produce(
      {},
      createRecipeToMutateProcessingMaskDefinition([processingMaskDefinitionsByPhaseByChannel1])
    );
    expect(processingMaskDefinitionsByPhaseByChannel).toEqual({
      'PDAR.PD01.SHZ': [processingMaskDefinitionsByPhaseByChannel1]
    });
  });

  it('can exercise immer produce method to add a processing mask definition to a seen channel', () => {
    const result = {
      'PDAR.PD01.SHZ': [
        {
          ...processingMaskDefinitionsByPhaseByChannel1,
          processingMaskDefinitionByPhase: {
            ...processingMaskDefinitionsByPhaseByChannel1.processingMaskDefinitionByPhase,
            ...processingMaskDefinitionsByPhaseByChannel2.processingMaskDefinitionByPhase
          }
        }
      ]
    };

    const processingMaskDefinitionsByPhaseByChannel = produce(
      {
        'PDAR.PD01.SHZ': [processingMaskDefinitionsByPhaseByChannel1]
      },
      createRecipeToMutateProcessingMaskDefinition([processingMaskDefinitionsByPhaseByChannel2])
    );
    expect(processingMaskDefinitionsByPhaseByChannel).toEqual(result);
  });

  it('can exercise immer produce method with undefined qc segment', () => {
    const processingMaskDefinitionsByPhaseByChannel = produce(
      {},
      createRecipeToMutateProcessingMaskDefinition(undefined)
    );
    expect(processingMaskDefinitionsByPhaseByChannel).toEqual({});
  });
});
