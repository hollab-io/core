# DoS & Griefing Audit -- hollab.eth Governance Contracts

**Auditor**: Claude Opus 4.6 (automated)
**Date**: 2026-04-16
**Scope**: OrganizationFactory, RoleRegistry, MeetingFactory, MeetingComponentsFactory, ActionVoting, GovToken, HolacracyTypes, ENSSubdomainRegistrar, GovTokenDeployer
**Focus**: Denial-of-service, gas griefing, unbounded loops, revert-based DoS, economic griefing, block stuffing

---

## [DOS-1] Unbounded `_roleLeads` array makes `removeRole` gas cost unpredictable

**Severity**: Medium
**Category**: evm-audit-dos
**Location**: `RoleRegistry.removeRole()` (lines 183-188) and `RoleRegistry.assignRoleLead()` (line 214)

**Description**: The `_roleLeads[roleId]` array grows without bound every time `assignRoleLead` is called. When `removeRole` executes, it iterates over the entire `_roleLeads` array to clear each lead. If a governance process assigns many leads to a single role over time, `removeRole` can exceed the block gas limit and become permanently uncallable for that role.

The `onlyGovernanceProcess` modifier limits who can call `assignRoleLead`, but the authorized MeetingFactory does not cap the number of leads per role. An admin adopting many Election proposals for the same role would grow this array. While unlikely in normal usage, nothing prevents it architecturally.

**Proof of Concept**:

1. Create a role via governance proposal.
2. Submit and adopt ~500+ Election proposals assigning different addresses as leads to that role (each `assignRoleLead` pushes to the array).
3. Attempt to `removeRole` -- the loop at line 184 iterates all 500+ entries, potentially exceeding the block gas limit.

**Recommendation**: Cap the maximum number of leads per role (e.g., `MAX_ROLE_LEADS = 50`), enforced in `assignRoleLead`. Alternatively, skip the per-address cleanup in `removeRole` -- the `_role.exists = false` flag already makes the role defunct, so stale `_isRoleLead` entries for a non-existent role are harmless.

---

## [DOS-2] Unbounded `_circleRoles` array makes `removeRole` scan cost grow linearly

**Severity**: Medium
**Category**: evm-audit-dos
**Location**: `RoleRegistry.removeRole()` (lines 191-198) and `RoleRegistry._createRole()` (line 335)

**Description**: Every `createRole` call pushes to `_circleRoles[circleId]`. When `removeRole` runs, it scans the entire array to find the matching role ID. If a circle accumulates hundreds of roles (including roles that were created, removed, and replaced over time -- note that `removeRole` does pop the entry, but cumulative creates still grow the peak), the scan becomes expensive.

More critically, the array only grows -- new roles always push. While removed roles are popped (swap-and-pop), the array length at any point equals the number of _currently active_ roles in that circle. A circle with 200+ active roles would make the scan costly.

**Proof of Concept**:

1. Create 200+ roles in a single circle via governance proposals.
2. Attempt to remove a role -- the loop at line 192 must scan up to 200 entries.

**Recommendation**: Maintain a `mapping(uint256 => uint256) _roleIndexInCircle` that records each role's index in `_circleRoles`, enabling O(1) removal instead of O(n) scanning. This is a standard swap-and-pop-with-index pattern.

---

## [DOS-3] `_mintInitialTokens` iterates over unbounded caller-supplied array

**Severity**: Medium
**Category**: evm-audit-dos
**Location**: `OrganizationFactory._mintInitialTokens()` (lines 316-318) and `OrganizationFactory.createOrganization()` (line 108)

**Description**: The `initialHolders` array length is entirely controlled by the caller of `createOrganization`. Each iteration performs an external call to `GovToken.mint()`, which writes two storage slots (balance + total supply checkpoint in ERC20Votes). A very large array would cause the transaction to exceed the block gas limit and revert.

This is self-griefing (the caller pays the gas), so the practical impact is low. However, on an L2 with tighter gas metering or if the factory is called by another contract (e.g., a batch deployer), this could cause unexpected reverts.

**Proof of Concept**:

1. Call `createOrganization` with `initialHolders` containing 1000+ addresses.
2. Transaction reverts due to gas exhaustion.

**Recommendation**: Add a reasonable cap: `if (_cfg.initialHolders.length > MAX_INITIAL_HOLDERS) revert ...;` where `MAX_INITIAL_HOLDERS` is e.g. 100. Also validate `_cfg.initialHolders.length == _cfg.initialAmounts.length` -- this check is currently missing and would cause an out-of-bounds revert if mismatched, but with a non-descriptive panic rather than a clear error.

---

## [DOS-4] `_validateSubname` iterates over unbounded string length

