SAND2024-02838O

# GMS PI 25 Release Notes
Please reference the related user's guides for more detailed information. All notes refer to the Geophysical Monitoring System (GMS) Interactive Analysis (IAN) user interface.

## Improvements to GMS
### Azimuth/Slowness Display
- Refactored FK thumbnail functionality to use functional components
- Analysts can change FK colormap to color the FK spectrum & FK UX prototype integrated into current display functionality 
### Event List Display
- Delete/reject/duplicate added to right click menu
  - Rejected/deleted events are not modifiable in any way
    - Rejected events cannot be deleted
    - Deleted events cannot be rejected
  - Menu option updates to indicate how many events the action will be applied to (e.g., Duplicate 5 selected events)
  - If an event is selected, when it is deleted/rejected in the Event List Display or Map Display it becomes de-selected
- Event List Display Columns
  - The Event List Display has been updated to include columns for Number Associated, Number Defining, Standard Deviation of Observations, Time Uncertainty, and Depth Uncertainty
  - Analysts can filter completed and remaining event counters by clicking on the number 
  - Sticky left/right-hand side columns within Event List Display have been removed
  - The unsaved changes column is sort-able 
- Show Events Menu
  - Analysts can select "Deleted Events" & "Rejected Events" options on the "Show Events" menu to specify whether deleted and rejected events are shown in the Event List Display
    - Updated configurable visibility settings for deleted/rejected events to be enabled by default
  - The following filtering option have been added to the 'Show events' dropdown within the Event List Display:
    - 'Complete'
    - 'Remaining'
    - 'Conflicts'
- ‘Create Event’ button added to toolbar
- The "open event" context menu is disabled if multiple events are selected     
### Filter Display
- Applies appropriately selected named filter based on selection in Waveform Display
- Configured default filter of the configured default filter list for open activity is appropriately applied to waveforms when opening/switching intervals 
### Map Display
- Duplication
  - When duplicated events exist on the Map Display, a number is added to the inside of the event icon or event label to indicate how many overlapping items exist (e.g., 2, 3)
  - Edge events can be duplicated via the duplicate context menu option
  - If deleting or rejecting a duplicated event, and selected events are not visible, number within event icon within the Map Display accurately represents visible events 
- New functionality added to rick-click menu
  - Option exists that allows analysts to create new events where they clicked on the map
  - Analysts can right-click on a location within the Map Display to pull up a 'Copy Lat/Lon' context menu option
  - When analysts right-click on a station/channel in the Waveform Display with a set of stations/channels selected after scaling amplitudes manually, the selected station/channel amplitudes are reset appropriately using the context menu option 'Reset manual amplitude scaling for selected channels' and/or using the hotkey
- Conflict icons added
  - Next to the ‘Signal Detection Details’ title within the SD Details popup menus when a signal detection is associated to more than one event
  - Next to the ‘Event Details’ title within the Event Details popup menu within the Map display when an Event is in conflict with any other Event
- Open Events
  - The "open event" context menu is disabled if multiple events are selected
  - Open events are always shown at the highest z-index level within the Map Display
- Visuals
  - Updated display and visualization of map uncertainty ellipses to be brighter and thicker 
  - Updated opacity of edge events/SDs to be more prominent so easier to visualize
  - Updated configurable visibility settings for deleted/rejected events to be enabled by default
- Event association context menus enable/disable logic has been updated
- The existing "Associated event time(s)" attribute in the Signal Detection Details popup displays the Event time of all Events if it is associated to more than one Event (if not, just displays single event time)
- Refactored Map Display from 39 to 9 data sources (i.e., layers) to reduce complexity and increase maintainability
- Event uncertainty ellipses (coverage & confidence) are their own distinct layer and do not disappear when preferred event location solution layer is turned off 
### Signal Detection List Display
- Analysts can double-click the SD "Time" or SD "Time std dev" values for a Signal Detection in the Signal Detection List Display table to manually edit their values
- Analysts can choose to change an existing SD phase label via right-click context menu option using the "Set Phase" menu
  - Updated change phase label logic to not apply changes when action is not valid
- The "Conflict" icon in the Signal Detection List includes a tooltip showing the times of the Events in conflict; sorted by time descending (e.g., Event(s) in conflict: 00:00:00, 01:00:00)
- SD count toolbar has been added to the SD List Display, follows the same functionality as Event List Counter and displays the following options:
  - Total
  - Open
  - Completed
  - Other
  - Conflicts
    - Conflicts toggle added to the 'Show Detections' dropdown to make it filterable
  - Deleted
  - Unassociated 
