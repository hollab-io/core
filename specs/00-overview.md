# Holacracy DAO Specification — Overview

## Source

Based on the **Holacracy Constitution v5.0** by HolacracyOne, LLC (CC BY-SA 4.0).

## Purpose

This specification suite translates the Holacracy Constitution into a set of smart-contract-ready specifications for on-chain governance. Each spec document maps to one Article of the Constitution and defines the data structures, state transitions, access control rules, and events required for implementation.

## Document Index

| Spec                                     | Constitution Article | Title                                     |
| ---------------------------------------- | -------------------- | ----------------------------------------- |
| [01](./01-organizational-structure.md)   | Article 1            | Organizational Structure                  |
| [02](./02-rules-of-cooperation.md)       | Article 2            | Rules of Cooperation                      |
| [03](./03-tactical-meetings.md)          | Article 3            | Tactical Meetings                         |
| [04](./04-distributed-authority.md)      | Article 4            | Distributed Authority                     |
| [05](./05-governance-process.md)         | Article 5            | Governance Process                        |
| [06](./06-glossary.md)                   | —                    | Glossary of Defined Terms                 |
| [07](./07-private-data-and-ai-agents.md) | —                    | Private Data Layer & AI Agent Integration |

## Key Design Principles

1. **Roles over People** — Authority is vested in Roles, not individuals. A person acts through the Roles they fill.
2. **Tension-Driven** — All change originates from a Tension (a gap between current reality and potential).
3. **Distributed Authority** — No single entity holds all power; authority is distributed across Roles and Circles via Governance.
4. **Consent-Based Governance** — Proposals pass unless there is a valid Objection (not majority vote).
5. **Constitutional Supremacy** — The Constitution is the supreme rule set; no implicit expectations override it.

## Core Entity Relationships

```
Organization
  └── Anchor Circle (broadest Circle)
        ├── Role A
        │     └── Internal Circle (Sub-Circle)
        │           ├── Sub-Role A1
        │           └── Sub-Role A2
        ├── Role B
        ├── Facilitator Role (elected)
        ├── Secretary Role (elected)
        └── Circle Lead Role (automatic)
```

## Actors

| Actor             | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| **Ratifier**      | Entity that adopts the Constitution for the Organization         |
| **Partner**       | A person who has agreed to abide by the Constitution             |
| **Role Lead**     | A Partner filling a specific Role                                |
| **Circle Lead**   | The Role Lead of a Role that contains a Circle                   |
| **Facilitator**   | Elected Role — facilitates governance & tactical meetings        |
| **Secretary**     | Elected Role — maintains records, interprets Constitution        |
| **Circle Rep**    | Elected Role — represents Sub-Circle tensions in Super-Circle    |
| **Circle Member** | Partners filling Circle Lead Role + all Role Leads in the Circle |

## Lifecycle Summary

1. **Ratifiers** adopt the Constitution, creating the Organization and Anchor Circle
2. **Governance Process** creates/modifies Roles, Policies, and Circle structure
3. **Circle Leads** assign Partners to Roles
4. **Role Leads** execute work: tracking Projects, Next-Actions, and Tensions
5. **Tactical Meetings** synchronize operational work
6. **Governance Meetings** evolve organizational structure via Proposals
7. **Process Breakdown** provides a safety valve when the system fails
