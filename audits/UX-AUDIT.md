# hollab.eth Frontend UX Audit — MVP Golden Path

**Date**: 2026-04-16
**Scope**: `apps/hola-modern` — landing, org creation, members onboarding, governance meeting room, public org/proposal/role permalinks, explore directory
**Audit type**: Static code review (no dev server)
**Auditor**: web3-ai-product-owner agent
**Lens**: paperclip.ing-style agent-native, wallet-first, composable primitives

---

## Executive Summary

The **public surface is the strongest part of the MVP**: `ExploreView`, `PublicOrgView`, `PublicRoleView`, and `PublicProposalView` render cleanly without a wallet, use ENS-style `<subname>.hollab.eth` framing, surface agent vs. human proposers with a dedicated badge, and route through predictable permalinks (`#/o/:orgId`, `#/o/:orgId/r/:roleId`, `#/o/:orgId/p/:proposalId`). This is genuinely agent-native in posture and deserves to be defended as the front door of the product.

What's blocking the positioning, however, is that **the authed governance room is a different product**. It was built for a pre-audit-era contract where adoption was a one-shot action, and the `GovernanceMeetingRoom` still ships that model: proposals are batched `createProposal + adoptProposal` pairs submitted at meeting completion. There is **no UI to raise objections, no UI to resolve objections, no UI to discard a proposal, and no UI to handle the 14-day expiry window** that the just-shipped lifecycle contracts now enforce. The read-side (public proposal view with objections list) exists; the write-side does not. Until this is closed, the golden path from "join" to "my proposal had an objection and got integrated" is effectively broken — users will create proposals that anyone can block and have no recourse inside the product.

Secondary issues cluster around (1) `OrganizationsHome`'s create flow silently deriving the subname from the org name without ever showing the resulting `<subname>.hollab.eth` identity back to the user before they sign (they don't know what ENS handle they just minted); (2) chain-switching being auto-forced via `WalletWorkspaceSync` without any chain-mismatch UI; (3) jargon density (tensions, IDM, circles, accountabilities, facilitator, secretary) landing with almost no inline onboarding copy for non-Holacracy readers; (4) no agent-discoverability artifact (no `agent.json`, no `.well-known/`, no per-org JSON manifest endpoint) despite the product positioning explicitly claiming "agent-readable." The public views are agent-_readable_ (indexer-backed, URL-addressable), but an agent still has to scrape HTML rather than hit a structured endpoint.

The TanStack Query convention is well-honored in the public read path but violated in several legacy authed hooks (`JoinOrganizationPanel`, `MembersView`, `TacticalMeetingRoom`) that still use raw `useEffect + setState` for async reads.

| Severity | Count |
| -------- | ----- |
| Critical | 2     |
| High     | 5     |
| Medium   | 7     |
| Low      | 5     |
| Info     | 3     |

---

## Critical

### [UX-C-1] Governance room has no objection UI — golden path is broken against current contracts

**Location**: `apps/hola-modern/src/views/GovernanceMeetingRoom.tsx:250-361`, `1774-1832`; absence across the whole authed tree.
**Flagged by**: paperclip lens (agent-native), golden-path completeness, spec alignment

The on-chain governance lifecycle shipped on 2026-04-15 is: `createProposal` → `raiseObjection` (opens sub-lifecycle) → `resolveObjection` (by objector or facilitator) → `adoptProposal` (requires zero open objections) / `discardProposal` / `discardExpiredProposal`. The frontend only knows about `createProposal` and `adoptProposal` — a grep of the entire `apps/hola-modern/src/` tree for `raiseObjection`, `resolveObjection`, `discardProposal` returns **zero hits in write paths**. `useObjectionsByProposal` exists as a read hook (used in `PublicProposalView`) but no mutation hook wraps the write side.

Consequences, in order of severity:

