# Spec 04 — Distributed Authority

> Maps to **Holacracy Constitution v5.0, Article 4**

---

## Overview

As a Role Lead, you have the authority to take any action or make any decision to enact your Role's Purpose or Accountabilities, provided you don't break a rule in this Constitution. You use your own reasonable judgment to prioritize among potential actions.

---

## 4.1 Constraints on Authority

### 4.1.1 Don't Violate Policies

-   While acting in a Role, you MAY NOT violate any Policies of the Role itself or of any Circle containing the Role.

### 4.1.2 Get Permission Before Impacting Domains

**Your own Domains**: Full authority to impact and control.

**Circle's undelegated Domains**: You MAY impact, BUT if the impact is substantially difficult or expensive to undo, you MUST get permission.

**Another Role's or Circle's Domains**: You MAY NOT exert control or cause material impact without permission.

**External sovereign entity's Domains**: You MAY NOT impact without permission.

#### Permission Mechanisms

1. **Direct permission** from whoever controls the Domain.
2. **Announce-and-wait**: Announce intent to take a specific action, invite anyone with a relevant Domain to object, wait a reasonable time. If no objections → permission granted for that specific action.
    - Written announcement reaches anyone who typically reads messages in that channel.
    - A Policy MAY change or constrain this process.

### 4.1.3 Get Authorization Before Spending Money

-   You MAY NOT spend money or other assets without authorization.
-   Authorization MUST come from a Role that already controls spending resources.
-   "Spending" includes disposing of significant property or significantly limiting rights.

#### Spending Authorization Process

1. Announce intent to spend in writing to the authorizing Role.
2. Share the announcement where all Partners serving as Role Leads of that Role will typically see it.
3. Include: reason for spending + which Role's resources to spend from.
4. Wait a reasonable time for consideration and responses.
5. Any recipient MAY escalate the spending for extra consideration.
6. You MAY NOT proceed if escalated.
7. A Role Lead of the authorizing Role MAY reverse an escalation.
8. The person who escalated MAY also reverse it.
9. Once reasonable time passes with no standing escalations → your Role gains control of those resources for the stated purpose.
10. You MAY further authorize others to spend.
11. The authorizing Role MAY revoke authorization at any time.
12. A Policy MAY change this process or directly authorize a Role to control spending.

### System Requirements

-   The system MUST enforce Policy compliance checks before actions.
-   The system MUST track Domain ownership and delegation.
-   The system MUST implement the announce-and-wait permission flow.
-   The system MUST implement the spending authorization flow with escalation.
-   The system MUST track authorization grants and revocations.

### Data Structures

```
DomainPermissionRequest {
  id: uint256
  requesterId: address
  requesterRoleId: uint256
  domainId: uint256
  action: string
  method: PermissionMethod  // Direct | AnnounceAndWait
  status: PermissionStatus  // Pending | Granted | Denied | Expired
  announcedAt: timestamp
  resolvedAt: timestamp
  objections: address[]
}

SpendingAuthorization {
  id: uint256
  requesterId: address
  requesterRoleId: uint256
  authorizingRoleId: uint256
  amount: uint256
  reason: string
  status: SpendAuthStatus   // Pending | Escalated | Authorized | Revoked
  escalatedBy: address[]
  announcedAt: timestamp
  resolvedAt: timestamp
}
```

---

## 4.2 Interpretation Authority

### General Interpretation

-   Partners MAY use reasonable judgment to interpret the Constitution and all Governance.
-   All Governance MUST be interpreted in context of the Purpose and Accountabilities of the containing Circle.
-   Interpretations MUST NOT conflict with official interpretation rulings of the Circle or Super-Circles.

### 4.2.1 Conflicts of Interpretation

-   Either party MAY ask the **Secretary** of any affected Circle to rule on interpretation.
-   The Secretary is accountable for interpreting the Constitution and Governance upon request.
-   After a Secretary rules, everyone MUST align with that ruling until relevant text or context changes.
-   A Secretary MAY publish the ruling and logic; sub-Circle Secretaries must then align with published logic.
-   A Secretary MAY contradict prior logic when a compelling new circumstance arises.
-   You MAY appeal to the Super-Circle Secretary; Super-Circle Secretary overrules Sub-Circle Secretary.

### 4.2.2 Striking Invalid Governance

-   Any Partner MAY ask a Circle's Secretary to rule on validity of Governance.
-   If the Secretary concludes it violates the Constitution → Secretary MUST strike it.
-   Secretary MUST promptly communicate what was struck and why to all Partners filling Roles in that Circle.