### Waveform Display
- QC Segments
  - Analysts can modify and reject existing QC segments via the 'Open QC Segment details' menu
  - A 'Create QC Segment' button exists in the Waveform Display toolbar that will be utilized to create QC segments for entire interval/open time range 
  - Analysts can select one or more raw waveform panels (using existing selection methods) and click a button in the Waveform Display toolbar to create new QC Segment(s) whose initial start/end times are set to the time window + configurable buffer of the open interval/time range 
  - Analysts can select one or more raw waveform panels (using existing selection methods) and hold a configurable hotkey (press and hold ‘m’ key) and click and drag on the selected channel panel(s) to define a time window and create new QC Segments
  - QC Selection & Processing Mask Details menu rows are scaled based on the number of overlapping QC segments (i.e., number of rows in the table)
- SD creation and editing
  - Analysts can left-click on a waveform panel (i.e., w/o a waveform) in the Waveform Display while pressing a hotkey (click + e) to add a new signal detection with the "current phase"
  - Analysts can left-click on a waveform panel (i.e., w/o a waveform) in the Waveform Display while pressing a hotkey (alt + e) to add a new signal detection with the default configured phase
  - Right-click context menu options exist in the Waveform display when users click on a waveform panel that allows analysts to create signal detections associated to a waveform or not (menu & hot keys only)
    - See GMS IAN Users Guide Appendix C for Hot Keys
  - Analysts can click and drag a single Signal Detection to adjust its arrival time (within a single waveform panel only)
  - Analysts can click and drag the left or right edge of the error bar for a single Signal Detection while pressing a configurable hotkey (ctrl + alt + e) to adjust the time uncertainty.
- Conflict icons added
  - Next to Signal Detection and Waveform Display phase name if it is associated to more than one Event
  - Next to the ‘Signal Detection Details’ title within the SD Details popup menus when a signal detection is associated to more than one event
- Filtering
  - Updated filtering logic to not recompute filter operation when filter operations in the same station have errors 
  - The filter descriptions for any Named Filters for a signal detection are shown in the existing ‘Current Version’ tab within the existing SD details menu in the Waveform Display for that signal detection
- Split mode (i.e. mode entered when creating a new SD where overlapping waveforms exist that allows analyst to choose which waveform the SD should be associated to)
  - Waveform panels are sorted by SD time,
    - If more than one SD is associated to the waveform, choose the SD time of the first SD when sorting 
  - When a user attempts to create a new SD in expanded mode in the Waveform Display all other right-click user interactions are disabled
  - All hotkey interactions within the Waveform Display are disabled except for pan left/right, zoom in/out and, space bar to zoom all the way out, and amplitude scaling 
- Added Event beam button to Waveform Display toolbar and hotkey (b) that will be used to create event beams using the default configured values
  - Event beam button opens Create Event Beam dialog that allows analysts to manually edit the following event beam parameters:
    - Input Stations
    - Input Channels
    - Phase
    - Lead time
    - Duration
    - Pre-filter
    - Beam summation method
    - Interpolation method 
- Visibility
  - Updated Waveform Display to only display predicted phases that are not extrapolated; still used for offsets 
  - Analysts can enable/disable Signal Detections to be shown on the Waveform Display by setting an option in the "Show detections" menu in the Waveform Display toolbar
    - Rejected signal detections are not shown by default but all other types of detections are visible by default; use configured visibility for rejected
  - When an analyst clicks to place a new SD at a time where multiple waveforms overlap the waveform row expands to show each overlapping waveform on its own row 
- Analysts can change the "current phase" in the Waveform Display by setting a menu option in the "Current Phase" popup menu or by using a hotkey (ctrl+e)
  - Updated current phase menu hotkey tooltip for default phase to show the appropriate hotkey based on OS 
- An ‘Associated event time(s)’ has been added to the existing Signal Detection Details popup & displays all the event times of all events if it is associated to more than one event (if not, just displays single event time)
- Channel offsets have been updated to utilize station offsets during phase alignment (previously they were using their own offsets)
- Alignment dropdown has been updated to be a button and to utilize the re-usable 'Set Phase' menu
- Green lines for open time range and x-axis tick marks for time axis on the Waveform Display have been updated to be a consistent width as SD pick markers
- Updated cross-hair to be same color as measure window drag selection window in Waveform Display when user holds shift + drag in the Waveform Display to help indicating what 'mode' analysts are in when creating a measure window 
### Workflow Display
- Updated workflow display context focus such that workflow display or an element within it gains focus when user clicks anywhere within the display
  - If the user clicks on an element that may have focus, then that element gains focus, and the display's tab is highlighted
  - If the user clicks on an element that may not have focus (i.e., the empty space of the display), the display still gains focus
  - On-hover focus has been removed from the Workflow Display
### Undo/Redo Display
- Implemented global & Event Undo/Redo stack 
  - 500 entries in stack before clearing
  - Entries show contextual information about the action that was taken
  - Entries are color coded
