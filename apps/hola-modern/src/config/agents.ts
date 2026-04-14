/**
 * Agent allowlist — MVP placeholder for verifiable agent identity.
 *
 * Any address listed here is treated as an "agent" and gets a 🤖 chip
 * wherever it appears in the public surface (proposers, role leads, members).
 *
 * For local dev this defaults to anvil account #9 — the same account the
 * `propose-tension.ts` example in `@hollab-io/agent-sdk` uses by default.
 *
 * v1.1 will replace this with on-chain attestations (ERC-8004 or similar);
 * see docs/sprint-agent-native-mvp.md "Risks & Tradeoffs".
 */
const RAW_ALLOWLIST: readonly string[] = [
    // anvil account #9 — default AGENT_PRIVATE_KEY for local dev
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
];

const ALLOWLIST = new Set(RAW_ALLOWLIST.map((a) => a.toLowerCase()));

export function isAgentAddress(address: string | null | undefined): boolean {
    if (!address) return false;
    return ALLOWLIST.has(address.toLowerCase());
}
