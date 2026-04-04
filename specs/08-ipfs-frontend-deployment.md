# Spec 08 — Decentralized Frontend Deployment (IPFS + ENS)

> Defines the architecture and workflow for deploying the HolLab frontend as a fully decentralized application via IPFS, Filecoin, and ENS.

---

## 1 Overview

HolLab's governance dApp frontend must be as censorship-resistant as its on-chain contracts. Traditional hosting (Vercel, Netlify, AWS) introduces single points of failure and centralized control. This spec defines a decentralized deployment pipeline that stores the frontend on IPFS/Filecoin and resolves it via ENS, ensuring the application remains accessible even if any single provider goes down.

### 1.1 Goals

-   **Censorship resistance** — No single entity can take down the frontend
-   **Content integrity** — IPFS content-addressing guarantees users receive unmodified code
-   **Automated deployment** — CI/CD pushes updates on every merge to the main branch
-   **Multisig governance** — ENS content-hash updates require Safe multisig approval
-   **Progressive decentralization** — Start with IPFS deployment, layer on ENS + Safe incrementally

---

## 2 Architecture

```
┌───────────────────────────────────────────────────┐
│  GitHub Actions CI/CD                              │
│  ├── Build static site (Next.js static export)     │
│  ├── Upload to IPFS via Omnipin                    │
│  └── Propose ENS contenthash update via Safe       │
└──────────────┬────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  IPFS / Filecoin             │
│  ├── Content-addressed CID   │
│  └── Filecoin persistence    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  ENS                         │
│  ├── hollab.eth (or subdomain) │
│  └── contenthash → IPFS CID │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Access Layer                │
│  ├── hollab.eth.limo         │
│  ├── Alternative gateways    │
│  └── Local IPFS node         │
└──────────────────────────────┘
```

---

## 3 Technology Stack

| Component          | Technology               | Purpose                                       |
| ------------------ | ------------------------ | --------------------------------------------- |
| Frontend Framework | Next.js (static export)  | SPA/SSG dApp UI for governance interactions   |
| Build System       | Turbo (monorepo)         | Integrates with existing workspace pipeline   |
| IPFS Upload        | Omnipin CLI              | Deploys static output to IPFS + Filecoin      |
| Storage Incentive  | Filecoin ($FIL + $USDfc) | Economic guarantee for long-term availability |
| Naming             | ENS                      | Human-readable decentralized domain           |
| Multisig           | Safe                     | Multi-party approval for ENS content updates  |
| Gateway            | eth.limo                 | HTTP bridge for standard browsers             |
| CI/CD              | GitHub Actions           | Automated build + deploy on merge             |

---

## 4 Frontend Application

### 4.1 Location

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks (wallet, contracts, SDK)
│   ├── lib/              # Utilities, contract ABIs, SDK wrappers
│   └── styles/           # Tailwind / CSS
├── public/               # Static assets
├── next.config.js        # Static export configuration
├── package.json
├── tsconfig.json         # Extends ../../tsconfig.base.json with DOM lib
└── tailwind.config.js
```

### 4.2 Key Dependencies

-   `next` — Framework (configured for `output: "export"`)
-   `react`, `react-dom` — UI library
-   `viem` — Ethereum interactions (already in monorepo)
-   `wagmi` + `@rainbow-me/rainbowkit` — Wallet connection
-   `@hollab/sdk` — Internal SDK package for key management, storage, org client
-   `@hollab/contracts` — Contract ABIs and typed bindings
-   `tailwindcss` — Styling

### 4.3 Build Output

Next.js static export produces a fully static site in `apps/web/out/`. This directory is the deployment artifact — no server runtime required.

```json
// next.config.js
{
    "output": "export",
    "images": { "unoptimized": true },
    "trailingSlash": true
}
```

### 4.4 Core Pages

| Route          | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `/`            | Landing / dashboard — org overview             |
| `/org/[id]`    | Organization detail — circles, roles, tensions |
| `/circle/[id]` | Circle view — sub-roles, policies, metrics     |
| `/governance`  | Active proposals, objections, voting           |
| `/meetings`    | Tactical meeting facilitation UI               |
| `/settings`    | Wallet connection, role assignments            |

---

## 5 Deployment Pipeline

### 5.1 Prerequisites

| Requirement     | Details                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| Filecoin wallet | Funded with $FIL and $USDfc for storage deals                                |
| ENS name        | Registered ENS domain (e.g. `hollab.eth`)                                    |
| Safe multisig   | Deployed Safe with required signers from core team                           |
| GitHub secrets  | `OMNIPIN_FILECOIN_TOKEN` (wallet private key), `OMNIPIN_PK` (ENS signer key) |

### 5.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy-ipfs.yml
name: Deploy to IPFS

on:
    push:
        branches: [main]
        paths:
            - "apps/web/**"
            - "packages/sdk/**"
            - "packages/contracts/**"

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - uses: oven-sh/setup-bun@v2

            - uses: pnpm/action-setup@v4
              with:
                  version: 9.7.1

            - uses: actions/setup-node@v4
              with:
                  node-version: 24
                  cache: "pnpm"

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Build
              run: pnpm turbo run build --filter=@hollab/web

            - name: Install Omnipin
              run: bun i -g omnipin@1.7.0

            - name: Deploy to IPFS + update ENS
              run: omnipin deploy apps/web/out --ens hollab.eth --safe <SAFE_ADDRESS>
              env:
                  OMNIPIN_FILECOIN_TOKEN: ${{ secrets.OMNIPIN_FILECOIN_TOKEN }}
                  OMNIPIN_PK: ${{ secrets.OMNIPIN_PK }}
```

