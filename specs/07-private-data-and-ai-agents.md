# Spec 07 — Private Data Layer & AI Agent Integration

> Extends the HolLab on-chain governance system with off-chain private storage (0G Network), encryption key management, and an AI agent execution layer.

---

## 1 Overview

HolLab's on-chain contracts (RoleRegistry, CircleRegistry, GovernanceProcess, CircleTreasury) store structural governance data publicly. However, organizations need private data — agent configurations, internal discussions, strategic context, sensitive proposals — that should be readable only by authorized circle/role members.

This spec defines:

-   A **private data layer** built on 0G Storage (KV + Log) with client-side AES-256-CTR encryption
-   A **hierarchical key management** scheme tied to on-chain roles
-   An **AI agent adapter** that bridges on-chain role authority with off-chain agent execution via 0G Compute
-   An **event indexer** that mirrors on-chain governance events to 0G Storage for agent consumption

---

## 2 Architecture

```
┌──────────────────────────────────────────────────────┐
│  On-Chain (EVM)                                       │
│  ├── OrganizationFactory                              │
│  ├── AccessManager (per org)                          │
│  ├── CircleRegistry / RoleRegistry / GovernanceProcess│
│  ├── CircleTreasury (TimelockController per circle)   │
│  └── AgentRegistry (ERC-7857 INFTs)        [new]      │
└──────────────┬───────────────────────────────────────┘
               │ events + role checks
┌──────────────▼───────────────────────────────────────┐
│  HolLab SDK (TypeScript)                    [new]     │
│  ├── OrgClient — org-level read/write                 │
│  ├── KeyManager — hierarchical key derivation         │
│  ├── EventIndexer — chain → 0G Storage sync           │
│  └── AgentAdapter — agent ↔ governance bridge         │
└──────────────┬───────────────────────────────────────┘
               │ encrypted read/write          │ inference
┌──────────────▼────────────┐  ┌───────────────▼───────┐
│  0G Storage               │  │  0G Compute            │
│  ├── KV: private org data │  │  ├── LLM inference     │
│  └── Log: audit trail     │  │  └── TEE verification  │
└───────────────────────────┘  └───────────────────────┘
```

---

## 3 Private Data Layer

### 3.1 Storage Schema

All private org data is stored in 0G Storage KV, organized by stream ID and key prefix.

| Stream ID     | Key Pattern                       | Value                      | Encryption | Description                |
| ------------- | --------------------------------- | -------------------------- | ---------- | -------------------------- |
| `org:{orgId}` | `meta`                            | Organization metadata JSON | Org key    | Name, purpose, config      |
| `org:{orgId}` | `circle:{circleId}:meta`          | Circle metadata JSON       | Circle key | Extended circle data       |
| `org:{orgId}` | `circle:{circleId}:tension:{id}`  | Tension detail JSON        | Circle key | Full tension context       |
| `org:{orgId}` | `circle:{circleId}:proposal:{id}` | Proposal detail JSON       | Circle key | Rationale, discussion      |
| `org:{orgId}` | `circle:{circleId}:treasury:log`  | Spending rationale JSON    | Circle key | Why spending was proposed  |
| `org:{orgId}` | `role:{roleId}:config`            | Role config JSON           | Role key   | Agent config, instructions |
| `org:{orgId}` | `role:{roleId}:memory`            | Agent memory JSON          | Role key   | Persistent agent context   |
| `org:{orgId}` | `agent:{agentId}:state`           | Agent state JSON           | Role key   | Current task, heartbeat    |

### 3.2 Audit Trail (Public)

Governance actions are mirrored to 0G Storage Log (append-only, plaintext) for public verifiability:

| Entry Type                     | Content                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `governance:proposal-adopted`  | Proposal ID, circle ID, change type, timestamp, tx hash |
| `governance:objection-raised`  | Objection ID, proposal ID, objector, timestamp          |
| `treasury:operation-scheduled` | Operation ID, circle ID, target, value, delay           |
| `treasury:operation-executed`  | Operation ID, circle ID, tx hash                        |
| `role:lead-assigned`           | Role ID, lead address, circle ID, timestamp             |
| `role:lead-unassigned`         | Role ID, lead address, circle ID, timestamp             |
| `circle:created`               | Circle ID, parent ID, name, timestamp                   |

---

## 4 Key Management

### 4.1 Key Hierarchy