**Severity**: Low
**Category**: evm-audit-dos
**Location**: `OrganizationFactory._validateSubname()` (lines 324-347)

**Description**: The `_subname` parameter is a caller-supplied `string calldata` with no maximum length check. The validation loop iterates over every byte. An extremely long string (tens of thousands of characters) increases gas cost linearly. Since `createOrganization` also stores the subname in storage (`_org.name = _subname; _org.subname = _subname;`), the storage write cost compounds the issue.

This is self-griefing since the caller pays. ENS subnames are practically limited to ~255 chars, but the contract does not enforce this.

**Proof of Concept**:

1. Call `createOrganization` with a 10,000-character subname consisting of valid lowercase letters.
2. Gas cost is significantly higher than expected due to the loop + two storage writes of the full string.

**Recommendation**: Add `if (_b.length > 63) revert OrganizationFactory_SubnameTooLong();` -- ENS labels are conventionally capped at 63 bytes. This also prevents excessive storage costs.

---

## [DOS-5] External calls to ENS registry and resolver in `createOrganization` can revert, blocking all org creation

**Severity**: Medium
**Category**: evm-audit-dos
**Location**: `OrganizationFactory.createOrganization()` (line 112) calling `ENS_REGISTRAR.registerSubnode()`

**Description**: `createOrganization` makes three external calls in sequence: `GovTokenDeployer.deploy()`, `GovToken.mint()` (in a loop), and `ENS_REGISTRAR.registerSubnode()`. The ENS registrar in turn calls the ENS registry (`setSubnodeOwner`, `setResolver`) and the resolver (`setAddr`). If any of these external contracts revert -- due to a bug, upgrade, access revocation, or the registrar's authorization being removed -- no organizations can be created.

The ENS registrar is immutable (`immutable` variable), so if the registrar contract itself becomes non-functional, the OrganizationFactory is permanently bricked with no recovery path.

**Proof of Concept**:

1. ENS registrar owner calls `deauthorize(organizationFactory)`.
2. All subsequent `createOrganization` calls revert at `registerSubnode` with `NotAuthorized()`.
3. The factory has no admin function to update the registrar or bypass ENS registration.

**Recommendation**: Either (a) make the ENS registrar address updatable by a trusted admin, (b) make ENS registration a separate optional step that can be retried, or (c) wrap the ENS call in a try/catch so org creation succeeds even if ENS registration fails. Option (b) is the cleanest separation of concerns.

---

## [DOS-6] `RoleRegistry.setGovernanceProcess` is one-shot with no recovery, and is front-runnable

**Severity**: High
**Category**: evm-audit-dos
**Location**: `RoleRegistry.setGovernanceProcess()` (lines 83-87) and `MeetingComponentsFactory.deploy()` (lines 79-81)

**Description**: `setGovernanceProcess` can only be called once -- after that, only `address(0)` would pass the guard `if (governanceProcess != address(0)) revert`. This means:

1. If `MeetingComponentsFactory.deploy()` is called and sets the governance process, but the MeetingFactory clone is later found to be buggy or compromised, there is no way to update it. The RoleRegistry is permanently locked to that MeetingFactory instance.

2. **Front-running attack**: Anyone can call `setGovernanceProcess` on a freshly cloned RoleRegistry before `MeetingComponentsFactory.deploy()` does, setting it to an attacker-controlled address. The attacker would then have exclusive control over all role mutations. The `MeetingComponentsFactory.deploy()` call would then revert.

    The attack window exists between `createOrganization` (which clones and initializes the RoleRegistry) and `MeetingComponentsFactory.deploy()` (which wires it). If these are in separate transactions, the window is open.

**Proof of Concept**:

1. Monitor mempool for `createOrganization` transactions.
2. Extract the predicted clone address (deterministic with ERC-1167 + CREATE).
3. Front-run `MeetingComponentsFactory.deploy()` by calling `setGovernanceProcess(attackerAddress)` on the new RoleRegistry clone.
4. The attacker now controls all role mutations for that org. The legitimate `deploy()` call reverts.

**Recommendation**: Restrict `setGovernanceProcess` to be callable only by a trusted address (e.g., the OrganizationFactory that created the clone, stored during `initialize`). Alternatively, use `Clones.cloneDeterministic` with a salt and set the governance process atomically in `initialize()`.

---

## [DOS-7] `MeetingComponentsFactory.deploy` can be called by anyone for any org

**Severity**: Medium
**Category**: evm-audit-dos
**Location**: `MeetingComponentsFactory.deploy()` (lines 53-87)

**Description**: `deploy()` has no access control -- anyone can call it for any organization's subname. Combined with DOS-6, this means:

