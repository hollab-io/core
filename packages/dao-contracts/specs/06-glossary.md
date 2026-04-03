# Spec 06 — Glossary of Defined Terms

> Extracted from **Holacracy Constitution v5.0**

All bolded/quoted terms defined in the Constitution are listed here with their canonical definitions and the section where they are first introduced.

---

## Core Entities

| Term             | Definition                                                                                                                                              | Section  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Ratifiers**    | The entity/entities that adopt the Constitution as the formal authority structure for the Organization                                                  | Preamble |
| **Constitution** | The formal authority structure and rule set adopted by the Ratifiers                                                                                    | Preamble |
| **Organization** | The entity for which the Constitution is adopted                                                                                                        | Preamble |
| **Partners**     | People designated by the Organization (in addition to Ratifiers) to assist with governance and operations, who have agreed to abide by the Constitution | Preamble |

## Structural Terms

| Term                 | Definition                                                                                                                     | Section |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **Role**             | An organizational construct that a person can fill and energize on behalf of the Organization                                  | 1.1     |
| **Role Lead**        | A person who fills a Role                                                                                                      | 1.1     |
| **Purpose**          | A capacity, potential, or goal that a Role will pursue or express                                                              | 1.1     |
| **Domains**          | Assets, processes, or other things a Role may exclusively control and regulate as its property                                 | 1.1     |
| **Accountabilities** | Ongoing activities a Role will manage and enact in service of other Roles or its Purpose                                       | 1.1     |
| **Policies**         | Grants or constraints of authority, or special rules that apply within a Role or Circle                                        | 1.1     |
| **Circle**           | A container for organizing Roles and Policies around a common Purpose                                                          | 1.3     |
| **Governance**       | The Roles and Policies within a Circle                                                                                         | 1.3     |
| **Sub-Circle**       | A Role's internal Circle, relative to the broader Circle holding the Role                                                      | 1.3.1   |
| **Super-Circle**     | The broader Circle that holds a Role, relative to that Role's internal Circle                                                  | 1.3.1   |
| **Anchor Circle**    | The broadest Circle that holds the Purpose of the whole Organization; has no Super-Circle                                      | 1.3.3   |
| **Circle Lead**      | The Role Lead of a Role that contains a Circle; fills the Circle Lead Role                                                     | 1.4     |
| **Circle Lead Role** | The automatic Role within a Circle held by the Circle Lead, carrying the broader Role's Purpose and uncovered Accountabilities | 1.4     |
| **Strategy**         | A heuristic that guides prioritization within a Circle, defined by a Circle Lead                                               | 1.4.3   |

## Elected Roles

| Term                 | Definition                                                                                                                          | Section |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **Facilitator**      | Appointed person filling the Facilitator Role; Purpose: "Circle governance and operational practices aligned with the Constitution" | 1.3.5   |
| **Facilitator Role** | The Role filled by the Facilitator                                                                                                  | 1.3.5   |
| **Secretary**        | Appointed person filling the Secretary Role; Purpose: "Stabilize the Circle's constitutionally-required records and meetings"       | 1.3.5   |
| **Secretary Role**   | The Role filled by the Secretary                                                                                                    | 1.3.5   |
| **Circle Rep**       | Elected person representing a Sub-Circle's Tensions in the Super-Circle                                                             | 5.1.1   |
| **Circle Rep Role**  | Purpose: "Tensions relevant to process in a broader Circle channeled out and resolved"                                              | 5.1.1   |
| **Circle Members**   | Partners filling Circle Lead Role + Partners serving as Role Lead for any Role in the Circle                                        | 5.1     |

## Operational Terms

| Term                 | Definition                                                                                       | Section |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| **Tension**          | A gap between the actual expression of a Role's Purpose/Accountabilities and its ideal potential | 1.2.1   |
| **Next-Actions**     | Useful actions that could be taken immediately, at least absent competing priorities             | 1.2.2   |
| **Projects**         | Specific outcomes that would be useful to work towards, at least absent competing priorities     | 1.2.2   |
| **Tactical Meeting** | A meeting to assist Partners in engaging each other in their responsibilities and duties         | 3       |

## Cooperation Terms

| Term                      | Definition                                                                               | Section |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| **Relational Agreements** | Agreements between Partners about how they will relate while working in the Organization | 2.4     |

## Authority Terms

| Term                      | Definition                                                                                                   | Section |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------- |
| **Individual Initiative** | Acting beyond the authority of one's Roles or breaking Constitution rules, under specific allowed conditions | 4.3     |

## Governance Process Terms

| Term                                    | Definition                                                                                        | Section |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| **Governance Process**                  | The process required to change a Circle's Governance                                              | 5       |
| **Proposer**                            | A Circle Member who initiates a change to Governance by sharing a Proposal                        | 5.3     |
| **Proposal**                            | A written suggestion to change a Circle's Governance, shared with all Circle Members              | 5.3     |
| **Objection**                           | A concern about adopting a Proposal that meets all required criteria                              | 5.3     |
| **Objector**                            | The person who raises an Objection                                                                | 5.3     |
| **Governance Meetings**                 | Regular meetings to enact the Governance Process in real time                                     | 5.4     |
| **Integrative Election Process**        | The structured election process for selecting Circle Rep, Facilitator, or Secretary               | 5.3.5   |
| **Integrative Decision-Making Process** | The structured process for processing Proposals within Governance Meetings                        | 5.4.5   |
| **Time Out**                            | A pause during a Governance Meeting for discussing admin issues or Constitution rules             | 5.4.3   |
| **Process Breakdown**                   | A state declared when a Circle shows a pattern of behavior or output violating Constitution rules | 5.5     |

---

## Enum Definitions (for implementation)

```
enum TensionStatus { Open, Processed, Resolved }
enum ActionStatus { Pending, Complete }
enum ProjectStatus { Active, Complete, Dropped }
enum RequestStatus { Pending, Fulfilled, Declined }
enum AgreementStatus { Active, Terminated }
enum MeetingStatus { Scheduled, InProgress, Completed }
enum MeetingPhase { CheckIn, ChecklistReview, MetricsReview, ProgressUpdates, BuildAgenda, TriageItems, ClosingRound }
enum ProposalStatus { Draft, Active, Objected, Integrating, Adopted, Withdrawn, Discarded }
enum ObjectionStatus { Raised, Testing, Valid, Invalid, Resolved, Abandoned }
enum ElectionStatus { Nominating, Sharing, Changing, Proposing, ObjectionRound, Complete }
enum BreakdownStatus { Active, Restored }
enum PermissionMethod { Direct, AnnounceAndWait }
enum PermissionStatus { Pending, Granted, Denied, Expired }
enum SpendAuthStatus { Pending, Escalated, Authorized, Revoked }
enum InterpretationStatus { Pending, Ruled, Appealed }
enum InitiativeStatus { Declared, Acknowledged, RestorationRequested, Resolved }
enum ChangeType { CreateRole, AmendRole, RemoveRole, CreatePolicy, AmendPolicy, RemovePolicy, MoveRole, Election }
enum ProcessingRequestType { Clarify, TakeAction, ImpactDomain }
enum TransparencyType { ProjectsAndActions, RelativePriority, Projections, ChecklistItems, Metrics, ProgressUpdates, OtherInformation }
enum OutputType { NextAction, Project, Request, Information }
enum AgendaItemStatus { Pending, Processing, Complete }
enum AgendaType { Proposal, Election }
```