```
Org Master Key (derived from org creator wallet signature)
├── Org Encryption Key (HKDF: master + "org")
│   └── encrypts: org-level metadata
├── Circle Key (HKDF: master + "circle" + circleId)
│   └── encrypts: circle-level data (tensions, proposals, treasury rationale)
└── Role Key (HKDF: circle key + "role" + roleId)
    └── encrypts: role-level data (agent config, memory, state)
```

### 4.2 Key Derivation

All keys derived using HKDF-SHA256:

```
orgKey       = HKDF(ikm: masterKey, salt: orgId,     info: "hollab:org")
circleKey    = HKDF(ikm: masterKey, salt: circleId,  info: "hollab:circle")
roleKey      = HKDF(ikm: circleKey, salt: roleId,    info: "hollab:role")
```

The master key is derived from the org creator's wallet signature over a deterministic message:

```
masterKey = keccak256(wallet.signMessage("hollab:org-key:" + orgId))
```

### 4.3 Key Distribution

| Recipient   | Keys They Receive                | Distribution Method                                                                            |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Org creator | Master key (derived from wallet) | Self-derived                                                                                   |
| Circle lead | Circle key                       | Encrypted with lead's public key, stored at `org:{orgId}:keyshare:circle:{circleId}:{address}` |
| Role lead   | Role key                         | Encrypted with lead's public key, stored at `org:{orgId}:keyshare:role:{roleId}:{address}`     |
| AI agent    | Role key (for its assigned role) | Injected into agent runtime config at startup                                                  |

### 4.4 Key Rotation

Key rotation is triggered when:

1. **Circle lead removed** — new circle key generated, all circle data re-encrypted, new key shares distributed to remaining leads
2. **Role lead removed** — new role key generated, role data re-encrypted
3. **Manual rotation** — org admin triggers rotation via SDK

Rotation is an off-chain operation. The SDK handles re-encryption and key share redistribution.

### 4.5 Invariants

-   A circle key MUST NOT be derivable from a role key
-   A role key MUST be derivable from the parent circle key (circle leads can always access role data within their circle)
-   Key shares MUST be encrypted with the recipient's public key before storage
-   The master key MUST NOT be stored anywhere — only derived on demand from wallet signature

---

## 5 AI Agent Integration

### 5.1 Agent Identity

Each AI agent in an org is represented by:

1. **On-chain**: An INFT (ERC-7857) token held by the role it fills. The INFT metadata (encrypted) contains the agent's model config, system prompt, and capabilities.
2. **On-chain**: A role assignment in RoleRegistry — the agent's address is a role lead.
3. **Off-chain**: Agent state in 0G Storage KV — persistent memory, current tasks, heartbeat timestamp.

### 5.2 AgentRegistry Contract

```
AgentRegistry
├── registerAgent(roleId, agentAddress, modelConfig) → agentId
├── deregisterAgent(agentId)
├── getAgent(agentId) → Agent struct
├── getAgentByRole(roleId) → Agent struct
└── agentHeartbeat(agentId) — updates last-seen timestamp
```

| Property        | Type    | Description                                             |
| --------------- | ------- | ------------------------------------------------------- |
| `id`            | uint256 | Auto-incrementing agent ID                              |
| `roleId`        | uint256 | The role this agent fills                               |
| `account`       | address | The agent's wallet address (EOA or smart account)       |
| `modelUri`      | string  | 0G Storage root hash pointing to encrypted model config |
| `registeredAt`  | uint256 | Registration timestamp                                  |
| `lastHeartbeat` | uint256 | Last heartbeat timestamp                                |
| `active`        | bool    | Whether the agent is currently active                   |

### 5.3 Agent Heartbeat Protocol

Inspired by Paperclip's heartbeat model, adapted for on-chain authority:

```
1. WAKE      — Agent runtime starts (cron or event-triggered)
2. IDENTIFY  — Read role assignment from RoleRegistry
3. AUTHORIZE — Derive role key, decrypt agent config from 0G Storage
4. CHECK     — Read pending governance proposals, treasury operations, tensions from 0G KV
5. PRIORITIZE— Select highest-priority work item
6. ACT       — Execute action:
               a. Submit governance proposal (on-chain via GovernanceProcess)
               b. Schedule treasury operation (on-chain via CircleTreasury)
               c. Write analysis/recommendation (off-chain to 0G KV)
               d. Delegate sub-task to another agent (on-chain role assignment)
7. REPORT    — Write status update to 0G KV (encrypted with circle key)
8. HEARTBEAT — Call AgentRegistry.agentHeartbeat(agentId) on-chain
9. SLEEP     — Agent runtime stops until next trigger
```

