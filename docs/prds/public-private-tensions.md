# PRD: Public/Private Tensions

**Status:** Draft · **Owner:** Product · **Date:** 2026-04-15
**Supersedes:** "Readable tensions (P0)" bet in `docs/sprint-agent-native-mvp.md`

## TL;DR

A proposal's tension is currently an on-chain `bytes32` with no way to resolve
it to human-readable content. Authors (human or agent) will pick at
propose-time whether the tension body is **public plaintext** (anyone with the
permalink sees the text) or **private encrypted** (only org members with the
right keyshare can decrypt). On-chain surface is unchanged — visibility is
encoded in a small off-chain envelope stored under the existing `tensionHash`.

## Problem

Today `PublicProposalView` renders a hex hash where the tension text should
be. The MVP permalink is agent-legible but not human-legible, so the share
loop breaks: nobody lands on the page and understands why the proposal
exists. We also have a v2 privacy narrative (IPFS + encryption via
`hollab-sdk`) that is built but unused on the write path.

A single always-public model is too blunt — some orgs will want to use
hollab for tensions that are sensitive (personnel, strategy). A single
always-private model kills the public share loop and contradicts the
paperclip-style "public-by-default, browsable" posture.

**The product decision: make visibility a per-tension choice, defaulting to
public.**

## User & Agent Stories

### Human author

> As a circle member raising a tension, I want to write my tension in plain
> markdown and pick "public" or "members only" before I sign, so I can share
> the permalink with the world or keep it inside the org.

### Human reader (stranger on the permalink)

> As someone who opened a hollab proposal link from Twitter, I want to read
> the actual tension — not a hash — so I understand what's being proposed and
> decide whether to care.

### Human reader (org member)

> As a member of the org, I want private tensions to decrypt automatically
> using my existing keyshare, so I never have to think about where the text
> lives.

### Agent author

> As an agent calling `createProposal`, I want a single SDK call that takes
> a `tensionText` plus a `visibility` flag and handles the envelope,
> hashing, and storage — so my prompt/tool surface stays one call, not three.

### Agent reader (firehose consumer)

> As an agent browsing recent proposals across orgs, I want public tensions
> to be fetchable without any key material, and private ones to be clearly
> marked as `visibility: private` so I can skip them cleanly.

## Proposed Solution

### Data model — the envelope

Off-chain, under `tensionHash`, store a single JSON envelope:

```jsonc
// visibility: "public"
{
  "v": 1,
  "visibility": "public",
  "contentType": "text/markdown",
  "body": "We keep rediscovering the same onboarding friction…"
}

// visibility: "private"
{
  "v": 1,
  "visibility": "private",
  "contentType": "text/markdown",
  "body": {
    "alg": "AES-GCM",
    "keyRef": "org:<orgId>:circle:<circleId>",
    "iv": "base64…",
    "ct": "base64…"
  }
}
```

Rules:

-   `tensionHash` on-chain = `keccak256(canonicalJSON(envelope))`. Binding the
    hash to the envelope (not the inner body) makes the visibility choice
    tamper-evident: if anyone rewrites public → private or swaps the body,
    the hash breaks.
-   `body` for public tensions is plaintext markdown, capped (e.g. 16 KB) at
    the SDK layer.
-   `body` for private tensions is an encrypted blob produced by
    `packages/hollab-sdk` using the existing AES-GCM + HKDF + keyshare path.
    Key scope: **per-org, per-circle** (reuse whatever scope `hollab-sdk`
    already binds to — do not invent a new one in this PRD).
-   `contentType` is advisory. Start with `text/markdown` only.

### Storage

-   Public envelopes: pinned to IPFS as-is (via the `hollab-sdk` storage
    backend / indexer pin-proxy). The envelope is public, but storage still
    goes through the same transport — no reason to fork it.
-   Private envelopes: same storage, with the `body` field pre-encrypted by
    `hollab-sdk` before upload.

**Non-goal:** we do not introduce a second storage backend for public
content. One path, one envelope, one upload call.

### Agent-SDK API surface

Extend `createProposal` input (in `packages/agent-sdk/src/modules/governance.ts`):

```ts
type CreateProposalInput = {
    orgId: bigint;
    circleId: bigint;
    changeType: ChangeType;
    changeData: `0x${string}`;

    // existing:
    tensionText?: string; // convenience — hashed & wrapped
    tensionHash?: `0x${string}`; // escape hatch — caller managed envelope

    // new:
    visibility?: "public" | "private"; // default: "public"
    contentType?: string; // default: "text/markdown"
};
```

Behavior:

-   If `tensionText` is provided, the SDK builds the envelope, uploads it
    through `hollab-sdk`, and sets `tensionHash = keccak256(envelope)`.
