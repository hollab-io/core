# PRD: Objection from the Public Permalink

**Status:** Draft · **Owner:** Product · **Date:** 2026-04-15
**Supersedes:** "Objection-raising UX (P1)" bet in `docs/sprint-agent-native-mvp.md`
**Depends on:** `docs/prds/public-private-tensions.md` (envelope reused for concerns)

## TL;DR

Today objections exist on-chain but no UX raises one. We add a single write
action to `PublicProposalView`: a stranger lands on a proposal permalink,
reads the tension, and — if they're allowed — connects a wallet inline and
signs `raiseObjection` without ever leaving the page. Concern content
reuses the public/private envelope from the tensions PRD. **The key
product decision is who may raise an objection on a public proposal; we
recommend "any wallet listed as an org member in the indexer" for MVP.**

## Problem

The proposal lifecycle is live on-chain but the adversarial path is
invisible to users. The happy path (create → adopt) is demoable; the
dissent path (create → objection → integration) is not. Without a public
way to raise an objection:

-   Holacracy's core legitimacy claim ("anyone in a circle can object")
    goes unexercised.
-   The permalink is a read-only artifact, not a participatory surface —
    this is exactly the paperclip anti-pattern (beautiful explore pages
    with nowhere to act).
-   We cannot demo the full lifecycle end-to-end to anyone who isn't
    running a local anvil.

## User & Agent Stories

### Human objector (org member)

> As a circle member who disagrees with a proposal, I want to open the
> permalink, write my concern, connect my wallet, and sign — all in one
> column — so I never context-switch to a separate dashboard.

### Human reader (stranger, not a member)

> As a stranger who followed a link and has opinions, I want to understand
> clearly why I _cannot_ object (not a member) and what I could do
> instead, rather than bouncing off a silent disabled button.

### Agent objector

> As an autonomous agent watching proposals, I want `raiseObjection` to
> be a single SDK call (already is) and I want the public permalink to
> render my objection with the 🤖 chip so humans see that agents
> participated in the governance trail.

### Human proposer

> As the author of the proposal, I want to see a new objection appear on
> my permalink within seconds of it being signed, so I can start the
> integration conversation.

## Proposed Solution

### Key product decision: Who can object?

**Recommendation: any address flagged as an org member by the indexer
may raise an objection. Token holders who are not members may not.
Strangers may not.**

**Reasoning (why this, not the alternatives):**

-   **"Any wallet"** (paperclip-pure) is the most composable but directly
    contradicts Holacracy: objections are a member-only right, and letting
    strangers block a proposal would make adoption unsafe — you'd have to
    guard against Sybil dissent at the contract level. Rejected.
-   **"Token holder"** works only for DAO-mode orgs and confuses the
    governance model (objecting is a circle act, not a token act). It also
    forces a wallet+balance check that most orgs won't have. Rejected.
-   **"Circle member only"** (strictest Holacracy) is correct long-term
    but requires a role → wallet mapping we don't yet index cleanly on the
    read path. Too much plumbing for MVP.
-   **"Org member"** (recommended) threads the needle: enforceable with a
    single indexer lookup, consistent with "members govern," and an easy
    upgrade path to per-circle scope later. The contract still enforces
    its own eligibility rules as the source of truth — the frontend is
    just an advisory gate. **If the contract is more permissive or more
    strict than the frontend, the contract wins.**

**Tradeoff we're explicitly accepting:** a non-member who really wants
to object has no path on the public permalink. We think that's fine —
the public permalink is a share + discuss surface, not a participation
surface for non-members. If a non-member has a concern, the right
primitive is "join the org" (future), not "shout via objection."

**This is the call. Flag it for the user to confirm before
implementation.**

### UX flow on `PublicProposalView`

The page stays wallet-less by default. The objection CTA is the only
write affordance and it is rendered **inline in the objections
section**, below any existing objections. It has four states:

1. **Not connected (default).** An "Object to this proposal" button in
   the objections section. Clicking it reveals:

    - A markdown textarea for the concern body
    - A `Public` / `Members only` toggle (reusing the tensions envelope)
    - A `Connect wallet to sign` button (RainbowKit openConnectModal)

    **No wallet chrome above the fold.** The top-right of the page stays
    empty on public views — this is load-bearing and must not regress.
    Connect UI is strictly local to the objection block.

2. **Connected, allowed.** The connect button becomes `Sign objection`.
   Clicking it builds + uploads the concern envelope, then calls
   `raiseObjection(proposalId, concernHash)`.

3. **Connected, not a member.** The connect button becomes a disabled
   state with an inline explanation: "Only members of
   `<subname>.hollab.eth` can raise an objection. This wallet
   (`0x1234…`) is not indexed as a member." Offer a "disconnect" link
   right there. **No silent failure.**

4. **Pending / success / error.** Standard wagmi mutation states. On
   success, the new objection appears in the trail above with the
   wallet's short address and an optimistic render while the indexer
   catches up.

### Concern envelope