- The Undo/Redo Display exists in the Analyst Workspace and may be docked, undocked (opened in a new tab), resized, and repositioned.
  - Shows the current state of the Global Undo/Redo Stack in an undo/redo stack table
- Analysts can set a UI control to change the Undo/Redo Display to Global Undo mode or Event Undo mode (Global Undo mode by default).
  - While the Analyst holds a modifier key (Alt), the Undo/Redo Display is in Event Undo mode.
  - In Global Undo mode, an undo or redo operation on a multiple modification set includes all entries in the set.
  - In Event Undo mode, an undo or redo operation on a multiple modification set only includes the entries related to the current Event.
- When an analyst hovers over an entry, all entries that would be included in that undo or redo action are visually highlighted.
- Conflict and undo/redo icons have tooltips indicating what they mean.
- The Keyboard Shortcuts menu has been updated to include new hotkeys
### UI General
- A 'Create Event' button exists in the Event List Display, SD List Display, and Waveform Display toolbars to allow the analyst to create new events 
  - When no signal detections have been selected in the Waveform, Signal Detection List, or Map Displays, pressing the ‘Create event’ button brings up a ‘Create Event’ popup that allows analysts to manually enter in event time, latitude, longitude, and depth 
  - When signal detections have been selected in the Waveform, Signal Detection List, or Map Displays, pressing the 'Create event' button or using the hotkey (c) will create a new real event based on selected signal detections
  - A paste icon exists next to the lat field within the Create Event dialog popups within the Event List, SD List, Map, and Waveform Displays that when pressed copies the lat/lon into the latitude & longitude fields
- Select/Deselect
  - When multiple SDs/events are selected for an action, targets that will be included are highlighted to indicate that they will be affected by an action
    - Omitted targets are dimmed
  - If an event is selected, when it is deleted/rejected in the Event List Display or Map Display it becomes de-selected
  - If an SD is selected, when it is deleted in the SD List, Waveform, or Map Displays it becomes de-selected
- New functionality added to rick-click menu
  - “Set to current phase” and “Set to default phase” context menu options allows analysts to update the selected SDs phases to the current or default phase respectively
  - Analysts can right-click on a Signal Detection or set of Signal Detections to associate, unassociate or reject select to/from open event
    - Analysts can also double-click a Signal Detection to associate or unassociate it to the currently open event
  - Analysts can right click events and SDs to have the selected menu option applied even if the event/SD is not selected
    - Qualified event/SD will be highlighted to indicate that action will only be applied to that event/SD
  - Analysts can choose to change an existing SD phase label via right-click context menu option using the "Set Phase" menu
  - Analysts can right-click a Signal Detection and select the "Reject" context menu option to reject the selected Signal Detections 
- Set Phase menu is synchronized across Waveform, SD List, and Map displays
  - Favorites are synchronized
  - Dropdown selection is synchronized
- Configurable Options
  - A configurable set of phase lists exist in UI processing configuration
  - A configurable default global SD time uncertainty exists in UI processing configuration
  - Configurable colors exist for deleted & rejected events and signal detections
  - A configurable action target highlight color exists in UI processing configuration and is used within SD List, Event List, and Map Display to highlight action targets appropriately 
  - A set of configurable FK color maps exist in UI processing configuration within all UI themes for use in coloring FK Spectrums (Turbo default)
  - A set of configurable constant velocity rings configured by station type exist for use in all FK spectrum plots within the FK Display
  - A configurable color exists in UI processing configuration & all UI themes for coloring accept icons of FKs with phases for the analyst activity and station that need review
  - A configurable color exists for FK thumbnail selection (that is set to a different color than SD selection)  in UI processing configuration within all UI themes 
- Hotkeys
  - Added configurable hotkeys
  - Hotkeys updated to utilize Blueprint hotkeys
  - All unused legacy hotkeys in the Waveform Display were removed
  - Analysts can use a hotkey (ctrl + shift + e) to open the Signal Detection "Set phase" control to change the phase label for selected Signal Detections
- UI is able to create temporary channels for each station for use in associating to SDs that were created without a waveform associated to them
- GMS UI computes conflicts every time associations change
- Added robust error handling to Signal Enhancement Configuration Service; implemented 209 status code for partial successes
- Updated reject SD  menu options, table column values/selectors, and state operations to be delete SD  across UI displays (SD List, Map Display, Waveform Display)
- Node upgraded from 16.4.2 to 18.17.0 (LTS version)
### Backend
- Removed the unnecessary FPS Plugin registry
- Added SLOWNESS and AZIMUTH predictions to the Feature Prediction Service
- Upgraded to JDK17
- Upgraded Hibernate from version 5 to 6
- Upgraded spring-boot from version 2 to 3
- Upgraded to Gradle 8 from Gradle 7
- Completed conversion of Simulator to Spring Framework
 
