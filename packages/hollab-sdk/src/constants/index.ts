/** HKDF info strings for key derivation */
export const KEY_INFO = {
    ORG: "hollab:org",
    CIRCLE: "hollab:circle",
    ROLE: "hollab:role",
} as const;

/** Prefix for the wallet signature message used to derive master key */
export const MASTER_KEY_MESSAGE_PREFIX = "hollab:org-key:";

/** Prefix for the shared secret derivation message */
export const SHARED_SECRET_MESSAGE_PREFIX = "hollab:shared-secret:";

/** Stream ID prefix */
export const STREAM_PREFIX = "org:";

/** KV key prefixes */
export const KEY_PREFIX = {
    META: "meta",
    CIRCLE: "circle:",
    ROLE: "role:",
    AGENT: "agent:",
    KEYSHARE: "keyshare:",
    TENSION: ":tension:",
    PROPOSAL: ":proposal:",
    TREASURY_LOG: ":treasury:log",
    CONFIG: ":config",
    MEMORY: ":memory",
    STATE: ":state",
} as const;