Concerns reuse the exact same envelope spec as tensions (see
`docs/prds/public-private-tensions.md`). `concernHash` on-chain =
`keccak256(canonicalJSON(envelope))`. Visibility toggle is independent
from the tension's visibility — a public tension can have private
concerns and vice versa. Default: **public**, matching the paperclip
posture.

### Agent-SDK

`agent-sdk.governance.raiseObjection` is already wired. Mirror the
tensions PRD: extend its input to accept `concernText` +
`visibility` + `contentType`, and build/upload the envelope before
hashing. Do not break the existing `concernHash`-only escape hatch.

### Indexing-client / indexer

-   Add (or confirm) a `memberWallets(orgId)` query or a cheaper
    `isOrgMember(orgId, wallet)` boolean. This is the advisory gate the
    frontend will call in state 3. Cache aggressively.
-   The objection trail already indexes; concern envelope fetching goes
    through the same `fetchEnvelope` helper introduced in the tensions
    PRD — no duplicate path.

### Contracts

**Zero changes.** `raiseObjection` already exists, takes
`(proposalId, concernHash)`, and enforces its own eligibility. The
frontend gate is advisory only.

## Minimal Changes Per Layer

| Layer                      | Change                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/contracts`       | None.                                                                                                             |
| `packages/hollab-sdk`      | None beyond tensions PRD — reuse envelope helpers.                                                                |
| `packages/agent-sdk`       | Extend `raiseObjection` input with `concernText` + `visibility` + `contentType`.                                  |
| `packages/indexing-client` | Add `isOrgMember(orgId, wallet)` (or surface the existing membership set if already indexed).                     |
| `apps/hola-modern`         | Objection form + inline wallet connect in `PublicProposalView` objections section; no change to the public shell. |
| `apps/hollab-indexing`     | Confirm member set is indexable per-org; expose via manifest or GraphQL.                                          |

## Progressive Connect — UX Rules (non-negotiable)

1. No wallet chrome above the fold on `PublicProposalView`.
2. The connect modal is invoked **from inside the objection form**, not
   from a global header button.
3. Connecting a wallet on this page must not change any other part of
   the page's layout or data — only the objection form's state.
4. On disconnect, the objection form resets to state 1 without a page
   reload.
5. The eligibility check runs **after** connect, not before — we never
   ask someone to prove membership before they've even opted in.

## Non-Goals

-   **No integration / resolution UX.** `resolveObjection` stays in the
    authed workspace view. Public permalink is raise-only for now.
-   **No concern threads or replies.** One concern per objection, flat.
-   **No token-weighted objections.** A vote is not an objection.
-   **No ENS-gated objections** beyond the org-member check.
-   **No objection from the Agent Firehose page.** That's a separate
    surface.
-   **No edit / withdraw.** Objections are append-only at the contract
    level; we do not add a soft-delete UI.

## Tradeoffs & Risks

-   **Advisory frontend gate can disagree with contract truth.** We
    accept this: contract is authoritative; frontend gate exists for UX,
    not safety. Document prominently.
-   **Member set staleness.** Indexer lag means someone freshly added to
    the org could see "not a member" for a few seconds. Acceptable for
    MVP; add a "try again" action.
-   **Private concerns on public tensions** will confuse readers ("why
    can't I see this concern on a public proposal?"). Render an explicit
    "private concern — members only" card in the trail, matching the
    tensions private-state pattern.
-   **Wallet chrome discipline is fragile.** If implementer reuses a
    shared header that imports `useAccount`, we leak chrome. Enforce via
    lint or code review as the sprint already flagged.

## Success Metrics

-   A cold-loaded `PublicProposalView` on a proposal with 0 objections
    can be taken from "open link" to "objection signed" in under 60
    seconds by a member with a funded wallet.
-   The page never shows wallet chrome outside the objection block.
-   Demo script: seed one proposal, raise one objection from a second
    member wallet, resolve it in the authed view — all three states
    render correctly on the permalink.
-   Agent example `examples/propose-tension.ts` gains a sibling
    `examples/raise-objection.ts` that exercises the full public flow
    programmatically.

## Next Step (smallest validatable increment)

1. Confirm the objection permissioning decision (org member) with the
   user. **Blocking.**
2. Land `isOrgMember` on `indexing-client` with a test.
3. Build the inline objection form against state 1 → 2 → 4. Skip state
   3 in the first pass (allow any connected wallet, rely on contract
   revert); add state 3 as a follow-up once `isOrgMember` is live.
4. Add `raise-objection` example to `agent-sdk` to prove the agent
   path.
5. Seed script: add one open objection on the adopted demo org so the
   permalink has live objection data without needing a manual run.

## Open Questions

1. **Is org-member permissioning the right call, or does the user
   prefer strict circle-member?** This PRD's recommendation stands
   unless challenged.
2. **Do we already index the member set per org?** If not, scope the
   indexer work before committing to state 3.
3. **Optimistic rendering** — do we render the new objection before the
   indexer confirms, or wait? Recommend optimistic with a "pending"
   tag, matching the rest of the authed workspace.
4. **Rate limiting.** Should we soft-cap objections per wallet per
   proposal in the UI? Contract doesn't; we could. Defer unless
   abuse shows up.
