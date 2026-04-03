# Spec 01 — Organizational Structure

> Maps to **Holacracy Constitution v5.0, Article 1**

---

## 1.1 Role Definition

A **Role** is the fundamental organizational construct. A person filling a Role is its **Role Lead**.

### Role Properties

| Property           | Type                | Required | Description                                              |
| ------------------ | ------------------- | -------- | -------------------------------------------------------- |
| `id`               | `uint256` / `Field` | Yes      | Unique identifier                                        |
| `name`             | `string`            | Yes      | Descriptive name                                         |
| `purpose`          | `string`            | No       | Capacity, potential, or goal the Role pursues            |
| `domains`          | `string[]`          | No       | Assets/processes the Role exclusively controls           |
| `accountabilities` | `string[]`          | No       | Ongoing activities the Role manages                      |
| `policies`         | `Policy[]`          | No       | Grants/constraints of authority within the Role          |
| `circleId`         | `uint256`           | Yes      | The Circle this Role belongs to                          |
| `isCircle`         | `bool`              | Yes      | Whether this Role has been broken down into a Sub-Circle |
| `roleLeads`        | `address[]`         | Yes      | Partners currently assigned to this Role                 |

### Invariants

-   A Role definition MUST have a name and at least one of: purpose, domain, or accountability.
-   Every Role's interior is implicitly a Circle (see §1.3.1), but it only becomes an active Circle when it holds its own sub-Roles or Policies.
-   Constitution-defined Roles (Facilitator, Secretary, Circle Lead, Circle Rep) CANNOT be further broken down.

---

## 1.2 Responsibilities of Role Leads

Role Leads have the following on-chain-trackable responsibilities:

### 1.2.1 Processing Tensions

-   Role Leads MUST be able to submit **Tensions** (gap between actual and ideal state).
-   Tensions reference the Role they originate from.

### 1.2.2 Processing Purpose & Accountabilities

Role Leads define and track:

-   **Next-Actions**: Immediately actionable steps.
-   **Projects**: Target outcomes to work towards.

### 1.2.3 Breaking Down Projects

-   Each active Project MUST have at least one Next-Action defined.

### 1.2.4 Tracking Projects, Next-Actions, & Tensions

-   All Projects and Next-Actions MUST be captured in written lists.
-   Tensions MUST be tracked until processed into Projects or Next-Actions.
-   Lists MUST be regularly reviewed and updated.

### 1.2.5 Executing Next-Actions

-   When time is available, the Role Lead SHOULD execute the Next-Action that adds the most value to the Organization.

### Data Structures

```
Tension {
  id: uint256
  roleId: uint256
  author: address
  description: string
  status: TensionStatus  // Open | Processed | Resolved
  createdAt: timestamp
}

NextAction {
  id: uint256
  roleId: uint256
  description: string
  status: ActionStatus   // Pending | Complete
  createdAt: timestamp
}

Project {
  id: uint256
  roleId: uint256
  description: string
  status: ProjectStatus  // Active | Complete | Dropped
  nextActions: uint256[]
  createdAt: timestamp
}
```

---

## 1.3 Circles

A **Circle** is a container for organizing Roles and Policies around a common Purpose. The Roles and Policies within a Circle constitute its **Governance**.

### 1.3.1 Breaking Down Roles

-   The inside of every Role IS a Circle.
-   A Role's internal Circle is a **Sub-Circle** of the broader Circle that holds the Role.
-   The broader Circle is the **Super-Circle**.
-   Constitution-defined Roles MAY NOT be broken down.

### 1.3.2 Delegating Domains

-   A Circle MAY grant Domains to its Roles.
-   Role Leads then control that Domain on behalf of the Circle.
-   A Circle can only grant Domains that fall within its own Domains or are internal.
-   The delegating Circle retains the right to create Policies on delegated Domains; these supersede Role-level Policies on conflict.
-   Granting a Domain does NOT delegate spending rights unless explicitly specified.

### 1.3.3 Anchor Circle

-   The broadest Circle is the **Anchor Circle** — it holds the Organization's Purpose.
-   The Anchor Circle holds all authorities and Domains the Organization controls.
-   The Anchor Circle has NO Super-Circle.
-   The Anchor Circle MAY change its own Purpose or clarify Accountabilities via Policy.
-   Ratifiers MAY define initial structure and Governance in the Anchor Circle upon adoption.

### Circle Properties

