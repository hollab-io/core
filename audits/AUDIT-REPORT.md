# hollab.eth Smart Contract Audit Report

**Date**: 2026-04-16
**Scope**: All Solidity contracts in `packages/contracts/src/`
**Compiler**: solc 0.8.28, Cancun, via-IR
**Pattern**: ERC-1167 minimal proxy clones (OpenZeppelin Clones)
**Auditors**: 7 parallel specialist agents (general, governance, access-control, DoS, proxies, ERC20, precision-math)

---

## Executive Summary

The audit identified **21 unique findings** after deduplication across 7 specialist audits. The most critical issues center on three systemic problems:

1. **Front-runnable governance process setter** (Critical) — `RoleRegistry.setGovernanceProcess()` has no access control, allowing org hijacking.
2. **circleId/orgId confusion in ActionVoting** (High) — Admin authorization checks the wrong entity, enabling cross-org privilege escalation.
3. **Permissionless MeetingComponentsFactory.deploy()** (High) — Compounds the governance hijack by allowing anyone to wire meeting components.

| Severity | Count |
| -------- | ----- |
| Critical | 1     |
| High     | 3     |
| Medium   | 7     |
| Low      | 7     |
| Info     | 3     |

---

## Critical

### [C-1] RoleRegistry.setGovernanceProcess() is front-runnable — governance hijack

**Location**: `RoleRegistry.setGovernanceProcess()` (RoleRegistry.sol:82-87)
**Flagged by**: GEN-1, GOV-2, AC-2, DOS-6, PROXY-1

`setGovernanceProcess()` has no access control beyond checking that `governanceProcess` is currently `address(0)`. On a freshly cloned RoleRegistry (after `createOrganization` but before `MeetingComponentsFactory.deploy()`), anyone can call it and set themselves as the governance process, gaining exclusive authority over all role mutations.

Since it can only be set once, the legitimate `deploy()` call then reverts permanently.

**PoC**:

1. Victim calls `createOrganization()` — RoleRegistry clone deployed with `governanceProcess == address(0)`.
2. Attacker front-runs `MeetingComponentsFactory.deploy()` by calling `setGovernanceProcess(attackerAddress)`.
3. Attacker now has exclusive `onlyGovernanceProcess` access: can create/remove roles, assign leads, etc.

**Recommendation**: Set the governance process atomically during `initialize()`, or restrict the caller to a factory address stored at init time.

---

## High

### [H-1] ActionVoting.\_assertOrgAdmin() passes circleId as orgId — broken authorization

**Location**: `ActionVoting._assertOrgAdmin()` (ActionVoting.sol:276-282)
**Flagged by**: GEN-4, GOV-4, AC-1, DOS-8, PROXY-4, ERC20-7

`_assertOrgAdmin(_circleId)` calls `orgFactory.isOrgAdmin(_circleId, msg.sender)` — but `isOrgAdmin` expects an `orgId`, not a `circleId`. These come from completely different counter sequences.

**Impact**:

-   For most circles, the admin check queries a nonexistent org → all admin-gated functions permanently revert.
-   If a circleId collides with a valid orgId, admins of the **wrong org** pass the check → cross-org privilege escalation.

Affects: `createVote`, `grantCollaboratorWeight`, `revokeCollaboratorWeight`, `setCircleQuorum`, `setCircleMintCap`.

**Recommendation**: Store `orgId` during `initialize()` and use it for all admin checks.

### [H-2] MeetingComponentsFactory.deploy() is permissionless — governance hijack amplifier

**Location**: `MeetingComponentsFactory.deploy()` (MeetingComponentsFactory.sol:53-87)
**Flagged by**: GEN-2, GOV-3, AC-3, DOS-7, PROXY-2, ERC20-10

No access control. Anyone can deploy meeting components for any org by subname. Compounds C-1: an attacker can front-run the legitimate org creator's deploy call, permanently locking the governance process.

Additionally, `_orgFactory` is a caller-supplied parameter — an attacker can pass a malicious fake OrgFactory that returns the real org's data but with attacker-controlled admin checks.

**Recommendation**: Add org-admin check. Store canonical OrgFactory as immutable instead of accepting it as a parameter.

### [H-3] MeetingFactory cross-org privilege escalation — no orgId binding