### 5.4 Agent Adapter (SDK)

The AgentAdapter is the SDK component that bridges agent runtimes to the HolLab system:

```typescript
interface AgentAdapter {
    // Lifecycle
    initialize(orgId: number, roleId: number, wallet: Signer): Promise<void>;
    heartbeat(): Promise<void>;

    // Read org context
    getCircleContext(circleId: number): Promise<CircleContext>;
    getPendingProposals(circleId: number): Promise<Proposal[]>;
    getPendingTreasuryOps(circleId: number): Promise<TreasuryOp[]>;
    getTensions(circleId: number): Promise<Tension[]>;

    // Write actions (on-chain)
    submitProposal(circleId: number, proposal: ProposalInput): Promise<number>;
    scheduleTreasuryTransfer(circleId: number, transfer: TransferInput): Promise<bytes32>;

    // Write state (off-chain, encrypted)
    writeMemory(key: string, value: any): Promise<void>;
    readMemory(key: string): Promise<any>;
    writeReport(circleId: number, report: Report): Promise<void>;
}
```

### 5.5 0G Compute Integration

Agents use 0G Compute for inference:

| Feature              | Usage                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Chat completions** | Agent reasoning about proposals, tensions, and role assignments. OpenAI-compatible API via 0G Compute.               |
| **TEE verification** | Verifiable inference — proofs that the agent's reasoning matches the claimed model + input.                          |
| **Fine-tuning**      | Org-specific model fine-tuning on governance history. Dataset = historical proposals + outcomes from 0G Storage Log. |

The SDK wraps 0G Compute's OpenAI-compatible endpoint:

```typescript
interface AgentInference {
    // Reasoning
    analyzeProposal(proposal: Proposal, context: CircleContext): Promise<Analysis>;
    evaluateObjection(objection: Objection, proposal: Proposal): Promise<Evaluation>;
    suggestRoleStructure(circle: Circle, tensions: Tension[]): Promise<Suggestion>;

    // Config
    setModel(modelId: string): void;
    setProvider(endpoint: string): void; // 0G Compute endpoint
}
```

---

## 6 Event Indexer

### 6.1 Purpose

The EventIndexer watches on-chain events and mirrors them to 0G Storage for agent consumption. This decouples agents from direct chain RPC access and provides a queryable data layer.

### 6.2 Indexed Events

| Contract           | Event                                          | Indexed Data                  |
| ------------------ | ---------------------------------------------- | ----------------------------- |
| CircleRegistry     | `AnchorCircleCreated`                          | Circle ID, name               |
| CircleRegistry     | `SubCircleCreated`                             | Circle ID, parent ID, role ID |
| CircleRegistry     | `CircleLeadAdded` / `CircleLeadRemoved`        | Circle ID, lead address       |
| CircleRegistry     | `CircleRoleCreated`                            | Circle ID, role ID            |
| CircleRegistry     | `ElectedRoleSet`                               | Circle ID, role type, account |
| CircleRegistry     | `PolicyAdded` / `PolicyRemoved`                | Circle ID, policy ID          |
| RoleRegistry       | `RoleCreated` / `RoleUpdated` / `RoleRemoved`  | Role ID, circle ID            |
| RoleRegistry       | `RoleLeadAssigned` / `RoleLeadUnassigned`      | Role ID, lead address         |
| GovernanceProcess  | `ProposalSubmitted` / `ProposalActivated`      | Proposal ID, circle ID        |
| GovernanceProcess  | `ObjectionRaised` / `ObjectionResolved`        | Objection ID, proposal ID     |
| GovernanceProcess  | `ProposalAdopted` / `ProposalDiscarded`        | Proposal ID                   |
| TimelockController | `CallScheduled` / `CallExecuted` / `Cancelled` | Operation ID, target, value   |

### 6.3 Storage Format

Events are written to 0G Storage in two places:

1. **KV (queryable, encrypted)**: Latest state snapshot per entity. Agents read this for current context.
2. **Log (append-only, plaintext)**: Full event history. Used for audit and AI fine-tuning datasets.