1. `handleCompleteMeeting` (GovernanceMeetingRoom.tsx:1737) builds a single batch that calls `createProposal` followed _immediately_ by `adoptProposal(predictedProposalId)` for every pending action. If any member had an out-of-band objection they wanted to raise, there is no surface to raise it through. The "Challenge round" in the IDM stepper (REVIEW_STEPS step `e`) is a dumb stepper with no handler — clicking it does nothing onchain.
2. If an agent or a human _does_ manage to raise an objection directly against the contract (via agent-sdk or Etherscan), the `adoptProposal` call in the batch reverts (contract enforces zero open objections), meaning the whole meeting-completion batch reverts, blocking `endMeeting` too. The user will see an opaque revert with no explanation.
3. There is no surface for the 14-day `MAX_PROPOSAL_AGE` expiry. A proposal created in a long-running meeting that doesn't complete becomes stranded. `discardExpiredProposal` is permissionless on-chain but the UI never calls it.

**Impact**: The golden path "open a meeting → create a proposal → objections flow → adopt or discard" is the product's reason-to-exist. Objections are literally Article 5.3 of the Holacracy constitution. Shipping without them in the UI contradicts both the spec and the just-shipped contract semantics.

**Recommendation**:

-   Add a write-side hook `useObjectionLifecycle` that wraps `raiseObjection`, `resolveObjection`, `discardProposal`, `discardExpiredProposal`.
-   In `GovernanceMeetingRoom`, split `createProposal` from `adoptProposal`. Create-on-submit, then push the proposal into the agenda as a Draft item with its own objection sub-panel. Adopt becomes a separate action per proposal (at the end of IDM step `f`).
-   Wire the "Challenge round" IDM step to an actual "Raise objection" form that submits `raiseObjection(proposalId, concernHash)`. The `concernHash` can be a content-ref to encrypted or public concern text — reuse the existing `useEncryptedStorage` pipeline.
-   Add a "Resolve" control visible to the original objector (withdrawal) and the circle facilitator (dismissal), matching the contract's `onlyObjectorOrFacilitator` gate.
-   Surface expired proposals in the open-proposals panel with a "Discard (expired)" button that anyone can click.

---

### [UX-C-2] Auto-chain-switching with no visible fallback silently blocks the golden path

**Location**: `apps/hola-modern/src/components/WalletWorkspaceSync.tsx:13-18`
**Flagged by**: web3 UX patterns, friction

```ts
useEffect(() => {
    if (chainId && chainId !== activeChainId) {
        switchChain?.({ chainId: activeChainId });
    }
}, [chainId, activeChainId, switchChain]);
```

This fires a wallet `wallet_switchEthereumChain` prompt the moment a user connects on the wrong network. There is **no fallback UI** if:

-   the user rejects the switch (the effect re-fires on every render the account hook returns, creating a prompt loop);
-   the chain isn't in the wallet (`wallet_addEthereumChain` is not attempted);
-   the user wants to browse public orgs without switching at all (the public views mounted above the auth gate don't care about chain, but the effect still fires).

There's also no "wrong network" banner anywhere in the app — if `switchChain` silently fails (e.g., user dismisses the prompt), the user lands in an org workspace with no data (indexer returns nothing for the wrong chain's factory address) and no explanation.

**Impact**: Users on Mainnet (which is `enabled: false` per `chains.ts:64` — "Coming soon") who connect a wallet for the first time get a Sepolia-switch prompt with zero context about _why_. Mobile wallets often fail this silently. New users conclude the app is broken.

**Recommendation**:

-   Remove the auto-switch. Show a banner + explicit button: "You're on Mainnet. hollab is on Sepolia — switch network to continue."
-   If the user is only browsing `#/o/:orgId`, `#/explore`, etc., do not prompt at all — these views don't use the connected chain.
-   Guard against re-fire: track whether a switch prompt is already in flight.

---

## High

### [UX-H-1] Create-workspace modal never shows the resulting `<subname>.hollab.eth` before signing

**Location**: `apps/hola-modern/src/views/OrganizationsHome.tsx:595-670`, with subname derivation hidden in `apps/hola-modern/src/hooks/useOrganizationFactory.ts:11-18`
**Flagged by**: paperclip lens (crypto-native identity), legibility