**Location**: `MeetingFactory` (entire contract)
**Flagged by**: PROXY-11

MeetingFactory does not store which `orgId` it belongs to. `createProposal` accepts `_orgId` as a caller-supplied parameter — nothing validates it matches the org this MeetingFactory was deployed for. An admin of org A can call org B's MeetingFactory with `_orgId = orgA_id`, pass both membership and admin checks, and execute structural changes on org B's RoleRegistry.

**Recommendation**: Store `orgId` during `initialize()` and validate all `_orgId` parameters match.

---

## Medium

### [M-1] Proposals can be adopted with unresolved objections

**Location**: `MeetingFactory.adoptProposal()` (MeetingFactory.sol:233-249)
**Flagged by**: GEN-3, GOV-1, AC-11

`adoptProposal()` checks only `Draft` status and admin permission. It does not verify that all objections are resolved. This violates Holacracy Constitution §5.3 which requires objection integration before adoption.

**Recommendation**: Track `openObjectionCount` per proposal, increment on `raiseObjection`, decrement on `resolveObjection`, require zero before adoption.

### [M-2] Admin can remove themselves — last-admin lockout

**Location**: `OrganizationFactory.removeOrgAdmin()` (OrganizationFactory.sol:200-209)
**Flagged by**: GEN-11, GOV-6, AC-6

An admin can remove themselves as the last admin, permanently leaving the org with no one who can approve join requests, add members, adopt proposals, or end meetings.

**Recommendation**: Track admin count per org and prevent removing the last admin.

### [M-3] initialHolders/initialAmounts array length mismatch not validated

**Location**: `OrganizationFactory._mintInitialTokens()` (OrganizationFactory.sol:312-319)
**Flagged by**: GEN-5, GOV-8, ERC20-1, MATH-8

No check that both arrays have equal length. Mismatched arrays cause opaque panics or silently skip amounts.

**Recommendation**: Add `if (_cfg.initialHolders.length != _cfg.initialAmounts.length) revert ArrayLengthMismatch();`

### [M-4] Unlimited minting authority with single-address control

**Location**: `GovToken.mint()` (GovToken.sol:27-33)
**Flagged by**: ERC20-2, GOV-14

The minter has unrestricted mint capability — no supply cap, no rate limit, no timelock. Any compromise of the org creator's key grants full control over governance token supply.

**Recommendation**: Add a `maxSupply` cap, or move minting authority to the AccessManager with a timelock.

### [M-5] No proposal expiry — stale drafts can be adopted indefinitely

**Location**: `MeetingFactory.adoptProposal()` (MeetingFactory.sol:233-249)
**Flagged by**: GOV-5

Draft proposals have no expiration. A proposal created months ago can be adopted when conditions have completely changed.

**Recommendation**: Add a `MAX_PROPOSAL_AGE` check in `adoptProposal`.

### [M-6] Quorum is stored on-chain but never enforced

**Location**: `ActionVoting` (entire contract)
**Flagged by**: GOV-13

`setCircleQuorum` stores quorum, `createVote` requires it to be set, but there is no `finalizeVote` function that checks whether quorum was met. Vote outcomes are purely off-chain with no on-chain enforcement.

**Recommendation**: If quorum enforcement is intended to be off-chain, document this. If on-chain, add a `finalizeVote` function.

### [M-7] circleMintedTotal invariant is undocumented and fragile

**Location**: `ActionVoting.grantCollaboratorWeight()` (ActionVoting.sol:209)
**Flagged by**: MATH-4

The code relies on `_circleMintedTotal >= (_existing - _weight)` but this invariant is undocumented. Future modifications could violate it.

**Recommendation**: Add invariant documentation. Consider an assertion.

---

## Low

### [L-1] GovToken.setMinter(address(0)) permanently disables minting

**Location**: `GovToken.setMinter()` (GovToken.sol:36-39)
**Flagged by**: GEN-6, GOV-7, AC-4, ERC20-3

No guard against setting minter to zero address. Once set, minting is permanently bricked with no recovery.

**Recommendation**: Add `if (_newMinter == address(0)) revert ZeroAddress();`

### [L-2] ENSSubdomainRegistrar has no ownership transfer mechanism