### System Requirements

-   The system MUST allow Partners to submit interpretation requests to Secretaries.
-   The system MUST allow Secretaries to publish rulings.
-   The system MUST allow Secretaries to strike invalid Governance.
-   The system MUST support appeals to Super-Circle Secretary.
-   Rulings MUST be recorded and referenceable.

### Data Structures

```
InterpretationRequest {
  id: uint256
  requesterId: address
  circleId: uint256
  subject: string              // What needs interpretation
  governanceRef: uint256       // Optional reference to specific Governance
  status: InterpretationStatus // Pending | Ruled | Appealed
  createdAt: timestamp
}

InterpretationRuling {
  id: uint256
  requestId: uint256
  secretaryId: address
  circleId: uint256
  ruling: string
  logic: string
  isPublished: bool
  supersededBy: uint256        // If overruled by appeal
  createdAt: timestamp
}

GovernanceStrike {
  id: uint256
  circleId: uint256
  governanceRef: uint256       // The struck Governance item
  secretaryId: address
  reason: string
  struckAt: timestamp
}
```

---

## 4.3 Individual Initiative

Partners are authorized to take **Individual Initiative** — acting beyond Role authority or breaking Constitution rules — under specific conditions.

### 4.3.1 Allowed Situations

ALL of the following MUST be true:

1. Acting in good faith to serve the Purpose or Accountabilities of some Role in the Organization.
2. The action would resolve or prevent more Tension than it would likely create.
3. The action would NOT commit the Organization to spending beyond what's already authorized.
4. If violating Policies or Domains, much value would be lost from delaying to get permission or change Governance.

### 4.3.2 Communication & Restoration

After taking Individual Initiative:

1. **MUST** explain the action to any Role Leads who may be significantly impacted.
2. **MUST** take further actions to resolve Tensions created, upon request of any impacted Role Lead.
3. **MUST** refrain from similar Individual Initiative upon request of any impacted Role Lead.
4. **MUST** prioritize communication and restoration over regular work.
5. A Circle Lead of a Circle containing all affected Roles MAY change this default priority.

### System Requirements

-   The system MUST allow Partners to declare an Individual Initiative with justification.
-   The system MUST notify impacted Role Leads.
-   The system MUST allow impacted Role Leads to request restoration or cessation.
-   Individual Initiatives MUST be logged for accountability.

### Data Structures

```
IndividualInitiative {
  id: uint256
  initiatorId: address
  servingRoleId: uint256       // Role whose Purpose is being served
  description: string
  justification: string
  policiesViolated: uint256[]  // Optional: which Policies were broken
  domainsImpacted: uint256[]   // Optional: which Domains were impacted
  impactedRoles: uint256[]
  status: InitiativeStatus     // Declared | Acknowledged | RestorationRequested | Resolved
  cessationRequested: bool
  createdAt: timestamp
}
```

---

## Access Control Summary

| Action                                            | Who May Perform                                 |
| ------------------------------------------------- | ----------------------------------------------- |
| Impact own Role's Domains                         | Role Lead                                       |
| Impact Circle's undelegated Domain (reversible)   | Role Lead in that Circle                        |
| Impact Circle's undelegated Domain (hard to undo) | Role Lead with permission                       |
| Impact another Role's Domain                      | Anyone with permission from Domain controller   |
| Spend money/assets                                | Anyone with authorization from controlling Role |
| Escalate spending                                 | Any recipient of spending announcement          |
| Reverse escalation                                | Role Lead of authorizing Role, or escalator     |
| Rule on interpretation                            | Secretary of affected Circle                    |
| Strike invalid Governance                         | Secretary of affected Circle                    |
| Appeal interpretation                             | Partner → Super-Circle Secretary                |
| Take Individual Initiative                        | Any Partner (under strict conditions)           |

---

## Events

```
DomainPermissionRequested(requestId, requesterId, domainId)
DomainPermissionGranted(requestId)
DomainPermissionDenied(requestId)
SpendingRequested(authId, requesterId, authorizingRoleId, amount)
SpendingEscalated(authId, escalatedBy)
SpendingAuthorized(authId)
SpendingRevoked(authId)
InterpretationRequested(requestId, circleId, subject)
InterpretationRuled(rulingId, requestId, secretaryId)
GovernanceStruck(strikeId, circleId, governanceRef, reason)
IndividualInitiativeDeclared(initiativeId, initiatorId, servingRoleId)
CessationRequested(initiativeId, requestedBy)
RestorationRequested(initiativeId, requestedBy)
```
