#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy-ipfs.sh — Build the hola-modern SPA, pin it to IPFS, and emit the Safe
#                  transaction needed to point hollab.eth at the new CID.
#
# This script intentionally STOPS before submitting anything on-chain. The
# `hollab.eth` ENS contenthash is updated through a Safe multisig — a human
# pastes the emitted calldata into the Safe Transaction Builder and collects
# signatures. The deployer key never lives in CI or in this script.
#
# Pipeline:
#   1. Preflight  — required env + tools (omnipin, node, pnpm)
#   2. Build      — pnpm --filter hola-modern build (+ dist/404.html copy)
#   3. Pin        — omnipin uploads dist/ to IPFS/Filecoin, returns a CID
#   4. Emit       — print CID, gateway preview, and setContenthash(node, hash)
#                   calldata for the Safe Transaction Builder
#
# Usage:
#   OMNIPIN_FILECOIN_TOKEN=… ./scripts/deploy-ipfs.sh
#
# Required env:
#   OMNIPIN_FILECOIN_TOKEN   — Filecoin/IPFS pinning API token for omnipin
#
# Optional env:
#   ENS_NAME                 — ENS name to update (default: hollab.eth)
#   ENS_RESOLVER             — resolver address the Safe tx targets. If unset the
#                              script still emits calldata and tells you to send it
#                              to the name's current Public Resolver.
#   OMNIPIN_BIN              — override the omnipin invocation (default: omnipin,
#                              falling back to `npx --yes omnipin`)
#   SKIP_BUILD=1             — reuse an existing apps/hola-modern/dist/
#
# Production build vars (read from apps/hola-modern/.env.production if present,
# otherwise must be exported in your shell):
#   VITE_IPFS_GATEWAY, VITE_INDEXER_URL_SEPOLIA, VITE_INDEXER_URL_MAINNET,
#   VITE_WALLETCONNECT_PROJECT_ID, …
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/apps/hola-modern"
DIST="$FRONTEND/dist"
ENS_NAME="${ENS_NAME:-hollab.eth}"

# ── tiny color helpers ───────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; GREEN=""; YELLOW=""; RED=""; RESET=""
fi
step() { echo ""; echo "${BOLD}▶ $*${RESET}"; }
ok()   { echo "${GREEN}✓${RESET} $*"; }
warn() { echo "${YELLOW}!${RESET} $*"; }
die()  { echo "${RED}✗ $*${RESET}" >&2; exit 1; }

# ── 1. Preflight ─────────────────────────────────────────────────────────────
step "Preflight"

for cmd in node pnpm; do
  command -v "$cmd" &>/dev/null || die "$cmd is required but not found."
done
ok "node $(node --version), pnpm $(pnpm --version)"

: "${OMNIPIN_FILECOIN_TOKEN:?OMNIPIN_FILECOIN_TOKEN is required (Filecoin/IPFS pinning token)}"
ok "OMNIPIN_FILECOIN_TOKEN present"

# Resolve the omnipin binary (global, else npx fallback).
if [ -n "${OMNIPIN_BIN:-}" ]; then
  read -r -a OMNIPIN <<<"$OMNIPIN_BIN"
elif command -v omnipin &>/dev/null; then
  OMNIPIN=(omnipin)
else
  warn "omnipin not on PATH — falling back to 'npx --yes omnipin'"
  OMNIPIN=(npx --yes omnipin)
fi
ok "omnipin: ${OMNIPIN[*]}"

# Load production build vars if a dotenv file exists (does not override the shell).
ENV_PROD="$FRONTEND/.env.production"
if [ -f "$ENV_PROD" ]; then
  set -a; # shellcheck disable=SC1090
  source "$ENV_PROD"; set +a
  ok "loaded build vars from $ENV_PROD"
else
  warn "no $ENV_PROD — relying on VITE_* already exported in the shell"
fi
[ -n "${VITE_IPFS_GATEWAY:-}" ] || warn "VITE_IPFS_GATEWAY is empty — production reads may fall back to the default gateway"

# ── 2. Build ─────────────────────────────────────────────────────────────────
if [ "${SKIP_BUILD:-}" = "1" ] && [ -f "$DIST/index.html" ]; then
  step "Build (skipped — reusing $DIST)"
else
  step "Build"
  ( cd "$ROOT" && pnpm --filter hola-modern build )
