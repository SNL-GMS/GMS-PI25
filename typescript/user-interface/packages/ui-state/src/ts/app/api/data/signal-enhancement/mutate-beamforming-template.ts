import type { BeamformingTemplateTypes } from '@gms/common-model';
import type { Draft } from 'immer';

/**
 * Mutates, applies a beamforming template result to an existing beamforming template.
 * ! Mutates the draft in place
 *
 * @param draft the Immer writable beamforming template record draft
 * @param beamformingTemplates beamforming templates by station
 */
const mutateBeamformingTemplate = (
  draft: BeamformingTemplateTypes.BeamformingTemplatesByStationByPhase,
  templatesEntry: [string, BeamformingTemplateTypes.BeamformingTemplatesByPhase]
): void => {
  if (templatesEntry) {
    const [stationName, templatesByPhase] = templatesEntry;
    // Check if the station has ever been requested

    if (draft[stationName]) {
      Object.keys(templatesByPhase).forEach(phase => {
        // check for previously obtained phase/absence of optional station property/version references matching
        if (
          !draft[stationName][phase] ||
          !('station' in draft[stationName][phase]) ||
          draft[stationName][phase].station?.effectiveAt !==
            templatesByPhase[phase].station?.effectiveAt
        ) {
          // update in any of these cases
          draft[stationName][phase] = templatesByPhase[phase];
        }
      });
    }
    // if the station hasn't been seen add it
    else {
      draft[stationName] = templatesByPhase;
    }
  }
};

/**
 * Builds an immer recipe to apply a beamforming template result to an existing beamforming template.
 *
 * @param beamformingTemplatesByStationByPhase the beamforming templates by station and phase to add to the record
 * @param beamType which record FK, EVENT to update
 */
export const createRecipeToMutateBeamformingTemplates = (
  beamformingTemplatesByStationByPhase: BeamformingTemplateTypes.BeamformingTemplatesByStationByPhase,
  beamType: BeamformingTemplateTypes.BeamType
): ((
  draft: Draft<BeamformingTemplateTypes.BeamformingTemplatesByBeamTypeByStationByPhase>
) => void) => {
  return (
    draft: Draft<Draft<BeamformingTemplateTypes.BeamformingTemplatesByBeamTypeByStationByPhase>>
  ) => {
    if (!draft[beamType]) draft[beamType] = {};

    if (beamformingTemplatesByStationByPhase) {
      Object.entries(beamformingTemplatesByStationByPhase).forEach(
        ([stationName, templatesByPhase]) => {
          mutateBeamformingTemplate(draft[beamType], [stationName, templatesByPhase]);
        }
      );
    }
  };
};
