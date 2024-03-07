import {
  eventData,
  eventHypothesis,
  eventId,
  eventId2,
  eventId3,
  eventStatusInfoInProgress
} from '@gms/common-model/__tests__/__data__/event/event-data';
import type { AppState } from '@gms/ui-state';
import { getStore } from '@gms/ui-state';
import { appState } from '@gms/ui-state/__tests__/test-util';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  EventContextMenu,
  EventContextMenuContent
} from '../../../../../src/ts/components/analyst-ui/components/events/context-menus';

jest.mock('@gms/ui-state', () => {
  const actualRedux = jest.requireActual('@gms/ui-state');
  return {
    ...actualRedux,
    useAppSelector: jest.fn((stateFunc: (state: AppState) => any) => {
      const state: AppState = appState;
      state.app.workflow.openIntervalName = 'AL1';
      state.app.analyst.selectedEventIds = [eventId, eventId2, eventId3];
      state.app.analyst.actionTargets.eventIds = [eventId];
      return stateFunc(state);
    }),
    useGetEvents: jest.fn().mockReturnValue({
      data: [{ [eventId]: eventData }]
    }),
    useEventStatusQuery: jest.fn().mockReturnValue({
      data: {
        [eventId]: eventStatusInfoInProgress
      }
    })
  };
});

jest.mock('@gms/common-model/lib/event', () => {
  const actual = jest.requireActual('@gms/common-model/lib/event');
  return {
    ...actual,
    useGetPreferredEventHypothesesByEventIds: jest.fn().mockReturnValue([
      {
        id: {
          eventId: 'eventID',
          hypothesisId: 'hypothesisID'
        },
        rejected: false,
        deleted: false,
        parentEventHypotheses: [],
        associatedSignalDetectionHypotheses: [],
        locationSolutions: [],
        name: ''
      }
    ])
  };
});

describe('EventContextMenu', () => {
  const openCallback = jest.fn();
  const closeCallback = jest.fn();
  const duplicateCallback = jest.fn();
  const rejectCallback = jest.fn();
  const deleteCallback = jest.fn();
  const entityProperties = {
    time: { value: 0, uncertainty: 0 },
    latitudeDegrees: 0,
    longitudeDegrees: 0,
    depthKm: { value: 0, uncertainty: 0 }
  };
  const setEventIdCallback = jest.fn();
  const eventDetailsCb = jest.fn();
  const preferredEventHypos = [eventHypothesis];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is exported', () => {
    expect(EventContextMenu).toBeDefined();
  });

  it('Cannot close if not already open and opens with only 1 actionTarget', () => {
    const { container } = render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen={false}
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    expect(container).toMatchSnapshot();

    const closeButton = screen.getByText('Close event');

    fireEvent.click(closeButton);
    expect(closeCallback).not.toHaveBeenCalled();

    const openButton = screen.getByText('Open event');

    fireEvent.click(openButton);
    expect(openCallback).toHaveBeenCalled();
  });

  it('isOpen=true enables "Close Event" and disables "Open Event', () => {
    const { container } = render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    expect(container).toMatchSnapshot();

    const openButton = screen.getByText('Open event');

    fireEvent.click(openButton);
    expect(openCallback).not.toHaveBeenCalled();

    const closeButton = screen.getByText('Close event');

    fireEvent.click(closeButton);

    expect(closeCallback).toHaveBeenCalledWith(eventId);
  });

  it('Close event calls the set event id callback if defined', () => {
    render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          setEventIdCallback={setEventIdCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    const closeButton = screen.getByText('Close event');

    fireEvent.click(closeButton);
    expect(setEventIdCallback).toHaveBeenCalledWith(undefined);
  });

  it('Duplicate is enabled and calls the callback when rejected and deleted are false', () => {
    render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          setEventIdCallback={setEventIdCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    const duplicateButton = screen.getByText(
      `Duplicate ${preferredEventHypos.length} selected event${
        preferredEventHypos.length === 1 ? '' : 's'
      }`
    );

    fireEvent.click(duplicateButton);

    expect(duplicateCallback).toHaveBeenCalled();
  });
  it('Delete is enabled and calls the callback when deleted is false', () => {
    render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          setEventIdCallback={setEventIdCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    const deleteButton = screen.getByText(
      `Delete ${preferredEventHypos.length} selected event${
        preferredEventHypos.length === 1 ? '' : 's'
      }`
    );

    fireEvent.click(deleteButton);

    expect(deleteCallback).toHaveBeenCalled();
  });
  it('Reject is enabled and calls the callback when rejected and deleted are false', () => {
    render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          setEventIdCallback={setEventIdCallback}
          includeEventDetailsMenuItem={false}
          isMapContextMenu={false}
        />
      </Provider>
    );

    // const rejectButton = screen.getByText(`Reject 0 selected events`);
    const rejectButton = screen.getByText(
      `Reject ${preferredEventHypos.length} selected event${
        preferredEventHypos.length === 1 ? '' : 's'
      }`
    );

    fireEvent.click(rejectButton);

    expect(rejectCallback).toHaveBeenCalled();
  });

  it('Event Details option is enabled and calls the callback when includeEventDetailsMenuItem is true', () => {
    render(
      <Provider store={getStore()}>
        <EventContextMenuContent
          isOpen
          selectedEventId={eventId}
          openCallback={openCallback}
          closeCallback={closeCallback}
          duplicateCallback={duplicateCallback}
          rejectCallback={rejectCallback}
          deleteCallback={deleteCallback}
          setEventIdCallback={setEventIdCallback}
          includeEventDetailsMenuItem
          isMapContextMenu={false}
          entityProperties={entityProperties}
          eventDetailsCb={eventDetailsCb}
        />
      </Provider>
    );

    const detailsButton = screen.getByText('Open event details');

    fireEvent.click(detailsButton);

    expect(eventDetailsCb).not.toHaveBeenCalled();
  });
});
