# Spec 02 — Rules of Cooperation

> Maps to **Holacracy Constitution v5.0, Article 2**

---

## Overview

Article 2 defines the duties that all Partners owe to each other. These are interpersonal obligations that complement the structural rules in Article 1. While many of these duties are behavioral and off-chain, the system MUST provide mechanisms to request and track compliance.

---

## 2.1 Duty of Transparency

As a Partner, you MUST provide transparency to Role Leads upon request:

| Transparency Item           | Description                                          | On-Chain Trackable |
| --------------------------- | ---------------------------------------------------- | ------------------ |
| **Projects & Next-Actions** | Share any Projects and Next-Actions being tracked    | Yes                |
| **Relative Priority**       | Share judgment of relative priority of work items    | Partial            |
| **Projections**             | Provide rough estimate of completion timelines       | Partial            |
| **Checklist Items**         | Verify completion of recurring actions               | Yes                |
| **Metrics**                 | Share metrics collected in Roles                     | Yes                |
| **Progress Updates**        | Summary of progress since last update                | Yes                |
| **Other Information**       | Share any readily-available, non-harmful information | No                 |

### System Requirements

-   The system MUST allow any Role Lead to request transparency data from another Partner.
-   The system MUST track Projects, Next-Actions, Checklists, and Metrics per Role.
-   Partners MUST be able to publish progress updates tied to their Roles.
-   Transparency requests SHOULD be logged and trackable.

### Data Structures

```
TransparencyRequest {
  id: uint256
  requesterId: uint256      // Requesting Role
  targetPartnerId: address   // Target Partner
  requestType: TransparencyType
  description: string
  status: RequestStatus      // Pending | Fulfilled | Declined
  createdAt: timestamp
  respondedAt: timestamp
}

ChecklistItem {
  id: uint256
  roleId: uint256
  description: string
  isRecurring: bool
  lastVerified: timestamp
}

Metric {
  id: uint256
  roleId: uint256
  name: string
  value: string
  lastUpdated: timestamp
}
```

---

## 2.2 Duty of Processing

Partners MUST promptly process messages and requests from Role Leads:

### 2.2.1 Requests to Clarify

-   Others MAY ask you to clarify next steps for Projects or Accountabilities.
-   You MUST determine and communicate a Next-Action or share what you're waiting for.

### 2.2.2 Requests for Projects & Next-Actions

-   Others MAY ask you to take on a specific Next-Action or Project.
-   You MUST accept and track it if it makes sense for your Role (absent competing priorities).
-   If you decline, you MUST explain reasoning or suggest an alternative.

### 2.2.3 Requests to Impact Domain

-   Others MAY ask to impact a Domain controlled by your Role.
-   You MUST allow it unless it would reduce your capacity to enact your Purpose or Accountabilities.
-   If you deny, you MUST explain the reason.

### System Requirements

-   The system MUST support typed requests: `Clarify`, `TakeAction`, `ImpactDomain`.
-   Each request MUST be trackable with status: `Pending`, `Accepted`, `Declined`.
-   Declined requests MUST include a reason.

### Data Structures

```
ProcessingRequest {
  id: uint256
  type: ProcessingRequestType  // Clarify | TakeAction | ImpactDomain
  fromRoleId: uint256
  toPartnerId: address
  targetRoleId: uint256        // The Role being requested of
  description: string
  status: RequestStatus
  reason: string               // Required if declined
  createdAt: timestamp
  respondedAt: timestamp
}
```

---

## 2.3 Duty of Prioritization

Partners MUST prioritize attention as follows:

### 2.3.1 Processing Over Executing

-   Processing inbound messages to Roles takes priority over executing Next-Actions.
-   Batching is allowed if processing remains prompt.
-   "Processing" = engaging duties in this Article + sharing how you processed, NOT executing captured work.

### 2.3.2 Meetings Over Executing

-   Attending constitutionally-defined meetings takes priority over Next-Actions.
-   Only when another Partner explicitly requests prioritization for a specific meeting.
-   MAY still decline if conflicting plans exist.

### 2.3.3 Circle Priorities

-   When choosing work within a Role, MUST consider:
    -   Official Strategies of the Role's Circle and Super-Circles
    -   Relative prioritizations set by Circle Lead
-   Official priorities > personal judgment of what's important.
-   Official priorities = those set by Circle Lead or authorized Role/process.

### 2.3.4 Deadlines

-   Deadlines in Governance or official Strategy = official prioritization of actions needed to hit deadline over other Circle actions.
-   Deadlines are NOT commitments regardless of impact.
-   A Circle Lead or authorized Role MAY overrule deadline prioritization.

### System Requirements

-   The system MUST allow Circle Leads to set Strategies (prioritization heuristics).
-   The system MUST allow Governance to include deadlines.
-   The system SHOULD track priority levels on Projects and Next-Actions.

### Data Structures

```
Strategy {
  id: uint256
  circleId: uint256
  description: string
  setBy: address           // Circle Lead who defined it
  createdAt: timestamp
  active: bool
}

PriorityOverride {
  id: uint256
  circleId: uint256
  targetRoleId: uint256
  description: string
  deadline: timestamp      // optional
  setBy: address
  createdAt: timestamp
}
```

---

## 2.4 Relational Agreements

Partners MAY establish **Relational Agreements** with each other about how they relate while working together.

### Rules

-   Relational Agreements MAY add to or clarify duties in this Article but NOT conflict with them.
-   They MUST focus on shaping behaviors that underpin work.
-   They MAY NOT set expectations of work to do in a Role.
-   They MAY NOT set expectations about prioritization across Roles.
-   They MAY only specify concrete behavioral constraints — no promises of outcomes or abstract qualities.
-   Either party MAY terminate by notifying the other (unless otherwise agreed).
-   Anyone facilitating a meeting MAY enforce Relational Agreements during that meeting.

### System Requirements

-   The system MUST support creating bilateral agreements between two Partners.
-   Agreements MUST be viewable by meeting Facilitators.
-   Either party MUST be able to terminate the agreement.

### Data Structures

```
RelationalAgreement {
  id: uint256
  partyA: address
  partyB: address
  description: string
  status: AgreementStatus  // Active | Terminated
  createdAt: timestamp
  terminatedAt: timestamp
  terminatedBy: address
}
```

---

## Events

```
TransparencyRequested(requestId, requesterId, targetId, type)
TransparencyFulfilled(requestId)
ProcessingRequested(requestId, type, fromRoleId, toPartnerId)
ProcessingResponded(requestId, status, reason)
StrategySet(circleId, strategyId, description)
StrategyDeactivated(circleId, strategyId)
RelationalAgreementCreated(agreementId, partyA, partyB)
RelationalAgreementTerminated(agreementId, terminatedBy)
ChecklistVerified(roleId, checklistItemId, timestamp)
MetricUpdated(roleId, metricId, value)
```