The create-workspace modal takes `orgName` and an optional `purpose`. The ENS subname is silently derived by `deriveSubname(orgName)` — lowercase, ASCII-squashed, dash-separated, truncated to 48 chars. The user never sees the derived subname before signing the deploy. The very first onboarding action mints them an onchain identity (`<subname>.hollab.eth`) and they don't know what handle they just got.

This is the _one_ moment where the crypto-native DNA of the product should scream. Paperclip-style products surface the identity primitive; hollab buries it.

**Impact**:

-   Users with unicode names, trailing whitespace, or `&` in org names get surprising subnames ("Acme & Co." → `acme-co`).
-   Names <3 ASCII alphanumerics after derivation throw a deep error ("Organization name too short") only _after_ the user clicks submit — the modal has no client-side validation of the derived subname.
-   Users who want to reserve a specific subname (e.g., `hollab` instead of auto-derived) have no way to do it.

**Recommendation**: Show a live-computed pill under the org-name input reading `acme.hollab.eth` as the user types, with a visible "edit" affordance that lets them override. Validate subname length inline (3-32 chars is the ENS sweet spot per the contract audit's `[I-3]`). Treat `<subname>.hollab.eth` as the primary identity string, not the name.

---

### [UX-H-2] Meeting completion tx has no per-call progress, is opaquely all-or-nothing

**Location**: `apps/hola-modern/src/views/GovernanceMeetingRoom.tsx:1737-1841`
**Flagged by**: web3 UX patterns (transaction states)

`handleCompleteMeeting` builds a batch that can contain 2N+1 calls (N proposals × [create + adopt] + 1 endMeeting) and submits them via `wallet_sendCalls` (EIP-5792) or falls back to sequential `sendTransaction`. In the fallback path (line 1822-1832), if call 3 of 7 reverts, the user has already signed and paid for calls 1 and 2, and the UI just sets `txError` to a generic string. The pending actions queue is not rolled back (`setPendingActions([])` only runs on full success, line 1834). On retry, the user tries to re-create proposals that were already created, causing deterministic failures.

There's also no per-step progress indicator — the button just shows a spinner and "Completing..." for what can be a 60+ second multi-tx flow on Sepolia.

**Impact**: Any partial failure leaves the meeting in a zombie state. Users will abandon.

**Recommendation**:

-   When the wallet doesn't support `wallet_sendCalls`, show a modal with a checklist: "Creating proposal 1/3... Adopting 1/3... Ending meeting..." — one row per call, tick as it lands.
-   On partial failure, show which calls succeeded and offer to resume from the failed step.
-   Detect EIP-5792 capability upfront (`wallet_getCapabilities`) and if absent, warn the user before they start: "Your wallet doesn't support batched transactions — you'll sign X prompts."

---

### [UX-H-3] No agent-discoverability artifact — "agent-readable" is asserted but not machine-addressable

**Location**: `apps/hola-modern/public/` (only `favicon.svg`, `hero-bg.png`, `icons.svg`, `manifest.json`), `apps/hola-modern/index.html` OG meta
**Flagged by**: paperclip lens (agent-native), product positioning

The product positioning (per `index.html:17-19`) is "Public, agent-readable organizations. Every circle, role, and proposal is a shareable governance object — no wallet required." The public views deliver on the wallet-less part. But there is no:

-   `/.well-known/agent.json` or `/.well-known/ai-plugin.json` describing what an agent can do on this site
-   Per-org JSON manifest endpoint (`/o/:orgId/manifest.json`) that an agent can GET without running a React SPA
-   Structured OG/Twitter metadata per org/role/proposal (the static `index.html` OG is a single site-wide description)
-   `application/ld+json` structured data in any public view
-   sitemap.xml listing the indexed orgs

An agent today that wants to "browse hollab" has to spin up a headless browser, render the SPA, wait for the indexer fetch, and scrape the DOM. That's not agent-native — that's web2-for-bots.

**Impact**: The single sharpest product differentiator (agent-readable governance) is undersold. ERC-8004 agent identities are stored on-chain, but no ambient agent can find them from a URL alone.

**Recommendation** (smallest shippable increment first):

1. Add a build-time `public/.well-known/agent.json` with the indexer GraphQL URL, chain IDs, and OrganizationFactory addresses. This is static and trivial.
2. Add a lightweight edge worker / static-generation step that emits `/o/:orgId/manifest.json` with the org's circles, roles, and open proposals. Since the app is IPFS-hosted via hash-routing, this can't be server-routed — but the indexer GraphQL is already public, so the manifest can be published alongside the SPA or on a sibling subdomain.
3. Add `<script type="application/ld+json">` blocks into each public view rendering the org/role/proposal as `schema.org/Organization`, `schema.org/Role`, etc.

---

### [UX-H-4] Jargon wall: "tension", "IDM", "accountabilities", "secretary", "ratifier" land cold

**Location**: `apps/hola-modern/src/views/GovernanceView.tsx:415-425`, `GovernanceMeetingRoom.tsx:122-149` (REVIEW_STEPS), `Welcome.tsx:127-129`, throughout `PublicProposalView.tsx`
**Flagged by**: paperclip lens (playful & legible)

The product uses Holacracy vocabulary authoritatively — "tensions", "Integrative Decision Making", "accountabilities", "circle lead", "secretary", "nominations" — without any onboarding gloss. `Welcome.tsx` surfaces "Roles & teams / Proposals & voting / Actions & execution / Agent-ready SDK" which is fine, but the moment a user enters the governance room they hit "Check-in round / Agenda building & processing / Closing round" with no explainer.

`PublicProposalView` displays `tensionHash: 0x...` as the only content (line 150-152). For a cold agent or human viewer, this is meaningless — the tension is, by definition, off-chain content hashed. But the UI doesn't even say that; it just shows the hash.

**Impact**: First-time visitors bounce at the governance room. The product accidentally excludes anyone who isn't already a Holacracy practitioner — which kills the paperclip-style "hand a link to someone and they get it" posture.

**Recommendation**:

-   In `GovernanceView.tsx`, replace the ShieldAlert box (line 406-425) with a plain-English "How this works" callout: "A proposal is a concrete change to your org's structure. Anyone can raise a concern (objection); valid objections must be integrated before the proposal is adopted."
-   Next to each jargon term, add an info tooltip (not a link — avoid taking users out of flow). "Tension ⓘ" explaining it as "the gap between how things work now and how they could work better."
-   In `PublicProposalView`, when `tensionHash` is unresolvable (no content ref), show "Tension not published to this surface — details are in the private org feed" instead of the raw hash.

---

### [UX-H-5] TanStack Query convention violated in legacy hooks — documented as mandatory

**Location**: `apps/hola-modern/src/views/MembersView.tsx:48-59`, `JoinOrganizationPanel.tsx:86-94`, `TacticalMeetingRoom.tsx:168`
**Flagged by**: stated convention (CLAUDE.md)

CLAUDE.md explicitly says: _"TanStack Query is mandatory in the frontend — all reads via useQuery, all writes via useMutation. No raw useEffect + useState async fetching."_ Three violations still ship:

1. `MembersView.tsx:48-59` — `useEffect` with `.then()` calling `listOrgMembersByOrg`, storing in local `useState`.
2. `JoinOrganizationPanel.tsx:86-94` — debounced `useEffect` calling a raw `lookupOrg` that uses `publicClient.readContract` and stores into a `useState` discriminated union.
3. `TacticalMeetingRoom.tsx:168` — `fetchOutputs(...).then(...)`.

**Impact**: Each of these loses caching, deduping, and stale-while-revalidate behavior. `MembersView` in particular will re-fetch on every tab switch. They also drift from the convention, encouraging new code to drop back to raw state.

**Recommendation**: Wrap each in `useQuery`. For `JoinOrganizationPanel`, the debounce can be replaced with React Query's built-in `keepPreviousData` + `staleTime` and a debounce on the `queryKey` seed (or `@tanstack/react-query`'s experimental `throttle` modifier). `MembersView`'s on-chain address set is trivially a `useQuery(["orgMembers", orgId])`.