fi
[ -f "$DIST/index.html" ] || die "build did not produce $DIST/index.html"
[ -f "$DIST/404.html" ]   || die "missing $DIST/404.html — the hash-routing fallback copy did not run"
ok "dist/ built (index.html + 404.html present)"

# ── 3. Pin to IPFS ───────────────────────────────────────────────────────────
step "Pin dist/ to IPFS via omnipin"
warn "omnipin CLI shape is assumed: '<bin> upload <dir>' printing a CID on stdout."
warn "If this fails, run the upload manually and re-run with CID=<cid> to skip pinning."

if [ -n "${CID:-}" ]; then
  ok "using provided CID=$CID (pinning skipped)"
else
  PIN_OUT="$("${OMNIPIN[@]}" upload "$DIST" 2>&1)" || {
    echo "$PIN_OUT" >&2
    die "omnipin upload failed. Confirm the CLI flags (\`${OMNIPIN[*]} --help\`) and OMNIPIN_FILECOIN_TOKEN, or pass CID=<cid> to skip."
  }
  echo "${DIM}${PIN_OUT}${RESET}"
  # Extract the first CIDv0 (Qm…) or CIDv1 (bafy…/bafk…) token from omnipin output.
  CID="$(printf '%s\n' "$PIN_OUT" | grep -oE '\b(Qm[1-9A-HJ-NP-Za-km-z]{44}|ba[a-z2-7]{57,})\b' | head -n1 || true)"
  [ -n "$CID" ] || die "could not parse a CID from omnipin output (see above). Re-run with CID=<cid>."
  ok "pinned → $CID"
fi

# ── 4. Emit Safe contenthash transaction ─────────────────────────────────────
step "Encode ENS contenthash + Safe calldata"

# Encode using the frontend's installed viem + multiformats (run from $FRONTEND
# so the deps resolve). Emits a single line: <namehash> <contenthash> <calldata>
ENC="$(
  cd "$FRONTEND" && CID="$CID" ENS_NAME="$ENS_NAME" node --input-type=module <<'NODE'
import { CID } from "multiformats/cid";
import { namehash, encodeFunctionData } from "viem";

const cidStr = process.env.CID;
const name = process.env.ENS_NAME;

// Normalize to CIDv1 dag-pb so the contenthash carries the standard 0x0170 prefix.
const v1 = CID.parse(cidStr).toV1();
const cidHex = Buffer.from(v1.bytes).toString("hex");
// EIP-1577 ipfs contenthash = varint(ipfs-ns = 0xe3) ++ CIDv1 bytes → 0xe301 ++ cid
const contenthash = `0x e3 01 ${cidHex}`.replace(/\s+/g, "");

const node = namehash(name);
const calldata = encodeFunctionData({
  abi: [{
    type: "function",
    name: "setContenthash",
    stateMutability: "nonpayable",
    inputs: [{ name: "node", type: "bytes32" }, { name: "hash", type: "bytes" }],
    outputs: [],
  }],
  functionName: "setContenthash",
  args: [node, contenthash],
});

process.stdout.write(`${node} ${contenthash} ${calldata}\n`);
NODE
)" || die "contenthash encoding failed (is hola-modern installed? run 'pnpm install')."

read -r ENS_NODE CONTENTHASH CALLDATA <<<"$ENC"
GATEWAY="${VITE_IPFS_GATEWAY:-https://gateway.pinata.cloud}"

echo ""
echo "${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo "${BOLD}  Pinned build ready — Safe transaction below (NOT submitted)${RESET}"
echo "${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo "  ENS name      : ${ENS_NAME}"
echo "  CID           : ${CID}"
echo "  Preview       : ${GATEWAY%/}/ipfs/${CID}"
echo "  eth.limo      : https://${ENS_NAME}.limo  (after the record propagates)"
echo ""
echo "  ${BOLD}Safe Transaction Builder${RESET} — new transaction:"
echo "    To (resolver) : ${ENS_RESOLVER:-<hollab.eth current Public Resolver — look it up on app.ens.domains>}"
echo "    Value         : 0"
echo "    Method        : setContenthash(bytes32 node, bytes hash)"
echo "    node          : ${ENS_NODE}"
echo "    hash          : ${CONTENTHASH}"
echo ""
echo "  ${BOLD}Raw calldata${RESET} (paste into Safe's 'Custom data' / Transaction Builder):"
echo "    ${CALLDATA}"
echo ""
warn "Collect Safe signatures and execute to finish the deploy. Nothing was submitted on-chain."
echo "${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