**Location**: `ENSSubdomainRegistrar` (ENSSubdomainRegistrar.sol:45)
**Flagged by**: GEN-7, AC-5

Owner is set in constructor and can never be changed. Lost/compromised key permanently locks admin functions.

**Recommendation**: Implement two-step ownership transfer.

### [L-3] Deleted roles leave stale data in content refs and string arrays

**Location**: `RoleRegistry.removeRole()` (RoleRegistry.sol:175-203)
**Flagged by**: GEN-8

`removeRole` sets `exists = false` but does not clear `_roleContentRefs`, `domains`, or `accountabilities`.

### [L-4] Meeting lifecycle is event-only with no on-chain validation

**Location**: `MeetingFactory.startMeeting/endMeeting/recordOutput/linkProposal` (MeetingFactory.sol:65-116)
**Flagged by**: GEN-9, GOV-10

Meetings have no on-chain state — anyone can end a meeting that was never started, record outputs to nonexistent meetings, or cross-reference meeting IDs across orgs.

### [L-5] No MinterChanged event emitted on minter transfer

**Location**: `GovToken.setMinter()` (GovToken.sol:36-39)
**Flagged by**: ERC20-4

Critical access control role change with no event emission. Invisible to off-chain observers.

### [L-6] Vote deadline has no upper bound — admin can create 1000-year votes

**Location**: `ActionVoting.createVote()` (ActionVoting.sol:163)
**Flagged by**: MATH-6

No max duration check. Add `MAX_VOTE_DURATION = 30 days`.

### [L-7] Election change type only assigns new leads, never unassigns previous ones

**Location**: `MeetingFactory._applyChange()` — `ChangeType.Election` (MeetingFactory.sol:160-162)
**Flagged by**: GOV-16

The `Election` handler only calls `assignRoleLead` — it never calls `unassignRoleLead` for the previous lead. This means elections accumulate leads instead of replacing them.

**Recommendation**: Unassign the previous lead before assigning the new one, or add a new `ReplaceRoleLead` change type.

---

## Info

### [I-1] `_purpose` parameter in createOrganization is accepted but discarded

**Location**: `OrganizationFactory.createOrganization()` (OrganizationFactory.sol:99)
**Flagged by**: GOV-15

`_purpose;` is a no-op statement. The value is never stored.

### [I-2] AccessManager is deployed per org but never referenced by governance contracts

**Location**: `OrganizationFactory.createOrganization()` (OrganizationFactory.sol:102)
**Flagged by**: GOV-18

An `AccessManager` is deployed with the org creator as admin, but no contract in the system uses it for access control.

### [I-3] No upper bound on subname length

**Location**: `OrganizationFactory._validateSubname()` (OrganizationFactory.sol:322-347)
**Flagged by**: GEN-12

Minimum 3 chars enforced but no maximum. Consider 32-byte cap for ENS compatibility.

---

## Positive Findings

-   Implementation contracts correctly set `_initialized = true` in constructors, preventing initialization on the implementation.
-   Clone `initialize()` correctly uses the initializer modifier preventing double-init.
-   No `selfdestruct` or `delegatecall` in any implementation contract.
-   ERC-1167 storage layout is safe — each clone gets independent storage.
-   Solidity 0.8.28 checked arithmetic prevents overflow/underflow in all unchecked-free code.
-   ActionVoting uses `getPastVotes` (snapshot-based voting) — correct defense against flash loan voting within the same tx.
-   No division or fractional math in the codebase — entire precision/rounding vulnerability class eliminated by design.

---

## Recommended Priority

| Priority | Finding                                       | Fix Complexity             |
| -------- | --------------------------------------------- | -------------------------- |
| 1        | C-1: Front-runnable setGovernanceProcess      | Low — set in initialize()  |
| 2        | H-1: circleId/orgId confusion in ActionVoting | Low — store orgId at init  |
| 3        | H-2: Permissionless deploy()                  | Low — add admin check      |
| 4        | H-3: Cross-org MeetingFactory                 | Low — store/validate orgId |
| 5        | M-1: Adopt without resolving objections       | Medium — add counter       |
| 6        | M-2: Last-admin lockout                       | Low — add counter          |
| 7        | M-3: Array length mismatch                    | Low — one-line check       |