---

## Medium

### [UX-M-1] Landing (`Welcome.tsx`) forces wallet connect — no "try without a wallet" affordance

**Location**: `apps/hola-modern/src/views/Welcome.tsx:149-178`, `App.tsx:194-234`
**Flagged by**: paperclip lens (progressive disclosure)

The Welcome screen's only CTA is `WalletAuthControl` (RainbowKit connect) under "Connect to get started." There's a `BookOpen` link to the Constitution lower down, but no visible path to `#/explore` or any public org. A first-time visitor who wants to _see_ what a hollab org looks like before committing a wallet has to guess the `/explore` URL.

The public views work wallet-less — they're already built — but the landing doesn't tell you that.

**Impact**: High bounce rate for curiosity-driven traffic. Wasted investment in the public surface.

**Recommendation**: Add a secondary CTA on `Welcome`: "Browse public organizations →" linking to `#/explore`. Move "Read the Constitution" to a subtler footer link — the explore CTA is the commercially important one.

### [UX-M-2] `OrganizationOnboarding.tsx` appears dead — duplicated flow vs. `OrganizationsHome` modal

**Location**: `apps/hola-modern/src/views/OrganizationOnboarding.tsx` (436 lines, referenced nowhere in `App.tsx`), vs. `OrganizationsHome.tsx:595-753` modal
**Flagged by**: flow coherence, code-review discipline