### 5.3 Deployment Flow

```
Push to main → GitHub Actions triggers
  │
  ├── 1. pnpm install + turbo build (static export → apps/web/out/)
  │
  ├── 2. omnipin deploy apps/web/out
  │      ├── Upload to IPFS → receive CID
  │      └── Pin to Filecoin → storage deal for persistence
  │
  ├── 3. --ens hollab.eth --safe <addr>
  │      ├── Encode CID as ENS contenthash
  │      └── Propose Safe transaction to update ENS record
  │
  └── 4. Safe signers approve → ENS contenthash updated
         └── hollab.eth.limo now serves new version
```

---

## 6 ENS Configuration

### 6.1 Records

| Record        | Value                     | Purpose                        |
| ------------- | ------------------------- | ------------------------------ |
| `contenthash` | `ipfs://<CID>`            | Points to IPFS-hosted frontend |
| `url`         | `https://hollab.eth.limo` | Fallback URL hint              |
| `description` | `HolLab Governance dApp`  | Human-readable description     |

### 6.2 Resolver

Use the ENS Public Resolver. The contenthash record is the only one Omnipin updates automatically; other records are set manually via the ENS Manager app.

### 6.3 Access Methods

| Method               | URL / Command                | Requirement                      |
| -------------------- | ---------------------------- | -------------------------------- |
| eth.limo gateway     | `https://hollab.eth.limo`    | None (any browser)               |
| Alternative gateways | `hollab.eth.link`, etc.      | None                             |
| Local IPFS node      | `ipfs://hollab.eth`          | IPFS-aware browser or local node |
| Direct CID           | `https://ipfs.io/ipfs/<CID>` | None                             |

---

## 7 Security Model

### 7.1 Multisig Protection

ENS contenthash updates go through Safe, preventing a single compromised key from hijacking the frontend. The Safe should require **M-of-N** signatures from core team members.

### 7.2 Content Integrity

IPFS content-addressing ensures that the CID embedded in the ENS record corresponds exactly to the deployed build output. Any tampering changes the CID, so users always receive the exact code that was deployed.

### 7.3 Secret Management

| Secret                   | Storage          | Access             |
| ------------------------ | ---------------- | ------------------ |
| `OMNIPIN_FILECOIN_TOKEN` | GitHub Secrets   | CI only            |
| `OMNIPIN_PK`             | GitHub Secrets   | CI only            |
| Safe signer keys         | Hardware wallets | Individual signers |

### 7.4 Risks and Mitigations

| Risk                          | Mitigation                                          |
| ----------------------------- | --------------------------------------------------- |
| Gateway outage (eth.limo)     | Multiple gateways available; direct IPFS access     |
| Filecoin storage deal expires | Monitor deal status; auto-renew or re-pin           |
| GitHub Actions compromise     | Safe multisig prevents unilateral ENS updates       |
| ENS domain expiry             | Set long registration period; monitor renewal dates |
| IPFS garbage collection       | Filecoin economic incentive guarantees pinning      |

---

## 8 Rollout Phases

### Phase 1 — Static Frontend Setup

-   Create `apps/web/` with Next.js static export
-   Integrate `@hollab/sdk` and `@hollab/contracts` packages
-   Build core pages (dashboard, org, circle, governance)
-   Verify `pnpm turbo run build --filter=@hollab/web` produces `apps/web/out/`

### Phase 2 — IPFS Deployment

-   Set up Filecoin wallet and fund with $FIL + $USDfc
-   Install Omnipin, test manual deployment: `omnipin deploy apps/web/out`
-   Verify site loads via direct IPFS CID gateway URL
-   Add `deploy-ipfs.yml` GitHub Actions workflow (without ENS flags)

### Phase 3 — ENS Integration

-   Register or configure ENS name (e.g. `hollab.eth`)
-   Deploy Safe multisig with core team signers
-   Enable `--ens` and `--safe` flags in Omnipin deploy command
-   Verify `hollab.eth.limo` resolves to the IPFS-hosted frontend

### Phase 4 — Production Hardening

-   Add deployment status notifications (Slack/Discord webhook)
-   Set up Filecoin deal monitoring and renewal alerts
-   Add ENS domain expiry monitoring
-   Document runbook for manual recovery (re-pin, re-deploy, Safe recovery)

---

## 9 Integration with Existing Specs

| Spec                          | Relationship                                              |
| ----------------------------- | --------------------------------------------------------- |
| 01 — Organizational Structure | Frontend renders circle/role hierarchy from on-chain data |
| 02 — Rules of Cooperation     | UI for duty tracking, tension processing                  |
| 03 — Tactical Meetings        | Meeting facilitation interface                            |
| 04 — Distributed Authority    | Role authority visualization and action flows             |
| 05 — Governance Process       | Proposal creation, objection, integration UI              |
| 07 — Private Data & AI Agents | SDK integration for encrypted data access per role        |