### 6.4 SDK Interface

```typescript
interface EventIndexer {
    // Start/stop
    start(fromBlock?: number): Promise<void>;
    stop(): Promise<void>;

    // Manual sync
    syncOrg(orgId: number): Promise<void>;

    // Callbacks
    onProposalSubmitted(handler: (proposal: Proposal) => void): void;
    onTreasuryScheduled(handler: (op: TreasuryOp) => void): void;
    onRoleChanged(handler: (change: RoleChange) => void): void;
}
```

---

## 7 SDK Package Structure

```
packages/hollab-sdk/
├── src/
│   ├── client/
│   │   ├── OrgClient.ts        — high-level org read/write
│   │   ├── StorageClient.ts    — 0G Storage KV + Log wrapper
│   │   └── ChainClient.ts      — on-chain contract interactions
│   ├── crypto/
│   │   ├── KeyManager.ts       — HKDF key derivation + key shares
│   │   ├── encrypt.ts          — AES-256-CTR encrypt/decrypt
│   │   └── keyshare.ts         — public-key encrypted key distribution
│   ├── indexer/
│   │   ├── EventIndexer.ts     — chain event → 0G Storage sync
│   │   └── handlers.ts         — per-event-type handlers
│   ├── agent/
│   │   ├── AgentAdapter.ts     — agent ↔ governance bridge
│   │   ├── AgentInference.ts   — 0G Compute wrapper
│   │   └── heartbeat.ts        — heartbeat protocol implementation
│   ├── types/
│   │   └── index.ts            — shared TypeScript types
│   └── index.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 7.1 Dependencies

| Dependency                | Purpose                            |
| ------------------------- | ---------------------------------- |
| `@0gfoundation/0g-ts-sdk` | 0G Storage KV + Log operations     |
| `ethers`                  | Chain interactions, wallet signing |
| `@noble/hashes`           | HKDF-SHA256 key derivation         |
| `@noble/ciphers`          | AES-256-CTR encryption             |

---

## 8 Security Considerations

### 8.1 Threat Model

| Threat                            | Mitigation                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0G node operator reads ciphertext | Client-side AES-256-CTR encryption. Operator sees only ciphertext.                                                               |
| Compromised circle lead key       | Key rotation: new circle key, re-encrypt all data, revoke old key shares.                                                        |
| Agent wallet compromised          | Deregister agent on-chain, rotate role key, revoke proposer/canceller roles.                                                     |
| Replay of old encrypted data      | Each encryption uses a random nonce (0G SDK standard). KV updates overwrite old values.                                          |
| Unauthorized treasury spending    | TimelockController enforces delay. Facilitator can cancel. All ops are on-chain and auditable.                                   |
| Agent acts outside authority      | Agent's on-chain transactions are gated by AccessManager / circle lead checks. Agent can only act within its role's permissions. |

### 8.2 Trust Assumptions

1. **0G Storage** — trusted for availability, NOT for confidentiality. All sensitive data is encrypted client-side.
2. **0G Compute TEE** — trusted for inference integrity. The TEE attestation proves the model and input match the output.
3. **On-chain contracts** — trusted as the source of truth for role assignments, circle membership, and treasury state.
4. **Wallet security** — the master key derives from a wallet signature. Wallet compromise = org compromise.

---

## 9 Implementation Order

| Phase       | Deliverable                                                                         | Depends On |
| ----------- | ----------------------------------------------------------------------------------- | ---------- |
| **Phase 1** | `KeyManager` — HKDF derivation, AES-256-CTR encrypt/decrypt, key share distribution | —          |
| **Phase 2** | `StorageClient` — 0G KV + Log wrapper with encryption integration                   | Phase 1    |
| **Phase 3** | `OrgClient` — high-level org data read/write (roles, proposals, tensions)           | Phase 2    |
| **Phase 4** | `EventIndexer` — chain events → 0G Storage sync                                     | Phase 3    |
| **Phase 5** | `AgentRegistry` contract — on-chain agent identity + heartbeat                      | —          |
| **Phase 6** | `AgentAdapter` — agent ↔ governance bridge                                         | Phase 3, 5 |
| **Phase 7** | `AgentInference` — 0G Compute integration for reasoning                             | Phase 6    |
| **Phase 8** | INFT (ERC-7857) integration — tokenized agent identities                            | Phase 5    |