1. An attacker can call `deploy()` for an org before the org creator does, wiring a MeetingFactory that the org creator did not initiate.
2. Since `setGovernanceProcess` is one-shot, the org creator cannot call `deploy()` again to get a different MeetingFactory -- the RoleRegistry is permanently locked.

While the deployed clones are deterministic copies of the same implementation, the attacker's `deploy()` call front-runs the legitimate one, potentially wiring components before the org is ready.

**Proof of Concept**:

1. Org creator calls `createOrganization`.
2. Attacker immediately calls `MeetingComponentsFactory.deploy(subname, orgFactory)`.
3. Governance process is set. Org creator's subsequent `deploy()` call reverts because `setGovernanceProcess` was already called.

**Recommendation**: Add access control to `deploy()` -- require that `msg.sender` is an org admin (check via `orgFactory.isOrgAdmin(orgId, msg.sender)`). Alternatively, bundle org creation and meeting component deployment into a single atomic transaction.

---

## [DOS-8] `ActionVoting._assertOrgAdmin` uses `_circleId` as `orgId` -- semantic mismatch enables unauthorized access or permanent revert

**Severity**: High
**Category**: evm-audit-dos
**Location**: `ActionVoting._assertOrgAdmin()` (lines 276-282)

**Description**: The `_assertOrgAdmin` function passes `_circleId` to `orgFactory.isOrgAdmin()`, but `isOrgAdmin` expects an `orgId`. Circle IDs and org IDs are from different counter sequences (`_roleCounter` in RoleRegistry vs `_orgCounter` in OrganizationFactory). This means:

1. If `circleId` happens to match an existing `orgId` for a _different_ organization, an admin of that other org could manipulate votes/quorums/weights for circles they have no authority over.
2. If `circleId` does not match any `orgId`, the call reverts (org not found), making all admin functions (`createVote`, `setCircleQuorum`, `grantCollaboratorWeight`, etc.) permanently unusable for that circle.

This is a logic bug that manifests as DoS: most circles will have IDs that don't correspond to valid org IDs, making all admin-gated ActionVoting functions revert.

**Proof of Concept**:

1. Create org (orgId=1), create roles/circles. Circle IDs come from `_roleCounter`, so the first circle might be roleId=1, but after a few roles, circleId could be 5.
2. Call `actionVoting.setCircleQuorum(5, 100)` -- this calls `orgFactory.isOrgAdmin(5, msg.sender)`. If orgId=5 doesn't exist, it reverts with `OrgNotFound`. If it does exist but belongs to a different org, the wrong admin check runs.

**Recommendation**: ActionVoting needs to store or receive `orgId` separately from `circleId`. The `_assertOrgAdmin` function should use the actual org ID that was set during `initialize`, not the circle ID.

---

## [DOS-9] Proposals store arbitrary-length `changeData` in storage with no size cap

**Severity**: Low
**Category**: evm-audit-dos
**Location**: `MeetingFactory.createProposal()` (line 222)

**Description**: `createProposal` copies `_changeData` (a `bytes calldata`) into storage (`p.changeData = _changeData`). The caller controls the size of this data. Storing very large `changeData` (e.g., a role with hundreds of domains/accountabilities as very long strings) costs the proposer gas but also means `adoptProposal` must load this data from storage into memory and ABI-decode it, with gas costs proportional to data size.

An org member could create a proposal with enormous `changeData` that is valid enough to not revert during `createProposal` but causes `adoptProposal` to run out of gas when the admin tries to adopt it. The proposal would be stuck in Draft state and need to be explicitly discarded.

**Proof of Concept**:

1. Org member calls `createProposal` with `changeData` encoding a `CreateRole` with 500 domains, each 1000 characters long.
2. Admin calls `adoptProposal` -- the `_applyChange` function loads the huge `changeData` from storage, decodes it, and pushes 500 strings into the RoleRegistry. This exceeds the block gas limit.
3. The proposal cannot be adopted. Admin must explicitly discard it.

**Recommendation**: Add a maximum size check on `_changeData.length` in `createProposal` (e.g., 16 KB). Also consider capping `_domains.length` and `_accountabilities.length` in `RoleRegistry._validateRole`.

---

## [DOS-10] `GovToken.mint` to a contract with a reverting `receive`/`fallback` -- not applicable (ERC20)

**Severity**: Info
**Category**: evm-audit-dos
**Location**: `GovToken.mint()` / `OrganizationFactory._mintInitialTokens()`

**Description**: ERC20 `_mint` does not send ETH, so reverting fallback/receive functions on recipient addresses are not a concern. However, `ERC20Votes._update` (inherited via OpenZeppelin) does call `_transferVotingUnits` which updates checkpoints. If a holder address is a contract that implements `ERC20Votes` hooks (e.g., `_afterTokenTransfer`), those hooks could theoretically revert. OpenZeppelin's implementation does not call external contracts during `_update`, so this is not exploitable.