`OrganizationOnboarding` is a full-page org-creation form with starter-structure stats, feature cards, and a "Create workspace" button that calls `createOrganization` via `useWorkspaceSnapshot` — a stale code path that doesn't use `useDeployOrganization`. `App.tsx` never imports it. The live create path is the modal inside `OrganizationsHome`. Dead code confuses future edits and invites partial fixes landing in the wrong place.

**Recommendation**: Delete `OrganizationOnboarding.tsx` or, if the intent is to ship a richer flow, promote it to the active path (the feature cards are a nice touch) and delete the modal. Don't keep both.

### [UX-M-3] `isOnboarding` member-invite auto-skip is load-bearing but invisible

**Location**: `apps/hola-modern/src/App.tsx:100-141`
**Flagged by**: flow coherence, invisible state

`isOnboarding` is computed and then immediately marked complete by `useEffect` (line 137-141), so the onboarding screen never renders. This is vestigial scaffolding from a prior flow. The name still suggests an invite step that doesn't exist — the `autoOpenInvite` state variable (line 95) is set but never triggered (no call to `setAutoOpenInvite(true)` in the codebase). New users who just created an org are dropped into the default `constitution` tab, with no prompt to add members. The Structure tab has the invite affordance but the user isn't directed there.

**Impact**: Every new org creator lands on the Constitution tab with zero instructions on what to do next. The actual next step — add members — is discoverable only by clicking into Structure.

**Recommendation**: Pick one:

-   Either delete the `isOnboarding` / `autoOpenInvite` state and have fresh orgs land on the `structure` tab with the invite panel pre-opened, OR
-   Bring back a lightweight onboarding overlay that says "Step 1: Add your first members" and points to Structure.

Either way, current state is a dead code path pretending to be a feature.

### [UX-M-4] `PublicProposalView` shows `tensionHash`/`concernHash` as raw bytes with no resolution path

**Location**: `apps/hola-modern/src/views/PublicProposalView.tsx:150-152`, `213-214`
**Flagged by**: legibility, agent-nativeness

The proposal view renders `proposal.tensionHash` and each objection's `concernHash` as font-mono hex. These are content refs; if the content is a public 0G blob, there's an SDK path to resolve it (`packages/hollab-sdk`). If it's encrypted and the viewer has no key, say so. Right now the UI treats them as terminal strings.

**Impact**: The whole public-proposal permalink — the thing you'd share with an agent or a cold reader — looks empty. It tells you there's a proposal, but not what the proposal is about.

**Recommendation**:

