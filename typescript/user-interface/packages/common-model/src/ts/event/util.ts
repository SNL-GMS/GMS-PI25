import type { Event, EventHypothesis, LocationSolution } from './types';

/**
 * Finds preferred event hypothesis for a given event and stage
 * If no preferred hypothesis exists for stage, will return most recent preferred hypothesis by stage
 *
 * @param event Event to search within
 * @param openIntervalName Currently open interval/stage name eg; "AL1"
 */
export const findPreferredEventHypothesisByStage = (
  event: Event,
  openIntervalName: string
): EventHypothesis => {
  if (!event) {
    return undefined;
  }

  const { preferredEventHypothesisByStage, eventHypotheses } = event;
  if (preferredEventHypothesisByStage?.length === 0) {
    return undefined;
  }

  const preferredHypoByStageId =
    preferredEventHypothesisByStage.find(hypo => hypo.stage.name === openIntervalName)?.preferred ??
    preferredEventHypothesisByStage[0].preferred;

  return eventHypotheses.find(
    hypothesis => hypothesis.id.hypothesisId === preferredHypoByStageId.id.hypothesisId
  );
};

/**
 * Determines if the provided {@link EventHypothesis} object is the
 * preferredEventHypothesis for the current open stage.
 *
 * @param event Event object to check
 * @param openIntervalName Current open stage
 * @param eventHypothesis EventHypothesis object to verify
 * @returns true if the eventHypothesis is preferred
 */
export const isPreferredEventHypothesisByStage = (
  event: Event,
  openIntervalName: string,
  eventHypothesis: EventHypothesis
): boolean => {
  if (!event || !eventHypothesis) {
    return false;
  }

  // Get the preferredEventHypo exists for the open stage (if it exists)
  const maybePreferred = event.preferredEventHypothesisByStage.find(
    hypo => hypo.stage.name === openIntervalName
  );

  // Check if these two have the same identifiers
  return (
    maybePreferred?.preferred.id.eventId === eventHypothesis.id.eventId &&
    maybePreferred?.preferred.id.hypothesisId === eventHypothesis.id.hypothesisId
  );
};

/**
 * Finds the last non rejected parent event hypothesis for a given event and hypothesis
 * if no valid hypothesis is found it returns the first hypothesis
 *
 * @param event
 * @param eventHypothesis
 */
export const findEventHypothesisParent = (
  event: Event,
  eventHypothesis: EventHypothesis
): EventHypothesis | undefined => {
  if (!eventHypothesis) {
    return undefined;
  }

  // loop backwards until we find a non-rejected hypothesis
  for (let i = eventHypothesis.parentEventHypotheses.length - 1; i >= 0; i -= 1) {
    const parentEventHypothesis = event.eventHypotheses.find(
      hypo => hypo.id.hypothesisId === eventHypothesis.parentEventHypotheses[i].id.hypothesisId
    );
    if (parentEventHypothesis) {
      return parentEventHypothesis;
    }
  }

  // nothing was found, return the first hypothesis
  return event.eventHypotheses[0];
};

/**
 * Finds the preferred location solution for a hypothesis falling back to the parents if the hypothesis is rejected
 *
 * @param eventHypothesisId hypothesis id to find the solution for
 * @param eventHypotheses list of hypotheses, if an event is opened
 * @returns a location solution
 */
export const findPreferredLocationSolution = (
  eventHypothesisId: string,
  eventHypotheses: EventHypothesis[]
): LocationSolution => {
  const eventHypothesis = eventHypotheses.find(
    hypothesis => hypothesis.id.hypothesisId === eventHypothesisId
  );
  if (!eventHypothesis) return undefined;
  if (eventHypothesis.preferredLocationSolution) {
    return eventHypothesis.locationSolutions.find(
      ls => ls.id === eventHypothesis.preferredLocationSolution.id
    );
  }

  if (eventHypothesis.parentEventHypotheses) {
    const parentHypothesisId =
      eventHypothesis.parentEventHypotheses[eventHypothesis.parentEventHypotheses.length - 1].id
        .hypothesisId;

    const parentEventHypothesis = eventHypotheses.find(
      hypothesis => hypothesis.id.hypothesisId === parentHypothesisId
    );

    return parentEventHypothesis.locationSolutions.find(
      ls => ls.id === parentEventHypothesis.preferredLocationSolution.id
    );
  }

  return undefined;
};