**Proof of Concept**: N/A -- no external call to recipient during mint.

**Recommendation**: No action needed. Documented for completeness.

---

## [DOS-11] `getOrganizations` view function with large `_limit` can cause RPC node timeouts

**Severity**: Low
**Category**: evm-audit-dos
**Location**: `OrganizationFactory.getOrganizations()` (lines 261-281)

**Description**: The `getOrganizations` view function allocates a dynamic array and copies `Organization` structs (which contain multiple strings and addresses) in a loop. With a large `_limit` value and many organizations, the returned data can be very large, causing RPC node timeouts or out-of-memory errors on the node side.

This is a view-only DoS that affects off-chain consumers (frontends, indexers) rather than on-chain execution. The `_limit` parameter is caller-controlled.

**Proof of Concept**:

1. After many organizations are created, call `getOrganizations(0, 10000)`.
2. The RPC node times out trying to serialize the response.

**Recommendation**: Enforce a maximum page size in the contract (e.g., `if (_limit > 100) _limit = 100`). The frontend already uses pagination, so this is defense-in-depth.

---

## [DOS-12] No length validation on `initialHolders` vs `initialAmounts` array parity

**Severity**: Low
**Category**: evm-audit-dos
**Location**: `OrganizationFactory._mintInitialTokens()` (lines 316-318)

**Description**: `_mintInitialTokens` iterates over `_cfg.initialHolders` and indexes into `_cfg.initialAmounts` at the same index. If the arrays have different lengths, the transaction either:

-   Panics with an out-of-bounds access (if `initialAmounts` is shorter) -- this is a Solidity panic, not a custom error, making debugging harder.
-   Silently ignores extra amounts (if `initialAmounts` is longer).

**Proof of Concept**:

1. Call `createOrganization` with `initialHolders.length = 3` and `initialAmounts.length = 2`.
2. Transaction reverts with `Panic(0x32)` (array out-of-bounds) instead of a descriptive error.

**Recommendation**: Add explicit validation: `if (_cfg.initialHolders.length != _cfg.initialAmounts.length) revert OrganizationFactory_ArrayLengthMismatch();`.

---

## [DOS-13] Block stuffing risk for time-sensitive `ActionVoting` deadlines

**Severity**: Low
**Category**: evm-audit-dos
**Location**: `ActionVoting.castVote()` (line 177) and `ActionVoting.createVote()` (line 163)

**Description**: Vote deadlines are set as `block.timestamp + _duration`. On L1 Ethereum, a well-funded attacker could stuff blocks near the deadline to prevent legitimate voters from getting their `castVote` transactions included before the deadline passes.

On Sepolia (the current deployment target) and most L2s, block stuffing is impractical due to different block production mechanics. On L1 mainnet, this requires sustained high gas spending.

**Proof of Concept**:

1. A vote is about to expire in 2-3 blocks.
2. Attacker submits high-gas-price transactions to fill those blocks.
3. Legitimate voters' `castVote` transactions are not included before the deadline.

**Recommendation**: Consider a grace period mechanism or allow the vote creator to extend deadlines. For L2 deployments, this is largely a non-issue due to shorter block times and different sequencer models.

---

## Summary

| ID     | Severity | Title                                                            |
| ------ | -------- | ---------------------------------------------------------------- |
| DOS-1  | Medium   | Unbounded `_roleLeads` array in `removeRole`                     |
| DOS-2  | Medium   | Unbounded `_circleRoles` scan in `removeRole`                    |
| DOS-3  | Medium   | Unbounded `initialHolders` loop in `_mintInitialTokens`          |
| DOS-4  | Low      | Unbounded `_validateSubname` string iteration                    |
| DOS-5  | Medium   | External ENS calls can permanently brick org creation            |
| DOS-6  | High     | `setGovernanceProcess` one-shot with no recovery + front-running |
| DOS-7  | Medium   | `MeetingComponentsFactory.deploy` has no access control          |
| DOS-8  | High     | `_assertOrgAdmin` uses circleId as orgId -- wrong ID namespace   |
| DOS-9  | Low      | Unbounded `changeData` storage in proposals                      |
| DOS-10 | Info     | ERC20 mint to reverting contract -- not applicable               |
| DOS-11 | Low      | `getOrganizations` view with large limit causes RPC timeout      |
| DOS-12 | Low      | Missing array length parity check in `_mintInitialTokens`        |
| DOS-13 | Low      | Block stuffing risk for vote deadlines                           |

**Critical**: 0 | **High**: 2 | **Medium**: 4 | **Low**: 5 | **Info**: 1