-   If `tensionHash == 0x00…00`, hide it ("Tension content not published").
-   If non-zero, attempt to resolve via the content-ref SDK and render the plaintext or a "Locked — role-encrypted" indicator.
-   Same for `concernHash` in objections and `changeData` — the hex dump at line 227 is particularly user-hostile.

### [UX-M-5] Expired-proposal UX is absent everywhere

**Location**: absence across `GovernanceMeetingRoom.tsx`, `PublicProposalView.tsx`, `GovernanceView.tsx`
**Flagged by**: contract semantics, edge cases

Contracts enforce `MAX_PROPOSAL_AGE = 14 days`. `adoptProposal` reverts on expiry; `discardExpiredProposal` is permissionless. The frontend never:

-   Warns a user that their draft proposal is aging toward expiry.
-   Shows "Expired" as a status on `PublicProposalView` (STATUS_LABELS at line 44 maps 0/3/5 = Draft/Adopted/Discarded; there's no code path for "expired but not yet discarded").
-   Offers a "Clean up expired proposals" action anywhere.

**Impact**: Stale drafts accumulate silently, then fail opaquely when someone tries to adopt them.

**Recommendation**:

-   In `PublicProposalView`, compute `isExpired = status === 0 && (now - submittedAt) > 14d` and show a dedicated tone + a "Discard (expired)" button that calls `discardExpiredProposal`. This is permissionless so it's a great agent-friendly affordance.
-   In the authed `GovernanceMeetingRoom`, warn when a proposal has <48h to expiry.

### [UX-M-6] Deploy tx link hardcoded to `etherscan.io` regardless of chain

**Location**: `apps/hola-modern/src/views/OrganizationsHome.tsx:698-705`
**Flagged by**: multi-chain correctness

```tsx
<a href={`https://etherscan.io/tx/${txHash}`} target="_blank" ...>
```

The user is on Sepolia by default (`DEFAULT_CHAIN_ID = hasLocal ? foundry.id : sepolia.id`). The explorer link points to mainnet Etherscan, which won't find the tx. The chain config (`chains.ts`) has explorer URLs available via `chain.blockExplorers`; they should be used.

**Recommendation**: `const txUrl = chainConfig.chain.blockExplorers?.default?.url + "/tx/" + txHash`.

### [UX-M-7] Object/array length discovery in `PublicProposalView` has a surprising slow path

**Location**: `apps/hola-modern/src/views/PublicProposalView.tsx:65-79`
**Flagged by**: correctness under realistic data

To resolve the composite proposal id, the view first lists **all open proposals for the org** (`useOpenProposalsByOrg`), picks the first one's `processAddress`, and uses it as a surrogate for _this_ proposal's `processAddress`. This works only because the indexer today sets `processAddress = meetingFactoryAddress` and each org has exactly one MeetingFactory clone. If an org ever gets a second MeetingFactory (planned or not), this silently picks the wrong one. And for an org with zero open proposals, the composite id is `null` and `useProposalFromIndexer` stays disabled — adopted/discarded proposals become unviewable by permalink.

**Impact**: Permalinks to adopted proposals — the most useful ones, because they're the historical record — may break.

**Recommendation**: Add a dedicated `getOrgProcessAddress(orgId)` endpoint on the indexing-client (or extend the org row to include it), so the proposal view can resolve `<processAddress>-<proposalId>` directly without scanning open proposals.

---

## Low

### [UX-L-1] `orgId` dependency missing from `handleLinkProposal` useCallback deps

**Location**: `apps/hola-modern/src/views/GovernanceMeetingRoom.tsx:1878-1884`
**Flagged by**: code hygiene

Deps array omits `orgId`. Stale-closure risk if the user switches orgs while a link-proposal tx is mid-flight.

### [UX-L-2] `Welcome.tsx` feature pill "Agent-ready SDK" is a claim with no follow-through

**Location**: `apps/hola-modern/src/views/Welcome.tsx:9-14`
**Flagged by**: positioning coherence

The SDK is real (`packages/agent-sdk`) but unconnected users can't discover how to use it — no link, no docs URL, no example agent. For an agent-native product, the agent onboarding path should be as prominent as the human one.

**Recommendation**: Link the pill to `/docs/agent-sdk` or wherever the SDK docs land, or add a footer link "Build an agent →".

### [UX-L-3] "Request to join" success message is terminal — no next-step

**Location**: `apps/hola-modern/src/views/JoinOrganizationPanel.tsx:255-264`
**Flagged by**: flow coherence

After submitting a join request, the user sees "Request submitted! The org admin will review it." and then... nothing. No "We'll notify you when you're approved" (there's no notification system), no estimated time, no way to see their pending request status later. Users will check back, see no change, and bounce.

**Recommendation**: Surface a persistent "Pending join requests" section in `OrganizationsHome` under "Your workspaces" that shows orgs the user has requested to join. Use the `hasPendingRequest` hook.

### [UX-L-4] `isAgentAddress` uses a hardcoded allowlist — doesn't scale

**Location**: `apps/hola-modern/src/config/agents.ts` (referenced by PublicOrgView/PublicProposalView/PublicRoleView)
**Flagged by**: agent-native positioning

The 🤖 badge that differentiates agent proposers from human ones is a well-executed detail — but if it relies on a hand-maintained list in `agents.ts`, it doesn't scale and new agents (who should be first-class) don't get recognized.

**Recommendation**: Either (a) pull agent identities from the ERC-8004 `AgentIdentityLinked` events via the indexer (the contracts already emit them), or (b) treat any address that's a contract as "possibly-agent" with a heuristic `code.length > 0` check. Paperclip-style agent-first UX means this identity tag needs to be emergent, not curated.

### [UX-L-5] `GovernanceMeetingRoom` has no accessible keyboard path

**Location**: `apps/hola-modern/src/views/GovernanceMeetingRoom.tsx:2089-2396`
**Flagged by**: a11y, cold observation

The side-drawer meeting room traps focus visually (backdrop blur, slide-in), but there's no `role="dialog"`, no `aria-modal="true"`, no focus trap, and no `Escape`-to-close. The X button is a plain `<button>`. Agents parsing the page (via accessibility tree) won't find the governance controls as a structured dialog.

**Recommendation**: Add proper ARIA dialog semantics. For an agent-native product, the a11y tree _is_ the agent-readable DOM.

---

## Info

### [UX-I-1] Tab labels diverge from on-chain concepts

`App.tsx:37-43` maps "tactical" → "Sync", "governance" → "Proposals", "structure" → "Structure", "constitution" → "About". The label renaming (Sync, Proposals, About) is a nice accessibility move for non-Holacracy readers, but it's inconsistent with every other surface — `GovernanceView` header says "Proposals / Structure changes", while the spec/contracts use "Governance Meeting". Pick a naming system and apply it everywhere, or surface both (labeled tab + subtitle).

### [UX-I-2] `OrganizationsHome` discover list filters out the user's created orgs — good, but with no copy

The Discover section at `OrganizationsHome.tsx:152-159` filters out orgs where the user is creator or member. This is correct, but there's no empty-state copy for a user who has joined every visible org. Consider a "You're in everything. Create a new org to keep the network growing" CTA for the empty Discover state.

### [UX-I-3] Sepolia-first default sells the product short for demos

`DEFAULT_CHAIN_ID` falls back to Sepolia when no local Anvil is running. That's fine for devs. For end-users landing on `hollab.eth`, the testnet branding ("Sepolia Testnet" label in the chain switcher) undercuts the agent-native positioning. When Mainnet lands, make Mainnet the user-facing default and keep Sepolia as a dev override.

---

## Positive Findings

The following is working and should be defended:

-   **Public permalink trio (`PublicOrgView`, `PublicRoleView`, `PublicProposalView`) is genuinely agent-native in spirit**: wallet-less, indexer-backed, URL-addressable, renders ENS subname as primary identity, and the agent 🤖 badge on proposers/leads is exactly the kind of playful legible signal that paperclip-style products ship.
-   **Hash routing works for IPFS deployment**: `useHashRouter.ts` cleanly encodes `#/o/:orgId/p/:proposalId` etc., and every view has a `onBack` path. The `dist/index.html` → `404.html` copy is a documented convention.
-   **Org creation batches `createOrganization + MeetingComponentsFactory.deploy` into a single EIP-5792 call** (`useOrganizationFactory.ts:125-155`). This is the correct crypto-native default — avoids the two-tx fumble that plagues most onchain-org products.
-   **TanStack Query compliance is strong in the public read path** — 14+ hooks wrap indexer calls in `useQuery` with proper `enabled` gates. The violations (see UX-H-5) are confined to legacy authed views.
-   **Discover section in `OrganizationsHome`** correctly separates "Your workspaces" from "Discover" with a "Browse" (public preview) vs. "Join" (request-to-join) split. This is a clean primitive — an agent could scrape it easily.
-   **Join flow's ENS-style subname lookup** (`JoinOrganizationPanel.tsx:57-84`) reads the org by subname directly, with live "subname.hollab.eth" formatting in the input. This is the UX pattern that `OrganizationsHome`'s create modal is missing (see UX-H-1).
-   **Organization card surfaces `<subname>.hollab.eth` as secondary identity** (`OrganizationsHome.tsx:117-121`) — the crypto-native DNA is present in the discover list, just missing from the create path.
-   **Encrypted content-ref plumbing is already there** (`useEncryptedStorage`, data-visibility radio in the proposal wizard at line 854-906). This means the write-path for proper agent-readable content (where tension/objection text lives) is partially wired — completing it will unblock UX-M-4.
-   **The proposal wizard's two-step Action → Details flow is well-structured** (`GovernanceMeetingRoom.tsx:531-1010`) — progressive disclosure is in place; it just needs an objection step bolted on after Adopt is delayed (see UX-C-1).

---

## Recommended Priority

| Priority | Finding                                                                    | Fix Complexity                  |
| -------- | -------------------------------------------------------------------------- | ------------------------------- |
| 1        | UX-C-1: Add objection lifecycle UI (raise/resolve/discard, split adopt)    | High — multi-hook + view rework |
| 2        | UX-C-2: Replace auto-chain-switch with explicit banner + button            | Low                             |
| 3        | UX-H-1: Show `<subname>.hollab.eth` in create modal with editable override | Low                             |
| 4        | UX-H-3: Ship `/.well-known/agent.json` + per-org JSON manifest             | Medium — needs build step       |
| 5        | UX-H-4: Inline gloss tooltips on Holacracy jargon                          | Low                             |
| 6        | UX-M-5: Expired-proposal status + permissionless discard button            | Medium                          |
| 7        | UX-H-2: Per-call progress during batched meeting completion                | Medium                          |
| 8        | UX-M-4: Resolve content-ref hashes in PublicProposalView                   | Medium — SDK plumbing           |
| 9        | UX-H-5: Migrate 3 legacy hooks to useQuery                                 | Low                             |
| 10       | UX-M-1: "Browse public orgs" CTA on Welcome                                | Trivial                         |
| 11       | UX-M-6: Chain-aware explorer link                                          | Trivial                         |
| 12       | UX-M-2: Delete dead `OrganizationOnboarding.tsx` or promote it             | Low                             |
| 13       | UX-M-3: Fix or remove vestigial `isOnboarding` logic in App.tsx            | Low                             |
| 14       | UX-L-4: Derive agent badge from ERC-8004 events, not allowlist             | Medium                          |

---

## Notes on scope deliberately excluded

-   **Privacy / Aztec layer**: descoped from MVP per project memory. Not evaluated.
-   **Agent-SDK internals / indexer schema**: out of scope for a frontend UX audit.
-   **Visual design polish** (typography, color balance, animation tuning): deferred — the Welcome and OrganizationsHome views already have strong visual craft (double-bezel cards, button-in-button pattern, grain overlay). Focus kept on flow-blockers.
-   **DAO governance flag (`daoVoteRequired`)**: no frontend surface yet; will be audited when that flow lands.
