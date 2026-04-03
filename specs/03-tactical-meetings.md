# Spec 03 — Tactical Meetings

> Maps to **Holacracy Constitution v5.0, Article 3**

---

## Overview

A **Tactical Meeting** is a synchronization ceremony where Partners engage each other on operational duties. Any Partner may convene one; the Secretary of each Circle is accountable for scheduling regular Tactical Meetings.

---

## 3.1 Attendance

### Regular Tactical Meetings (convened by Secretary)

-   All of the Circle's Roles are invited (unless a Policy says otherwise).
-   All Partners serving as Role Leads of those Roles are invited.
-   The convener MAY narrow the invitation to a subset of Role Leads for a Role.

### Ad-hoc Tactical Meetings (convened by any Partner)

-   The convening Partner MUST specify which Roles are invited.
-   All Role Leads of those Roles are then invited.

### System Requirements

-   The system MUST allow any Partner to create a Tactical Meeting with a specified Role list.
-   The system MUST allow the Secretary to create recurring Tactical Meetings for a Circle.
-   The system MUST track attendance/participation.

### Data Structures

```
TacticalMeeting {
  id: uint256
  circleId: uint256
  convenedBy: address
  invitedRoles: uint256[]
  participants: address[]
  status: MeetingStatus     // Scheduled | InProgress | Completed
  scheduledAt: timestamp
  startedAt: timestamp
  completedAt: timestamp
  isRecurring: bool
}
```

---

## 3.2 Meeting Process

The Facilitator (or convener if not Secretary-convened) manages the following process:

### Phase 1: Check-in Round

-   Each participant shares current state or opening comment.
-   **No responses allowed.**
-   Proceed in turn order.

### Phase 2: Checklist Review

-   Each participant verifies completion of recurring actions for their Roles in the meeting.

### Phase 3: Metrics Review

-   Each participant shares metrics they regularly report on for their Roles.

### Phase 4: Progress Updates

-   Each participant highlights progress on Projects or initiatives since last report.
-   **Only new progress** — not general status.

### Phase 5: Build Agenda

-   Participants build an agenda of items to process.
-   Each item = short label, no explanation or discussion.
-   More items MAY be added between processing of existing items.

### Phase 6: Triage Items

-   For each agenda item, the owner MAY make requests of others:
    -   In their general capacity as Partner, OR
    -   To a Role that participant represents in the meeting.
-   Requests to a Role MAY only be made in service of a Role the requester represents.
-   The Facilitator manages time per item and MAY cut off processing after fair share.

### Phase 7: Closing Round

-   Each participant shares a closing reflection.
-   **No responses allowed.**

### Policy Override

A Circle Policy MAY specify an alternate process or amend this default for Tactical Meetings called by any of the Circle's Roles.

### System Requirements

-   The system MUST track the meeting phase/step.
-   The system MUST capture outputs: new Next-Actions, Projects, and requests created during the meeting.
-   The system MUST enforce turn-based rounds for Check-in and Closing.
-   The system MUST allow agenda items to be added dynamically during Phase 5 and between items in Phase 6.
-   Meeting outputs MUST be published (Secretary's accountability).

### Data Structures

```
TacticalAgendaItem {
  id: uint256
  meetingId: uint256
  ownerId: address
  label: string
  status: AgendaItemStatus  // Pending | Processing | Complete
  outputs: MeetingOutput[]
  createdAt: timestamp
}

MeetingOutput {
  id: uint256
  meetingId: uint256
  agendaItemId: uint256
  type: OutputType          // NextAction | Project | Request | Information
  description: string
  assignedTo: address
  roleId: uint256
  createdAt: timestamp
}

enum MeetingPhase {
  CheckIn,
  ChecklistReview,
  MetricsReview,
  ProgressUpdates,
  BuildAgenda,
  TriageItems,
  ClosingRound
}
```

---

## Events

```
TacticalMeetingCreated(meetingId, circleId, convenedBy)
TacticalMeetingStarted(meetingId)
TacticalMeetingPhaseChanged(meetingId, phase)
AgendaItemAdded(meetingId, agendaItemId, ownerId, label)
AgendaItemProcessed(meetingId, agendaItemId)
MeetingOutputCreated(meetingId, outputId, type, assignedTo)
TacticalMeetingCompleted(meetingId)
```