| Property         | Type              | Description                           |
| ---------------- | ----------------- | ------------------------------------- |
| `id`             | `uint256`         | Same as the Role it is internal to    |
| `parentCircleId` | `uint256 \| null` | Super-Circle (null for Anchor Circle) |
| `roles`          | `uint256[]`       | Child Roles                           |
| `policies`       | `Policy[]`        | Circle-level Policies                 |
| `facilitator`    | `address`         | Elected Facilitator                   |
| `secretary`      | `address`         | Elected Secretary                     |
| `circleLeads`    | `address[]`       | Circle Lead(s)                        |
| `circleRep`      | `address \| null` | Elected Circle Rep                    |

### 1.3.4 Linking Into Circles

-   A Role MAY link into another Circle if a Policy of that Circle (or Super-Circle) invites it.
-   The inviting Circle MAY add to the linked Role but NOT delete/change what another Circle added.
-   Assignment authority stays with the source Circle.
-   Linking does NOT create a Sub-Circle/Super-Circle relationship.
-   Unlinking removes all Governance that Circle added to the Role.

### 1.3.5 Facilitator & Secretary Roles

**Facilitator Role**:

-   Purpose: "Circle governance and operational practices aligned with the Constitution"
-   Appointed by the Circle.
-   Circle MAY add Accountabilities/Domains but NOT change the Purpose.

**Secretary Role**:

-   Purpose: "Stabilize the Circle's constitutionally-required records and meetings"
-   Appointed by the Circle.
-   Circle MAY add Accountabilities/Domains but NOT change the Purpose.

---

## 1.4 Circle Leads

Serving as a Role Lead also means serving as **Circle Lead** within that Role's internal Circle, filling the **Circle Lead Role**.

### Properties

-   The Circle Lead Role holds the overall Purpose of the broader Role.
-   It holds all Accountabilities not covered by other Roles/processes in the Circle.
-   The Anchor Circle has NO Circle Leads (unless a Policy says otherwise).

### 1.4.1 Assigning Roles

-   Circle Lead controls Role assignments within the Circle.
-   MAY assign a Role to multiple people simultaneously.
-   MAY focus an assignment on a specific context.
-   MAY revoke any assignment at any time.
-   No one other than a Circle Lead may assign/revoke Roles (unless delegated via Policy).

### 1.4.2 Covering Unfilled Roles

-   When a Role is unfilled → each Circle Lead is automatically considered a Role Lead of it.
-   When a Role is filled only by non-Partners → Circle Lead is also a Role Lead (for Partner duties only).

### 1.4.3 Defining Priorities & Strategies

-   A Circle Lead MAY judge relative priority across Roles.
-   A Circle Lead MAY define a **Strategy** (prioritization heuristic) for the Circle.

### 1.4.4 Routing External References

-   When external Governance references the Circle or a Role, the Circle Lead MAY redirect that reference to another Role.

### 1.4.5 Amending the Circle Lead Role

-   A Circle MAY NOT modify the Purpose or remove the Circle Lead Role.
-   A Circle MAY add Accountabilities/Domains (these cascade to Sub-Circle Lead Roles recursively).
-   A Circle MAY remove authorities from the Circle Lead Role by placing them on another Role or defining an alternate means.

---

## Access Control Summary

| Action                            | Who May Perform                         |
| --------------------------------- | --------------------------------------- |
| Create/modify Roles               | Circle Members via Governance Process   |
| Assign Partners to Roles          | Circle Lead (or delegated Role/process) |
| Revoke Role assignments           | Circle Lead                             |
| Grant Domains to Roles            | Circle Members via Governance           |
| Create Policies                   | Circle Members via Governance           |
| Appoint Facilitator/Secretary     | Circle (via election)                   |
| Break down a Role into Sub-Circle | Circle Members via Governance           |
| Link a Role into another Circle   | Policy of target Circle                 |

---

## Events

```
RoleCreated(circleId, roleId, name)
RoleUpdated(roleId, field, oldValue, newValue)
RoleRemoved(circleId, roleId)
RoleAssigned(roleId, partner, focus)
RoleUnassigned(roleId, partner)
CircleCreated(roleId, parentCircleId)
DomainDelegated(circleId, roleId, domain)
PolicyCreated(circleId, policyId)
PolicyUpdated(policyId)
PolicyRemoved(policyId)
FacilitatorElected(circleId, partner)
SecretaryElected(circleId, partner)
CircleRepElected(circleId, partner)
RoleLinked(roleId, targetCircleId)
RoleUnlinked(roleId, targetCircleId)
```
