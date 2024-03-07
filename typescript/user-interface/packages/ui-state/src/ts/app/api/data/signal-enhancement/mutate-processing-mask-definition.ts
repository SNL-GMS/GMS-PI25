import type { ProcessingMaskDefinitionsByPhaseByChannel } from '@gms/common-model/lib/processing-mask-definitions/types';
import type { Draft } from 'immer';

/**
 * Mutates, applies a processing mask definition result to an existing processing mask definition.
 * ! Mutates the draft in place
 *
 * @param draft the Immer writable qc segment record draft
 * @param processingMaskDefinitionsByPhaseByChannel the processing mask definitions by phase and channel to add to the record
 */
const mutateProcessingMaskDefinition = (
  draft: Record<string, ProcessingMaskDefinitionsByPhaseByChannel[]>,
  processingMaskDefinitionsByPhaseByChannel: ProcessingMaskDefinitionsByPhaseByChannel
): void => {
  if (processingMaskDefinitionsByPhaseByChannel) {
    // Check if the base channel has ever been requested
    if (draft[processingMaskDefinitionsByPhaseByChannel.channel.name]) {
      const index = draft[processingMaskDefinitionsByPhaseByChannel.channel.name].findIndex(
        pmDef =>
          pmDef.channel.effectiveAt ===
          processingMaskDefinitionsByPhaseByChannel.channel.effectiveAt
      );
      // If haven't seen the same version reference
      if (index === -1) {
        draft[processingMaskDefinitionsByPhaseByChannel.channel.name].push(
          processingMaskDefinitionsByPhaseByChannel
        );
      }
      // else we have seen the version reference and need to combine records
      else {
        draft[processingMaskDefinitionsByPhaseByChannel.channel.name][
          index
        ].processingMaskDefinitionByPhase = {
          ...draft[processingMaskDefinitionsByPhaseByChannel.channel.name][index]
            .processingMaskDefinitionByPhase,
          ...processingMaskDefinitionsByPhaseByChannel.processingMaskDefinitionByPhase
        };
      }
    }
    // if the base channel hasn't been seen add it
    else {
      draft[processingMaskDefinitionsByPhaseByChannel.channel.name] = [
        processingMaskDefinitionsByPhaseByChannel
      ];
    }
  }
};

/**
 * Builds an immer recipe to apply a processing mask definition result to an existing processing mask definition.
 *
 * @param processingMaskDefinitionsByPhaseByChannelArray the processing mask definitions by phase and channel to add to the record
 * @returns Immer produce function
 */
export const createRecipeToMutateProcessingMaskDefinition = (
  processingMaskDefinitionsByPhaseByChannelArray: ProcessingMaskDefinitionsByPhaseByChannel[]
): ((draft: Draft<Record<string, ProcessingMaskDefinitionsByPhaseByChannel[]>>) => void) => {
  return (draft: Draft<Draft<Record<string, ProcessingMaskDefinitionsByPhaseByChannel[]>>>) => {
    if (processingMaskDefinitionsByPhaseByChannelArray) {
      processingMaskDefinitionsByPhaseByChannelArray.forEach(
        processingMaskDefinitionsByPhaseByChannel => {
          mutateProcessingMaskDefinition(draft, processingMaskDefinitionsByPhaseByChannel);
        }
      );
    }
  };
};