## Known Issues:
### Event List Display
- Filtering in the Event List Display is not working properly in all cases, e.g.,
  - Filtering 0.000, Unknown
  - Sdobs column isn't filtering properly when number has been rounded (e..g., since only showing 3 significant figures if rounded not an exact match to what's being actually sorted on)
  - Workflow status column is not filterable
  - Time column is not filterable
  - Likely other miscellaneous unidentified issues 
### Map Display
- Double-click to associate/unassociate 'associated to other event' SDs does not work, when occurs also shows 'undefined' in Undo/Redo display
### SD List Display
- Cannot alt/option + click to see SD details menu option
- Signal Detection time & time std deviation are not editable; users can enter values after double-clicking but they revert back to their previous values
### Waveform Display
- When measurement window is open/adjusted, channel focus can sometimes slightly clip parent channels (i.e., at top, vertical position)
  - i.e., waveform scroll does not jump on resize but shows the appropriate number of channels and the full waveform panel 
- Waveform display horizontal scrolling from left to right in Firefox has performance issues:
  - Rendering lag with SDs and waveforms where they sometimes appear out of sync (happens in Chrome too but is less severe)
  - Station label disappears sometimes and/or waveforms render beyond it (only happens in Firefox)
- Vertical scrolling performance has been observed to be degrading
- Intermittent issues have been found where using m+click to create a new QC mask will not always bring up the 'Create QC mask' dialog menu 
- Alignment can sometimes cause the left/right panning buttons to be disabled after double-clicking to zoom out fully, which can prevent users from loading more data and/or scrolling to the left/right.  
  - Work-around: zoom in slightly before the right-most or left-most edge (whichever button is disabled) and then push the buttons
  - We don't intend to fix this, as there are planned stories to remove these buttons from the Waveform Display and allow users to load data on either side of an interval via the Workflow Display. 
- Raw waveforms are sometimes scaled to maximum amplitude and do not adjust to appropriate auto-scaled values until the user scrolls or waits (auto-scale rendering issue); also observed sometimes when filtering
- Reset manual amplitude scaling for selected channels context menu option does not always reflect the actionable targets, only updates the number based on selected items (regardless if action will be applied or not) 
- Alignment text at the bottom of the Waveform Display (e.g., Aligned on: X) does not properly update when closing an event to say aligned by Time
  - Change alignment toolbar menu option has this issue as well 
- When zoomed in, the scrollbar cuts off the bottom of the station panel, panel label & y-axis scale 
- When in split mode and have expanded raw channels prior to entering split-mode, clicking on a raw expanded channel does not cancel the creation of a new SD (in fact does nothing)
  - Current work-around is to click on any station to cancel the creation of a new SD, use Escape hotkey, or press 'X' in the top station waveform panel 
- When in split mode, y-axis tick marks flicker (re-render multiple times) when filtering 
- SD time uncertainty error bars do not move with newly created SDs when adjusting the SD time
- Waveforms disappear when a Waveform Display tab is under another tab and an event is open 
- Newly created SDs not associated to a waveform cannot have their phases modified 
- (Alt/Option + shift + y) hotkey to reset all amplitude scales when in alignment mode will remove some of the offset overlays and beams within those respective rows
### Workflow Display
- Workflow Display intervals disappear when workflow display is under another tab or its size is modified (e.g., changing its location/size in golden layout) 
### Undo/Redo Display
- See issue above related to double-click & undefined showing up in history stack
- Sometimes multiple stack entry is not properly dimmed when undone
### UI General
- Occasionally, filter definition retrieval from the database fails for channel segments; this is due to a serialization/deserialization failure when a value retrieved from the backend (e.g., kWeight) is set to Infinity or -Infinity. This error appears as a failure in Developer Tools.
- Occasionally, the vertical scrollbar flashes on right-hand side of the UI when loading, until user preferences are loaded 
- Updating configured default phase assignments within configurable phase lists is not properly updating context menu options and does not allow the user to modify existing phases thereafter to current/default phases 
### Backend
- Known difference in data between corporate and containerized Oracle. Only corporate Oracle should be used for validation purposes
- Canned Processing Mask Capability will return Processing Masks that may not correspond to the canned QC segments that are being bridged
- Event Manager Service:
  - Occasionally seeing failures in event endpoints 
  - Feature Prediction Service returning incorrect times for phase predictions - issues in calculation.
  - Faceting does not work as expected
- Intermittent issues in user manager service
- Transient issue in Signal Enhancement Configuration Service with following error "beamType cannot be case to phaseType"