-   If `tensionHash` is passed directly, the SDK does no storage work —
    caller is on their own. (This preserves today's escape hatch.)
-   Visibility defaults to `"public"` so agents keep the paperclip posture by
    default.

### Frontend UX (`apps/hola-modern`)

**Propose flow (authed workspace view):**

-   New segmented control next to the tension textarea: `Public` / `Members only`.
-   Default: `Public`. Tooltip: "Anyone with the link can read this tension."
-   Switching to `Members only` shows an inline note: "Only members of
    `<circle>` with a keyshare will be able to decrypt."
-   No gating on visibility choice — a member can always pick either.

**Reader flow (`PublicProposalView`):**
Replace the hex-hash header with one of three states:

1. **Public tension** — render the markdown body. Show a small
   `public` chip next to "Tension" heading. Keep the hash in a
   collapsed "technical details" footer.
2. **Private tension, reader is a member with a valid key** — decrypt
   client-side, render the markdown, show a `private` chip. This state
   only exists on the authed workspace view, not `PublicProposalView` —
   see below.
3. **Private tension, reader has no key** — show a first-class empty
   state: "This tension is private to members of `<org>`. Connect your
   wallet if you're a member to decrypt." No wallet chrome above the
   fold; the connect CTA lives inline in the empty state.

**Important:** `PublicProposalView` stays wallet-less for public
tensions. Private tensions in the wallet-less view render the "members
only" empty state only — decryption happens in the authed view. This
keeps the PublicShell / wallet-chrome separation that the sprint
established.

### Indexing-client

No schema change required. `tensionHash` is already indexed. Optionally
add an `envelopeFetcher` helper in `indexing-client` that takes a hash
and returns the envelope for display — but this can also live in
`hollab-sdk`. Recommendation: put it in `hollab-sdk` to keep
`indexing-client` pure.

### Contracts

**Zero changes.** `tensionHash` stays `bytes32`. Visibility is off-chain
metadata. This is the whole point.

## Minimal Changes Per Layer

| Layer                      | Change                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/contracts`       | None.                                                                                                          |
| `packages/hollab-sdk`      | Add envelope build/parse helpers; thin wrapper over existing encrypt/upload. Add `fetchEnvelope(tensionHash)`. |
| `packages/agent-sdk`       | Extend `createProposal` input with `visibility` + `contentType`; wire envelope build to `hollab-sdk`.          |
| `packages/indexing-client` | None (or pass-through type for envelope if we centralize the fetcher here).                                    |
| `apps/hola-modern`         | Visibility toggle on propose form; render envelope body in `PublicProposalView`; private-empty-state variant.  |
| `apps/hollab-indexing`     | None.                                                                                                          |

## Non-Goals

-   **Do not touch `concernHash`** — that is the parallel work item in the
    public-objection PRD and will reuse this envelope.
-   **No per-field ACLs.** Visibility is binary (public or members-only). No
    "public title, private body," no selective disclosure.
-   **No Aztec.** Descoped from MVP; private = symmetric encryption via
    `hollab-sdk` only.
-   **No mutable tensions.** Tension bodies are append-once; edits require a
    new proposal.
-   **No multi-body envelopes.** One body per tensionHash.
-   **No role-based decrypt.** If you have the circle keyshare, you can
    decrypt. Finer-grained gating is a v2 discussion.

## Tradeoffs & Risks

-   **Public-by-default could leak content orgs didn't mean to share.** We
    mitigate with a clear label at propose-time and the "members only"
    option one click away. We accept the risk — the paperclip posture
    requires defaulting to public.
-   **Envelope hash binding means you can't re-upload to "fix a typo"
    without breaking the on-chain hash.** This is correct behavior but will
    surprise authors. Surface "tensions are immutable" in the propose UI.
-   **IPFS availability.** If the envelope is unreachable, the permalink
    degrades to the hex-hash state we have today. Acceptable fallback;
    document it.
-   **Private + public in the same org = UX complexity.** Readers will see
    a mix of rendered tensions and "members only" cards. We think this is
    fine and actually legible.

## Success Metrics

-   ≥ 80% of tensions in seeded demos render as public markdown on the
    permalink (not hex hashes).
-   Time-to-first-meaningful-paint on a public permalink (stranger, cold
    cache) under 2.5 s including envelope fetch.
-   At least one seeded private tension in the demo org, decryptable by
    the deployer wallet in the authed view.
-   Agent example (`examples/propose-tension.ts`) demonstrates both
    visibility modes via a flag.

## Next Step (smallest validatable increment)

1. Land the envelope type + build/parse helpers in `hollab-sdk` with unit
   tests (public + private round-trip).
2. Wire `agent-sdk.createProposal` to build + upload the public envelope
   (private path can ship in a follow-up if needed, but keep the input
   shape forward-compatible).
3. Render public envelopes in `PublicProposalView`. Hex fallback stays.
4. Update `SeedDemoOrgs.s.sol` + `examples/propose-tension.ts` so the
   demo org has at least two public tensions with real text.

**Ship 1–4 on the current branch; private path can follow in the next
PR if it risks the sprint.** The share loop is unblocked as soon as step
3 lands.

## Open Questions

1. **Key scope for private tensions.** Circle-level or org-level? This
   PRD assumes circle-level because `hollab-sdk` already binds that way
   — confirm before implementation.
2. **Where does `fetchEnvelope` live?** `hollab-sdk` (this PRD's
   recommendation) or `indexing-client`? Pick one; do not duplicate.
3. **Canonical JSON implementation.** Do we adopt an existing lib
   (`json-canonicalize`) or hand-roll a minimal sort? Decide at
   implementation time — minor.
4. **Envelope size cap.** 16 KB proposed. Revisit once we see real
   tensions.
